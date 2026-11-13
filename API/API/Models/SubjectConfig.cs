using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class SubjectConfig
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int SubjectId { get; set; }
        public Subject Subject { get; set; }
        public int PaperId { get; set; }
        public Paper Paper { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Section
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int PaperId { get; set; }
        public Paper Paper { get; set; }
        public int BatchId { get; set; } = 1;
        public string Name { get; set; }
        public string Description { get; set; }
        public int TotalQuestions { get; set; }
        [Column(TypeName = "decimal(10,2)")]
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }

    public class Question
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int QuestionId { get; set; }
        public int? SectionId { get; set; }
        public Section? Section { get; set; }

        public int? ProjectPaperSectionId { get; set; }
        [ForeignKey("ProjectPaperSectionId")]
        public ProjectPaperSection? ProjectPaperSection { get; set; }
        public string QuestionNo { get; set; }
        [Column(TypeName = "decimal(10,2)")]
        public decimal Marks { get; set; }

        public int? TypeId { get; set; }
        [ForeignKey("TypeId")]
        public QuestionType? QuestionType { get; set; }

        public string Type { get; set; } = "MCQ"; // MCQ, SA, LA, CS, NP, EXP, RC, WS, LIT, GV
        public bool IsOptional { get; set; }
        public string? OptionalGroupCode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        // QuestionMarks navigation removed (table now uses QuestionMasterId)
    }

    public class QuestionMark
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int MarkingId { get; set; }
        [ForeignKey("MarkingId")]
        public Marking? Marking { get; set; }

        public int? ScriptId { get; set; }
        [ForeignKey("ScriptId")]
        public Script? Script { get; set; }

        [Column("QuestionMasterId")]
        public int QuestionMasterId { get; set; }
        [ForeignKey("QuestionMasterId")]
        public QuestionMaster? QuestionMaster { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal MarksAwarded { get; set; }
        public bool IsSkipped { get; set; }
        public string? Remarks { get; set; }
        public bool IsAttempted { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
