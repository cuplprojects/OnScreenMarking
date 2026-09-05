using System;
using System.Collections.Generic;

namespace API.Models.DTOs
{
    public class RoleDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; }
        public string Description { get; set; }
        public int HierarchyLevel { get; set; }
        public bool IsActive { get; set; }
        public List<string> PermissionsList { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateRoleRequest
    {
        public string RoleName { get; set; }
        public string? Description { get; set; }
        public int HierarchyLevel { get; set; }
        public bool? IsActive { get; set; } = true;
        public List<string>? Permissions { get; set; }
    }

    public class UpdateRoleRequest
    {
        public string RoleName { get; set; }
        public string? Description { get; set; }
        public int HierarchyLevel { get; set; }
        public bool? IsActive { get; set; }
        public List<string>? Permissions { get; set; }
    }
}
