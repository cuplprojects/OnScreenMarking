using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Section
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int PaperId { get; set; }
        public Paper Paper { get; set; }
        
        public int? SectionMasterId { get; set; }
        public SectionMaster SectionMaster { get; set; }

        public string Name { get; set; }
        public string Description { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalMarks { get; set; }
        public int StartQuestion { get; set; } // e.g., 1
        public int EndQuestion { get; set; } // e.g., 10
        public int MaxQuestionsToAttempt { get; set; } // e.g., 8 (out of 10)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }

    public class Question
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int QuestionId { get; set; }
        public int SectionId { get; set; }
        public Section Section { get; set; }
        public string QuestionNo { get; set; }
        public decimal Marks { get; set; }
        public string Type { get; set; } // MCQ, SA, LA, CS, NP, EXP, RC, WS, LIT, GV
        public bool IsOptional { get; set; }
        public string? OptionalGroupCode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<QuestionMark> QuestionMarks { get; set; } = new List<QuestionMark>();
    }

    public class QuestionMark
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int MarkingId { get; set; }
        public Marking Marking { get; set; }
        public int QuestionId { get; set; }
        public Question Question { get; set; }
        public decimal MarksAwarded { get; set; }
        public bool IsSkipped { get; set; }
        public string Remarks { get; set; }
        public bool IsAttempted { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
