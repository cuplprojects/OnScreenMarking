namespace API.Models.DTOs
{
    public class ScriptDto
    {
        public int Id { get; set; }
        public string? InBuiltBarCode { get; set; }
        public string GeneratedBarcode { get; set; }
        public int PaperId { get; set; }
        public string CleanPdfUrl { get; set; }
        public string Status { get; set; }
        public bool? IsReEvaluationRequested { get; set; }
        public string? RollNumber { get; set; }
        public decimal? TotalMarks { get; set; }
        public decimal? Percentage { get; set; }
        public string? Remarks { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public int? AllocationId { get; set; }
        public string? PaperName { get; set; }
        public string? PaperCode { get; set; }
        public string? SubjectName { get; set; }
        public int? SubjectId { get; set; }
    }

    public class AssignScriptRequest
    {
        public int ExaminerId { get; set; }
    }

    public class ScriptStatusUpdateRequest
    {
        public string Status { get; set; }
        public string Remarks { get; set; }
    }
}
