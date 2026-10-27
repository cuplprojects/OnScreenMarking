using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System;
using System.Collections.Generic;

namespace API.Models
{
    public class University
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UniversityId { get; set; }
        public string UniversityName { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<AssignmentType> AssignmentTypes { get; set; } = new List<AssignmentType>();
        public ICollection<Department> Departments { get; set; } = new List<Department>();
        public ICollection<Project> Projects { get; set; } = new List<Project>();
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
