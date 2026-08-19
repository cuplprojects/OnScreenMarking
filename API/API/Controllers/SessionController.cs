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
        public async Task<ActionResult<IEnumerable<Session>>> GetSessions()
        {
            try
            {
                var sessions = await _context.Sessions
                    .AsNoTracking()
                    .Where(s => s.IsActive)
                    .OrderByDescending(s => s.SessionId)
                    .Select(s => new
                    {
                        sessionId = s.SessionId,
                        sessionName = s.SessionName,
                        isActive = s.IsActive,
                        createdAt = s.CreatedAt
                    })
                    .ToListAsync();

                return Ok(sessions);
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
                    .Include(p => p.Papers)
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
