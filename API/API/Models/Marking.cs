using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Marking
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int ScriptId { get; set; }
        public Script Script { get; set; }
        public int ExaminerId { get; set; }
        public User Examiner { get; set; }
        public int AllocationId { get; set; }
        public Allocation Allocation { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Remarks { get; set; }
        public MarkingStatus Status { get; set; } = MarkingStatus.draft;
        public DateTime StartedAt { get; set; }
        public string EvaluatedPdfUrl { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<QuestionMark> QuestionMarks { get; set; } = new List<QuestionMark>();
    }
}
