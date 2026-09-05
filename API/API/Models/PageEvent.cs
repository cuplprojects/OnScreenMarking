using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("page_events")]
    public class PageEvent
    {
        [Key]
        [Column("id")]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("page_id")]
        [MaxLength(36)]
        public string PageId { get; set; } = string.Empty;
        public ScannedPage? ScannedPage { get; set; }

        [Required]
        [Column("event_type")]
        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty;

        [Column("event_detail")]
        public string? EventDetail { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
