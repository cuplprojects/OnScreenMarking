using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class PaperSectionMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int PaperId { get; set; }
        public Paper Paper { get; set; }

        public int SectionMasterId { get; set; }
        public SectionMaster SectionMaster { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
