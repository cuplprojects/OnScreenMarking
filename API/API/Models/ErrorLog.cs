using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class ErrorLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string Method { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public string QueryString { get; set; } = string.Empty;

        public int StatusCode { get; set; }

        public string Message { get; set; } = string.Empty;

        public string StackTrace { get; set; } = string.Empty;

        public string? InnerException { get; set; }

    }
}
