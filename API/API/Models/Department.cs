using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Department
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int DepartmentId { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; } = true;
        public int UniversityId { get; set; }
        public University? University { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<DepartmentCourse> DepartmentCourses { get; set; } = new List<DepartmentCourse>();
        public ICollection<DepartmentSubject> DepartmentSubjects { get; set; } = new List<DepartmentSubject>();
    }
}
