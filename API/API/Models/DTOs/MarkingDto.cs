using System.Text.Json;

namespace API.Models.DTOs
{
    public class MarkingDto
    {
        public int Id { get; set; }
        public int ScriptId { get; set; }
        public int ExaminerId { get; set; }
        public int AllocationId { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Remarks { get; set; }
        public string Status { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }

    public class SubmitMarkingRequest
    {
        public int AllocationId { get; set; }
        public int ExaminerId { get; set; }
        public decimal TotalMarks { get; set; }
        public string Remarks { get; set; }
        public string? EvaluatedPdfUrl { get; set; }
    }

    public class DraftMarksRequest
    {
        public int ExaminerId { get; set; }
        public JsonElement DraftData { get; set; }
    }

    public class QuestionMarkDto
    {
        public int QuestionId { get; set; }
        public string QuestionNo { get; set; }
        public decimal MarksAwarded { get; set; }
        public bool IsSkipped { get; set; }
        public string Remarks { get; set; }
        public bool IsAttempted { get; set; }
    }

    public class SectionMarkDto
    {
        public string SectionId { get; set; }
        public decimal MarksObtained { get; set; }
        public decimal MaxMarks { get; set; }
        public List<QuestionMarkDto> Questions { get; set; } = new List<QuestionMarkDto>();
    }
}
