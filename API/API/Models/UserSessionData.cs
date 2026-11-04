using System;
using System.Collections.Generic;

namespace API.Models
{
    public class UserSessionData
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        public int? UniversityId { get; set; }
        public int? SubjectId1 { get; set; }
        public int? CollegeId { get; set; }
        public List<string> Permissions { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

