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
        public async Task<IActionResult> GetAll()
        {
            try
            {
                // Auto-seed default assignment types if none exist
                if (!await _context.AssignmentTypes.AnyAsync())
                {
                    _context.AssignmentTypes.AddRange(
                        new AssignmentType { Type = "Single Evaluation", DailyLimit = 50, TimePerCopy = 15, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new AssignmentType { Type = "Double Evaluation", DailyLimit = 40, TimePerCopy = 20, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                    );
                    await _context.SaveChangesAsync();
                }

                var types = await _context.AssignmentTypes
                    .OrderBy(t => t.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Type,
                        t.DailyLimit,
                        t.TimePerCopy,
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

                // Check if type already exists (case-insensitive)
                var existing = await _context.AssignmentTypes
                    .FirstOrDefaultAsync(t => t.Type.ToLower() == trimmedType.ToLower());

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
                    Type = trimmedType,
                    DailyLimit = dto.DailyLimit > 0 ? dto.DailyLimit : 50,
                    TimePerCopy = dto.TimePerCopy > 0 ? dto.TimePerCopy : 15,
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

                // Check if in use by any Universities
                bool inUse = await _context.Universities.AnyAsync(u => u.AssignmentTypeId == id);
                if (inUse)
                {
                    return BadRequest(new { success = false, message = "Cannot delete assignment type because it is in use by universities." });
                }

                _context.AssignmentTypes.Remove(type);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Assignment type deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class AssignmentTypeDto
    {
        public string Type { get; set; }
        public int DailyLimit { get; set; } = 50;
        public int TimePerCopy { get; set; } = 15;
    }
}
