using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("template_configuration")]
    public class TemplateConfiguration
    {
        [Key]
        [Column("template_id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TemplateId { get; set; }

        [Column("template_name")]
        [MaxLength(255)]
        public string? TemplateName { get; set; }

        [Column("barcode_dimensions")]
        [MaxLength(100)]
        public string? BarcodeDimensions { get; set; }

        [Column("page_dimension")]
        [MaxLength(100)]
        public string? PageDimension { get; set; }

        [Column("page_no_position")]
        [MaxLength(100)]
        public string? PageNoPosition { get; set; }

        [Column("barcode_availability")]
        [MaxLength(100)]
        public string? BarcodeAvailability { get; set; }

        [Column("total_pages")]
        public int? TotalPages { get; set; }

        [Column("page_range")]
        [MaxLength(100)]
        public string? PageRange { get; set; }

        [Column("has_barcode")]
        public bool HasBarcode { get; set; } = true;

        [Column("has_page_number")]
        public bool HasPageNumber { get; set; } = true;

        [Column("skip_pages")]
        public int SkipPages { get; set; } = 0;

        [Column("status")]
        public bool Status { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
