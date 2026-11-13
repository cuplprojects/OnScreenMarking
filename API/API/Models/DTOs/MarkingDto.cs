using System.Text.Json;
using API.Models;

namespace API.Models.DTOs
{
    public class MarkingDto
    {
        public int Id { get; set; }
        public int ScriptId { get; set; }
        public int? ProjectId { get; set; }
        public int ExaminerId { get; set; }
        public int AllocationId { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Remarks { get; set; }
        public MarkingStatus Status { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public int? TimePerCopyMinutes { get; set; }
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
        public int? QuestionMasterId { get; set; }
        private int _questionId;
        public int QuestionId
        {
            get => QuestionMasterId.HasValue && QuestionMasterId.Value > 0 ? QuestionMasterId.Value : _questionId;
            set
            {
                _questionId = value;
                if (!QuestionMasterId.HasValue || QuestionMasterId.Value == 0)
                    QuestionMasterId = value;
            }
        }
        public int? ScriptId { get; set; }
        public string QuestionNo { get; set; } = string.Empty;
        public decimal MarksAwarded { get; set; }
        public bool IsSkipped { get; set; }
        public string Remarks { get; set; } = string.Empty;
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
