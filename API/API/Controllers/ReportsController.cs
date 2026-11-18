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

                var deptIds = departments.Select(d => d.DepartmentId).ToList();

                // Batch fetch all DepartmentSubjects and SubjectPapers in bulk (eliminating N+1 query loop)
                var allDeptSubjects = await _context.DepartmentSubjects
                    .AsNoTracking()
                    .Where(ds => deptIds.Contains(ds.DepartmentId))
                    .ToListAsync();

                var allSubjectIds = allDeptSubjects.Select(ds => ds.SubjectId).Distinct().ToList();

                var allSubjectPapers = await _context.SubjectPapers
                    .AsNoTracking()
                    .Where(sp => allSubjectIds.Contains(sp.SubjectId))
                    .ToListAsync();

                var allPaperIds = allSubjectPapers.Select(sp => sp.PaperId).Distinct().ToList();

                // Aggregate scripts count by PaperId directly in SQL
                var paperScriptCounts = await _context.Scripts
                    .AsNoTracking()
                    .Where(s => s.ProjectPaper != null && allPaperIds.Contains(s.ProjectPaper.PaperId))
                    .GroupBy(s => s.ProjectPaper.PaperId)
                    .Select(g => new { PaperId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.PaperId, g => g.Count);

                // Aggregate markings count and sum by PaperId directly in SQL
                var paperMarkingStats = await _context.Markings
                    .AsNoTracking()
                    .Where(m => m.Status == MarkingStatus.submitted && m.Script != null && m.Script.ProjectPaper != null && allPaperIds.Contains(m.Script.ProjectPaper.PaperId))
                    .GroupBy(m => m.Script.ProjectPaper.PaperId)
                    .Select(g => new
                    {
                        PaperId = g.Key,
                        Count = g.Count(),
                        TotalMarks = g.Sum(m => m.TotalMarks)
                    })
                    .ToDictionaryAsync(g => g.PaperId, g => g);

                var deptSubjectsMap = allDeptSubjects
                    .GroupBy(ds => ds.DepartmentId)
                    .ToDictionary(g => g.Key, g => g.Select(ds => ds.SubjectId).ToHashSet());

                var subjectPapersMap = allSubjectPapers
                    .GroupBy(sp => sp.SubjectId)
                    .ToDictionary(g => g.Key, g => g.Select(sp => sp.PaperId).ToList());

                var departmentStats = new List<object>();

                foreach (var department in departments)
                {
                    var subIds = deptSubjectsMap.TryGetValue(department.DepartmentId, out var sIds) ? sIds : new HashSet<int>();
                    var pIds = subIds
                        .SelectMany(sId => subjectPapersMap.TryGetValue(sId, out var pList) ? pList : Enumerable.Empty<int>())
                        .Distinct()
                        .ToList();

                    int totalScriptsCount = pIds.Sum(pId => paperScriptCounts.GetValueOrDefault(pId, 0));
                    int evaluatedCount = pIds.Sum(pId => paperMarkingStats.TryGetValue(pId, out var st) ? st.Count : 0);
                    decimal totalMarks = pIds.Sum(pId => paperMarkingStats.TryGetValue(pId, out var st) ? st.TotalMarks : 0m);
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
                    .AsNoTracking()
                    .Where(u => u.UserType == "examiner")
                    .ToListAsync();

                var examinerIds = examiners.Select(e => e.Id).ToList();

                // Compute examiner aggregates directly in SQL (single query instead of N+1)
                var markingStats = await _context.Markings
                    .AsNoTracking()
                    .Where(m => examinerIds.Contains(m.ExaminerId) && m.Status == MarkingStatus.submitted)
                    .GroupBy(m => m.ExaminerId)
                    .Select(g => new
                    {
                        ExaminerId = g.Key,
                        Count = g.Count(),
                        TotalMarks = g.Sum(m => m.TotalMarks),
                        ContestedCount = g.Count(m => m.Script != null && m.Script.IsReEvaluationRequested == true)
                    })
                    .ToDictionaryAsync(g => g.ExaminerId, g => g);

                var performanceData = examiners.Select(examiner =>
                {
                    if (!markingStats.TryGetValue(examiner.Id, out var st) || st.Count == 0)
                    {
                        return new
                        {
                            examiner = examiner.Name,
                            email = examiner.Email,
                            scriptsEvaluated = 0,
                            avgMarks = 0m,
                            accuracy = "N/A"
                        };
                    }

                    decimal avgMarks = st.TotalMarks / st.Count;
                    decimal accuracyPct = ((decimal)(st.Count - st.ContestedCount) / st.Count) * 100m;

                    return new
                    {
                        examiner = examiner.Name,
                        email = examiner.Email,
                        scriptsEvaluated = st.Count,
                        avgMarks = Math.Round(avgMarks, 2),
                        accuracy = $"{Math.Round(accuracyPct, 1)}%"
                    };
                }).ToList();

                return Ok(new { success = true, data = performanceData });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

       
        [HttpGet("examiner/{examinerId}")]
        public async Task<IActionResult> GetExaminerReport(int examinerId, [FromQuery] int limit = 100)
        {
            try
            {
                limit = Math.Clamp(limit <= 0 ? 100 : limit, 1, 200);

                var markingsQuery = _context.Markings
                    .AsNoTracking()
                    .Where(m => m.ExaminerId == examinerId && m.Status == MarkingStatus.submitted);

                var totalCount = await markingsQuery.CountAsync();
                decimal totalMarks = totalCount > 0 ? await markingsQuery.SumAsync(m => m.TotalMarks) : 0m;
                decimal avgMarks = totalCount > 0 ? totalMarks / totalCount : 0m;

                var markings = await markingsQuery
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                            .ThenInclude(p => p.SubjectPapers)
                                .ThenInclude(sp => sp.Subject)
                    .Include(m => m.Allocation)
                    .OrderByDescending(m => m.SubmittedAt)
                    .Take(limit)
                    .ToListAsync();

                var subjectBreakdown = markings
                    .Where(m => m.Script?.ProjectPaper?.Paper?.SubjectPapers != null)
                    .SelectMany(m =>
                        m.Script.ProjectPaper.Paper.SubjectPapers.Select(sp => new
                        {
                            SubjectName = sp.Subject?.SubName ?? "General",
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

                var projectedMarkings = markings.Select(m => new
                {
                    id = m.Id,
                    scriptId = m.ScriptId,
                    totalMarks = m.TotalMarks,
                    percentage = m.Percentage,
                    remarks = m.Remarks,
                    submittedAt = m.SubmittedAt,
                    paperCode = m.Script?.ProjectPaper?.Paper?.PaperCode,
                    paperName = m.Script?.ProjectPaper?.Paper?.PaperName
                }).ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalScriptsEvaluated = totalCount,
                        averageMarks = Math.Round(avgMarks, 2),
                        subjectBreakdown,
                        markings = projectedMarkings
                    }
                });
            }
            catch (Exception)
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
