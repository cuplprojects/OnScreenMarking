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
                    .Where(qm => qm.BatchId == master.BatchId && qm.Section == master.Name)
                    .OrderBy(qm => qm.Id)
                    .Select(qm => new
                    {
                        questionId        = qm.Id,
                        questionNo        = qm.Question,
                        marks             = qm.Marks,
                        typeId            = (int?)null,
                        questionTypeId    = (int?)null,
                        type              = qm.Type != null ? qm.Type : "MCQ",
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
        // Creates a section in SectionMasters and saves questions to QuestionMasters.
        // If paper already has a shared/master batch, it forks to a new batch.
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

                // ── Resolve BatchId and Fork if Master/Shared ──────────────────────────
                int resolvedBatchId = 0;
                int currentBatchId = projectPaper.BatchId.HasValue && projectPaper.BatchId.Value > 0 ? projectPaper.BatchId.Value : 0;

                bool isMasterOrShared = currentBatchId > 0 && (
                    currentBatchId <= 5 || 
                    await _context.ProjectPapers.CountAsync(pp => pp.BatchId == currentBatchId) > 1
                );

                if (isMasterOrShared)
                {
                    // Fork into a new batch so master template remains untouched
                    var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                    var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                    resolvedBatchId = Math.Max(maxSm, maxQm) + 1;
                    if (resolvedBatchId <= 0) resolvedBatchId = 1;

                    // Duplicate existing sections & questions from currentBatchId to resolvedBatchId
                    var existingSections = await _context.SectionMasters
                        .Where(sm => sm.BatchId == currentBatchId)
                        .ToListAsync();

                    foreach (var es in existingSections)
                    {
                        var clonedSm = new SectionMaster
                        {
                            BatchId               = resolvedBatchId,
                            Name                  = es.Name,
                            Description           = es.Description,
                            TotalQuestions        = es.TotalQuestions,
                            TotalMarks            = es.TotalMarks,
                            StartQuestion         = es.StartQuestion,
                            EndQuestion           = es.EndQuestion,
                            MaxQuestionsToAttempt = es.MaxQuestionsToAttempt,
                            CreatedAt             = DateTime.UtcNow
                        };
                        _context.SectionMasters.Add(clonedSm);

                        var esQuestions = await _context.QuestionMasters
                            .Where(qm => qm.BatchId == currentBatchId && qm.Section == es.Name)
                            .ToListAsync();

                        foreach (var eqm in esQuestions)
                        {
                            _context.QuestionMasters.Add(new QuestionMaster
                            {
                                BatchId        = resolvedBatchId,
                                Section        = es.Name,
                                Question       = eqm.Question,
                                QuestionTypeId = eqm.QuestionTypeId,
                                Type           = eqm.Type,
                                Group          = eqm.Group,
                                Status         = eqm.Status,
                                CreatedAt      = DateTime.UtcNow
                            });
                        }
                    }
                }
                else if (currentBatchId > 0)
                {
                    // Reuse paper's existing dedicated custom batch
                    resolvedBatchId = currentBatchId;
                }
                else
                {
                    // Generate new batch id
                    var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                    var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                    resolvedBatchId = Math.Max(maxSm, maxQm) + 1;
                    if (resolvedBatchId <= 0) resolvedBatchId = 1;
                }

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

                var allQTypes = await _context.QuestionTypes.ToListAsync();
                var defType = allQTypes.FirstOrDefault(t => t.QuestionTypeName == "MCQ") ?? allQTypes.FirstOrDefault();

                List<QuestionMaster> qmList;
                if (dto.Questions != null && dto.Questions.Count > 0)
                {
                    qmList = dto.Questions.Select(q =>
                    {
                        int? qTypeId = q.QuestionTypeId ?? q.TypeId;
                        string qTypeName = !string.IsNullOrWhiteSpace(q.Type) ? q.Type.Trim() : "";

                        if (qTypeId.HasValue && qTypeId.Value > 0)
                        {
                            var matched = allQTypes.FirstOrDefault(t => t.QuestionTypeId == qTypeId.Value);
                            if (matched != null && string.IsNullOrEmpty(qTypeName))
                                qTypeName = matched.QuestionTypeName;
                        }
                        else if (!string.IsNullOrEmpty(qTypeName))
                        {
                            var matched = allQTypes.FirstOrDefault(t => t.QuestionTypeName.ToLower() == qTypeName.ToLower());
                            if (matched != null)
                                qTypeId = matched.QuestionTypeId;
                        }

                        if (!qTypeId.HasValue && defType != null)
                        {
                            qTypeId = defType.QuestionTypeId;
                            if (string.IsNullOrEmpty(qTypeName)) qTypeName = defType.QuestionTypeName;
                        }

                        return new QuestionMaster
                        {
                            BatchId        = resolvedBatchId,
                            Section        = masterName,
                            Question       = q.QuestionNo,
                            QuestionTypeId = qTypeId,
                            Type           = !string.IsNullOrWhiteSpace(qTypeName) ? qTypeName : "MCQ",
                            Group          = !string.IsNullOrWhiteSpace(q.OptionalGroupCode) ? q.OptionalGroupCode.Trim() : null,
                            Status         = true,
                            CreatedAt      = DateTime.UtcNow
                        };
                    }).ToList();
                }
                else
                {
                    qmList = new List<QuestionMaster>();
                    decimal defaultMarksPerQ = dto.TotalQuestions > 0 && dto.TotalMarks > 0
                        ? Math.Round(dto.TotalMarks / dto.TotalQuestions, 2, MidpointRounding.AwayFromZero)
                        : 0m;
                    int? defTypeId = defType?.QuestionTypeId;
                    for (int i = dto.StartQuestion; i <= dto.EndQuestion; i++)
                    {
                        qmList.Add(new QuestionMaster
                        {
                            BatchId        = resolvedBatchId,
                            Section        = masterName,
                            Question       = i.ToString(),
                            QuestionTypeId = defTypeId,
                            Type           = defType?.QuestionTypeName ?? "MCQ",
                            Marks          = defaultMarksPerQ,
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
        // If the edited section belongs to an imported master template or shared batch,
        // a NEW batch is created with all sections & questions, preserving the master template!
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

                // Resolve the ProjectPaper
                ProjectPaper? projectPaper = null;
                if (dto.ProjectPaperId.HasValue && dto.ProjectPaperId.Value > 0)
                {
                    projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.Id == dto.ProjectPaperId.Value);
                }
                else if (dto.ProjectId.HasValue && dto.PaperId.HasValue)
                {
                    projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.ProjectId == dto.ProjectId.Value && pp.PaperId == dto.PaperId.Value);
                }
                else
                {
                    projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.BatchId == oldBatchId);
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

                bool isMasterOrShared = oldBatchId <= 5 || 
                    await _context.ProjectPapers.CountAsync(pp => pp.BatchId == oldBatchId) > 1 ||
                    dto.ForkNewBatch;

                if (isMasterOrShared)
                {
                    // ── FORK: Coordinator imported section from master and is editing it ──
                    // Create a NEW batch so the master template remains pristine!
                    var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                    var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                    int newBatchId = Math.Max(maxSm, maxQm) + 1;
                    if (newBatchId <= 0) newBatchId = 1;

                    // 1. Copy other sections in oldBatchId to newBatchId
                    var otherMasters = await _context.SectionMasters
                        .Where(sm => sm.BatchId == oldBatchId && sm.Id != id)
                        .ToListAsync();

                    foreach (var om in otherMasters)
                    {
                        var clonedSm = new SectionMaster
                        {
                            BatchId               = newBatchId,
                            Name                  = om.Name,
                            Description           = om.Description,
                            TotalQuestions        = om.TotalQuestions,
                            TotalMarks            = om.TotalMarks,
                            StartQuestion         = om.StartQuestion,
                            EndQuestion           = om.EndQuestion,
                            MaxQuestionsToAttempt = om.MaxQuestionsToAttempt,
                            CreatedAt             = DateTime.UtcNow
                        };
                        _context.SectionMasters.Add(clonedSm);

                        var omQuestions = await _context.QuestionMasters
                            .Where(qm => qm.BatchId == oldBatchId && qm.Section == om.Name)
                            .ToListAsync();

                        foreach (var qm in omQuestions)
                        {
                            _context.QuestionMasters.Add(new QuestionMaster
                            {
                                BatchId        = newBatchId,
                                Section        = om.Name,
                                Question       = qm.Question,
                                QuestionTypeId = qm.QuestionTypeId,
                                Type           = qm.Type,
                                Group          = qm.Group,
                                Status         = qm.Status,
                                CreatedAt      = DateTime.UtcNow
                            });
                        }
                    }

                    // 2. Add the EDITED section under newBatchId
                    int totalQ = dto.TotalQuestions > 0 ? dto.TotalQuestions : (dto.Questions?.Count ?? (dto.EndQuestion >= dto.StartQuestion ? dto.EndQuestion - dto.StartQuestion + 1 : 1));
                    var newMaster = new SectionMaster
                    {
                        BatchId               = newBatchId,
                        Name                  = dto.Name.Trim(),
                        Description           = dto.Description ?? "",
                        TotalQuestions        = totalQ,
                        TotalMarks            = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero),
                        StartQuestion         = dto.StartQuestion,
                        EndQuestion           = dto.EndQuestion,
                        MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : totalQ,
                        CreatedAt             = DateTime.UtcNow
                    };
                    _context.SectionMasters.Add(newMaster);

                    var allQTypesUpdate = await _context.QuestionTypes.ToListAsync();
                    var defTypeUpdate = allQTypesUpdate.FirstOrDefault(t => t.QuestionTypeName == "MCQ") ?? allQTypesUpdate.FirstOrDefault();

                    // 3. Add questions for the edited section under newBatchId
                    if (dto.Questions != null && dto.Questions.Count > 0)
                    {
                        var qmList = dto.Questions.Select(q =>
                        {
                            int? qTypeId = q.QuestionTypeId ?? q.TypeId;
                            string qTypeName = !string.IsNullOrWhiteSpace(q.Type) ? q.Type.Trim() : "";

                            if (qTypeId.HasValue && qTypeId.Value > 0)
                            {
                                var matched = allQTypesUpdate.FirstOrDefault(t => t.QuestionTypeId == qTypeId.Value);
                                if (matched != null && string.IsNullOrEmpty(qTypeName))
                                    qTypeName = matched.QuestionTypeName;
                            }
                            else if (!string.IsNullOrEmpty(qTypeName))
                            {
                                var matched = allQTypesUpdate.FirstOrDefault(t => t.QuestionTypeName.ToLower() == qTypeName.ToLower());
                                if (matched != null)
                                    qTypeId = matched.QuestionTypeId;
                            }

                            if (!qTypeId.HasValue && defTypeUpdate != null)
                            {
                                qTypeId = defTypeUpdate.QuestionTypeId;
                                if (string.IsNullOrEmpty(qTypeName)) qTypeName = defTypeUpdate.QuestionTypeName;
                            }

                            return new QuestionMaster
                            {
                                BatchId        = newBatchId,
                                Section        = newMaster.Name,
                                Question       = q.QuestionNo,
                                QuestionTypeId = qTypeId,
                                Type           = !string.IsNullOrWhiteSpace(qTypeName) ? qTypeName : "MCQ",
                                Group          = !string.IsNullOrWhiteSpace(q.OptionalGroupCode) ? q.OptionalGroupCode.Trim() : null,
                                Status         = true,
                                CreatedAt      = DateTime.UtcNow
                            };
                        }).ToList();
                        _context.QuestionMasters.AddRange(qmList);
                    }
                    else
                    {
                        for (int i = dto.StartQuestion; i <= dto.EndQuestion; i++)
                        {
                            _context.QuestionMasters.Add(new QuestionMaster
                            {
                                BatchId        = newBatchId,
                                Section        = newMaster.Name,
                                Question       = i.ToString(),
                                QuestionTypeId = defTypeUpdate?.QuestionTypeId,
                                Type           = defTypeUpdate?.QuestionTypeName ?? "MCQ",
                                Group          = null,
                                Status         = true,
                                CreatedAt      = DateTime.UtcNow
                            });
                        }
                    }

                    // 4. Update ProjectPaper's BatchId reference to the newly created batch!
                    if (projectPaper != null)
                    {
                        projectPaper.BatchId             = newBatchId;
                        projectPaper.IsSectionConfigured = true;
                        projectPaper.UpdatedAt           = DateTime.UtcNow;
                        _context.ProjectPapers.Update(projectPaper);
                    }

                    await _context.SaveChangesAsync();

                    return Ok(new 
                    { 
                        success   = true, 
                        message   = "Section edited and successfully branched to a new batch",
                        batchId   = newBatchId,
                        sectionId = newMaster.Id 
                    });
                }
                else
                {
                    // Update in place for dedicated batch
                    master.Name                  = dto.Name.Trim();
                    master.Description           = dto.Description ?? "";
                    master.TotalQuestions        = dto.TotalQuestions;
                    master.TotalMarks            = Math.Round(dto.TotalMarks, 2, MidpointRounding.AwayFromZero);
                    master.StartQuestion         = dto.StartQuestion;
                    master.EndQuestion           = dto.EndQuestion;
                    master.MaxQuestionsToAttempt = dto.MaxQuestionsToAttempt > 0 ? dto.MaxQuestionsToAttempt : dto.TotalQuestions;
                    _context.SectionMasters.Update(master);

                    var existingQMs = await _context.QuestionMasters
                        .Where(qm => qm.BatchId == master.BatchId && qm.Section == oldName)
                        .ToListAsync();
                    if (existingQMs.Any())
                        _context.QuestionMasters.RemoveRange(existingQMs);

                    var allQTypesDirect = await _context.QuestionTypes.ToListAsync();
                    var defTypeDirect = allQTypesDirect.FirstOrDefault(t => t.QuestionTypeName == "MCQ") ?? allQTypesDirect.FirstOrDefault();

                    if (dto.Questions != null && dto.Questions.Count > 0)
                    {
                        var qmList = dto.Questions.Select(q =>
                        {
                            int? qTypeId = q.QuestionTypeId ?? q.TypeId;
                            string qTypeName = !string.IsNullOrWhiteSpace(q.Type) ? q.Type.Trim() : "";

                            if (qTypeId.HasValue && qTypeId.Value > 0)
                            {
                                var matched = allQTypesDirect.FirstOrDefault(t => t.QuestionTypeId == qTypeId.Value);
                                if (matched != null && string.IsNullOrEmpty(qTypeName))
                                    qTypeName = matched.QuestionTypeName;
                            }
                            else if (!string.IsNullOrEmpty(qTypeName))
                            {
                                var matched = allQTypesDirect.FirstOrDefault(t => t.QuestionTypeName.ToLower() == qTypeName.ToLower());
                                if (matched != null)
                                    qTypeId = matched.QuestionTypeId;
                            }

                            if (!qTypeId.HasValue && defTypeDirect != null)
                            {
                                qTypeId = defTypeDirect.QuestionTypeId;
                                if (string.IsNullOrEmpty(qTypeName)) qTypeName = defTypeDirect.QuestionTypeName;
                            }

                            return new QuestionMaster
                            {
                                BatchId        = master.BatchId,
                                Section        = master.Name,
                                Question       = q.QuestionNo,
                                QuestionTypeId = qTypeId,
                                Type           = !string.IsNullOrWhiteSpace(qTypeName) ? qTypeName : "MCQ",
                                Group          = !string.IsNullOrWhiteSpace(q.OptionalGroupCode) ? q.OptionalGroupCode.Trim() : null,
                                Status         = true,
                                CreatedAt      = DateTime.UtcNow
                            };
                        }).ToList();
                        _context.QuestionMasters.AddRange(qmList);
                    }
                    else
                    {
                        for (int i = dto.StartQuestion; i <= dto.EndQuestion; i++)
                        {
                            _context.QuestionMasters.Add(new QuestionMaster
                            {
                                BatchId        = master.BatchId,
                                Section        = master.Name,
                                Question       = i.ToString(),
                                QuestionTypeId = defTypeDirect?.QuestionTypeId,
                                Type           = defTypeDirect?.QuestionTypeName ?? "MCQ",
                                Group          = null,
                                Status         = true,
                                CreatedAt      = DateTime.UtcNow
                            });
                        }
                    }

                    if (projectPaper != null && projectPaper.BatchId != master.BatchId)
                    {
                        projectPaper.BatchId             = master.BatchId;
                        projectPaper.IsSectionConfigured = true;
                        projectPaper.UpdatedAt           = DateTime.UtcNow;
                        _context.ProjectPapers.Update(projectPaper);
                    }

                    await _context.SaveChangesAsync();

                    return Ok(new { success = true, message = "Section updated successfully", batchId = master.BatchId, sectionId = master.Id });
                }
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
        public async Task<IActionResult> DeleteProjectPaperSection(
            int id, 
            [FromQuery] int? projectPaperId = null, 
            [FromQuery] int? projectId = null, 
            [FromQuery] int? paperId = null)
        {
            try
            {
                var master = await _context.SectionMasters.FindAsync(id);
                if (master == null)
                    return NotFound(new { success = false, message = "Section not found" });

                var secBatchId = master.BatchId;
                var secName    = master.Name;

                // Resolve project paper
                ProjectPaper? projectPaper = null;
                if (projectPaperId.HasValue && projectPaperId.Value > 0)
                    projectPaper = await _context.ProjectPapers.FindAsync(projectPaperId.Value);
                else if (projectId.HasValue && paperId.HasValue)
                    projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.ProjectId == projectId.Value && pp.PaperId == paperId.Value);
                else
                    projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.BatchId == secBatchId);

                bool isMasterOrShared = secBatchId <= 5 || await _context.ProjectPapers.CountAsync(pp => pp.BatchId == secBatchId) > 1;

                if (isMasterOrShared && projectPaper != null)
                {
                    // Fork remaining sections into new batch so template is not deleted
                    var remaining = await _context.SectionMasters
                        .Where(sm => sm.BatchId == secBatchId && sm.Id != id)
                        .ToListAsync();

                    if (remaining.Any())
                    {
                        var maxSm = await _context.SectionMasters.MaxAsync(sm => (int?)sm.BatchId) ?? 0;
                        var maxQm = await _context.QuestionMasters.MaxAsync(qm => (int?)qm.BatchId) ?? 0;
                        int newBatchId = Math.Max(maxSm, maxQm) + 1;
                        if (newBatchId <= 0) newBatchId = 1;

                        foreach (var rem in remaining)
                        {
                            _context.SectionMasters.Add(new SectionMaster
                            {
                                BatchId               = newBatchId,
                                Name                  = rem.Name,
                                Description           = rem.Description,
                                TotalQuestions        = rem.TotalQuestions,
                                TotalMarks            = rem.TotalMarks,
                                StartQuestion         = rem.StartQuestion,
                                EndQuestion           = rem.EndQuestion,
                                MaxQuestionsToAttempt = rem.MaxQuestionsToAttempt,
                                CreatedAt             = DateTime.UtcNow
                            });

                            var remQuestions = await _context.QuestionMasters
                                .Where(qm => qm.BatchId == secBatchId && qm.Section == rem.Name)
                                .ToListAsync();

                            foreach (var qm in remQuestions)
                            {
                                _context.QuestionMasters.Add(new QuestionMaster
                                {
                                    BatchId   = newBatchId,
                                    Section   = rem.Name,
                                    Question  = qm.Question,
                                    Type      = qm.Type,
                                    Group     = qm.Group,
                                    Status    = qm.Status,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                        projectPaper.BatchId = newBatchId;
                    }
                    else
                    {
                        projectPaper.BatchId             = null;
                        projectPaper.IsSectionConfigured = false;
                    }
                    projectPaper.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Ok(new { success = true, message = "Section removed from paper" });
                }

                // If not master/shared, delete directly
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

                return Ok(new { success = true, batchId = batchId, message = $"Successfully linked {masters.Count} master section(s) to project paper" });
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
                .Where(qm => qm.BatchId == batchId)
                .OrderBy(qm => qm.Id)
                .ToListAsync();

            var allQTypesResponse = await _context.QuestionTypes.ToListAsync();
            var defQtResponse = allQTypesResponse.FirstOrDefault(t => t.QuestionTypeName == "MCQ") ?? allQTypesResponse.FirstOrDefault();

            return sectionMasters.Select(sm =>
            {
                decimal qMarks = sm.TotalQuestions > 0
                    ? Math.Round(sm.TotalMarks / sm.TotalQuestions, 2, MidpointRounding.AwayFromZero)
                    : 0m;

                return (object)new
                {
                    id                    = sm.Id,
                    projectPaperId        = projectPaper.Id,
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
                        id        = projectPaper.Id,
                        projectId = projectPaper.ProjectId,
                        paperId   = projectPaper.PaperId,
                        paperName = projectPaper.Paper?.PaperName,
                        paperCode = projectPaper.Paper?.PaperCode
                    },
                    questions = allQuestions
                        .Where(qm => qm.Section == sm.Name)
                        .Select(qm => {
                            int? typeId = qm.QuestionTypeId;
                            string typeName = qm.Type;
                            if (!typeId.HasValue && !string.IsNullOrEmpty(typeName))
                            {
                                var matched = allQTypesResponse.FirstOrDefault(t => t.QuestionTypeName.ToLower() == typeName.ToLower());
                                if (matched != null) typeId = matched.QuestionTypeId;
                            }
                            if (string.IsNullOrEmpty(typeName) && typeId.HasValue)
                            {
                                var matched = allQTypesResponse.FirstOrDefault(t => t.QuestionTypeId == typeId.Value);
                                if (matched != null) typeName = matched.QuestionTypeName;
                            }
                            if (!typeId.HasValue && defQtResponse != null)
                            {
                                typeId = defQtResponse.QuestionTypeId;
                                if (string.IsNullOrEmpty(typeName)) typeName = defQtResponse.QuestionTypeName;
                            }

                            return new
                            {
                                questionId        = qm.Id,
                                questionNo        = qm.Question,
                                typeId            = typeId,
                                questionTypeId    = typeId,
                                type              = !string.IsNullOrWhiteSpace(typeName) ? typeName : "MCQ",
                                isOptional        = !string.IsNullOrEmpty(qm.Group),
                                optionalGroupCode = qm.Group,
                                marks             = qMarks
                            };
                        }).ToList()
                };
            }).ToList();
        }
    }
}
