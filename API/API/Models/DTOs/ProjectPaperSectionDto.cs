using System;
using System.Collections.Generic;

namespace API.Models.DTOs
{
    public class ProjectPaperSectionDto
    {
        public int Id { get; set; }
        public int ProjectPaperId { get; set; }
        public int? SectionMasterId { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int TotalQuestions { get; set; }
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
    }

    public class CreateProjectPaperSectionDto
    {
        public int ProjectPaperId { get; set; }
        public int? ProjectId { get; set; }
        public int? PaperId { get; set; }
        public int? SectionMasterId { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int TotalQuestions { get; set; }
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
        public List<QuestionDto>? Questions { get; set; }
    }

    public class UpdateProjectPaperSectionDto
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public int TotalQuestions { get; set; }
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
        public List<QuestionDto>? Questions { get; set; }
    }

    public class ImportMasterToProjectPaperSectionsRequest
    {
        public int ProjectPaperId { get; set; }
        public int? ProjectId { get; set; }
        public int? PaperId { get; set; }
        public bool OverwriteExisting { get; set; } = false;
    }

    public class ImportMastersToProjectPaperRequest
    {
        public int? ProjectPaperId { get; set; }
        public int? ProjectId { get; set; }
        public int? PaperId { get; set; }
        public List<int> MasterSectionIds { get; set; } = new List<int>();
        public bool OverwriteExisting { get; set; } = false;
    }
}
