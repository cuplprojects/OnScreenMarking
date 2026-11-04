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

        private async Task<(int? typeId, string typeName)> ResolveQuestionTypeAsync(int? dtoTypeId, string? dtoTypeName)
        {
            if (dtoTypeId.HasValue && dtoTypeId.Value > 0)
            {
                var qt = await _context.QuestionTypes.FindAsync(dtoTypeId.Value);
                if (qt != null)
                {
                    return (qt.QuestionTypeId, qt.QuestionTypeName);
                }
            }

            if (!string.IsNullOrWhiteSpace(dtoTypeName))
            {
                var trimmed = dtoTypeName.Trim();
                var qt = await _context.QuestionTypes.FirstOrDefaultAsync(t => t.QuestionTypeName.ToLower() == trimmed.ToLower());
                if (qt != null)
                {
                    return (qt.QuestionTypeId, qt.QuestionTypeName);
                }
                return (null, trimmed);
            }

            var defQt = await _context.QuestionTypes.FirstOrDefaultAsync(t => t.QuestionTypeName == "MCQ") 
                     ?? await _context.QuestionTypes.FirstOrDefaultAsync();
            if (defQt != null)
            {
                return (defQt.QuestionTypeId, defQt.QuestionTypeName);
            }

            return (null, "MCQ");
        }

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
                if (!masters.Any())
                {
                    var defaultMasters = new List<SectionMaster>
                    {
                        new SectionMaster
                        {
                            Name = "Section A",
                            Description = "Multiple Choice Questions",
                            StartQuestion = 1,
                            EndQuestion = 10,
                            TotalQuestions = 10,
                            TotalMarks = 20,
                            MaxQuestionsToAttempt = 10,
                            CreatedAt = DateTime.UtcNow
                        },
                        new SectionMaster
                        {
                            Name = "Section B",
                            Description = "Short Answer Questions",
                            StartQuestion = 11,
                            EndQuestion = 15,
                            TotalQuestions = 5,
                            TotalMarks = 30,
                            MaxQuestionsToAttempt = 5,
                            CreatedAt = DateTime.UtcNow
                        },
                        new SectionMaster
                        {
                            Name = "Section C",
                            Description = "Long Answer Questions",
                            StartQuestion = 16,
                            EndQuestion = 20,
                            TotalQuestions = 5,
                            TotalMarks = 50,
                            MaxQuestionsToAttempt = 3,
                            CreatedAt = DateTime.UtcNow
                        }
                    };
                    _context.SectionMasters.AddRange(defaultMasters);
                    await _context.SaveChangesAsync();
                    masters = defaultMasters;
                }
                return Ok(masters);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("Masters/{id}")]
        public async Task<ActionResult<SectionMaster>> GetSectionMaster(int id)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section Master not found" });

                return Ok(master);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("Masters")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<SectionMaster>> CreateSectionMaster([FromBody] SectionMasterDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                int assignedBatchId = dto.BatchId > 0 ? dto.BatchId : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;
                var exists = await _context.SectionMasters.AnyAsync(sm => sm.BatchId == assignedBatchId && sm.Name.ToLower() == dto.Name.Trim().ToLower());
                if (exists)
                    return BadRequest(new { success = false, message = $"A section with name '{dto.Name}' already exists in Batch #{assignedBatchId}" });

                int totalQ = dto.TotalQuestions > 0 ? dto.TotalQuestions : (dto.EndQuestion >= dto.StartQuestion ? dto.EndQuestion - dto.StartQuestion + 1 : 1);
                var master = new SectionMaster
                {
                    BatchId = assignedBatchId,
                    Name = dto.Name.Trim(),
                    Description = dto.Description ?? "",
                    TotalQuestions = totalQ,
                    TotalMarks = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero),
                    StartQuestion = dto.StartQuestion,
                    EndQuestion = dto.EndQuestion,
                    MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : totalQ,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SectionMasters.Add(master);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetSectionMaster), new { id = master.Id }, master);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("Masters/Batch")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult> CreateSectionMastersBatch([FromBody] BatchSectionMasterDto dto)
        {
            try
            {
                if (dto == null || dto.Sections == null || !dto.Sections.Any())
                    return BadRequest(new { success = false, message = "At least one section is required" });

                int assignedBatchId = (dto.BatchId.HasValue && dto.BatchId.Value > 0)
                    ? dto.BatchId.Value
                    : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;

                // Check for duplicates within the submitted list itself
                var duplicateInList = dto.Sections
                    .Where(s => !string.IsNullOrWhiteSpace(s.Name))
                    .GroupBy(m => m.Name.Trim().ToLower())
                    .FirstOrDefault(g => g.Count() > 1);

                if (duplicateInList != null)
                {
                    return BadRequest(new { success = false, message = $"Duplicate section name '{duplicateInList.Key}' found in the submitted batch" });
                }

                var newMasters = new List<SectionMaster>();

                foreach (var s in dto.Sections)
                {
                    if (string.IsNullOrWhiteSpace(s.Name))
                        return BadRequest(new { success = false, message = "All sections must have a valid name" });

                    // Check for duplicate name within this batch in database
                    var existsInDb = await _context.SectionMasters.AnyAsync(sm => 
                        sm.BatchId == assignedBatchId && sm.Name.ToLower() == s.Name.Trim().ToLower());
                    if (existsInDb)
                        return BadRequest(new { success = false, message = $"Section '{s.Name}' already exists in Batch #{assignedBatchId}" });

                    int totalQ = s.TotalQuestions > 0 ? s.TotalQuestions : (s.EndQuestion >= s.StartQuestion ? s.EndQuestion - s.StartQuestion + 1 : 1);

                    newMasters.Add(new SectionMaster
                    {
                        BatchId = assignedBatchId,
                        Name = s.Name.Trim(),
                        Description = s.Description ?? "",
                        TotalQuestions = totalQ,
                        TotalMarks = Math.Round(s.TotalMarks, 2, MidpointRounding.AwayFromZero),
                        StartQuestion = s.StartQuestion,
                        EndQuestion = s.EndQuestion,
                        MaxQuestionsToAttempt = s.MaxQuestionsToAttempt > 0 ? s.MaxQuestionsToAttempt : totalQ,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _context.SectionMasters.AddRange(newMasters);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    message = $"Successfully created {newMasters.Count} section(s) for Batch #{assignedBatchId}",
                    batchId = assignedBatchId,
                    sections = newMasters
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("Masters/{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateSectionMaster(int id, [FromBody] SectionMasterDto dto)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section Master not found" });

                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                int targetBatchId = dto.BatchId > 0 ? dto.BatchId : master.BatchId;
                var duplicate = await _context.SectionMasters.AnyAsync(sm => sm.Id != id && sm.BatchId == targetBatchId && sm.Name.ToLower() == dto.Name.Trim().ToLower());
                if (duplicate)
                    return BadRequest(new { success = false, message = $"Another section master with name '{dto.Name}' already exists in Batch #{targetBatchId}" });

                int totalQ = dto.TotalQuestions > 0 ? dto.TotalQuestions : (dto.EndQuestion >= dto.StartQuestion ? dto.EndQuestion - dto.StartQuestion + 1 : 1);

                if (dto.BatchId > 0) { master.BatchId = dto.BatchId; }
                master.Name = dto.Name.Trim();
                master.Description = dto.Description ?? "";
                master.TotalQuestions = totalQ;
                master.TotalMarks = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero);
                master.StartQuestion = dto.StartQuestion;
                master.EndQuestion = dto.EndQuestion;
                master.MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : totalQ;

                _context.SectionMasters.Update(master);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Section Master updated successfully", master });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("Masters/{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DeleteSectionMaster(int id)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section Master not found" });



                _context.SectionMasters.Remove(master);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Section Master deleted successfully" });
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
                    int nextBatchId = sectionDto.BatchId > 0 ? sectionDto.BatchId : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;
                    master = new SectionMaster
                    {
                        BatchId = nextBatchId,
                        Name = masterName,
                        Description = sectionDto.Description,
                        TotalQuestions = sectionDto.TotalQuestions,
                        TotalMarks = Math.Round(sectionDto.TotalMarks, 2, MidpointRounding.AwayFromZero),
                        StartQuestion = sectionDto.StartQuestion,
                        EndQuestion = sectionDto.EndQuestion,
                        MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(master);
                    await _context.SaveChangesAsync();
                }

                int finalBatchId = sectionDto.BatchId > 0 ? sectionDto.BatchId : master.BatchId;
                if (finalBatchId <= 0) finalBatchId = 1;

                var section = new Section
                {
                    PaperId = sectionDto.PaperId,
                    BatchId = finalBatchId,
                    Name = sectionDto.Name,
                    Description = sectionDto.Description,
                    TotalQuestions = sectionDto.TotalQuestions,
                    TotalMarks = Math.Round(sectionDto.TotalMarks, 2, MidpointRounding.AwayFromZero),
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
                        var (qTypeId, qTypeName) = await ResolveQuestionTypeAsync(questionDto.TypeId, questionDto.Type);

                        var question = new Question
                        {
                            SectionId = section.Id,
                            QuestionNo = questionDto.QuestionNo,
                            Marks = Math.Round(questionDto.Marks, 2, MidpointRounding.AwayFromZero),
                            TypeId = qTypeId,
                            Type = qTypeName,
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
                    decimal marksPerQuestion = sectionDto.TotalQuestions > 0 ? Math.Round((decimal)sectionDto.TotalMarks / sectionDto.TotalQuestions, 2, MidpointRounding.AwayFromZero) : 0;

                    for (int i = sectionDto.StartQuestion; i <= sectionDto.EndQuestion; i++)
                    {
                        var (defTypeId, defTypeName) = await ResolveQuestionTypeAsync(null, "MCQ");
                        var question = new Question
                        {
                            SectionId = section.Id,
                            QuestionNo = i.ToString(),
                            Marks = marksPerQuestion,
                            TypeId = defTypeId,
                            Type = defTypeName,
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
                    int nextBatchId = sectionDto.BatchId > 0 ? sectionDto.BatchId : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;
                    master = new SectionMaster
                    {
                        BatchId = nextBatchId,
                        Name = masterName,
                        Description = sectionDto.Description,
                        TotalQuestions = sectionDto.TotalQuestions,
                        TotalMarks = Math.Round(sectionDto.TotalMarks, 2, MidpointRounding.AwayFromZero),
                        StartQuestion = sectionDto.StartQuestion,
                        EndQuestion = sectionDto.EndQuestion,
                        MaxQuestionsToAttempt = sectionDto.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(master);
                    await _context.SaveChangesAsync();
                }

                section.BatchId = sectionDto.BatchId > 0 ? sectionDto.BatchId : master.BatchId;
                if (section.BatchId <= 0) section.BatchId = 1;
                section.Name = sectionDto.Name;
                section.Description = sectionDto.Description;
                section.TotalQuestions = sectionDto.TotalQuestions;
                section.TotalMarks = Math.Round(sectionDto.TotalMarks, 2, MidpointRounding.AwayFromZero);
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
                            existingQuestion.Marks = Math.Round(questionDto.Marks, 2, MidpointRounding.AwayFromZero);
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
                                Marks = Math.Round(questionDto.Marks, 2, MidpointRounding.AwayFromZero),
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
                        int nextBatchId = request.SectionDetails.BatchId > 0 ? request.SectionDetails.BatchId : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;
                        master = new SectionMaster
                        {
                            BatchId = nextBatchId,
                            Name = masterName,
                            Description = request.SectionDetails.Description,
                            TotalQuestions = request.SectionDetails.TotalQuestions > 0 ? request.SectionDetails.TotalQuestions : calculatedTotalQuestions,
                            TotalMarks = Math.Round(request.SectionDetails.TotalMarks, 2, MidpointRounding.AwayFromZero),
                            StartQuestion = request.SectionDetails.StartQuestion,
                            EndQuestion = request.SectionDetails.EndQuestion,
                            MaxQuestionsToAttempt = request.SectionDetails.MaxQuestionsToAttempt,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.SectionMasters.Add(master);
                        await _context.SaveChangesAsync();
                    }

                    int secBatchId = request.SectionDetails.BatchId > 0 ? request.SectionDetails.BatchId : master.BatchId;
                    if (secBatchId <= 0) secBatchId = 1;

                    var section = new Section
                    {
                        PaperId = paperId,
                        BatchId = secBatchId,
                        Name = request.SectionDetails.Name,
                        Description = request.SectionDetails.Description,
                        TotalQuestions = request.SectionDetails.TotalQuestions > 0 ? request.SectionDetails.TotalQuestions : calculatedTotalQuestions,
                        TotalMarks = Math.Round(request.SectionDetails.TotalMarks, 2, MidpointRounding.AwayFromZero),
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
                                Marks = Math.Round(questionDto.Marks, 2, MidpointRounding.AwayFromZero),
                                Type = questionDto.Type ?? "MCQ",
                                IsOptional = questionDto.IsOptional,
                                OptionalGroupCode = questionDto.OptionalGroupCode,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                    else
                    {
                        decimal marksPerQuestion = section.TotalQuestions > 0 ? Math.Round((decimal)section.TotalMarks / section.TotalQuestions, 2, MidpointRounding.AwayFromZero) : 0;
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
                            int nextBatchId = sourceSection.BatchId > 0 ? sourceSection.BatchId : (await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0) + 1;
                            master = new SectionMaster
                            {
                                BatchId = nextBatchId,
                                Name = masterName,
                                Description = sourceSection.Description,
                                TotalQuestions = sourceSection.TotalQuestions,
                                TotalMarks = Math.Round(sourceSection.TotalMarks, 2, MidpointRounding.AwayFromZero),
                                StartQuestion = sourceSection.StartQuestion,
                                EndQuestion = sourceSection.EndQuestion,
                                MaxQuestionsToAttempt = sourceSection.MaxQuestionsToAttempt,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.SectionMasters.Add(master);
                            await _context.SaveChangesAsync();
                        }

                        int cBatchId = sourceSection.BatchId > 0 ? sourceSection.BatchId : master.BatchId;
                        if (cBatchId <= 0) cBatchId = 1;

                        var newSection = new Section
                        {
                            PaperId = targetPaperId,
                            BatchId = cBatchId,
                            Name = sourceSection.Name,
                            Description = sourceSection.Description,
                            TotalQuestions = sourceSection.TotalQuestions,
                            TotalMarks = Math.Round(sourceSection.TotalMarks, 2, MidpointRounding.AwayFromZero),
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
                            Marks = Math.Round(q.Marks, 2, MidpointRounding.AwayFromZero),
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

                question.Marks = Math.Round(questionDto.Marks, 2, MidpointRounding.AwayFromZero);
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

        [HttpPost("import-masters")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ImportMasterSections([FromBody] ImportMasterSectionsRequest request)
        {
            try
            {
                if (request == null || request.MasterSectionIds == null || !request.MasterSectionIds.Any())
                    return BadRequest(new { success = false, message = "At least one Master Section must be selected" });

                var targetPaperIds = new List<int>();
                if (request.TargetPaperIds != null && request.TargetPaperIds.Any())
                {
                    targetPaperIds.AddRange(request.TargetPaperIds);
                }
                else if (request.PaperId > 0)
                {
                    targetPaperIds.Add(request.PaperId);
                }

                if (!targetPaperIds.Any())
                    return BadRequest(new { success = false, message = "Target Paper ID is required" });

                var masters = await _context.SectionMasters
                    .Where(m => request.MasterSectionIds.Contains(m.Id))
                    .ToListAsync();

                if (!masters.Any())
                    return BadRequest(new { success = false, message = "No matching master sections found" });

                int importedCount = 0;

                foreach (var paperId in targetPaperIds.Distinct())
                {
                    var paper = await _context.Papers.FindAsync(paperId);
                    if (paper == null) continue;

                    if (request.OverwriteExisting)
                    {
                        var existing = await _context.Sections.Where(s => s.PaperId == paperId).ToListAsync();
                        if (existing.Any())
                        {
                            _context.Sections.RemoveRange(existing);
                            await _context.SaveChangesAsync();
                        }
                    }

                    int currentMaxQuestion = 0;
                    var currentSections = await _context.Sections.Where(s => s.PaperId == paperId).ToListAsync();
                    if (currentSections.Any())
                    {
                        currentMaxQuestion = currentSections.Max(s => s.EndQuestion);
                    }

                    foreach (var master in masters.OrderBy(m => m.StartQuestion).ThenBy(m => m.Id))
                    {
                        int startQ = request.OverwriteExisting ? master.StartQuestion : (currentMaxQuestion > 0 ? currentMaxQuestion + 1 : master.StartQuestion);
                        int totalQ = master.TotalQuestions > 0 ? master.TotalQuestions : (master.EndQuestion >= master.StartQuestion ? master.EndQuestion - master.StartQuestion + 1 : 1);
                        int endQ = startQ + totalQ - 1;
                        if (!request.OverwriteExisting)
                        {
                            currentMaxQuestion = endQ;
                        }

                        var newSection = new Section
                        {
                            PaperId = paperId,
                            BatchId = master.BatchId > 0 ? master.BatchId : 1,
                            Name = master.Name,
                            Description = master.Description ?? "",
                            TotalQuestions = totalQ,
                            TotalMarks = Math.Round(master.TotalMarks, 2, MidpointRounding.AwayFromZero),
                            StartQuestion = startQ,
                            EndQuestion = endQ,
                            MaxQuestionsToAttempt = master.MaxQuestionsToAttempt > 0 ? master.MaxQuestionsToAttempt : totalQ,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.Sections.Add(newSection);
                        await _context.SaveChangesAsync();

                        // Create questions
                        decimal marksPerQ = totalQ > 0 ? Math.Round((decimal)master.TotalMarks / totalQ, 2, MidpointRounding.AwayFromZero) : 1;
                        var questions = new List<Question>();
                        for (int qNo = startQ; qNo <= endQ; qNo++)
                        {
                            var (defTypeId, defTypeName) = await ResolveQuestionTypeAsync(null, "MCQ");
                            questions.Add(new Question
                            {
                                SectionId = newSection.Id,
                                QuestionNo = qNo.ToString(),
                                Marks = marksPerQ,
                                TypeId = defTypeId,
                                Type = defTypeName,
                                IsOptional = false,
                                CreatedAt = DateTime.UtcNow
                            });
                        }

                        _context.Questions.AddRange(questions);
                        await _context.SaveChangesAsync();
                        importedCount++;
                    }
                }

                return Ok(new { success = true, message = $"Successfully imported {importedCount} sections" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("paper-masters/{paperId}")]
        [Authorize]
        public async Task<IActionResult> GetPaperMasterSections(int paperId)
        {
            try
            {
                var batchIds = await _context.PaperSectionMasters
                    .Where(psm => psm.PaperId == paperId)
                    .Select(psm => psm.BatchId)
                    .Distinct()
                    .ToListAsync();

                var mappings = await _context.SectionMasters
                    .Where(sm => batchIds.Contains(sm.BatchId))
                    .OrderBy(sm => sm.StartQuestion)
                    .ToListAsync();

                return Ok(mappings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("paper-masters")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> SavePaperMasterSections([FromBody] SavePaperMasterSectionsRequest request)
        {
            try
            {
                if (request == null || request.PaperId <= 0)
                    return BadRequest(new { success = false, message = "Valid Paper ID is required" });

                var paper = await _context.Papers.FindAsync(request.PaperId);
                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                List<SectionMaster> masterSections = new List<SectionMaster>();
                if (request.MasterSectionIds != null && request.MasterSectionIds.Any())
                {
                    masterSections = await _context.SectionMasters
                        .Where(sm => request.MasterSectionIds.Contains(sm.Id))
                        .OrderBy(sm => sm.StartQuestion)
                        .ThenBy(sm => sm.Id)
                        .ToListAsync();

                    int sumQuestions = masterSections.Sum(sm => sm.TotalQuestions);
                    decimal sumMarks = masterSections.Sum(sm => sm.TotalMarks);

                    if (paper.TotalQuestions > 0 && sumQuestions != paper.TotalQuestions)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"Incorrect configuration: Selected master sections have a total of {sumQuestions} questions. Total Questions must be {sumQuestions} only." 
                        });
                    }

                    if (paper.MaxMarks > 0 && sumMarks > paper.MaxMarks)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"Selected sections total marks ({sumMarks}) exceeds paper max marks limit ({paper.MaxMarks})." 
                        });
                    }
                }

                // 1. Update PaperSectionMaster mappings
                var existingPsm = await _context.PaperSectionMasters.Where(psm => psm.PaperId == request.PaperId).ToListAsync();
                _context.PaperSectionMasters.RemoveRange(existingPsm);

                var targetBatchIds = masterSections.Select(sm => sm.BatchId).Distinct().ToList();
                if (request.BatchIds != null && request.BatchIds.Any())
                {
                    targetBatchIds.AddRange(request.BatchIds.Where(b => b > 0));
                    targetBatchIds = targetBatchIds.Distinct().ToList();
                }

                foreach (var bId in targetBatchIds)
                {
                    _context.PaperSectionMasters.Add(new PaperSectionMaster
                    {
                        PaperId = request.PaperId,
                        BatchId = bId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // 2. Synchronize Sections and Questions for the Paper (Sections table)
                var existingSections = await _context.Sections
                    .Include(s => s.Questions)
                    .Where(s => s.PaperId == request.PaperId)
                    .ToListAsync();

                foreach (var s in existingSections)
                {
                    _context.Questions.RemoveRange(s.Questions);
                }
                _context.Sections.RemoveRange(existingSections);
                await _context.SaveChangesAsync();

                if (masterSections.Any())
                {
                    int currentMaxQ = 0;
                    var otherSections = await _context.Sections.Where(s => s.PaperId == request.PaperId).ToListAsync();
                    if (otherSections.Any())
                    {
                        currentMaxQ = otherSections.Max(s => s.EndQuestion);
                    }

                    foreach (var master in masterSections)
                    {
                        int totalQ = master.TotalQuestions > 0 ? master.TotalQuestions : (master.EndQuestion >= master.StartQuestion ? master.EndQuestion - master.StartQuestion + 1 : 1);
                        int startQ = master.StartQuestion > 0 ? master.StartQuestion : (currentMaxQ > 0 ? currentMaxQ + 1 : 1);
                        int endQ = master.EndQuestion >= startQ ? master.EndQuestion : startQ + totalQ - 1;
                        currentMaxQ = endQ;

                        var newSection = new Section
                        {
                            PaperId = request.PaperId,
                            BatchId = master.BatchId > 0 ? master.BatchId : 1,
                            Name = master.Name,
                            Description = master.Description ?? "",
                            TotalQuestions = totalQ,
                            TotalMarks = Math.Round(master.TotalMarks, 2, MidpointRounding.AwayFromZero),
                            StartQuestion = startQ,
                            EndQuestion = endQ,
                            MaxQuestionsToAttempt = master.MaxQuestionsToAttempt > 0 ? master.MaxQuestionsToAttempt : totalQ,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Sections.Add(newSection);
                        await _context.SaveChangesAsync();

                        decimal marksPerQ = totalQ > 0 ? Math.Round(master.TotalMarks / totalQ, 2) : 1;
                        var questions = new List<Question>();
                        for (int qNo = startQ; qNo <= endQ; qNo++)
                        {
                            var (defTypeId, defTypeName) = await ResolveQuestionTypeAsync(null, "MCQ");
                            questions.Add(new Question
                            {
                                SectionId = newSection.Id,
                                QuestionNo = qNo.ToString(),
                                Marks = marksPerQ,
                                TypeId = defTypeId,
                                Type = defTypeName,
                                IsOptional = false,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                        _context.Questions.AddRange(questions);
                        await _context.SaveChangesAsync();
                    }
                }

                // 3. Synchronize ProjectPaperSections and Questions for any ProjectPapers linked to this Paper
                var projectPapers = await _context.ProjectPapers
                    .Where(pp => pp.PaperId == request.PaperId)
                    .ToListAsync();

                foreach (var pp in projectPapers)
                {
                    var existingPps = await _context.ProjectPaperSections
                        .Include(pps => pps.Questions)
                        .Where(pps => pps.ProjectPaperId == pp.Id)
                        .ToListAsync();

                    foreach (var pps in existingPps)
                    {
                        _context.Questions.RemoveRange(pps.Questions);
                    }
                    _context.ProjectPaperSections.RemoveRange(existingPps);
                    await _context.SaveChangesAsync();

                    if (masterSections.Any())
                    {
                        foreach (var master in masterSections)
                        {
                            int totalQ = master.TotalQuestions > 0 ? master.TotalQuestions : (master.EndQuestion >= master.StartQuestion ? master.EndQuestion - master.StartQuestion + 1 : 1);
                            int startQ = master.StartQuestion > 0 ? master.StartQuestion : 1;
                            int endQ = master.EndQuestion >= startQ ? master.EndQuestion : startQ + totalQ - 1;

                            var newPps = new ProjectPaperSection
                            {
                                ProjectPaperId = pp.Id,
                                BatchId = master.BatchId > 0 ? master.BatchId : 1,
                                Name = master.Name,
                                Description = master.Description ?? "",
                                StartQuestion = startQ,
                                EndQuestion = endQ,
                                TotalQuestions = totalQ,
                                TotalMarks = Math.Round(master.TotalMarks, 2, MidpointRounding.AwayFromZero),
                                MaxQuestionsToAttempt = master.MaxQuestionsToAttempt > 0 ? master.MaxQuestionsToAttempt : totalQ,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.ProjectPaperSections.Add(newPps);
                            await _context.SaveChangesAsync();

                            decimal marksPerQ = totalQ > 0 ? Math.Round(master.TotalMarks / totalQ, 2) : 1;
                            var ppsQuestions = new List<Question>();
                            for (int i = startQ; i <= endQ; i++)
                            {
                                ppsQuestions.Add(new Question
                                {
                                    ProjectPaperSectionId = newPps.Id,
                                    QuestionNo = i.ToString(),
                                    Marks = marksPerQ,
                                    Type = "MCQ",
                                    IsOptional = false,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                            _context.Questions.AddRange(ppsQuestions);
                            await _context.SaveChangesAsync();
                        }
                        pp.IsSectionConfigured = true;
                    }
                    else
                    {
                        pp.IsSectionConfigured = false;
                    }
                    pp.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Paper master section mapping and questions updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class SavePaperMasterSectionsRequest
    {
        public int PaperId { get; set; }
        public List<int> MasterSectionIds { get; set; } = new List<int>();
        public List<int> BatchIds { get; set; } = new List<int>();
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

    public class ImportMasterSectionsRequest
    {
        public int PaperId { get; set; }
        public List<int>? TargetPaperIds { get; set; }
        public List<int> MasterSectionIds { get; set; } = new List<int>();
        public bool OverwriteExisting { get; set; } = false;
    }

    public class BatchSectionMasterDto
    {
        public int? BatchId { get; set; }
        public List<SectionMasterDto> Sections { get; set; } = new List<SectionMasterDto>();
    }

    public class SectionMasterDto
    {
        public int BatchId { get; set; } = 0;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int TotalQuestions { get; set; }
        public decimal TotalMarks { get; set; }
        public int StartQuestion { get; set; }
        public int EndQuestion { get; set; }
        public int MaxQuestionsToAttempt { get; set; }
    }
}
