using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var totalScripts = await _context.Scripts.CountAsync();
                var evaluatedScripts = await _context.Scripts.CountAsync(s => s.Status == ScriptStatus.completed);
                var pendingScripts = await _context.Scripts.CountAsync(s => s.Status == ScriptStatus.pending);
                var inProgressScripts = await _context.Scripts.CountAsync(s => s.Status == ScriptStatus.in_progress || s.Status == ScriptStatus.marking);

                var completedMarkingsQuery = _context.Markings.Where(m => m.Status == MarkingStatus.submitted);
                var completedCount = await completedMarkingsQuery.CountAsync();
                decimal totalMarks = completedCount > 0 ? await completedMarkingsQuery.SumAsync(m => m.TotalMarks) : 0m;
                decimal averageScore = completedCount > 0 ? totalMarks / completedCount : 0m;

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalScripts,
                        evaluatedScripts,
                        pendingScripts,
                        inProgressScripts,
                        averageScore = Math.Round(averageScore, 2),
                        completionRate = totalScripts > 0 ? Math.Round((evaluatedScripts / (decimal)totalScripts) * 100, 2) : 0
                    }
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while generating dashboard stats." });
            }
        }

        [HttpGet("department-wise")]
        public async Task<IActionResult> GetDepartmentWiseStats()
        {
            try
            {
                var departments = await _context.Departments
                    .AsNoTracking()
                    .Where(d => d.IsActive)
                    .ToListAsync();

                var departmentStats = new List<object>();

                foreach (var department in departments)
                {
                    // Get subject ids mapped to department
                    var subjectIds = await _context.DepartmentSubjects
                        .Where(ds => ds.DepartmentId == department.DepartmentId)
                        .Select(ds => ds.SubjectId)
                        .ToListAsync();

                    // Get paper ids mapped to subjects
                    var paperIds = await _context.SubjectPapers
                        .Where(sp => subjectIds.Contains(sp.SubjectId))
                        .Select(sp => sp.PaperId)
                        .Distinct()
                        .ToListAsync();

                    // SQL aggregates instead of loading all scripts into memory (H14)
                    var totalScriptsCount = await _context.Scripts
                        .Where(s => paperIds.Contains(s.ProjectPaper.PaperId))
                        .CountAsync();

                    var markingsQuery = _context.Markings
                        .Where(m => paperIds.Contains(m.Script.ProjectPaper.PaperId) && m.Status == MarkingStatus.submitted);

                    var evaluatedCount = await markingsQuery.CountAsync();
                    decimal totalMarks = evaluatedCount > 0 ? await markingsQuery.SumAsync(m => m.TotalMarks) : 0m;
                    decimal avgScore = evaluatedCount > 0 ? totalMarks / evaluatedCount : 0m;

                    departmentStats.Add(new
                    {
                        department = department.Name,
                        total = totalScriptsCount,
                        evaluated = evaluatedCount,
                        pending = Math.Max(0, totalScriptsCount - evaluatedCount),
                        avgScore = Math.Round(avgScore, 2),
                        progress = totalScriptsCount > 0
                            ? Math.Round((evaluatedCount / (decimal)totalScriptsCount) * 100, 2)
                            : 0
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = departmentStats
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while generating department stats."
                });
            }
        }

        [HttpGet("examiner-performance")]
        [Authorize(Roles = "coordinator,admin")]
        public async Task<IActionResult> GetExaminerPerformance()
        {
            try
            {
                var examiners = await _context.Users
                    .Where(u => u.UserType == "examiner")
                    .ToListAsync();

                var performanceData = new List<object>();

                foreach (var examiner in examiners)
                {
                    var markings = await _context.Markings
                        .Include(m => m.Script)
                        .Where(m => m.ExaminerId == examiner.Id && m.Status == MarkingStatus.submitted)
                        .ToListAsync();

                    decimal totalMarks = markings.Sum(m => m.TotalMarks);
                    decimal avgMarks = markings.Count > 0 ? totalMarks / markings.Count : 0;

                    // Calculate real accuracy rate dynamically based on re-evaluation dispute ratios
                    string accuracy;
                    if (markings.Count == 0)
                    {
                        accuracy = "N/A";
                    }
                    else
                    {
                        int contestedCount = markings.Count(m => m.Script != null && m.Script.IsReEvaluationRequested == true);
                        decimal accuracyPct = ((decimal)(markings.Count - contestedCount) / markings.Count) * 100m;
                        accuracy = $"{Math.Round(accuracyPct, 1)}%";
                    }

                    performanceData.Add(new
                    {
                        examiner = examiner.Name,
                        email = examiner.Email,
                        scriptsEvaluated = markings.Count,
                        avgMarks = Math.Round(avgMarks, 2),
                        accuracy
                    });
                }

                return Ok(new { success = true, data = performanceData });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

       
        [HttpGet("examiner/{examinerId}")]
        public async Task<IActionResult> GetExaminerReport(int examinerId)
        {
            try
            {
                var markings = await _context.Markings
                    .Where(m => m.ExaminerId == examinerId &&
                                m.Status == MarkingStatus.submitted)
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                            .ThenInclude(p => p.SubjectPapers)
                                .ThenInclude(sp => sp.Subject)
                    .Include(m => m.Allocation)
                    .ToListAsync();

                decimal totalMarks = markings.Sum(m => m.TotalMarks);

                decimal avgMarks = markings.Count > 0
                    ? totalMarks / markings.Count
                    : 0;

                var subjectBreakdown = markings
                    .SelectMany(m =>
                        m.Script.ProjectPaper.Paper.SubjectPapers.Select(sp => new
                        {
                            SubjectName = sp.Subject.SubName,
                            Marking = m
                        }))
                    .GroupBy(x => x.SubjectName)
                    .Select(g => new
                    {
                        subject = g.Key,

                        count = g.Count(),

                        totalMarks = g.Sum(x => x.Marking.TotalMarks)
                    })
                    .ToList();

                return Ok(new
                {
                    success = true,

                    data = new
                    {
                        totalScriptsEvaluated = markings.Count,

                        averageMarks = Math.Round(avgMarks, 2),

                        subjectBreakdown,

                        markings
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while processing your request."
                });
            }
        }
    }
}
