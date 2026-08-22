using System.Collections.Generic;

namespace API.Models.DTOs
{
    public class ProjectExaminerDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int AllocatedCount { get; set; }
        public int ProjectAllocatedCount { get; set; }
        public string Workload { get; set; } = string.Empty;
        public string SubjectExpertise { get; set; } = string.Empty;
    }
}
