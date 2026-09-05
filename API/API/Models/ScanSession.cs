using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("scan_sessions")]
    public class ScanSession
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("exam_batch_id")]
        [MaxLength(36)]
        public string ExamBatchId { get; set; } = string.Empty;
        public ExamBatch? ExamBatch { get; set; }

        [Required]
        [Column("operator_id")]
        [MaxLength(36)]
        public string OperatorId { get; set; } = string.Empty;
        public Operator? Operator { get; set; }

        [Required]
        [Column("booklet_config_id")]
        [MaxLength(36)]
        public string BookletConfigId { get; set; } = string.Empty;
        public BookletConfig? BookletConfig { get; set; }

        [Column("integration_path")]
        [MaxLength(50)]
        public string IntegrationPath { get; set; } = "PATH_B";

        [Column("candidate_ref")]
        [MaxLength(255)]
        public string? CandidateRef { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "ACTIVE";

        [Column("started_at")]
        public DateTime? StartedAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        // Navigation properties
        public ICollection<Booklet> Booklets { get; set; } = new List<Booklet>();
        public ICollection<ScannedPage> ScannedPages { get; set; } = new List<ScannedPage>();
    }
}
