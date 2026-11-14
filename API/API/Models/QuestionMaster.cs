using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class QuestionMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        /// <summary>
        /// Batch identifier — same as the SectionMaster batch this question belongs to
        /// </summary>
        public int BatchId { get; set; }

        /// <summary>
        /// Section name this question belongs to (e.g. "Section A")
        /// </summary>
        [MaxLength(255)]
        public string? Section { get; set; }

        /// <summary>
        /// Question number / label (e.g. "1", "2", "Q3")
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string Question { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key to QuestionType in questiontypes table
        /// </summary>
        [Required]
        public int QuestionTypeId { get; set; } = 1;

        [ForeignKey(nameof(QuestionTypeId))]
        public QuestionType? QuestionType { get; set; }

        private string? _type;
        /// <summary>
        /// Helper property for question type name (not in DB — resolved from QuestionType navigation)
        /// </summary>
        [NotMapped]
        public string? Type
        {
            get => QuestionType?.QuestionTypeName ?? _type;
            set => _type = value;
        }

        /// <summary>
        /// Maximum marks for this question
        /// </summary>
        [Column(TypeName = "decimal(10,2)")]
        public decimal Marks { get; set; } = 0;

        /// <summary>
        /// Group the question belongs to (only populated if question is grouped, e.g. optional group code)
        /// </summary>
        [MaxLength(255)]
        public string? Group { get; set; }

        /// <summary>
        /// Status of the question (true = Active, false = Inactive)
        /// </summary>
        public bool Status { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
