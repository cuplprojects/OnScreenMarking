using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("ProjectPaperSections")]
    public class ProjectPaperSection
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int ProjectPaperId { get; set; }
        [ForeignKey("ProjectPaperId")]
        public ProjectPaper ProjectPaper { get; set; }

        public int? SectionMasterId { get; set; }
        [ForeignKey("SectionMasterId")]
        public SectionMaster? SectionMaster { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public string? Description { get; set; }

        public int TotalQuestions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalMarks { get; set; }

        public int StartQuestion { get; set; } // e.g. 1

        public int EndQuestion { get; set; } // e.g. 10

        public int MaxQuestionsToAttempt { get; set; } // e.g. 8 (out of 10)

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}
