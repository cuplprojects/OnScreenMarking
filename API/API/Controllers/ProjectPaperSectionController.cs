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

        private async Task<(int typeId, string typeName)> ResolveQuestionTypeAsync(int? dtoTypeId, string? dtoTypeName)
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
            }

            // Fallback to first available
            var firstQt = await _context.QuestionTypes.FirstOrDefaultAsync();
            if (firstQt != null)
            {
                return (firstQt.QuestionTypeId, firstQt.QuestionTypeName);
            }

            // Create default MCQ if table is empty
            var defaultQt = new QuestionType { QuestionTypeName = "MCQ" };
            _context.QuestionTypes.Add(defaultQt);
            await _context.SaveChangesAsync();
            return (defaultQt.QuestionTypeId, defaultQt.QuestionTypeName);
        }

        // GET: api/projectpapersection?projectPaperId=5 OR ?batchId=1 OR ?scriptId=10
        // Sections are read from SectionMasters (by BatchId)
        // Questions are read from QuestionMasters (by BatchId + Section name)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetProjectPaperSections(
            [FromQuery] int? projectPaperId = null,
            [FromQuery] int? projectId = null,
            [FromQuery] int? paperId = null,
            [FromQuery] int? batchId = null,
            [FromQuery] int? scriptId = null)
        {
            try
            {
                ProjectPaper? projectPaper = null;
                int? resolvedBatchId = batchId;

                if (scriptId.HasValue && scriptId.Value > 0)
                {
                    var script = await _context.Scripts
                        .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                        .FirstOrDefaultAsync(s => s.Id == scriptId.Value);

                    if (script != null)
                    {
                        projectPaper = script.ProjectPaper;
                        resolvedBatchId = script.BatchId ?? script.ProjectPaper?.BatchId;
                    }
                }

                if (projectPaperId.HasValue && projectPaperId.Value > 0)
                {
                    projectPaper = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .FirstOrDefaultAsync(pp => pp.Id == projectPaperId.Value);

                    if (projectPaper != null && (!resolvedBatchId.HasValue || resolvedBatchId.Value <= 0))
                    {
                        resolvedBatchId = projectPaper.BatchId;
                    }
                }
                else if (projectId.HasValue && paperId.HasValue)
                {
                    projectPaper = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .FirstOrDefaultAsync(pp => pp.ProjectId == projectId.Value && pp.PaperId == paperId.Value);

                    if (projectPaper != null && (!resolvedBatchId.HasValue || resolvedBatchId.Value <= 0))
                    {
                        resolvedBatchId = projectPaper.BatchId;
                    }
                }
                else if (projectId.HasValue)
                {
                    // Return all sections for all papers in a project
                    var projectPapers = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .Where(pp => pp.ProjectId == projectId.Value && pp.BatchId != null)
                        .ToListAsync();

                    var allResults = new List<object>();
                    foreach (var pp in projectPapers)
                    {
                        var ppSections = await BuildSectionsResponse(pp, pp.BatchId);
                        allResults.AddRange(ppSections);
                    }
                    return Ok(allResults);
                }

                if (resolvedBatchId.HasValue && resolvedBatchId.Value > 0 && projectPaper == null)
                {
                    projectPaper = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .FirstOrDefaultAsync(pp => pp.BatchId == resolvedBatchId.Value);
                }

                if (projectPaper == null && (!resolvedBatchId.HasValue || resolvedBatchId.Value <= 0))
                    return Ok(new List<object>());

                var sections = await BuildSectionsResponse(projectPaper, resolvedBatchId);
                return Ok(sections);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET: api/projectpapersection/5
        // id here is the SectionMaster.Id
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetProjectPaperSection(int id)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section not found" });

                var questions = await _context.QuestionMasters
                    .Include(qm => qm.QuestionType)
                    .Where(qm => qm.BatchId == master.BatchId && qm.Section == master.Name)
                    .OrderBy(qm => qm.Id)
                    .Select(qm => new
                    {
                        questionId        = qm.Id,
                        questionNo        = qm.Question,
                        marks             = qm.Marks,
                        typeId            = qm.QuestionTypeId,
                        questionTypeId    = qm.QuestionTypeId,
                        type              = qm.QuestionType != null ? qm.QuestionType.QuestionTypeName : "MCQ",
                        isOptional        = !string.IsNullOrEmpty(qm.Group),
                        optionalGroupCode = qm.Group
                    })
                    .ToListAsync();

                return Ok(new
                {
                    id            = master.Id,
                    batchId       = master.BatchId,
                    name          = master.Name,
                    description   = master.Description,
                    totalQuestions = master.TotalQuestions,
                    totalMarks    = master.TotalMarks,
                    startQuestion = master.StartQuestion,
                    endQuestion   = master.EndQuestion,
                    maxQuestionsToAttempt = master.MaxQuestionsToAttempt,
                    createdAt     = master.CreatedAt,
                    questions     = questions
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection
        // Creates/updates a section in SectionMasters and saves questions to QuestionMasters.
        // Links the paper to the batch via ProjectPapers.BatchId.
        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<object>> CreateProjectPaperSection([FromBody] CreateProjectPaperSectionDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { success = false, message = "Section name is required" });

                // Resolve ProjectPaperId from ProjectId + PaperId if needed
                if (dto.ProjectPaperId <= 0 && dto.ProjectId.HasValue && dto.PaperId.HasValue)
                {
                    var pp = await _context.ProjectPapers
                        .FirstOrDefaultAsync(p => p.ProjectId == dto.ProjectId.Value && p.PaperId == dto.PaperId.Value);
                    if (pp != null)
                        dto.ProjectPaperId = pp.Id;
                }

                if (dto.ProjectPaperId <= 0)
                    return BadRequest(new { success = false, message = "ProjectPaperId or ProjectId+PaperId is required" });

                var projectPaper = await _context.ProjectPapers
                    .Include(pp => pp.Paper)
                    .Include(pp => pp.Project)
                    .FirstOrDefaultAsync(pp => pp.Id == dto.ProjectPaperId);

                if (projectPaper == null)
                    return BadRequest(new { success = false, message = "Project paper assignment not found" });

                if (projectPaper.Project != null && !projectPaper.Project.IsActive)
                    return BadRequest(new { success = false, message = "Cannot create sections for an inactive project." });

                // ── Resolve BatchId ──────────────────────────────────────────────────
                // Priority: DTO → ProjectPapers.BatchId → generate new
                int resolvedBatchId = dto.BatchId > 0 ? dto.BatchId : 0;

                if (resolvedBatchId <= 0 && projectPaper.BatchId.HasValue && projectPaper.BatchId.Value > 0)
                    resolvedBatchId = projectPaper.BatchId.Value;

                if (resolvedBatchId <= 0)
                {
                    // Generate a new batch id (max across SectionMasters + QuestionMasters)
                    var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                    var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                    resolvedBatchId = Math.Max(maxSm, maxQm) + 1;
                }

                if (resolvedBatchId <= 0) resolvedBatchId = 1;

                // ── SectionMaster: create or update ──────────────────────────────────
                var masterName = dto.Name.Trim();
                int totalQ = dto.TotalQuestions > 0
                    ? dto.TotalQuestions
                    : (dto.Questions?.Count ?? (dto.EndQuestion >= dto.StartQuestion ? dto.EndQuestion - dto.StartQuestion + 1 : 1));

                var master = await _context.SectionMasters
                    .FirstOrDefaultAsync(sm => sm.BatchId == resolvedBatchId && sm.Name.ToLower() == masterName.ToLower());

                if (master == null)
                {
                    master = new SectionMaster
                    {
                        BatchId               = resolvedBatchId,
                        Name                  = masterName,
                        Description           = dto.Description ?? "",
                        TotalQuestions        = totalQ,
                        TotalMarks            = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero),
                        StartQuestion         = dto.StartQuestion,
                        EndQuestion           = dto.EndQuestion,
                        MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : totalQ,
                        CreatedAt             = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(master);
                }
                else
                {
                    master.Description           = dto.Description ?? "";
                    master.TotalQuestions        = totalQ;
                    master.TotalMarks            = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero);
                    master.StartQuestion         = dto.StartQuestion;
                    master.EndQuestion           = dto.EndQuestion;
                    master.MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : totalQ;
                    _context.SectionMasters.Update(master);
                }

                await _context.SaveChangesAsync();

                // ── ProjectPapers.BatchId ────────────────────────────────────────────
                projectPaper.IsSectionConfigured = true;
                projectPaper.BatchId             = resolvedBatchId;
                projectPaper.UpdatedAt           = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);
                await _context.SaveChangesAsync();

                // ── QuestionMasters: replace all rows for this batch+section ─────────
                var existingQMs = await _context.QuestionMasters
                    .Where(qm => qm.BatchId == resolvedBatchId && qm.Section == masterName)
                    .ToListAsync();
                if (existingQMs.Any())
                    _context.QuestionMasters.RemoveRange(existingQMs);

                List<QuestionMaster> qmList = new List<QuestionMaster>();
                if (dto.Questions != null && dto.Questions.Count > 0)
                {
                    foreach (var q in dto.Questions)
                    {
                        var (resolvedTypeId, resolvedTypeName) = await ResolveQuestionTypeAsync(q.TypeId ?? q.QuestionTypeId, q.Type);
                        qmList.Add(new QuestionMaster
                        {
                            BatchId        = resolvedBatchId,
                            Section        = masterName,
                            Question       = q.QuestionNo,
                            Marks          = Math.Round(q.Marks, 2, MidpointRounding.AwayFromZero),
                            QuestionTypeId = resolvedTypeId,
                            Group          = !string.IsNullOrWhiteSpace(q.OptionalGroupCode) ? q.OptionalGroupCode.Trim() : null,
                            Status         = true,
                            CreatedAt      = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    // Auto-generate questions from start→end range
                    decimal defaultMarksPerQ = totalQ > 0 ? Math.Round((decimal)dto.TotalMarks / totalQ, 2) : 0;
                    var (defTypeId, defTypeName) = await ResolveQuestionTypeAsync(null, "MCQ");
                    for (int i = dto.StartQuestion; i <= dto.EndQuestion; i++)
                    {
                        qmList.Add(new QuestionMaster
                        {
                            BatchId        = resolvedBatchId,
                            Section        = masterName,
                            Question       = i.ToString(),
                            Marks          = defaultMarksPerQ,
                            QuestionTypeId = defTypeId,
                            Group          = null,
                            Status         = true,
                            CreatedAt      = DateTime.UtcNow
                        });
                    }
                }

                _context.QuestionMasters.AddRange(qmList);
                await _context.SaveChangesAsync();

                int? targetUniId = projectPaper.Paper?.UniversityId;
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return Ok(new
                {
                    success   = true,
                    sectionId = master.Id,
                    batchId   = resolvedBatchId,
                    message   = "Section created successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT: api/projectpapersection/5
        // id = SectionMaster.Id
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateProjectPaperSection(int id, [FromBody] UpdateProjectPaperSectionDto dto)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section not found" });

                var oldName    = master.Name;
                var oldBatchId = master.BatchId;

                if (dto.BatchId > 0) master.BatchId = dto.BatchId;
                master.Name                  = dto.Name.Trim();
                master.Description           = dto.Description ?? "";
                master.TotalQuestions        = dto.TotalQuestions;
                master.TotalMarks            = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero);
                master.StartQuestion         = dto.StartQuestion;
                master.EndQuestion           = dto.EndQuestion;
                master.MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : dto.TotalQuestions;
                _context.SectionMasters.Update(master);
                await _context.SaveChangesAsync();

                // ── QuestionMasters: replace rows for this batch+section ──────────────
                var existingQMs = await _context.QuestionMasters
                    .Where(qm => qm.BatchId == master.BatchId && qm.Section == oldName)
                    .ToListAsync();
                if (existingQMs.Any())
                    _context.QuestionMasters.RemoveRange(existingQMs);

                if (dto.Questions != null && dto.Questions.Count > 0)
                {
                    var qmList = new List<QuestionMaster>();
                    foreach (var q in dto.Questions)
                    {
                        var (resolvedTypeId, resolvedTypeName) = await ResolveQuestionTypeAsync(q.TypeId ?? q.QuestionTypeId, q.Type);
                        qmList.Add(new QuestionMaster
                        {
                            BatchId        = master.BatchId,
                            Section        = master.Name,
                            Question       = q.QuestionNo,
                            Marks          = Math.Round(q.Marks, 2, MidpointRounding.AwayFromZero),
                            QuestionTypeId = resolvedTypeId,
                            Group          = !string.IsNullOrWhiteSpace(q.OptionalGroupCode) ? q.OptionalGroupCode.Trim() : null,
                            Status         = true,
                            CreatedAt      = DateTime.UtcNow
                        });
                    }
                    _context.QuestionMasters.AddRange(qmList);
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Section updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/projectpapersection/5
        // id = SectionMaster.Id
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DeleteProjectPaperSection(int id)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section not found" });

                var secBatchId = master.BatchId;
                var secName    = master.Name;

                // Remove QuestionMasters for this section
                var qmsToRemove = await _context.QuestionMasters
                    .Where(qm => qm.BatchId == secBatchId && qm.Section == secName)
                    .ToListAsync();
                if (qmsToRemove.Any())
                    _context.QuestionMasters.RemoveRange(qmsToRemove);

                _context.SectionMasters.Remove(master);
                await _context.SaveChangesAsync();

                // If no more SectionMasters for this batch, clear BatchId on ProjectPaper
                bool hasRemainingInBatch = await _context.SectionMasters
                    .AnyAsync(sm => sm.BatchId == secBatchId);

                if (!hasRemainingInBatch)
                {
                    var affectedPapers = await _context.ProjectPapers
                        .Where(pp => pp.BatchId == secBatchId)
                        .ToListAsync();

                    foreach (var pp in affectedPapers)
                    {
                        pp.BatchId             = null;
                        pp.IsSectionConfigured = false;
                        pp.UpdatedAt           = DateTime.UtcNow;
                    }
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = "Section deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection/import-masters
        // Assigns existing SectionMasters (by Id list) to a ProjectPaper via BatchId.
        // Does NOT create new SectionMaster rows — just links via ProjectPapers.BatchId.
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
                    .Include(pp => pp.Project)
                    .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

                if (projectPaper == null)
                    return NotFound(new { success = false, message = "Project paper not found" });

                if (projectPaper.Project != null && !projectPaper.Project.IsActive)
                    return BadRequest(new { success = false, message = "Cannot import sections to an inactive project." });

                var masters = await _context.SectionMasters
                    .Where(m => request.MasterSectionIds.Contains(m.Id))
                    .ToListAsync();

                if (!masters.Any())
                    return BadRequest(new { success = false, message = "No matching master sections found" });

                // All selected masters should ideally share the same BatchId.
                // Use the first master's BatchId as the canonical batch for this paper.
                int batchId = masters.First().BatchId;

                projectPaper.IsSectionConfigured = true;
                projectPaper.BatchId             = batchId;
                projectPaper.UpdatedAt           = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);
                await _context.SaveChangesAsync();

                int? targetUniId = projectPaper.Paper?.UniversityId;
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return Ok(new { success = true, message = $"Successfully linked {masters.Count} master section(s) to project paper" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/projectpapersection/import-from-paper
        // Imports sections from the Sections table (master paper setup) into SectionMasters + QuestionMasters,
        // then links the ProjectPaper to the batch.
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
                    .Include(pp => pp.Project)
                    .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

                if (projectPaper == null)
                    return NotFound(new { success = false, message = "Project paper not found" });

                if (projectPaper.Project != null && !projectPaper.Project.IsActive)
                    return BadRequest(new { success = false, message = "Cannot import sections to an inactive project." });

                // Load master sections from Sections table for this paper
                var masterSections = await _context.Sections
                    .Where(s => s.PaperId == projectPaper.PaperId)
                    .ToListAsync();

                if (!masterSections.Any())
                    return BadRequest(new { success = false, message = "Master paper has no sections to import" });

                // Determine or generate a batch id
                int resolvedBatchId = projectPaper.BatchId ?? 0;
                if (resolvedBatchId <= 0)
                {
                    resolvedBatchId = masterSections.FirstOrDefault(s => s.BatchId > 0)?.BatchId ?? 0;
                }
                if (resolvedBatchId <= 0)
                {
                    var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                    var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                    resolvedBatchId = Math.Max(maxSm, maxQm) + 1;
                }

                foreach (var ms in masterSections)
                {
                    int totalQ = ms.EndQuestion - ms.StartQuestion + 1;
                    if (totalQ <= 0) totalQ = ms.TotalQuestions > 0 ? ms.TotalQuestions : 1;

                    // Upsert into SectionMasters
                    var existingMaster = await _context.SectionMasters
                        .FirstOrDefaultAsync(sm => sm.BatchId == resolvedBatchId && sm.Name.ToLower() == ms.Name.ToLower());

                    if (existingMaster == null)
                    {
                        _context.SectionMasters.Add(new SectionMaster
                        {
                            BatchId               = resolvedBatchId,
                            Name                  = ms.Name,
                            Description           = ms.Description ?? "",
                            TotalQuestions        = totalQ,
                            TotalMarks            = ms.TotalMarks,
                            StartQuestion         = ms.StartQuestion,
                            EndQuestion           = ms.EndQuestion,
                            MaxQuestionsToAttempt = ms.MaxQuestionsToAttempt > 0 ? ms.MaxQuestionsToAttempt : totalQ,
                            CreatedAt             = DateTime.UtcNow
                        });
                    }

                    // Replace QuestionMasters for this section
                    var existingQMs = await _context.QuestionMasters
                        .Where(qm => qm.BatchId == resolvedBatchId && qm.Section == ms.Name)
                        .ToListAsync();
                    if (existingQMs.Any())
                        _context.QuestionMasters.RemoveRange(existingQMs);

                    decimal defaultMarksPerQ = ms.TotalQuestions > 0 ? Math.Round((decimal)ms.TotalMarks / ms.TotalQuestions, 2) : 0;
                    var (defTypeId, defTypeName) = await ResolveQuestionTypeAsync(null, "MCQ");
                    for (int i = ms.StartQuestion; i <= ms.EndQuestion; i++)
                    {
                        _context.QuestionMasters.Add(new QuestionMaster
                        {
                            BatchId        = resolvedBatchId,
                            Section        = ms.Name,
                            Question       = i.ToString(),
                            Marks          = defaultMarksPerQ,
                            QuestionTypeId = defTypeId,
                            Group          = null,
                            Status         = true,
                            CreatedAt      = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();

                projectPaper.IsSectionConfigured = true;
                projectPaper.BatchId             = resolvedBatchId;
                projectPaper.UpdatedAt           = DateTime.UtcNow;
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

        // ── Helper: build section response from SectionMasters + QuestionMasters ──────
        private async Task<List<object>> BuildSectionsResponse(ProjectPaper? projectPaper, int? explicitBatchId = null)
        {
            int batchId = explicitBatchId ?? projectPaper?.BatchId ?? 0;
            if (batchId <= 0 && projectPaper != null)
            {
                batchId = await _context.ProjectPapers
                    .Where(pp => pp.PaperId == projectPaper.PaperId && pp.BatchId != null && pp.BatchId > 0)
                    .Select(pp => pp.BatchId!.Value)
                    .FirstOrDefaultAsync();
            }

            if (batchId <= 0)
                return new List<object>();

            var sectionMasters = await _context.SectionMasters
                .Where(sm => sm.BatchId == batchId)
                .OrderBy(sm => sm.Id)
                .ToListAsync();

            var allQuestions = await _context.QuestionMasters
                .Include(qm => qm.QuestionType)
                .Where(qm => qm.BatchId == batchId)
                .OrderBy(qm => qm.Id)
                .ToListAsync();

            decimal paperMaxMarks = projectPaper?.Paper?.MaxMarks ?? 0;
            if (paperMaxMarks <= 0)
            {
                paperMaxMarks = allQuestions.Sum(q => q.Marks);
                if (paperMaxMarks <= 0 && sectionMasters.Any())
                {
                    paperMaxMarks = sectionMasters.Sum(sm => sm.TotalMarks);
                }
            }

            if (!sectionMasters.Any() && allQuestions.Any())
            {
                var sectionNames = allQuestions
                    .Select(q => string.IsNullOrWhiteSpace(q.Section) ? "Section A" : q.Section.Trim())
                    .Distinct()
                    .ToList();

                int virtualId = 1;
                return sectionNames.Select(secName =>
                {
                    var secQuestions = allQuestions
                        .Where(q => (string.IsNullOrWhiteSpace(q.Section) ? "Section A" : q.Section.Trim()) == secName)
                        .ToList();
                    decimal secMarks = secQuestions.Sum(q => q.Marks);
                    int startQ = 1;
                    int endQ = secQuestions.Count;
                    if (int.TryParse(secQuestions.FirstOrDefault()?.Question, out int sq)) startQ = sq;
                    if (int.TryParse(secQuestions.LastOrDefault()?.Question, out int eq)) endQ = eq;

                    return (object)new
                    {
                        id = virtualId++,
                        projectPaperId = projectPaper?.Id ?? 0,
                        batchId = batchId,
                        name = secName,
                        description = secName,
                        totalQuestions = secQuestions.Count,
                        totalMarks = secMarks,
                        startQuestion = startQ,
                        endQuestion = endQ,
                        maxQuestionsToAttempt = secQuestions.Count,
                        createdAt = DateTime.UtcNow,
                        updatedAt = DateTime.UtcNow,
                        projectPaper = new
                        {
                            id = projectPaper?.Id ?? 0,
                            projectId = projectPaper?.ProjectId ?? 0,
                            paperId = projectPaper?.PaperId ?? 0,
                            batchId = batchId,
                            paperName = projectPaper?.Paper?.PaperName,
                            paperCode = projectPaper?.Paper?.PaperCode,
                            maxMarks = paperMaxMarks
                        },
                        totalPaperMarks = paperMaxMarks,
                        questions = secQuestions.Select(qm => new
                        {
                            questionId = qm.Id,
                            questionNo = qm.Question,
                            marks = qm.Marks,
                            typeId = qm.QuestionTypeId,
                            questionTypeId = qm.QuestionTypeId,
                            type = qm.QuestionType != null ? qm.QuestionType.QuestionTypeName : "MCQ",
                            isOptional = !string.IsNullOrEmpty(qm.Group),
                            optionalGroupCode = qm.Group
                        }).ToList()
                    };
                }).ToList();
            }

            return sectionMasters.Select(sm => (object)new
            {
                id                    = sm.Id,
                projectPaperId        = projectPaper?.Id ?? 0,
                batchId               = sm.BatchId,
                name                  = sm.Name,
                description           = sm.Description,
                totalQuestions        = sm.TotalQuestions,
                totalMarks            = sm.TotalMarks,
                startQuestion         = sm.StartQuestion,
                endQuestion           = sm.EndQuestion,
                maxQuestionsToAttempt = sm.MaxQuestionsToAttempt,
                createdAt             = sm.CreatedAt,
                updatedAt             = sm.CreatedAt,
                projectPaper = new
                {
                    id        = projectPaper?.Id ?? 0,
                    projectId = projectPaper?.ProjectId ?? 0,
                    paperId   = projectPaper?.PaperId ?? 0,
                    batchId   = batchId,
                    paperName = projectPaper?.Paper?.PaperName,
                    paperCode = projectPaper?.Paper?.PaperCode,
                    maxMarks  = paperMaxMarks
                },
                totalPaperMarks = paperMaxMarks,
                questions = allQuestions
                    .Where(qm => (string.IsNullOrWhiteSpace(qm.Section) ? "Section A" : qm.Section.Trim()) == sm.Name.Trim())
                    .Select(qm => new
                    {
                        questionId        = qm.Id,
                        questionNo        = qm.Question,
                        marks             = qm.Marks,
                        typeId            = qm.QuestionTypeId,
                        questionTypeId    = qm.QuestionTypeId,
                        type              = qm.QuestionType != null ? qm.QuestionType.QuestionTypeName : "MCQ",
                        isOptional        = !string.IsNullOrEmpty(qm.Group),
                        optionalGroupCode = qm.Group
                    }).ToList()
            }).ToList();
        }
    }
}
