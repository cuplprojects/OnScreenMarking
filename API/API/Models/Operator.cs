using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("operators")]
    public class Operator
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("email")]
        [MaxLength(255)]
        public string? Email { get; set; }

        [Column("workstation_id")]
        [MaxLength(100)]
        public string? WorkstationId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<ScanSession> ScanSessions { get; set; } = new List<ScanSession>();
    }
}
