using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProjectController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProjectController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetProjects(
            [FromQuery] int? sessionId = null, 
            [FromQuery] int? universityId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string search = "",
            [FromQuery] string? sortField = null,
            [FromQuery] string? sortOrder = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var query = _context.Projects.AsQueryable();

                if (sessionId.HasValue)
                    query = query.Where(p => p.SessionId == sessionId.Value);

                if (universityId.HasValue)
                    query = query.Where(p => p.UniversityId == universityId.Value);

                if (isActive.HasValue)
                    query = query.Where(p => p.IsActive == isActive.Value);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(p => p.ProjectName.ToLower().Contains(s));
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("projectName", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(p => p.ProjectName) : query.OrderBy(p => p.ProjectName);
                    else if (sortField.Equals("isActive", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(p => p.IsActive) : query.OrderBy(p => p.IsActive);
                    else if (sortField.Equals("createdAt", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt);
                    else
                        query = query.OrderBy(p => p.ProjectName);
                }
                else
                {
                    query = query.OrderBy(p => p.ProjectName);
                }

                var projection = query.Select(p => new
                {
                    projectId = p.ProjectId,
                    projectName = p.ProjectName,
                    isActive = p.IsActive,
                    createdAt = p.CreatedAt,
                    sessionId = p.SessionId,
                    universityId = p.UniversityId,
                    session = p.Session != null ? new { sessionName = p.Session.SessionName } : null
                });

                object projects;
                if (pageSize > 0)
                {
                    projects = await projection
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();
                }
                else
                {
                    projects = await projection.ToListAsync();
                }

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = projects,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Project>> GetProject(int id)
        {
            try
            {
                var project = await _context.Projects
                    .Include(p => p.Session)
                    .Include(p => p.University)
                    .Include(p => p.ProjectPapers)
                        .ThenInclude(pp => pp.Paper)
                    .FirstOrDefaultAsync(p => p.ProjectPapers.FirstOrDefault().ProjectId == id);

                if (project == null)
                    return NotFound(new { success = false, message = "Project not found" });

                return Ok(project);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<Project>> CreateProject([FromBody] ProjectDto projectDto)
        {
            try
            {
                if (string.IsNullOrEmpty(projectDto.ProjectName))
                    return BadRequest(new { success = false, message = "Project name is required" });

                if (projectDto.SessionId <= 0)
                    return BadRequest(new { success = false, message = "Session ID is required" });

                if (projectDto.UniversityId <= 0)
                    return BadRequest(new { success = false, message = "University ID is required" });

                // Verify session exists
                var session = await _context.Sessions.FindAsync(projectDto.SessionId);
                if (session == null)
                    return BadRequest(new { success = false, message = "Session not found" });

                // Verify university exists
                var university = await _context.Universities.FindAsync(projectDto.UniversityId);
                if (university == null)
                    return BadRequest(new { success = false, message = "University not found" });

                var project = new Project
                {
                    ProjectName = projectDto.ProjectName,
                    SessionId = projectDto.SessionId,
                    UniversityId = projectDto.UniversityId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Projects.Add(project);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetProject), new { id = project.ProjectId }, project);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] ProjectDto projectDto)
        {
            try
            {
                var project = await _context.Projects.FindAsync(id);
                if (project == null)
                    return NotFound(new { success = false, message = "Project not found" });

                project.ProjectName = projectDto.ProjectName;
                project.IsActive = projectDto.IsActive;

                _context.Projects.Update(project);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Project updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/papers")]
        public async Task<ActionResult<IEnumerable<Paper>>> GetProjectPapers(int id)
        {
            try
            {
                var papers = await _context.Papers
                    .Where(p => p.ProjectPapers.FirstOrDefault().ProjectId == id && p.IsActive)
                    .Include(p => p.SubjectPapers)
                        .ThenInclude(sp => sp.Subject)
                    .Include(p => p.Sections)
                    .OrderBy(p => p.PaperNumber)
                    .ToListAsync();

                return Ok(papers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
