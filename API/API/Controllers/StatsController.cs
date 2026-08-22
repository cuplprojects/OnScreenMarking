using API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StatsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("counts")]
        public async Task<IActionResult> GetCounts([FromQuery] int? universityId = null)
        {
            try
            {
                int targetUniversityId = 0;
                if (universityId.HasValue)
                {
                    targetUniversityId = universityId.Value;
                }
                else
                {
                    var userIdClaim = User.FindFirst("id")?.Value;
                    if (int.TryParse(userIdClaim, out int userId))
                    {
                        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                        if (user != null && user.UniversityId != null)
                        {
                            targetUniversityId = user.UniversityId.Value;
                        }
                    }
                }

                if (targetUniversityId == 0)
                {
                    return BadRequest(new { success = false, message = "University ID is required or user must be associated with a university." });
                }

                var departmentsCount = await _context.Departments
                    .CountAsync(d => d.UniversityId == targetUniversityId && d.IsActive);

                var coursesCount = await _context.Courses
                    .CountAsync(c => c.Department.UniversityId == targetUniversityId && c.IsActive && c.Department.IsActive);

                var subjectsCount = await _context.DepartmentSubjects
                    .CountAsync(ds => ds.Department.UniversityId == targetUniversityId && ds.Subject.Status && ds.Department.IsActive);

                var scriptsCount = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper.Project.UniversityId == targetUniversityId);

                var completedMarking = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper.Project.UniversityId == targetUniversityId && s.Status == "completed");

                var unassignedScriptsCount = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper.Project.UniversityId == targetUniversityId && (s.Status == "pending" || (s.Status != "completed" && !s.Allocations.Any())));

                var unconfiguredPapersCount = await _context.ProjectPapers
                    .CountAsync(pp => pp.Project.UniversityId == targetUniversityId && !pp.Paper.Sections.Any());

                var projectsStats = await _context.Projects
                    .AsNoTracking()
                    .Where(p => p.UniversityId == targetUniversityId)
                    .Select(p => new
                    {
                        projectId = p.ProjectId,
                        papersCount = p.ProjectPapers.Count(),
                        totalScripts = p.ProjectPapers.SelectMany(pp => pp.Scripts).Count(),
                        pendingScripts = p.ProjectPapers.SelectMany(pp => pp.Scripts).Count(s => s.Status == "pending" || (s.Status != "completed" && !s.Allocations.Any())),
                        allocatedScripts = p.ProjectPapers.SelectMany(pp => pp.Scripts).Count(s => s.Status == "allocated" || s.Status == "marking"),
                        completedScripts = p.ProjectPapers.SelectMany(pp => pp.Scripts).Count(s => s.Status == "completed"),
                        unconfiguredPapersCount = p.ProjectPapers.Count(pp => !pp.Paper.Sections.Any())
                    })
                    .ToListAsync();

                return Ok(new
                {
                    departments = departmentsCount,
                    courses = coursesCount,
                    subjects = subjectsCount,
                    scripts = scriptsCount,
                    completedMarking = completedMarking,
                    unassignedScriptsCount = unassignedScriptsCount,
                    unconfiguredPapersCount = unconfiguredPapersCount,
                    projects = projectsStats
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
