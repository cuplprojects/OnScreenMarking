using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class AssignmentType
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int? UniversityId { get; set; }
        public University? University { get; set; }

        [Required]
        [MaxLength(100)]
        public string Type { get; set; }

        public int DailyLimit { get; set; } = 50;

        public int TimePerCopy { get; set; } = 15;

        public int ReassignmentHours { get; set; } = 24;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
