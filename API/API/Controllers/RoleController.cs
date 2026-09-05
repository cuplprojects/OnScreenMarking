using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RoleController(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task<bool> HasPermissionAsync(string permission)
        {
            var userType = User.FindFirst("userType")?.Value;
            if (string.IsNullOrEmpty(userType)) return false;

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName.ToLower() == userType.ToLower());
            if (role == null)
            {
                return userType.Equals("admin", StringComparison.OrdinalIgnoreCase);
            }

            return role.PermissionsList.Contains(permission);
        }

        [HttpGet]
        public async Task<ActionResult> GetAllRoles()
        {
            if (!await HasPermissionAsync("READ_ROLE"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view roles." });
            }

            try
            {
                var roles = await _context.Roles
                    .OrderBy(r => r.HierarchyLevel)
                    .ToListAsync();

                var roleDtos = roles.Select(r => new RoleDto
                {
                    RoleId = r.RoleId,
                    RoleName = r.RoleName,
                    Description = r.Description,
                    HierarchyLevel = r.HierarchyLevel,
                    IsActive = r.IsActive,
                    PermissionsList = r.PermissionsList,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                }).ToList();

                return Ok(new { success = true, data = roleDtos });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{roleId}")]
        public async Task<ActionResult> GetRoleById(int roleId)
        {
            if (!await HasPermissionAsync("READ_ROLE"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view roles." });
            }

            try
            {
                var role = await _context.Roles.FindAsync(roleId);
                if (role == null)
                {
                    return NotFound(new { success = false, message = "Role not found" });
                }

                var roleDto = new RoleDto
                {
                    RoleId = role.RoleId,
                    RoleName = role.RoleName,
                    Description = role.Description,
                    HierarchyLevel = role.HierarchyLevel,
                    IsActive = role.IsActive,
                    PermissionsList = role.PermissionsList,
                    CreatedAt = role.CreatedAt,
                    UpdatedAt = role.UpdatedAt
                };

                return Ok(new { success = true, data = roleDto });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("create")]
        public async Task<ActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            if (!await HasPermissionAsync("CREATE_ROLE"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to create roles." });
            }

            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.RoleName))
                {
                    return BadRequest(new { success = false, message = "Role Name is required" });
                }

                // Check if role name already exists
                var exists = await _context.Roles.AnyAsync(r => r.RoleName.ToLower() == request.RoleName.ToLower().Trim());
                if (exists)
                {
                    return BadRequest(new { success = false, message = $"Role '{request.RoleName}' already exists" });
                }

                var role = new Role
                {
                    RoleName = request.RoleName.Trim(),
                    Description = request.Description?.Trim(),
                    HierarchyLevel = request.HierarchyLevel,
                    IsActive = request.IsActive ?? true,
                    PermissionsList = request.Permissions ?? new List<string>(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Roles.Add(role);
                await _context.SaveChangesAsync();

                var roleDto = new RoleDto
                {
                    RoleId = role.RoleId,
                    RoleName = role.RoleName,
                    Description = role.Description,
                    HierarchyLevel = role.HierarchyLevel,
                    IsActive = role.IsActive,
                    PermissionsList = role.PermissionsList,
                    CreatedAt = role.CreatedAt,
                    UpdatedAt = role.UpdatedAt
                };

                return Ok(new { success = true, message = "Role created successfully", data = roleDto });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{roleId}")]
        public async Task<IActionResult> UpdateRole(int roleId, [FromBody] UpdateRoleRequest request)
        {
            if (!await HasPermissionAsync("UPDATE_ROLE"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to update roles." });
            }

            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.RoleName))
                {
                    return BadRequest(new { success = false, message = "Role Name is required" });
                }

                var role = await _context.Roles.FindAsync(roleId);
                if (role == null)
                {
                    return NotFound(new { success = false, message = "Role not found" });
                }

                // Check if new name conflicts with another role
                var exists = await _context.Roles.AnyAsync(r => r.RoleId != roleId && r.RoleName.ToLower() == request.RoleName.ToLower().Trim());
                if (exists)
                {
                    return BadRequest(new { success = false, message = $"Another role named '{request.RoleName}' already exists" });
                }

                role.RoleName = request.RoleName.Trim();
                role.Description = request.Description?.Trim();
                role.HierarchyLevel = request.HierarchyLevel;
                if (request.IsActive.HasValue)
                {
                    role.IsActive = request.IsActive.Value;
                }
                role.PermissionsList = request.Permissions ?? new List<string>();
                role.UpdatedAt = DateTime.UtcNow;

                _context.Entry(role).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Role updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{roleId}")]
        public async Task<IActionResult> DeleteRole(int roleId)
        {
            if (!await HasPermissionAsync("DELETE_ROLE"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to delete roles." });
            }

            try
            {
                var role = await _context.Roles.FindAsync(roleId);
                if (role == null)
                {
                    return NotFound(new { success = false, message = "Role not found" });
                }

                _context.Roles.Remove(role);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Role deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET: api/role/permissions/all
        [HttpGet("permissions/all")]
        public ActionResult GetAllPermissions()
        {
            try
            {
                var permissions = new List<string>
                {
                    // University Management
                    "CREATE_UNIVERSITY", "READ_UNIVERSITY", "UPDATE_UNIVERSITY", "DELETE_UNIVERSITY",

                    // College Management
                    "CREATE_COLLEGE", "READ_COLLEGE", "UPDATE_COLLEGE", "DELETE_COLLEGE",

                    // Department Management
                    "CREATE_DEPARTMENT", "READ_DEPARTMENT", "UPDATE_DEPARTMENT", "DELETE_DEPARTMENT",

                    // Course Management
                    "CREATE_COURSE", "READ_COURSE", "UPDATE_COURSE", "DELETE_COURSE",

                    // Subject Management
                    "CREATE_SUBJECT", "READ_SUBJECT", "UPDATE_SUBJECT", "DELETE_SUBJECT",

                    // Session Management
                    "CREATE_SESSION", "READ_SESSION", "UPDATE_SESSION", "DELETE_SESSION",

                    // Project Management
                    "CREATE_PROJECT", "READ_PROJECT", "UPDATE_PROJECT", "DELETE_PROJECT",

                    // Paper & Section Management
                    "CREATE_PAPER", "READ_PAPER", "UPDATE_PAPER", "DELETE_PAPER",
                    "IMPORT_PAPERS", "MANAGE_SECTIONS", "MANAGE_QUESTIONS",

                    // Script Management
                    "CREATE_SCRIPT", "READ_SCRIPT", "UPDATE_SCRIPT", "DELETE_SCRIPT",

                    // Allocation Management
                    "CREATE_ALLOCATION", "READ_ALLOCATION", "UPDATE_ALLOCATION", "DELETE_ALLOCATION",

                    // Marking Management
                    "CREATE_MARKING", "READ_MARKING", "UPDATE_MARKING", "DELETE_MARKING",

                    // Attendance Management
                    "CREATE_ATTENDANCE", "READ_ATTENDANCE", "UPDATE_ATTENDANCE", "DELETE_ATTENDANCE",

                    // User Management
                    "CREATE_USER", "READ_USER", "UPDATE_USER", "DELETE_USER", "INVITE_USER",

                    // Role & Permission Management
                    "CREATE_ROLE", "READ_ROLE", "UPDATE_ROLE", "DELETE_ROLE",

                    // Report Management
                    "VIEW_REPORTS", "EXPORT_REPORTS",

                    // System Administration
                    "VIEW_LOGS", "MANAGE_SETTINGS", "VIEW_ANALYTICS"
                };

                return Ok(new { success = true, data = permissions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
