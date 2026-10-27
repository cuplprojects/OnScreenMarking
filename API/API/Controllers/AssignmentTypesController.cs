using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/assignment-types")]
    [Authorize]
    public class AssignmentTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AssignmentTypesController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET /api/AssignmentTypes
        /// Lists all assignment types with DailyLimit and TimePerCopy
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] int? universityId = null)
        {
            try
            {
                // Auto-seed default assignment types if none exist
                if (!await _context.AssignmentTypes.AnyAsync())
                {
                    _context.AssignmentTypes.AddRange(
                        new AssignmentType { Type = "Single Evaluation", DailyLimit = 50, TimePerCopy = 15, ReassignmentHours = 24, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new AssignmentType { Type = "Double Evaluation", DailyLimit = 40, TimePerCopy = 20, ReassignmentHours = 24, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                    );
                    await _context.SaveChangesAsync();
                }

                var query = _context.AssignmentTypes.AsQueryable();
                if (universityId.HasValue && universityId.Value > 0)
                {
                    query = query.Where(t => t.UniversityId == null || t.UniversityId == universityId.Value);
                }

                var types = await query
                    .OrderBy(t => t.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.UniversityId,
                        t.Type,
                        t.DailyLimit,
                        t.TimePerCopy,
                        t.ReassignmentHours,
                        t.CreatedAt,
                        t.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(types);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/AssignmentTypes
        /// Creates a new assignment type
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> Create([FromBody] AssignmentTypeDto dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.Type))
                {
                    return BadRequest(new { success = false, message = "Type name is required" });
                }

                string trimmedType = dto.Type.Trim();

                // Check if type already exists for this university or globally (case-insensitive)
                var existing = await _context.AssignmentTypes
                    .FirstOrDefaultAsync(t => t.Type.ToLower() == trimmedType.ToLower() && t.UniversityId == dto.UniversityId);

                if (existing != null)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Assignment type already exists",
                        data = existing
                    });
                }

                var newType = new AssignmentType
                {
                    UniversityId = dto.UniversityId,
                    Type = trimmedType,
                    DailyLimit = dto.DailyLimit > 0 ? dto.DailyLimit : 50,
                    TimePerCopy = dto.TimePerCopy > 0 ? dto.TimePerCopy : 15,
                    ReassignmentHours = dto.ReassignmentHours > 0 ? dto.ReassignmentHours : 24,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AssignmentTypes.Add(newType);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Assignment type created successfully",
                    data = newType
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// PUT /api/AssignmentTypes/{id}
        /// Updates an assignment type
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> Update(int id, [FromBody] AssignmentTypeDto dto)
        {
            try
            {
                var type = await _context.AssignmentTypes.FindAsync(id);
                if (type == null)
                    return NotFound(new { success = false, message = "Assignment type not found" });

                if (dto.UniversityId.HasValue)
                {
                    type.UniversityId = dto.UniversityId.Value > 0 ? dto.UniversityId.Value : null;
                }

                if (!string.IsNullOrWhiteSpace(dto.Type))
                {
                    type.Type = dto.Type.Trim();
                }

                if (dto.DailyLimit > 0)
                {
                    type.DailyLimit = dto.DailyLimit;
                }

                if (dto.TimePerCopy > 0)
                {
                    type.TimePerCopy = dto.TimePerCopy;
                }

                if (dto.ReassignmentHours > 0)
                {
                    type.ReassignmentHours = dto.ReassignmentHours;
                }

                type.UpdatedAt = DateTime.UtcNow;

                _context.AssignmentTypes.Update(type);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Assignment type updated successfully", data = type });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// DELETE /api/AssignmentTypes/{id}
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var type = await _context.AssignmentTypes.FindAsync(id);
                if (type == null)
                    return NotFound(new { success = false, message = "Assignment type not found" });

                _context.AssignmentTypes.Remove(type);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Assignment type deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

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

            // Fallback to first active university
            var fallbackId = await _context.Universities
                .Where(u => u.IsActive)
                .OrderBy(u => u.UniversityId)
                .Select(u => u.UniversityId)
                .FirstOrDefaultAsync();

            return fallbackId > 0 ? fallbackId : null;
        }

        /// <summary>
        /// GET /api/AssignmentTypes/configuration
        /// GET /api/AssignmentTypes/settings
        /// GET /api/settings/assignment-configuration
        /// Gets current assignment configuration (Hardcoded to Daily Allocation or Equal Distribution)
        /// </summary>
        [HttpGet("configuration")]
        [HttpGet("settings")]
        [HttpGet("/api/settings/assignment-configuration")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> GetAssignmentConfiguration([FromQuery] int? universityId = null)
        {
            try
            {
                int? targetUniId = await GetTargetUniversityIdAsync(universityId);

                string universityName = null;
                if (targetUniId.HasValue)
                {
                    universityName = await _context.Universities
                        .Where(u => u.UniversityId == targetUniId.Value)
                        .Select(u => u.UniversityName)
                        .FirstOrDefaultAsync();
                }

                AssignmentType config = null;
                if (targetUniId.HasValue)
                {
                    config = await _context.AssignmentTypes
                        .Where(t => t.UniversityId == targetUniId.Value)
                        .OrderByDescending(t => t.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                if (config == null)
                {
                    config = await _context.AssignmentTypes
                        .Where(t => t.UniversityId == null)
                        .OrderBy(t => t.Id)
                        .FirstOrDefaultAsync();
                }

                // Strictly enforce the 2 options: "Daily Allocation" or "Equal Distribution"
                string activeType = config?.Type;
                if (string.IsNullOrWhiteSpace(activeType) ||
                    (!activeType.Equals("Daily Allocation", StringComparison.OrdinalIgnoreCase) &&
                     !activeType.Equals("Equal Distribution", StringComparison.OrdinalIgnoreCase)))
                {
                    activeType = "Daily Allocation";
                }
                else if (activeType.Equals("Daily Allocation", StringComparison.OrdinalIgnoreCase))
                {
                    activeType = "Daily Allocation";
                }
                else
                {
                    activeType = "Equal Distribution";
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = config?.Id ?? 0,
                        universityId = targetUniId,
                        universityName = universityName ?? "All Universities",
                        type = activeType,
                        dailyLimit = config?.DailyLimit > 0 ? config.DailyLimit : 50,
                        timePerCopy = config?.TimePerCopy > 0 ? config.TimePerCopy : 15,
                        reassignmentHours = config?.ReassignmentHours > 0 ? config.ReassignmentHours : 24,
                        updatedAt = config?.UpdatedAt ?? DateTime.UtcNow
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/AssignmentTypes/configuration
        /// POST /api/AssignmentTypes/settings
        /// POST /api/settings/assignment-configuration
        /// Saves or updates the assignment configuration (strictly Daily Allocation or Equal Distribution)
        /// </summary>
        [HttpPost("configuration")]
        [HttpPost("settings")]
        [HttpPost("/api/settings/assignment-configuration")]
        [Authorize(Roles = "admin,Admin,coordinator,Coordinator")]
        public async Task<IActionResult> SaveAssignmentConfiguration([FromBody] AssignmentConfigurationDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new { success = false, message = "Invalid configuration data" });
                }

                // Strictly enforce 2 hardcoded options: "Daily Allocation" or "Equal Distribution"
                string normalizedType;
                if (!string.IsNullOrWhiteSpace(dto.Type) &&
                    dto.Type.Trim().Equals("Equal Distribution", StringComparison.OrdinalIgnoreCase))
                {
                    normalizedType = "Equal Distribution";
                }
                else
                {
                    normalizedType = "Daily Allocation";
                }

                int? targetUniId = await GetTargetUniversityIdAsync(dto.UniversityId);

                AssignmentType config = null;
                if (targetUniId.HasValue)
                {
                    config = await _context.AssignmentTypes
                        .Where(t => t.UniversityId == targetUniId.Value)
                        .OrderByDescending(t => t.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                if (config != null)
                {
                    config.Type = normalizedType;
                    config.DailyLimit = dto.DailyLimit > 0 ? dto.DailyLimit : 50;
                    config.TimePerCopy = dto.TimePerCopy > 0 ? dto.TimePerCopy : 15;
                    config.ReassignmentHours = dto.ReassignmentHours > 0 ? dto.ReassignmentHours : 24;
                    config.UpdatedAt = DateTime.UtcNow;
                    _context.AssignmentTypes.Update(config);
                }
                else
                {
                    config = new AssignmentType
                    {
                        UniversityId = targetUniId,
                        Type = normalizedType,
                        DailyLimit = dto.DailyLimit > 0 ? dto.DailyLimit : 50,
                        TimePerCopy = dto.TimePerCopy > 0 ? dto.TimePerCopy : 15,
                        ReassignmentHours = dto.ReassignmentHours > 0 ? dto.ReassignmentHours : 24,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.AssignmentTypes.Add(config);
                }

                await _context.SaveChangesAsync();

                string universityName = null;
                if (targetUniId.HasValue)
                {
                    universityName = await _context.Universities
                        .Where(u => u.UniversityId == targetUniId.Value)
                        .Select(u => u.UniversityName)
                        .FirstOrDefaultAsync();
                }

                return Ok(new
                {
                    success = true,
                    message = $"Assignment configuration updated to '{normalizedType}' successfully",
                    data = new
                    {
                        id = config.Id,
                        universityId = targetUniId,
                        universityName = universityName ?? "All Universities",
                        type = config.Type,
                        dailyLimit = config.DailyLimit,
                        timePerCopy = config.TimePerCopy,
                        reassignmentHours = config.ReassignmentHours,
                        updatedAt = config.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class AssignmentTypeDto
    {
        public int? UniversityId { get; set; }
        public string Type { get; set; }
        public int DailyLimit { get; set; } = 50;
        public int TimePerCopy { get; set; } = 15;
        public int ReassignmentHours { get; set; } = 24;
    }

    public class AssignmentConfigurationDto
    {
        public int? UniversityId { get; set; }
        public string Type { get; set; } // "Daily Allocation" or "Equal Distribution"
        public int DailyLimit { get; set; } = 50;
        public int TimePerCopy { get; set; } = 15;
        public int ReassignmentHours { get; set; } = 24;
    }
}
