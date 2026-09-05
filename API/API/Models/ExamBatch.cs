using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("exam_batches")]
    public class ExamBatch
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("exam_code")]
        [MaxLength(100)]
        public string ExamCode { get; set; } = string.Empty;

        [Column("exam_title")]
        [MaxLength(255)]
        public string? ExamTitle { get; set; }

        [Column("exam_date")]
        public DateTime? ExamDate { get; set; }

        [Column("expected_booklet_count")]
        public int? ExpectedBookletCount { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "PENDING";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<ScanSession> ScanSessions { get; set; } = new List<ScanSession>();
    }
}
