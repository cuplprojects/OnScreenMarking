using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Paper
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PaperId { get; set; }
     
        public string PaperCode { get; set; } // e.g., "MATH-2024-P1", "MATH-2024-P2"
        public string PaperName { get; set; } // e.g., "Paper 1", "Paper 2"
        public int PaperNumber { get; set; } // 1, 2, 3, etc.
        public decimal MaxMarks { get; set; } = 100;
        public int TotalQuestions { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int? UniversityId { get; set; }
        public University? University { get; set; }
        public ICollection<ProjectPaper> ProjectPapers { get; set; } = new List<ProjectPaper>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<SubjectPaper> SubjectPapers { get; set; }
    = new List<SubjectPaper>();
        public ICollection<Section> Sections { get; set; } = new List<Section>();

    }
}
