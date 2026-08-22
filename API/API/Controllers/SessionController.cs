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
    public class SessionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SessionController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetSessions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string search = "",
            [FromQuery] string? sortField = null,
            [FromQuery] string? sortOrder = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var query = _context.Sessions.AsNoTracking();

                if (isActive.HasValue)
                    query = query.Where(s => s.IsActive == isActive.Value);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(s => s.SessionName.ToLower().Contains(searchLower));
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("sessionName", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.SessionName) : query.OrderBy(s => s.SessionName);
                    else if (sortField.Equals("isActive", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.IsActive) : query.OrderBy(s => s.IsActive);
                    else if (sortField.Equals("createdAt", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.CreatedAt) : query.OrderBy(s => s.CreatedAt);
                    else
                        query = query.OrderByDescending(s => s.SessionId);
                }
                else
                {
                    query = query.OrderByDescending(s => s.SessionId);
                }

                var projection = query.Select(s => new
                {
                    sessionId = s.SessionId,
                    sessionName = s.SessionName,
                    isActive = s.IsActive,
                    createdAt = s.CreatedAt
                });

                object sessions;
                if (pageSize > 0)
                {
                    sessions = await projection
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();
                }
                else
                {
                    sessions = await projection.ToListAsync();
                }

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = sessions,
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
        public async Task<ActionResult<Session>> GetSession(int id)
        {
            try
            {
                var session = await _context.Sessions
                    .Include(s => s.Projects)
                    .FirstOrDefaultAsync(s => s.SessionId == id);

                if (session == null)
                    return NotFound(new { success = false, message = "Session not found" });

                return Ok(session);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<Session>> CreateSession([FromBody] SessionDto sessionDto)
        {
            try
            {
                if (string.IsNullOrEmpty(sessionDto.SessionName))
                    return BadRequest(new { success = false, message = "Session name is required" });

                var session = new Session
                {
                    SessionName = sessionDto.SessionName,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                // Deactivate all other sessions since only one can be active at a time
                var activeSessions = await _context.Sessions.Where(s => s.IsActive).ToListAsync();
                foreach (var activeSession in activeSessions)
                {
                    activeSession.IsActive = false;
                }

                _context.Sessions.Add(session);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetSession), new { id = session.SessionId }, session);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateSession(int id, [FromBody] SessionDto sessionDto)
        {
            try
            {
                var session = await _context.Sessions.FindAsync(id);
                if (session == null)
                    return NotFound(new { success = false, message = "Session not found" });

                session.SessionName = sessionDto.SessionName;
                
                if (sessionDto.IsActive && !session.IsActive)
                {
                    // If setting this session to active, deactivate all others
                    var activeSessions = await _context.Sessions.Where(s => s.IsActive && s.SessionId != id).ToListAsync();
                    foreach (var activeSession in activeSessions)
                    {
                        activeSession.IsActive = false;
                    }
                }
                
                session.IsActive = sessionDto.IsActive;

                _context.Sessions.Update(session);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Session updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/projects")]
        public async Task<ActionResult<IEnumerable<Project>>> GetSessionProjects(int id)
        {
            try
            {
                var projects = await _context.Projects
                    .Where(p => p.SessionId == id && p.IsActive)
                    .Include(p => p.ProjectPapers)
                        .ThenInclude(pp => pp.Paper)
                    .OrderBy(p => p.ProjectName)
                    .ToListAsync();

                return Ok(projects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
