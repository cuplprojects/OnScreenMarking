using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;
using API.Services;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProjectPaperSectionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IDailyAllocationService _dailyAllocationService;

        public ProjectPaperSectionController(
            ApplicationDbContext context,
            IDailyAllocationService dailyAllocationService)
        {
            _context = context;
            _dailyAllocationService = dailyAllocationService;
        }

        // GET: api/projectpapersection?projectPaperId=5 OR ?projectId=1&paperId=2
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetProjectPaperSections(
            [FromQuery] int? projectPaperId = null,
            [FromQuery] int? projectId = null,
            [FromQuery] int? paperId = null)
        {
            try
            {
                var query = _context.ProjectPaperSections.AsQueryable();

                if (projectPaperId.HasValue)
                {
                    query = query.Where(pps => pps.ProjectPaperId == projectPaperId.Value);
                }
                else if (projectId.HasValue && paperId.HasValue)
                {
                    query = query.Where(pps => pps.ProjectPaper.ProjectId == projectId.Value && pps.ProjectPaper.PaperId == paperId.Value);
                }
                else if (projectId.HasValue)
                {
                    query = query.Where(pps => pps.ProjectPaper.ProjectId == projectId.Value);
                }
                else if (paperId.HasValue)
                {
                    query = query.Where(pps => pps.ProjectPaper.PaperId == paperId.Value);
                }

                var sections = await query
                    .Include(pps => pps.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .Include(pps => pps.Questions)
                    .OrderBy(pps => pps.Id)
                    .Select(pps => new
                    {
                        pps.Id,
                        pps.ProjectPaperId,
                        pps.SectionMasterId,
                        pps.Name,
                        pps.Description,
                        pps.TotalQuestions,
                        pps.TotalMarks,
                        pps.StartQuestion,
                        pps.EndQuestion,
                        pps.MaxQuestionsToAttempt,
                        pps.CreatedAt,
                        pps.UpdatedAt,
                        ProjectPaper = new
                        {
                            pps.ProjectPaper.Id,
                            pps.ProjectPaper.ProjectId,
                            pps.ProjectPaper.PaperId,
                            PaperName = pps.ProjectPaper.Paper != null ? pps.ProjectPaper.Paper.PaperName : null,
                            PaperCode = pps.ProjectPaper.Paper != null ? pps.ProjectPaper.Paper.PaperCode : null
                        },
                        Questions = pps.Questions.Select(q => new
                        {
                            q.QuestionId,
                            q.QuestionNo,
                            q.Marks,
                            q.Type,
                            q.IsOptional,
                            q.OptionalGroupCode
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(sections);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET: api/projectpapersection/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetProjectPaperSection(int id)
        {
            try
            {
                var section = await _context.ProjectPaperSections
                    .Include(pps => pps.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .Include(pps => pps.Questions)
                    .FirstOrDefaultAsync(pps => pps.Id == id);

                if (section == null)
                    return NotFound(new { success = false, message = "Project paper section not found" });

                return Ok(new
                {
                    section.Id,
                    section.ProjectPaperId,
                    section.SectionMasterId,
                    section.Name,
                    section.Description,
                    section.TotalQuestions,
                    section.TotalMarks,
                    section.StartQuestion,
                    section.EndQuestion,
                    section.MaxQuestionsToAttempt,
                    section.CreatedAt,
                    section.UpdatedAt,
                    ProjectPaper = new
                    {
                        section.ProjectPaper.Id,
                        section.ProjectPaper.ProjectId,
                        section.ProjectPaper.PaperId,
                        PaperName = section.ProjectPaper.Paper?.PaperName,
                        PaperCode = section.ProjectPaper.Paper?.PaperCode
                    },
                    Questions = section.Questions.Select(q => new
                    {
                        q.QuestionId,
                        q.QuestionNo,
                        q.Marks,
                        q.Type,
                        q.IsOptional,
                        q.OptionalGroupCode
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection
        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<object>> CreateProjectPaperSection([FromBody] CreateProjectPaperSectionDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                if (dto.ProjectPaperId <= 0 && dto.ProjectId.HasValue && dto.PaperId.HasValue)
                {
                    var pp = await _context.ProjectPapers
                        .FirstOrDefaultAsync(p => p.ProjectId == dto.ProjectId.Value && p.PaperId == dto.PaperId.Value);
                    if (pp != null)
                    {
                        dto.ProjectPaperId = pp.Id;
                    }
                }

                if (dto.ProjectPaperId <= 0)
                    return BadRequest(new { success = false, message = "ProjectPaperId or ProjectId+PaperId is required" });

                var projectPaper = await _context.ProjectPapers
                    .Include(pp => pp.Paper)
                    .FirstOrDefaultAsync(pp => pp.Id == dto.ProjectPaperId);

                if (projectPaper == null)
                    return BadRequest(new { success = false, message = "Project paper assignment not found" });

                var section = new ProjectPaperSection
                {
                    ProjectPaperId = dto.ProjectPaperId,
                    SectionMasterId = dto.SectionMasterId,
                    Name = dto.Name.Trim(),
                    Description = dto.Description,
                    TotalQuestions = dto.TotalQuestions > 0 ? dto.TotalQuestions : (dto.Questions?.Count ?? (dto.EndQuestion - dto.StartQuestion + 1)),
                    TotalMarks = dto.TotalMarks,
                    StartQuestion = dto.StartQuestion,
                    EndQuestion = dto.EndQuestion,
                    MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : dto.TotalQuestions,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.ProjectPaperSections.Add(section);
                projectPaper.IsSectionConfigured = true;
                projectPaper.UpdatedAt = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);
                await _context.SaveChangesAsync();

                // Add questions if provided
                if (dto.Questions != null && dto.Questions.Count > 0)
                {
                    foreach (var q in dto.Questions)
                    {
                        var question = new Question
                        {
                            ProjectPaperSectionId = section.Id,
                            QuestionNo = q.QuestionNo,
                            Marks = q.Marks,
                            Type = q.Type ?? "MCQ",
                            IsOptional = q.IsOptional,
                            OptionalGroupCode = q.OptionalGroupCode,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Questions.Add(question);
                    }
                    await _context.SaveChangesAsync();
                }

                int? targetUniId = projectPaper.Paper?.UniversityId;
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return CreatedAtAction(nameof(GetProjectPaperSection), new { id = section.Id }, new { success = true, sectionId = section.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT: api/projectpapersection/5
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateProjectPaperSection(int id, [FromBody] UpdateProjectPaperSectionDto dto)
        {
            try
            {
                var section = await _context.ProjectPaperSections
                    .Include(pps => pps.Questions)
                    .FirstOrDefaultAsync(pps => pps.Id == id);

                if (section == null)
                    return NotFound(new { success = false, message = "Project paper section not found" });

                section.Name = dto.Name.Trim();
                section.Description = dto.Description;
                section.TotalQuestions = dto.TotalQuestions;
                section.TotalMarks = dto.TotalMarks;
                section.StartQuestion = dto.StartQuestion;
                section.EndQuestion = dto.EndQuestion;
                section.MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt;
                section.UpdatedAt = DateTime.UtcNow;

                // Sync questions in-place without creating new rows
                if (dto.Questions != null)
                {
                    var existingQuestions = section.Questions.ToList();

                    // Match incoming questions to existing questions by QuestionId (or by QuestionNo)
                    var matchedExistingIds = new HashSet<int>();

                    foreach (var q in dto.Questions)
                    {
                        Question? existing = null;
                        if (q.QuestionId > 0)
                        {
                            existing = existingQuestions.FirstOrDefault(eq => eq.QuestionId == q.QuestionId);
                        }
                        if (existing == null && !string.IsNullOrWhiteSpace(q.QuestionNo))
                        {
                            existing = existingQuestions.FirstOrDefault(eq => !matchedExistingIds.Contains(eq.QuestionId) && eq.QuestionNo == q.QuestionNo);
                        }

                        if (existing != null)
                        {
                            // Update existing row in place
                            matchedExistingIds.Add(existing.QuestionId);
                            existing.QuestionNo = q.QuestionNo;
                            existing.Marks = q.Marks;
                            existing.Type = q.Type ?? "MCQ";
                            existing.IsOptional = q.IsOptional;
                            existing.OptionalGroupCode = q.OptionalGroupCode;
                        }
                        else
                        {
                            // Only add if truly a new question row
                            var newQ = new Question
                            {
                                ProjectPaperSectionId = section.Id,
                                QuestionNo = q.QuestionNo,
                                Marks = q.Marks,
                                Type = q.Type ?? "MCQ",
                                IsOptional = q.IsOptional,
                                OptionalGroupCode = q.OptionalGroupCode,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.Questions.Add(newQ);
                        }
                    }

                    // Remove questions that were deleted by user
                    var toDelete = existingQuestions
                        .Where(eq => !matchedExistingIds.Contains(eq.QuestionId))
                        .ToList();
                    if (toDelete.Any())
                    {
                        _context.Questions.RemoveRange(toDelete);
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Project paper section updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/projectpapersection/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DeleteProjectPaperSection(int id)
        {
            try
            {
                var section = await _context.ProjectPaperSections
                    .Include(pps => pps.Questions)
                    .FirstOrDefaultAsync(pps => pps.Id == id);

                if (section == null)
                    return NotFound(new { success = false, message = "Project paper section not found" });

                var ppId = section.ProjectPaperId;
                _context.Questions.RemoveRange(section.Questions);
                _context.ProjectPaperSections.Remove(section);
                await _context.SaveChangesAsync();

                var projectPaper = await _context.ProjectPapers.FindAsync(ppId);
                if (projectPaper != null)
                {
                    bool hasRemaining = await _context.ProjectPaperSections.AnyAsync(pps => pps.ProjectPaperId == ppId)
                        || await _context.Sections.AnyAsync(s => s.PaperId == projectPaper.PaperId);
                    projectPaper.IsSectionConfigured = hasRemaining;
                    projectPaper.UpdatedAt = DateTime.UtcNow;
                    _context.ProjectPapers.Update(projectPaper);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = "Project paper section deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection/import-from-paper
        // Clones sections configured on the master paper (Sections table) into ProjectPaperSections for this project paper
        [HttpPost("import-from-paper")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ImportFromMasterPaper([FromBody] ImportMasterToProjectPaperSectionsRequest request)
        {
            try
            {
                int projectPaperId = request.ProjectPaperId;
                if (projectPaperId <= 0 && request.ProjectId.HasValue && request.PaperId.HasValue)
                {
                    var pp = await _context.ProjectPapers
                        .FirstOrDefaultAsync(p => p.ProjectId == request.ProjectId.Value && p.PaperId == request.PaperId.Value);
                    if (pp != null) projectPaperId = pp.Id;
                }

                if (projectPaperId <= 0)
                    return BadRequest(new { success = false, message = "ProjectPaperId or ProjectId+PaperId is required" });

                var projectPaper = await _context.ProjectPapers
                    .Include(pp => pp.Paper)
                    .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

                if (projectPaper == null)
                    return NotFound(new { success = false, message = "Project paper not found" });

                var masterSections = await _context.Sections
                    .Include(s => s.Questions)
                    .Where(s => s.PaperId == projectPaper.PaperId)
                    .ToListAsync();

                if (!masterSections.Any())
                    return BadRequest(new { success = false, message = "Master paper has no sections to import" });

                if (request.OverwriteExisting)
                {
                    var existing = await _context.ProjectPaperSections
                        .Include(pps => pps.Questions)
                        .Where(pps => pps.ProjectPaperId == request.ProjectPaperId)
                        .ToListAsync();

                    foreach (var sec in existing)
                    {
                        _context.Questions.RemoveRange(sec.Questions);
                    }
                    _context.ProjectPaperSections.RemoveRange(existing);
                }

                foreach (var ms in masterSections)
                {
                    var newSection = new ProjectPaperSection
                    {
                        ProjectPaperId = request.ProjectPaperId,
                        SectionMasterId = ms.SectionMasterId,
                        Name = ms.Name,
                        Description = ms.Description,
                        TotalQuestions = ms.TotalQuestions,
                        TotalMarks = ms.TotalMarks,
                        StartQuestion = ms.StartQuestion,
                        EndQuestion = ms.EndQuestion,
                        MaxQuestionsToAttempt = ms.MaxQuestionsToAttempt,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.ProjectPaperSections.Add(newSection);
                    await _context.SaveChangesAsync();

                    foreach (var mq in ms.Questions)
                    {
                        _context.Questions.Add(new Question
                        {
                            ProjectPaperSectionId = newSection.Id,
                            QuestionNo = mq.QuestionNo,
                            Marks = mq.Marks,
                            Type = mq.Type,
                            IsOptional = mq.IsOptional,
                            OptionalGroupCode = mq.OptionalGroupCode,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                projectPaper.IsSectionConfigured = true;
                projectPaper.UpdatedAt = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);

                await _context.SaveChangesAsync();

                int? targetUniId = projectPaper.Paper?.UniversityId;
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return Ok(new { success = true, message = $"Successfully imported {masterSections.Count} section(s) to project paper" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection/import-masters
        // Imports selected SectionMasters directly into ProjectPaperSections for this project paper
        [HttpPost("import-masters")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ImportMasterSectionsToProjectPaper([FromBody] ImportMastersToProjectPaperRequest request)
        {
            try
            {
                if (request == null || request.MasterSectionIds == null || !request.MasterSectionIds.Any())
                    return BadRequest(new { success = false, message = "At least one Master Section must be selected" });

                int projectPaperId = request.ProjectPaperId ?? 0;
                if (projectPaperId <= 0 && request.ProjectId.HasValue && request.PaperId.HasValue)
                {
                    var pp = await _context.ProjectPapers
                        .FirstOrDefaultAsync(p => p.ProjectId == request.ProjectId.Value && p.PaperId == request.PaperId.Value);
                    if (pp != null) projectPaperId = pp.Id;
                }

                if (projectPaperId <= 0)
                    return BadRequest(new { success = false, message = "ProjectPaperId or ProjectId+PaperId is required" });

                var projectPaper = await _context.ProjectPapers
                    .Include(pp => pp.Paper)
                    .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

                if (projectPaper == null)
                    return NotFound(new { success = false, message = "Project paper not found" });

                var masters = await _context.SectionMasters
                    .Where(m => request.MasterSectionIds.Contains(m.Id))
                    .ToListAsync();

                if (!masters.Any())
                    return BadRequest(new { success = false, message = "No matching master sections found" });

                if (request.OverwriteExisting)
                {
                    var existing = await _context.ProjectPaperSections
                        .Include(pps => pps.Questions)
                        .Where(pps => pps.ProjectPaperId == projectPaperId)
                        .ToListAsync();

                    foreach (var sec in existing)
                    {
                        _context.Questions.RemoveRange(sec.Questions);
                    }
                    _context.ProjectPaperSections.RemoveRange(existing);
                    await _context.SaveChangesAsync();
                }

                foreach (var master in masters)
                {
                    var totalQ = master.EndQuestion - master.StartQuestion + 1;
                    if (totalQ <= 0) totalQ = 1;

                    var newSection = new ProjectPaperSection
                    {
                        ProjectPaperId = projectPaperId,
                        SectionMasterId = master.Id,
                        Name = master.Name,
                        Description = master.Description,
                        StartQuestion = master.StartQuestion,
                        EndQuestion = master.EndQuestion,
                        TotalQuestions = totalQ,
                        TotalMarks = master.TotalMarks,
                        MaxQuestionsToAttempt = master.MaxQuestionsToAttempt > 0 ? master.MaxQuestionsToAttempt : totalQ,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.ProjectPaperSections.Add(newSection);
                    await _context.SaveChangesAsync();

                    decimal marksPerQ = Math.Round(master.TotalMarks / totalQ, 2);
                    for (int i = master.StartQuestion; i <= master.EndQuestion; i++)
                    {
                        _context.Questions.Add(new Question
                        {
                            ProjectPaperSectionId = newSection.Id,
                            QuestionNo = i.ToString(),
                            Marks = marksPerQ,
                            Type = "MCQ",
                            IsOptional = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                projectPaper.IsSectionConfigured = true;
                projectPaper.UpdatedAt = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);

                await _context.SaveChangesAsync();

                int? targetUniId = projectPaper.Paper?.UniversityId;
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return Ok(new { success = true, message = $"Successfully imported {masters.Count} master section(s) to project paper" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
