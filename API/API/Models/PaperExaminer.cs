using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class PaperExaminer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int ProjectPaperId { get; set; }
        public ProjectPaper ProjectPaper { get; set; }
        public int? ProjectId { get; set; }
        public Project? Project { get; set; }
        public int ExaminerId { get; set; }
        public User Examiner { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public int PaperId => ProjectPaper?.PaperId ?? 0;
    }
}

