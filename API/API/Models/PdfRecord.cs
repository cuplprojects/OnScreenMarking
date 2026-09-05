using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("pdf_records")]
    public class PdfRecord
    {
        [Key]
        [Column("Pdf_Id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PdfId { get; set; }

        [Column("pdf_name")]
        [MaxLength(255)]
        public string? PdfName { get; set; }

        [Column("pdf_location")]
        public string? PdfLocation { get; set; }

        [Column("generated_barcode")]
        [MaxLength(255)]
        public string? GeneratedBarcode { get; set; }

        [Column("inbuilt_barcode")]
        [MaxLength(255)]
        public string? InbuiltBarcode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
