using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("booklet_configs")]
    public class BookletConfig
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("config_name")]
        [MaxLength(255)]
        public string ConfigName { get; set; } = string.Empty;

        [Column("total_pages")]
        public int TotalPages { get; set; }

        [Column("roi_x_start")]
        public float RoiXStart { get; set; } = 0.0f;

        [Column("roi_x_end")]
        public float RoiXEnd { get; set; } = 1.0f;

        [Column("roi_y_start")]
        public float RoiYStart { get; set; } = 0.0f;

        [Column("roi_y_end")]
        public float RoiYEnd { get; set; } = 1.0f;

        [Column("integration_path")]
        [MaxLength(50)]
        public string IntegrationPath { get; set; } = "PATH_B";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<ScanSession> ScanSessions { get; set; } = new List<ScanSession>();
    }
}
