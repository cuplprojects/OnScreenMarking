using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("generated_pdfs")]
    public class GeneratedPdf
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("booklet_id")]
        [MaxLength(36)]
        public string BookletId { get; set; } = string.Empty;
        public Booklet? Booklet { get; set; }

        [Required]
        [Column("pdf_path")]
        public string PdfPath { get; set; } = string.Empty;

        [Column("page_count")]
        public int PageCount { get; set; }

        [Required]
        [Column("sha256_checksum")]
        [MaxLength(64)]
        public string Sha256Checksum { get; set; } = string.Empty;

        [Column("file_size_bytes")]
        public long? FileSizeBytes { get; set; }

        [Column("xmp_metadata")]
        public string? XmpMetadata { get; set; }

        [Column("generated_at")]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<UploadQueue> UploadQueues { get; set; } = new List<UploadQueue>();
    }
}
