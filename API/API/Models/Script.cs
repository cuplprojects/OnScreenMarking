using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Script
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public string? InBuiltBarcode { get; set; }
        public string GeneratedBarcode { get; set; }
        public int ProjectPaperId { get; set; }
        public ProjectPaper ProjectPaper { get; set; }
        public int? ProjectId { get; set; }
        public Project? Project { get; set; }
        public string CleanPdfUrl { get; set; }
        public ScriptStatus Status { get; set; } = ScriptStatus.pending;
        public bool? IsReEvaluationRequested { get; set; }
        public string? RollNumber { get; set; }
        [Column(TypeName = "decimal(10,2)")]
        public decimal? TotalMarks { get; set; } = 0;
        [Column(TypeName = "decimal(10,2)")]
        public decimal? Percentage { get; set; } = 0;
        public string? Remarks { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Allocation> Allocations { get; set; } = new List<Allocation>();
        public ICollection<Marking> Markings { get; set; } = new List<Marking>();
    }
}
