using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class EventLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string Method { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public string QueryString { get; set; } = string.Empty;

        public string Headers { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;

        public string? UserId { get; set; }

        public string Message { get; set; } = string.Empty;

        public string IpAddress { get; set; } = string.Empty;

        // Legacy column compatibility for MySQL tables
        public string? Event { get; set; } = string.Empty;
        public string? Category { get; set; } = string.Empty;
        public string? OldValue { get; set; } = string.Empty;
        public string? NewValue { get; set; } = string.Empty;
    }
}
