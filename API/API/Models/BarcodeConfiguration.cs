using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("barcode_configuration")]
    public class BarcodeConfiguration
    {
        [Key]
        [Column("BarcodeId")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int BarcodeId { get; set; }

        [Required]
        [Column("Barcode")]
        [MaxLength(255)]
        public string Barcode { get; set; } = string.Empty;

        [Column("prefix")]
        [MaxLength(50)]
        public string? Prefix { get; set; }

        [Column("suffix")]
        [MaxLength(50)]
        public string? Suffix { get; set; }

        [Column("subject_code")]
        [MaxLength(50)]
        public string? SubjectCode { get; set; }

        [Column("Status")]
        public bool Status { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
