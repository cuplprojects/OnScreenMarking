using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SectionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SectionController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("Masters")]
        public async Task<ActionResult<IEnumerable<SectionMaster>>> GetSectionMasters()
        {
            try
            {
                var masters = await _context.SectionMasters.OrderBy(m => m.Name).ToListAsync();
                return Ok(masters);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Section>>> GetSections([FromQuery] int? paperId = null)
        {
            try
            {
                var query = _context.Sections.AsQueryable();

                if (paperId.HasValue)
                    query = query.Where(s => s.PaperId == paperId.Value);

                var sections = await query
                    .Include(s => s.Paper)
                    .Include(s => s.Questions)
                    .OrderBy(s => s.Id)
                    .ToListAsync();

                return Ok(sections);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Section>> GetSection(int id)
        {
            try
            {
                var section = await _context.Sections
                    .Include(s => s.Paper)
                    .Include(s => s.Questions)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (section == null)
                    return NotFound(new { success = false, message = "Section not found" });

                return Ok(section);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<Section>> CreateSection([FromBody] SectionDto sectionDto)
        {
            try
            {
                if (string.IsNullOrEmpty(sectionDto.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                if (sectionDto.PaperId <= 0)
                    return BadRequest(new { success = false, message = "Paper ID is required" });

                // Verify paper exists
                var paper = await _context.Papers.FindAsync(sectionDto.PaperId);
                if (paper == null)
                    return BadRequest(new { success = false, message = "Paper not found" });

                // Validate start and end question
                // Calculate total questions from range or list
                int calculatedTotalQuestions = sectionDto.Questions != null && sectionDto.Questions.Count > 0
                    ? sectionDto.Questions.Count
                    : (sectionDto.EndQuestion >= sectionDto.StartQuestion ? sectionDto.EndQuestion - sectionDto.StartQuestion + 1 : 0);
                
                if (sectionDto.TotalQuestions <= 0)
                {
                    sectionDto.TotalQuestions = calculatedTotalQuestions;
                }

                // Handle SectionMaster
                var masterName = sectionDto.Name.Trim();
                var master = await _context.SectionMasters.FirstOrDefaultAsync(sm => sm.Name == masterName);
                if (master == null)
                {
                    master = new SectionMaster
                    {
                        Name = masterName,
                        Description = sectionDto.Description,
                        TotalQuestions = sectionDto.TotalQuestions,
                        TotalMarks = sectionDto.TotalMarks,
                        StartQuestion = sectionDto.StartQuestion,
                        EndQuestion = sectionDto.EndQuestion,
                        MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(master);
                    await _context.SaveChangesAsync();
                }

                var section = new Section
                {
                    PaperId = sectionDto.PaperId,
                    SectionMasterId = master.Id,
                    Name = sectionDto.Name,
                    Description = sectionDto.Description,
                    TotalQuestions = sectionDto.TotalQuestions,
                    TotalMarks = sectionDto.TotalMarks,
                    StartQuestion = sectionDto.StartQuestion,
                    EndQuestion = sectionDto.EndQuestion,
                    MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Sections.Add(section);
                await _context.SaveChangesAsync();

                // Save questions from UI (if provided) or auto-create them
                var questions = new List<Question>();

                if (sectionDto.Questions != null && sectionDto.Questions.Count > 0)
                {
                    // Use questions from UI
                    foreach (var questionDto in sectionDto.Questions)
                    {
                        // Validate question type is provided
                        if (string.IsNullOrEmpty(questionDto.Type))
                            return BadRequest(new { success = false, message = $"Question {questionDto.QuestionNo} must have a type selected" });

                        var question = new Question
                        {
                            SectionId = section.Id,
                            QuestionNo = questionDto.QuestionNo,
                            Marks = questionDto.Marks,
                            Type = questionDto.Type,
                            IsOptional = questionDto.IsOptional,
                            OptionalGroupCode = questionDto.OptionalGroupCode,
                            CreatedAt = DateTime.UtcNow
                        };
                        questions.Add(question);
                    }
                }
                else
                {
                    // Auto-create questions with default values (fallback)
                    decimal marksPerQuestion = (decimal)sectionDto.TotalMarks / sectionDto.TotalQuestions;

                    for (int i = sectionDto.StartQuestion; i <= sectionDto.EndQuestion; i++)
                    {
                        var question = new Question
                        {
                            SectionId = section.Id,
                            QuestionNo = i.ToString(),
                            Marks = marksPerQuestion,
                            Type = "MCQ", // default type
                            IsOptional = false,
                            CreatedAt = DateTime.UtcNow
                        };
                        questions.Add(question);
                    }
                }

                _context.Questions.AddRange(questions);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetSection), new { id = section.Id }, section);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateSection(int id, [FromBody] SectionDto sectionDto)
        {
            try
            {
                var section = await _context.Sections.FindAsync(id);
                if (section == null)
                    return NotFound(new { success = false, message = "Section not found" });

                // Handle SectionMaster updates
                var masterName = sectionDto.Name.Trim();
                var master = await _context.SectionMasters.FirstOrDefaultAsync(sm => sm.Name == masterName);
                if (master == null)
                {
                    master = new SectionMaster
                    {
                        Name = masterName,
                        Description = sectionDto.Description,
                        TotalQuestions = sectionDto.TotalQuestions,
                        TotalMarks = sectionDto.TotalMarks,
                        StartQuestion = sectionDto.StartQuestion,
                        EndQuestion = sectionDto.EndQuestion,
                        MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(master);
                    await _context.SaveChangesAsync();
                }

                section.SectionMasterId = master.Id;
                section.Name = sectionDto.Name;
                section.Description = sectionDto.Description;
                section.TotalQuestions = sectionDto.TotalQuestions;
                section.TotalMarks = sectionDto.TotalMarks;
                section.StartQuestion = sectionDto.StartQuestion;
                section.EndQuestion = sectionDto.EndQuestion;
                section.MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt;

                _context.Sections.Update(section);
                await _context.SaveChangesAsync();

                // Save or update individual questions
                if (sectionDto.Questions != null && sectionDto.Questions.Count > 0)
                {
                    var existingQuestions = await _context.Questions.Where(q => q.SectionId == id).ToListAsync();
                    
                    foreach (var questionDto in sectionDto.Questions)
                    {
                        var existingQuestion = existingQuestions.FirstOrDefault(q => q.QuestionNo == questionDto.QuestionNo);
                        if (existingQuestion != null)
                        {
                            existingQuestion.Marks = questionDto.Marks;
                            existingQuestion.Type = questionDto.Type;
                            existingQuestion.IsOptional = questionDto.IsOptional;
                            existingQuestion.OptionalGroupCode = questionDto.OptionalGroupCode;
                            _context.Questions.Update(existingQuestion);
                        }
                        else
                        {
                            var newQuestion = new Question
                            {
                                SectionId = id,
                                QuestionNo = questionDto.QuestionNo,
                                Marks = questionDto.Marks,
                                Type = questionDto.Type,
                                IsOptional = questionDto.IsOptional,
                                OptionalGroupCode = questionDto.OptionalGroupCode,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.Questions.Add(newQuestion);
                        }
                    }
                    
                    // Remove any questions that are no longer in the range
                    var questionNosToKeep = sectionDto.Questions.Select(q => q.QuestionNo).ToList();
                    var questionsToRemove = existingQuestions.Where(q => !questionNosToKeep.Contains(q.QuestionNo)).ToList();
                    if (questionsToRemove.Count > 0)
                    {
                        _context.Questions.RemoveRange(questionsToRemove);
                    }
                    
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = "Section updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DeleteSection(int id)
        {
            try
            {
                var section = await _context.Sections.FindAsync(id);
                if (section == null)
                    return NotFound(new { success = false, message = "Section not found" });

                _context.Sections.Remove(section);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Section deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("bulk-create")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> BulkCreateSections([FromBody] BulkSectionDto request)
        {
            try
            {
                if (request.PaperIds == null || !request.PaperIds.Any())
                    return BadRequest(new { success = false, message = "At least one Paper ID is required" });

                if (string.IsNullOrEmpty(request.SectionDetails.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                var createdSections = new List<Section>();

                foreach (var paperId in request.PaperIds)
                {
                    // Check if paper exists
                    var paper = await _context.Papers.FindAsync(paperId);
                    if (paper == null) continue;

                    int calculatedTotalQuestions = request.SectionDetails.Questions != null && request.SectionDetails.Questions.Count > 0
                        ? request.SectionDetails.Questions.Count
                        : (request.SectionDetails.EndQuestion >= request.SectionDetails.StartQuestion ? request.SectionDetails.EndQuestion - request.SectionDetails.StartQuestion + 1 : 0);

                    // Handle SectionMaster
                    var masterName = request.SectionDetails.Name.Trim();
                    var master = await _context.SectionMasters.FirstOrDefaultAsync(sm => sm.Name == masterName);
                    if (master == null)
                    {
                        master = new SectionMaster
                        {
                            Name = masterName,
                            Description = request.SectionDetails.Description,
                            TotalQuestions = request.SectionDetails.TotalQuestions > 0 ? request.SectionDetails.TotalQuestions : calculatedTotalQuestions,
                            TotalMarks = request.SectionDetails.TotalMarks,
                            StartQuestion = request.SectionDetails.StartQuestion,
                            EndQuestion = request.SectionDetails.EndQuestion,
                            MaxQuestionsToAttempt = request.SectionDetails.MaxQuestionsToAttempt,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.SectionMasters.Add(master);
                        await _context.SaveChangesAsync();
                    }

                    var section = new Section
                    {
                        PaperId = paperId,
                        SectionMasterId = master.Id,
                        Name = request.SectionDetails.Name,
                        Description = request.SectionDetails.Description,
                        TotalQuestions = request.SectionDetails.TotalQuestions > 0 ? request.SectionDetails.TotalQuestions : calculatedTotalQuestions,
                        TotalMarks = request.SectionDetails.TotalMarks,
                        StartQuestion = request.SectionDetails.StartQuestion,
                        EndQuestion = request.SectionDetails.EndQuestion,
                        MaxQuestionsToAttempt = request.SectionDetails.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Sections.Add(section);
                    await _context.SaveChangesAsync();
                    createdSections.Add(section);

                    var questions = new List<Question>();

                    if (request.SectionDetails.Questions != null && request.SectionDetails.Questions.Count > 0)
                    {
                        foreach (var questionDto in request.SectionDetails.Questions)
                        {
                            questions.Add(new Question
                            {
                                SectionId = section.Id,
                                QuestionNo = questionDto.QuestionNo,
                                Marks = questionDto.Marks,
                                Type = questionDto.Type ?? "MCQ",
                                IsOptional = questionDto.IsOptional,
                                OptionalGroupCode = questionDto.OptionalGroupCode,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                    else
                    {
                        decimal marksPerQuestion = section.TotalQuestions > 0 ? (decimal)section.TotalMarks / section.TotalQuestions : 0;
                        for (int i = section.StartQuestion; i <= section.EndQuestion; i++)
                        {
                            questions.Add(new Question
                            {
                                SectionId = section.Id,
                                QuestionNo = i.ToString(),
                                Marks = marksPerQuestion,
                                Type = "MCQ",
                                IsOptional = false,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    _context.Questions.AddRange(questions);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = $"{createdSections.Count} sections created successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("import")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ImportSections([FromBody] ImportSectionDto request)
        {
            try
            {
                if (request.TargetPaperIds == null || !request.TargetPaperIds.Any())
                    return BadRequest(new { success = false, message = "At least one target Paper ID is required" });

                var sourceSections = await _context.Sections
                    .Include(s => s.Questions)
                    .Where(s => s.PaperId == request.SourcePaperId)
                    .ToListAsync();

                if (!sourceSections.Any())
                    return BadRequest(new { success = false, message = "Source paper has no sections to import" });

                int importedCount = 0;

                foreach (var targetPaperId in request.TargetPaperIds)
                {
                    if (targetPaperId == request.SourcePaperId) continue; // Skip if source = target

                    // OPTIONAL: Overwrite existing sections
                    var existingSections = await _context.Sections.Where(s => s.PaperId == targetPaperId).ToListAsync();
                    if (existingSections.Any())
                    {
                        _context.Sections.RemoveRange(existingSections);
                        await _context.SaveChangesAsync();
                    }

                    foreach (var sourceSection in sourceSections)
                    {
                        // Handle SectionMaster
                        var masterName = sourceSection.Name.Trim();
                        var master = await _context.SectionMasters.FirstOrDefaultAsync(sm => sm.Name == masterName);
                        if (master == null)
                        {
                            master = new SectionMaster
                            {
                                Name = masterName,
                                Description = sourceSection.Description,
                                TotalQuestions = sourceSection.TotalQuestions,
                                TotalMarks = sourceSection.TotalMarks,
                                StartQuestion = sourceSection.StartQuestion,
                                EndQuestion = sourceSection.EndQuestion,
                                MaxQuestionsToAttempt = sourceSection.MaxQuestionsToAttempt,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.SectionMasters.Add(master);
                            await _context.SaveChangesAsync();
                        }

                        var newSection = new Section
                        {
                            PaperId = targetPaperId,
                            SectionMasterId = master.Id,
                            Name = sourceSection.Name,
                            Description = sourceSection.Description,
                            TotalQuestions = sourceSection.TotalQuestions,
                            TotalMarks = sourceSection.TotalMarks,
                            StartQuestion = sourceSection.StartQuestion,
                            EndQuestion = sourceSection.EndQuestion,
                            MaxQuestionsToAttempt = sourceSection.MaxQuestionsToAttempt,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.Sections.Add(newSection);
                        await _context.SaveChangesAsync();

                        var newQuestions = sourceSection.Questions.Select(q => new Question
                        {
                            SectionId = newSection.Id,
                            QuestionNo = q.QuestionNo,
                            Marks = q.Marks,
                            Type = q.Type,
                            IsOptional = q.IsOptional,
                            OptionalGroupCode = q.OptionalGroupCode,
                            CreatedAt = DateTime.UtcNow
                        }).ToList();

                        _context.Questions.AddRange(newQuestions);
                        await _context.SaveChangesAsync();
                    }
                    
                    importedCount++;
                }

                return Ok(new { success = true, message = $"Sections imported to {importedCount} papers successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/questions")]
        public async Task<ActionResult<IEnumerable<Question>>> GetSectionQuestions(int id)
        {
            try
            {
                var questions = await _context.Questions
                    .Where(q => q.SectionId == id)
                    .OrderBy(q => q.QuestionNo)
                    .ToListAsync();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("question/{questionId}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateQuestion(int questionId, [FromBody] QuestionDto questionDto)
        {
            try
            {
                var question = await _context.Questions.FindAsync(questionId);
                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                question.Marks = questionDto.Marks;
                question.Type = questionDto.Type;
                question.IsOptional = questionDto.IsOptional;
                question.OptionalGroupCode = questionDto.OptionalGroupCode;

                _context.Questions.Update(question);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Question updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class BulkSectionDto
    {
        public SectionDto SectionDetails { get; set; }
        public List<int> PaperIds { get; set; }
    }

    public class ImportSectionDto
    {
        public int SourcePaperId { get; set; }
        public List<int> TargetPaperIds { get; set; }
    }
}
