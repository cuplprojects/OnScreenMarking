using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("scanned_pages")]
    public class ScannedPage
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

        [Required]
        [Column("booklet_id")]
        [MaxLength(36)]
        public string BookletId { get; set; } = string.Empty;
        public Booklet? Booklet { get; set; }

        [Required]
        [Column("image_path")]
        public string ImagePath { get; set; } = string.Empty;

        [Column("detected_page_number")]
        public int? DetectedPageNumber { get; set; }

        [Column("manual_page_number")]
        public int? ManualPageNumber { get; set; }

        [Column("ocr_confidence")]
        public int? OcrConfidence { get; set; }

        [Column("detection_source")]
        [MaxLength(50)]
        public string DetectionSource { get; set; } = "AUTO";

        [Column("file_size_bytes")]
        public long? FileSizeBytes { get; set; }

        [Column("scanned_at")]
        public DateTime? ScannedAt { get; set; }

        // Navigation properties
        public ICollection<PageEvent> PageEvents { get; set; } = new List<PageEvent>();
    }
}
