using API.Data;
using API.Models;
using API.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UniversitiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UniversitiesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<University>>> GetUniversities()
        {
            try
            {
                var universities = await _context.Universities
                    .Where(u => u.IsActive)
                    .Include(u => u.Departments)
                    .Include(u => u.Projects)
                    .ToListAsync();

                return Ok(universities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<University>> GetUniversity(int id)
        {
            try
            {
                var university = await _context.Universities
                    .Include(u => u.Departments)
                    .Include(u => u.Projects)
                    .FirstOrDefaultAsync(u => u.UniversityId == id);

                if (university == null)
                    return NotFound(new { success = false, message = "University not found" });

                return Ok(university);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<University>> CreateUniversity([FromBody] University university)
        {
            try
            {
                if (string.IsNullOrEmpty(university.UniversityName))
                    return BadRequest(new { success = false, message = "University name is required" });

                // Only admins can create universities
                var userType = User.FindFirst("userType")?.Value;
                if (userType != "admin")
                    return Forbid();

                _context.Universities.Add(university);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetUniversity), new { id = university.UniversityId }, university);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateUniversity(int id, [FromBody] University university)
        {
            try
            {
                var existingUniversity = await _context.Universities.FindAsync(id);
                if (existingUniversity == null)
                    return NotFound(new { success = false, message = "University not found" });

                existingUniversity.UniversityName = university.UniversityName;
                existingUniversity.IsActive = university.IsActive;

                _context.Universities.Update(existingUniversity);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "University updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/departments")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Department>>> GetUniversityDepartments(int id)
        {
            try
            {
                var departments = await _context.Departments
                    .Where(d => d.UniversityId == id && d.IsActive)
                    .Include(d => d.DepartmentSubjects)
                        .ThenInclude(ds => ds.Subject)
                    .OrderBy(d => d.Name)
                    .ToListAsync();

                return Ok(departments);
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

        [HttpGet("current/my-university")]
        public async Task<ActionResult<University>> GetMyUniversity()
        {
            try
            {
                var userIdClaim = User.FindFirst("id")?.Value;
                if (!int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { success = false, message = "Invalid user" });

                var user = await _context.Users
                    .AsNoTracking()
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null || user.UniversityId == null)
                    return NotFound(new { success = false, message = "User not associated with a university" });

                var university = await _context.Universities
                    .AsNoTracking()
                    .Include(u => u.Departments)
                    .Include(u => u.Projects)
                    .FirstOrDefaultAsync(u => u.UniversityId == user.UniversityId);

                if (university == null)
                    return NotFound(new { success = false, message = "University not found" });

                return Ok(university);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
