namespace API.Models.DTOs
{
    public class PaperExaminerAssignDto
    {
        public int? ProjectPaperId { get; set; }
        public int? ProjectId { get; set; }
        public int? PaperId { get; set; }
        public int ExaminerId { get; set; }
        public int? OldExaminerId { get; set; }
    }

    public class PaperExaminerUpdateDto
    {
        public int? Id { get; set; }
        public int? ProjectPaperId { get; set; }
        public int? ProjectId { get; set; }
        public int? PaperId { get; set; }
        public int? OldExaminerId { get; set; }
        public int? ExaminerId { get; set; }
        public int? NewExaminerId { get; set; }

        public int ResolvedNewExaminerId => NewExaminerId ?? ExaminerId ?? 0;
    }
}

