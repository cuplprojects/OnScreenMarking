namespace API.Models.DTOs
{
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; }
        public string SubjectCode { get; set; }
        public int DepartmentId { get; set; }
        public bool IsActive { get; set; }
    }

    public class SessionDto
    {
        public int SessionId { get; set; }
        public string SessionName { get; set; }
        public bool IsActive { get; set; }
    }

    public class ProjectDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; }
        public int SessionId { get; set; }
        public int UniversityId { get; set; }
        public bool IsActive { get; set; }
    }

    public class AllocationDto
    {
        public int Id { get; set; }
        public int ScriptId { get; set; }
        public int ExaminerId { get; set; }
        public DateTime AllocatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public int TimeTakenSeconds { get; set; }
        public string Status { get; set; }
    }

    public class SectionDto
    {
        public int Id { get; set; }
        public int PaperId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int TotalQuestions { get; set; }
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
        public List<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
    }

    public class QuestionDto
    {
        public int QuestionId { get; set; }
        public int SectionId { get; set; }
        public string QuestionNo { get; set; }
        public decimal Marks { get; set; }
        public string Type { get; set; }
        public bool IsOptional { get; set; }
        public string OptionalGroupCode { get; set; }
    }

    public class QuestionMarksDto
    {
        public int Id { get; set; }
        public int MarkingId { get; set; }
        public int QuestionId { get; set; }
        public decimal MarksAwarded { get; set; }
        public bool IsSkipped { get; set; }
        public string Remarks { get; set; }
        public bool IsAttempted { get; set; }
    }
}
