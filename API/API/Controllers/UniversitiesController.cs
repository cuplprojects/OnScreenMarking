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
        public async Task<IActionResult> GetUniversities(
            [FromQuery] int page = 0,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? sortField = null,
            [FromQuery] string? sortOrder = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var query = _context.Universities.AsQueryable();

                if (isActive.HasValue)
                {
                    query = query.Where(u => u.IsActive == isActive.Value);
                }
                else
                {
                    // For backward compatibility when not explicitly asking for all
                    // We might still want to return active only if no page parameter is passed,
                    // but for Admin pages, we want all. Let's return all if isActive is not provided.
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var s = search.ToLower();
                    query = query.Where(u => u.UniversityName.ToLower().Contains(s));
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("universityName", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.UniversityName) : query.OrderBy(u => u.UniversityName);
                    else if (sortField.Equals("isActive", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive);
                    else if (sortField.Equals("createdAt", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt);
                    else
                        query = query.OrderBy(u => u.UniversityName);
                }
                else
                {
                    query = query.OrderBy(u => u.UniversityName);
                }

                if (page > 0 && pageSize > 0)
                {
                    query = query.Skip((page - 1) * pageSize).Take(pageSize);
                }

                var universities = await query
                    .Select(u => new
                    {
                        u.UniversityId,
                        u.UniversityName,
                        u.IsActive,
                        u.CreatedAt,
                        u.UpdatedAt,
                        AssignmentTypes = u.AssignmentTypes.Select(at => new
                        {
                            at.Id,
                            at.Type,
                            at.DailyLimit,
                            at.TimePerCopy,
                            at.ReassignmentHours
                        }).ToList(),
                        Departments = u.Departments.Select(d => new { d.DepartmentId }).ToList(),
                        Projects = u.Projects.Select(p => new { p.ProjectId }).ToList()
                    })
                    .ToListAsync();

                if (page == 0) // Meaning old behavior is expected or explicitly asking for all
                {
                    // Some endpoints might expect just active universities if page is 0
                    if (!isActive.HasValue) 
                    {
                        // Let's keep returning active universities by default for unpaginated lists unless specified
                        var activeUnies = universities.Where(u => u.IsActive).ToList();
                        return Ok(activeUnies);
                    }
                    return Ok(universities);
                }

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = universities,
                    totalCount = totalCount,
                    totalPages = totalPages
                });
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
                    .Include(u => u.AssignmentTypes)
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

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchUniversities(
            [FromQuery] string? query = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 10)
        {
            try
            {
                // Start with active universities only
                var baseQuery = _context.Universities
                    .Where(u => u.IsActive)
                    .AsQueryable();

                // Apply fuzzy search if query provided
                if (!string.IsNullOrEmpty(query))
                {
                    var searchLower = query.ToLower();
                    baseQuery = baseQuery.Where(u => u.UniversityName.ToLower().Contains(searchLower));
                }

                var totalCount = await baseQuery.CountAsync();

                // Order by name and apply pagination
                var results = await baseQuery
                    .OrderBy(u => u.UniversityName)
                    .Skip(skip)
                    .Take(take)
                    .Select(u => new
                    {
                        u.UniversityId,
                        u.UniversityName,
                        u.IsActive,
                        u.CreatedAt,
                        u.UpdatedAt,
                        Departments = u.Departments.Select(d => new { d.DepartmentId }).ToList(),
                        Projects = u.Projects.Select(p => new { p.ProjectId }).ToList()
                    })
                    .ToListAsync();

                return Ok(new
                {
                    items = results,
                    totalCount = totalCount,
                    skip = skip,
                    take = take,
                    hasMore = (skip + take) < totalCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // Helper to resolve the active universityId for coordinator or admin
        private async Task<int?> GetTargetUniversityIdAsync(int? queryUniversityId)
        {
            if (queryUniversityId.HasValue && queryUniversityId.Value > 0)
            {
                return queryUniversityId.Value;
            }

            var loggedInUserIdStr = User.FindFirst("id")?.Value;
            if (int.TryParse(loggedInUserIdStr, out int userId))
            {
                var userRecord = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.UniversityId })
                    .FirstOrDefaultAsync();

                if (userRecord?.UniversityId != null && userRecord.UniversityId > 0)
                {
                    return userRecord.UniversityId;
                }
            }

            // Fallback to first active university if only one exists
            var fallbackId = await _context.Universities
                .Where(u => u.IsActive)
                .OrderBy(u => u.UniversityId)
                .Select(u => u.UniversityId)
                .FirstOrDefaultAsync();

            return fallbackId > 0 ? fallbackId : null;
        }

        /// <summary>
        /// GET /api/Universities/assignment-settings
        /// GET /api/Universities/assignment-type
        /// Gets the university and its configured AssignmentType (with DailyLimit and TimePerCopy)
        /// </summary>
        [HttpGet("assignment-settings")]
        [HttpGet("assignment-type")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> GetAssignmentSettings([FromQuery] int? universityId = null)
        {
            try
            {
                int? targetUniversityId = await GetTargetUniversityIdAsync(universityId);

                var query = _context.Universities
                    .Include(u => u.AssignmentTypes)
                    .AsQueryable();

                if (targetUniversityId.HasValue && targetUniversityId.Value > 0)
                {
                    query = query.Where(u => u.UniversityId == targetUniversityId.Value);
                }

                var list = await query
                    .OrderBy(u => u.UniversityName)
                    .Select(u => new
                    {
                        universityId = u.UniversityId,
                        universityName = u.UniversityName,
                        assignmentTypeId = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => (int?)at.Id).FirstOrDefault(),
                        assignmentType = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.Type).FirstOrDefault(),
                        dailyLimit = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.DailyLimit).FirstOrDefault(),
                        timePerCopy = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.TimePerCopy).FirstOrDefault(),
                        reassignmentHours = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.ReassignmentHours).FirstOrDefault(),
                        assignmentTypes = u.AssignmentTypes.Select(at => new
                        {
                            id = at.Id,
                            type = at.Type,
                            dailyLimit = at.DailyLimit,
                            timePerCopy = at.TimePerCopy,
                            reassignmentHours = at.ReassignmentHours,
                            updatedAt = at.UpdatedAt
                        }).ToList(),
                        updatedAt = u.UpdatedAt
                    })
                    .ToListAsync();

                // If targetUniversityId was filtered and returned empty, return all active universities
                if (list.Count == 0)
                {
                    list = await _context.Universities
                        .Include(u => u.AssignmentTypes)
                        .Where(u => u.IsActive)
                        .OrderBy(u => u.UniversityName)
                        .Select(u => new
                        {
                            universityId = u.UniversityId,
                            universityName = u.UniversityName,
                            assignmentTypeId = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => (int?)at.Id).FirstOrDefault(),
                            assignmentType = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.Type).FirstOrDefault(),
                            dailyLimit = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.DailyLimit).FirstOrDefault(),
                            timePerCopy = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.TimePerCopy).FirstOrDefault(),
                            reassignmentHours = u.AssignmentTypes.OrderByDescending(at => at.UpdatedAt).Select(at => at.ReassignmentHours).FirstOrDefault(),
                            assignmentTypes = u.AssignmentTypes.Select(at => new
                            {
                                id = at.Id,
                                type = at.Type,
                                dailyLimit = at.DailyLimit,
                                timePerCopy = at.TimePerCopy,
                                reassignmentHours = at.ReassignmentHours,
                                updatedAt = at.UpdatedAt
                            }).ToList(),
                            updatedAt = u.UpdatedAt
                        })
                        .ToListAsync();
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/Universities/assignment-setting
        /// POST /api/Universities/assignment-type
        /// PUT /api/Universities/assignment-type
        /// Updates AssignmentTypeId in Universities table
        /// </summary>
        [HttpPost("assignment-setting")]
        [HttpPost("assignment-type")]
        [HttpPut("assignment-type")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> SetAssignmentSetting([FromBody] UniversityAssignmentSettingDto dto)
        {
            try
            {
                if (dto == null || dto.AssignmentTypeId <= 0)
                {
                    return BadRequest(new { success = false, message = "Assignment Type is required" });
                }

                int? targetUniversityId = await GetTargetUniversityIdAsync(dto.UniversityId);
                if (!targetUniversityId.HasValue || targetUniversityId.Value <= 0)
                {
                    return BadRequest(new { success = false, message = "University ID is required" });
                }

                var university = await _context.Universities
                    .FirstOrDefaultAsync(u => u.UniversityId == targetUniversityId.Value);

                if (university == null)
                {
                    return NotFound(new { success = false, message = "University not found" });
                }

                var assignType = await _context.AssignmentTypes.FindAsync(dto.AssignmentTypeId);
                if (assignType == null)
                {
                    return BadRequest(new { success = false, message = "Invalid Assignment Type ID" });
                }

                assignType.UniversityId = university.UniversityId;
                assignType.UpdatedAt = DateTime.UtcNow;
                _context.AssignmentTypes.Update(assignType);

                university.UpdatedAt = DateTime.UtcNow;
                _context.Universities.Update(university);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"University assignment type updated to '{assignType.Type}' successfully",
                    data = new
                    {
                        universityId = university.UniversityId,
                        universityName = university.UniversityName,
                        assignmentTypeId = assignType.Id,
                        assignmentType = assignType.Type,
                        dailyLimit = assignType.DailyLimit,
                        timePerCopy = assignType.TimePerCopy,
                        reassignmentHours = assignType.ReassignmentHours
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class UniversityAssignmentSettingDto
    {
        public int? UniversityId { get; set; }
        public int AssignmentTypeId { get; set; }
    }
}
