using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("project_configuration")]
    public class ProjectConfiguration
    {
        [Key]
        [Column("ProjectConfigId")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ProjectConfigId { get; set; }

        [Column("ProjectId")]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Column("SubjectId")]
        public int? SubjectId { get; set; }
        public Subject? Subject { get; set; }

        [Column("TemplateId")]
        public int? TemplateId { get; set; }
        public TemplateConfiguration? TemplateConfiguration { get; set; }

        [Column("BarcodeId")]
        public int? BarcodeId { get; set; }
        public BarcodeConfiguration? BarcodeConfiguration { get; set; }

        [Column("PaperId")]
        public int? PaperId { get; set; }
        public Paper? Paper { get; set; }

        [Column("PaperCode")]
        [MaxLength(255)]
        public string? PaperCode { get; set; }

        [Column("input_folder")]
        [MaxLength(500)]
        public string? InputFolder { get; set; }

        [Column("output_folder")]
        [MaxLength(500)]
        public string? OutputFolder { get; set; }

        [Column("enable_ocr_validation")]
        public bool EnableOcrValidation { get; set; } = false;

        [Column("enable_manual_correction")]
        public bool EnableManualCorrection { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
