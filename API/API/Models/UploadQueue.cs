using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("upload_queue")]
    public class UploadQueue
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("pdf_id")]
        [MaxLength(36)]
        public string PdfId { get; set; } = string.Empty;
        public GeneratedPdf? GeneratedPdf { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "PENDING";

        [Column("retry_count")]
        public int RetryCount { get; set; } = 0;

        [Column("server_url")]
        [MaxLength(500)]
        public string? ServerUrl { get; set; }

        [Column("last_error")]
        public string? LastError { get; set; }

        [Column("queued_at")]
        public DateTime QueuedAt { get; set; } = DateTime.UtcNow;

        [Column("last_attempted_at")]
        public DateTime? LastAttemptedAt { get; set; }

        [Column("uploaded_at")]
        public DateTime? UploadedAt { get; set; }
    }
}
