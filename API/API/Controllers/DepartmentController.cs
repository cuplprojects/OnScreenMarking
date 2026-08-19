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
    public class DepartmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DepartmentController(ApplicationDbContext context)
        {
            _context = context;
        }
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetDepartments(
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
                var query = _context.Departments.AsQueryable();

                if (universityId.HasValue)
                {
                    query = query.Where(d => d.UniversityId == universityId.Value);
                }

                if (isActive.HasValue)
                {
                    query = query.Where(d => d.IsActive == isActive.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(d => d.Name.ToLower().Contains(s));
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("name", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(d => d.Name) : query.OrderBy(d => d.Name);
                    else if (sortField.Equals("isActive", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(d => d.IsActive) : query.OrderBy(d => d.IsActive);
                    else
                        query = query.OrderBy(d => d.Name);
                }
                else
                {
                    query = query.OrderBy(d => d.Name);
                }

                var projection = query.Select(d => new
                {
                    departmentId = d.DepartmentId,
                    name = d.Name,
                    isActive = d.IsActive,
                    universityId = d.UniversityId,
                    createdAt = d.CreatedAt,
                    updatedAt = d.UpdatedAt,
                    courses = d.Courses.Select(c => new { id = c.Id, name = c.Name }).ToList()
                });

                object departments;
                if (pageSize > 0)
                {
                    departments = await projection
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();
                }
                else
                {
                    departments = await projection.ToListAsync();
                }

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = departments,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = totalPages
                });
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

        [HttpGet("{id}")]
        public async Task<ActionResult<Department>> GetDepartment(int id)
        {
            try
            {
                var department = await _context.Departments
                    .Include(d => d.Courses)
                    .Include(d => d.DepartmentSubjects)
                    .ThenInclude (ds => ds.Subject)
                    .FirstOrDefaultAsync(d => d.DepartmentId == id);

                if (department == null)
                    return NotFound(new { success = false, message = "Department not found" });

                return Ok(department);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<Department>> CreateDepartment([FromBody] Department department)
        {
            try
            {
                if (string.IsNullOrEmpty(department.Name))
                    return BadRequest(new { success = false, message = "Department name is required" });

                if (department.UniversityId <= 0)
                    return BadRequest(new { success = false, message = "University ID is required" });

                // Verify university exists
                var university = await _context.Universities.FindAsync(department.UniversityId);
                if (university == null)
                    return BadRequest(new { success = false, message = "University not found" });

                // Coordinators can only create departments for their own university
                var userType = User.FindFirst("userType")?.Value;
                if (userType == "coordinator")
                {
                    var userIdClaim = User.FindFirst("id")?.Value;
                    if (int.TryParse(userIdClaim, out int userId))
                    {
                        var user = await _context.Users.FindAsync(userId);
                        if (user?.UniversityId != department.UniversityId)
                            return Forbid();
                    }
                }

                department.IsActive = true;
                department.CreatedAt = DateTime.UtcNow;
                department.UpdatedAt = DateTime.UtcNow;

                _context.Departments.Add(department);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetDepartment), new { id = department.DepartmentId }, department);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateDepartment(int id, [FromBody] Department department)
        {
            try
            {
                var existingDepartment = await _context.Departments.FindAsync(id);
                if (existingDepartment == null)
                    return NotFound(new { success = false, message = "Department not found" });

                existingDepartment.Name = department.Name;
                existingDepartment.IsActive = department.IsActive;
                existingDepartment.UpdatedAt = DateTime.UtcNow;

                _context.Departments.Update(existingDepartment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Department updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/subjects")]
        public async Task<ActionResult<IEnumerable<Subject>>> GetDepartmentSubjects(int id)
        {
            try
            {
                var subjects = await _context.DepartmentSubjects
                    .Where(ds => ds.DepartmentId == id)
                    .Select(ds => ds.Subject)
                    .Where(s => s.Status)
                    .Include(s => s.SubjectPapers)
                        .ThenInclude(sp => sp.Paper)
                    .OrderBy(s => s.SubName)
                    .ToListAsync();

                return Ok(subjects);
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
