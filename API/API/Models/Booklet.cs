using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("booklets")]
    public class Booklet
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("session_id")]
        [MaxLength(36)]
        public string SessionId { get; set; } = string.Empty;
        public ScanSession? ScanSession { get; set; }

        [Column("total_pages_expected")]
        public int TotalPagesExpected { get; set; }

        [Column("candidate_ref")]
        [MaxLength(255)]
        public string? CandidateRef { get; set; }

        [Column("total_pages_received")]
        public int TotalPagesReceived { get; set; } = 0;

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "SCANNING";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        // Navigation properties
        public ICollection<ScannedPage> ScannedPages { get; set; } = new List<ScannedPage>();
        public ICollection<GeneratedPdf> GeneratedPdfs { get; set; } = new List<GeneratedPdf>();
    }
}
