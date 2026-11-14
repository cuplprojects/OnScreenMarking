using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using API.Data;
using API.Models;
using API.Models.DTOs;
using API.Services;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PapersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
        private readonly IDailyAllocationService _dailyAllocationService;

        public PapersController(
            ApplicationDbContext context, 
            IWebHostEnvironment environment, 
            Microsoft.Extensions.Configuration.IConfiguration configuration,
            IDailyAllocationService dailyAllocationService)
        {
            _context = context;
            _environment = environment;
            _configuration = configuration;
            _dailyAllocationService = dailyAllocationService;
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetProjectDashboardPapers(
            [FromQuery] int projectId,
            [FromQuery] int? universityId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string search = "",
            [FromQuery] bool? isActive = null,
            [FromQuery] string sortField = "",
            [FromQuery] string sortOrder = "",
            [FromQuery] string statusFilter = "",
            [FromQuery] int? subjectId = null,
            [FromQuery] string? subjectName = null,
            [FromQuery] string? paperCode = null,
            [FromQuery] string? paperName = null,
            [FromQuery] string? catchNo = null)
        {
            try
            {
                // Ensure pageSize is within reasonable bounds
                if (pageSize <= 0) pageSize = 10;
                if (pageSize > 100) pageSize = 100;
                if (page <= 0) page = 1;

                // Resolve logged-in user's UniversityId
                int? targetUniversityId = universityId;
                if (!targetUniversityId.HasValue || targetUniversityId.Value <= 0)
                {
                    var loggedInUserIdStr = User.FindFirst("id")?.Value;
                    if (int.TryParse(loggedInUserIdStr, out int userId))
                    {
                        var userRecord = await _context.Users
                            .Where(u => u.Id == userId)
                            .Select(u => new { u.UniversityId })
                            .FirstOrDefaultAsync();

                        if (userRecord?.UniversityId != null && userRecord.UniversityId > 0)
                        {
                            targetUniversityId = userRecord.UniversityId;
                        }
                    }
                }

                var query = _context.Papers.AsQueryable();

                if (projectId > 0)
                {
                    query = query.Where(p => p.ProjectPapers.Any(pp => pp.ProjectId == projectId));
                }
                else if (targetUniversityId.HasValue && targetUniversityId.Value > 0)
                {
                    query = query.Where(p => p.UniversityId == targetUniversityId.Value || p.ProjectPapers.Any(pp => pp.Project.UniversityId == targetUniversityId.Value));
                }

                if (subjectId.HasValue)
                {
                    query = query.Where(p => p.SubjectPapers.Any(sp => sp.SubjectId == subjectId.Value));
                }

                if (!string.IsNullOrWhiteSpace(subjectName))
                {
                    query = query.Where(p => 
                        p.SubjectPapers.Any(sp => sp.Subject.SubName.Contains(subjectName)) ||
                        p.ProjectPapers.Any(pp => pp.CatchNo.Contains(subjectName))
                    );
                }

                if (!string.IsNullOrWhiteSpace(paperCode))
                {
                    query = query.Where(p => p.PaperCode.Contains(paperCode));
                }

                if (!string.IsNullOrWhiteSpace(paperName))
                {
                    query = query.Where(p => p.PaperName.Contains(paperName));
                }

                if (!string.IsNullOrWhiteSpace(catchNo))
                {
                    query = query.Where(p => p.ProjectPapers.Any(pp => pp.CatchNo != null && pp.CatchNo.Contains(catchNo)));
                }

                if (isActive.HasValue)
                {
                    query = query.Where(p => p.IsActive == isActive.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(p => p.PaperName.Contains(search) || p.PaperCode.Contains(search) || p.ProjectPapers.Select(pp => pp.CatchNo).FirstOrDefault().Contains(search));
                }

                // Filter by card status
                if (!string.IsNullOrWhiteSpace(statusFilter))
                {
                    switch (statusFilter.ToLower())
                    {
                        case "pending":
                            query = query.Where(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any()))) > 0);
                            break;
                        case "marking":
                            query = query.Where(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (s.Status == ScriptStatus.allocated || s.Status == ScriptStatus.marking)) > 0);
                            break;
                        case "completed":
                            query = query.Where(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && s.Status == ScriptStatus.completed) > 0);
                            break;
                        case "unconfigured":
                            query = query.Where(p => 
                                !p.ProjectPapers.Any(pp => (projectId <= 0 || pp.ProjectId == projectId) && (pp.IsSectionConfigured || (pp.BatchId.HasValue && pp.BatchId.Value > 0))));
                            break;
                        case "sections_missing":
                            query = query.Where(p => 
                                !p.ProjectPapers.Any(pp => (projectId <= 0 || pp.ProjectId == projectId) && (pp.IsSectionConfigured || (pp.BatchId.HasValue && pp.BatchId.Value > 0))));
                            break;
                        case "pdf_missing":
                            query = query.Where(p => !p.ProjectPapers.Any(pp => pp.ProjectId == projectId && !string.IsNullOrEmpty(pp.QuestionPaperPdfUrl)));
                            break;
                        case "not_assigned":
                            query = query.Where(p => !_context.PaperExaminers.Any(pe => pe.ProjectPaper != null && pe.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || pe.ProjectPaper.ProjectId == projectId)));
                            break;
                        case "ready_for_allocation":
                            query = query.Where(p => 
                                _context.Scripts.Any(s => s.ProjectPaper.PaperId == p.PaperId && 
                                                          (projectId <= 0 || s.ProjectPaper.ProjectId == projectId) && 
                                                          !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))
                            );
                            break;
                    }
                }

                // Sorting
                if (!string.IsNullOrWhiteSpace(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    switch (sortField.ToLower())
                    {
                        case "papercode":
                            query = isDesc ? query.OrderByDescending(p => p.PaperCode) : query.OrderBy(p => p.PaperCode);
                            break;
                        case "papername":
                            query = isDesc ? query.OrderByDescending(p => p.PaperName) : query.OrderBy(p => p.PaperName);
                            break;
                        case "catchno":
                            query = isDesc ? query.OrderByDescending(p => p.ProjectPapers.Select(pp => pp.CatchNo).FirstOrDefault()) : query.OrderBy(p => p.ProjectPapers.Select(pp => pp.CatchNo).FirstOrDefault());
                            break;
                        case "papernumber":
                            query = isDesc ? query.OrderByDescending(p => p.PaperNumber) : query.OrderBy(p => p.PaperNumber);
                            break;
                        case "maxmarks":
                            query = isDesc ? query.OrderByDescending(p => p.MaxMarks) : query.OrderBy(p => p.MaxMarks);
                            break;
                        case "totalquestions":
                            query = isDesc ? query.OrderByDescending(p => p.TotalQuestions) : query.OrderBy(p => p.TotalQuestions);
                            break;
                        case "subjectname":
                            query = isDesc 
                                ? query.OrderByDescending(p => p.SubjectPapers.Select(sp => sp.Subject.SubName).FirstOrDefault()) 
                                : query.OrderBy(p => p.SubjectPapers.Select(sp => sp.Subject.SubName).FirstOrDefault());
                            break;
                        case "totalscripts":
                            query = isDesc 
                                ? query.OrderByDescending(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId)) 
                                : query.OrderBy(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId));
                            break;
                        case "pendingscripts":
                            query = isDesc 
                                ? query.OrderByDescending(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))) 
                                : query.OrderBy(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus)));
                            break;
                        case "allocatedscripts":
                            query = isDesc 
                                ? query.OrderByDescending(p => _context.Allocations.Count(a => a.Script.ProjectPaper.PaperId == p.PaperId && a.AssignmentStatus)) 
                                : query.OrderBy(p => _context.Allocations.Count(a => a.Script.ProjectPaper.PaperId == p.PaperId && a.AssignmentStatus));
                            break;
                        case "completedscripts":
                            query = isDesc 
                                ? query.OrderByDescending(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && s.Status == ScriptStatus.completed)) 
                                : query.OrderBy(p => _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && s.Status == ScriptStatus.completed));
                            break;
                        default:
                            query = isDesc ? query.OrderByDescending(p => p.PaperNumber) : query.OrderBy(p => p.PaperNumber);
                            break;
                    }
                }
                else
                {
                    query = query.OrderBy(p => p.PaperNumber);
                }

                var totalCount = await query.CountAsync();

                var rawItems = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new
                    {
                        paperId = p.PaperId,
                        projectPaperId = p.ProjectPapers.Where(pp => pp.ProjectId == projectId).Select(pp => pp.Id).FirstOrDefault(),
                        batchId = p.ProjectPapers.Where(pp => pp.ProjectId == projectId).Select(pp => pp.BatchId).FirstOrDefault(),
                        universityId = p.UniversityId,
                        paperCode = p.PaperCode,
                        paperName = p.PaperName,
                        paperNumber = p.PaperNumber,
                        description = p.Description ?? "",
                        catchNo = p.ProjectPapers.Where(pp => pp.ProjectId == projectId).Select(pp => pp.CatchNo).FirstOrDefault() ?? "",
                        questionPaperPdfUrl = p.ProjectPapers.Where(pp => pp.ProjectId == projectId).Select(pp => pp.QuestionPaperPdfUrl).FirstOrDefault() ?? "",
                        projectId = projectId,
                        maxMarks = p.MaxMarks,
                        totalQuestions = p.TotalQuestions,
                        isActive = p.IsActive,
                        subjectName = p.SubjectPapers.Select(sp => sp.Subject.SubName).FirstOrDefault(),
                        subjectId = p.SubjectPapers.Select(sp => sp.SubjectId).FirstOrDefault(),
                        subjectNames = p.SubjectPapers.Select(sp => sp.Subject.SubName).ToList(),
                        subjectIds = p.SubjectPapers.Select(sp => sp.SubjectId).ToList(),
                        totalScripts = _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || s.ProjectPaper.ProjectId == projectId)),
                        completedScripts = _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || s.ProjectPaper.ProjectId == projectId) && s.Status == ScriptStatus.completed),
                        allocatedScripts = _context.Allocations.Count(a => a.Script.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || a.Script.ProjectPaper.ProjectId == projectId) && a.AssignmentStatus),
                        pendingScripts = _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || s.ProjectPaper.ProjectId == projectId) && !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus)),
                        isSectionConfiguredFlag = p.ProjectPapers.Any(pp => (projectId <= 0 || pp.ProjectId == projectId) && pp.IsSectionConfigured),
                        isExaminerAssigned = p.ProjectPapers.Any(pp => (projectId <= 0 || pp.ProjectId == projectId) && pp.IsExaminerAssigned) 
                            || _context.PaperExaminers.Any(pe => pe.ProjectPaper != null && pe.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || pe.ProjectPaper.ProjectId == projectId) && pe.IsActive),
                        expertsCount = _context.PaperExaminers.Count(pe => pe.ProjectPaper != null && pe.ProjectPaper.PaperId == p.PaperId && (projectId <= 0 || pe.ProjectPaper.ProjectId == projectId))
                    })
                    .ToListAsync();

                var items = rawItems.Select(p =>
                {
                    // Simplified: Only use IsSectionConfigured flag from ProjectPapers table
                    bool isConfigured = p.isSectionConfiguredFlag;

                    return new
                    {
                        p.paperId,
                        p.projectPaperId,
                        p.batchId,
                        p.universityId,
                        p.paperCode,
                        p.paperName,
                        p.paperNumber,
                        p.description,
                        p.catchNo,
                        p.questionPaperPdfUrl,
                        p.projectId,
                        p.maxMarks,
                        p.totalQuestions,
                        p.isActive,
                        p.subjectName,
                        p.subjectId,
                        p.subjectNames,
                        p.subjectIds,
                        p.totalScripts,
                        p.completedScripts,
                        p.allocatedScripts,
                        p.pendingScripts,
                        isSectionsConfigured = isConfigured,
                        isSectionConfigured = isConfigured,
                        p.isExaminerAssigned,
                        sectionsCount = 0, // No longer calculating section count
                        configuredMarks = 0m, // No longer calculating marks
                        p.expertsCount
                    };
                }).ToList();

                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                return Ok(new
                {
                    items = items,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("options")]
        public async Task<IActionResult> GetPaperOptions([FromQuery] int projectId)
        {
            try
            {
                if (projectId <= 0) return BadRequest(new { success = false, message = "Valid Project ID is required" });

                var options = await _context.ProjectPapers
                    .Where(pp => pp.ProjectId == projectId)
                    .Select(pp => new
                    {
                        paperId = pp.Paper.PaperId,
                        paperCode = pp.Paper.PaperCode,
                        paperName = pp.Paper.PaperName
                    })
                    .OrderBy(p => p.paperCode)
                    .ToListAsync();

                return Ok(options);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult> GetPapers(
            [FromQuery] int? subjectId = null, 
            [FromQuery] int? projectId = null, 
            [FromQuery] int? universityId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string sortField = "",
            [FromQuery] string sortOrder = "asc",
            [FromQuery] bool isMaster = false,
            [FromQuery] string search = "")
        {
            try
            {
                // Validate pagination parameters
                if (pageSize <= 0) pageSize = 10;
                if (pageSize > 100) pageSize = 100;
                if (page <= 0) page = 1;

                var query = _context.Papers
                    .Include(p => p.SubjectPapers)
                        .ThenInclude(sp => sp.Subject)
                    .Include(p => p.ProjectPapers)
                        .ThenInclude(pp => pp.Project)
                    .Include(p => p.ProjectPapers)
                        .ThenInclude(pp => pp.PaperExaminers)
                            .ThenInclude(pe => pe.Examiner)
                    .AsQueryable();

                if (subjectId.HasValue)
                {
                    query = query.Where(p =>
                        p.SubjectPapers.Any(sp => sp.SubjectId == subjectId.Value));
                }
                
                if (projectId.HasValue)
                    query = query.Where(p => p.ProjectPapers.Any(pp => pp.ProjectId == projectId.Value));

                // Filter by isMaster status vs university/project papers
                if (isMaster)
                {
                    // Master papers belong directly to a university
                    if (universityId.HasValue)
                    {
                        query = query.Where(p => p.UniversityId == universityId.Value);
                    }
                    else
                    {
                        query = query.Where(p => p.UniversityId.HasValue);
                    }
                }
                else if (universityId.HasValue && !projectId.HasValue)
                {
                    // Papers associated with this university or its projects
                    query = query.Where(p => p.UniversityId == universityId.Value || p.ProjectPapers.Any(pp => pp.Project.UniversityId == universityId.Value));
                }

                // Search filter
                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(p => p.PaperName.Contains(search) || p.PaperCode.Contains(search));
                }

                // Apply sorting
                if (!string.IsNullOrWhiteSpace(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    switch (sortField.ToLower())
                    {
                        case "papercode":
                            query = isDesc ? query.OrderByDescending(p => p.PaperCode) : query.OrderBy(p => p.PaperCode);
                            break;
                        case "papername":
                            query = isDesc ? query.OrderByDescending(p => p.PaperName) : query.OrderBy(p => p.PaperName);
                            break;
                        default:
                            query = isDesc ? query.OrderByDescending(p => p.PaperNumber) : query.OrderBy(p => p.PaperNumber);
                            break;
                    }
                }
                else
                {
                    query = query.OrderBy(p => p.PaperNumber);
                }

                // Get total count before pagination
                var totalCount = await query.CountAsync();

                // Apply pagination
                var paginatedPapers = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var paperBatchIds = paginatedPapers
                    .SelectMany(p => p.ProjectPapers)
                    .Where(pp => pp.BatchId.HasValue && pp.BatchId.Value > 0)
                    .Select(pp => pp.BatchId!.Value)
                    .Distinct()
                    .ToList();

                var smList = paperBatchIds.Any()
                    ? await _context.SectionMasters.Where(sm => paperBatchIds.Contains(sm.BatchId)).ToListAsync()
                    : new List<SectionMaster>();

                var qmList = paperBatchIds.Any()
                    ? await _context.QuestionMasters.Where(qm => paperBatchIds.Contains(qm.BatchId)).ToListAsync()
                    : new List<QuestionMaster>();

                // Map to DTOs
                var paperDtos = paginatedPapers.Select(p =>
                {
                    var relevantPp = projectId.HasValue 
                        ? p.ProjectPapers.FirstOrDefault(pp => pp.ProjectId == projectId.Value)
                        : p.ProjectPapers.FirstOrDefault();

                    int bId = relevantPp?.BatchId ?? 0;
                    var bSections = bId > 0 ? smList.Where(sm => sm.BatchId == bId).ToList() : new List<SectionMaster>();
                    var bQuestions = bId > 0 ? qmList.Where(qm => qm.BatchId == bId).ToList() : new List<QuestionMaster>();

                    int secCount = bSections.Count > 0 
                        ? bSections.Count 
                        : bQuestions.Select(q => q.Section).Where(s => !string.IsNullOrEmpty(s)).Distinct().Count();

                    var activeExaminers = relevantPp?.PaperExaminers?
                        .Where(pe => pe.IsActive && pe.Examiner != null)
                        .ToList() ?? new List<PaperExaminer>();

                    int examCount = activeExaminers.Count;
                    var examNames = activeExaminers.Select(pe => pe.Examiner.Name).Distinct().ToList();

                    return new PaperDto
                    {
                        PaperId = p.PaperId,
                        PaperCode = p.PaperCode,
                        PaperName = p.PaperName,
                        PaperNumber = p.PaperNumber,
                        MaxMarks = p.MaxMarks,
                        TotalQuestions = p.TotalQuestions,
                        Description = p.Description,
                        IsActive = p.IsActive,
                        UniversityId = p.UniversityId,
                        ProjectId = projectId ?? p.ProjectPapers.Select(pp => (int?)pp.ProjectId).FirstOrDefault(),
                        ProjectPaperId = relevantPp?.Id,
                        BatchId = relevantPp?.BatchId,
                        CatchNo = relevantPp?.CatchNo ?? "",
                        QuestionPaperPdfUrl = relevantPp?.QuestionPaperPdfUrl ?? "",
                        SubjectIds = p.SubjectPapers
                            .Select(sp => sp.SubjectId)
                            .ToList(),
                        SubjectNames = p.SubjectPapers
                            .Select(sp => sp.Subject.SubName)
                            .ToList(),
                        MasterSectionIds = bSections.Select(sm => sm.Id).ToList(),
                        MasterSectionNames = bSections.Select(sm => sm.Name).Distinct().ToList(),
                        SectionsCount = secCount,
                        ExaminersCount = examCount,
                        ExaminerNames = examNames
                    };
                }).ToList();

                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                return Ok(new
                {
                    items = paperDtos,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PaperDto>> GetPaper(int id)
        {
            try
            {
                var paper = await _context.Papers
                    .Include(p => p.Sections)
                    .Include(p => p.SubjectPapers)
                        .ThenInclude(sp => sp.Subject)
                    .Include(p => p.ProjectPapers)
                    .FirstOrDefaultAsync(p => p.PaperId == id);

                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                var firstProjectPaper = paper.ProjectPapers.FirstOrDefault();

                var paperDto = new PaperDto
                {
                    PaperId = paper.PaperId,
                    PaperCode = paper.PaperCode,
                    PaperName = paper.PaperName,
                    PaperNumber = paper.PaperNumber,
                    MaxMarks = paper.MaxMarks,
                    TotalQuestions = paper.TotalQuestions,
                    Description = paper.Description,
                    CatchNo = firstProjectPaper?.CatchNo ?? "",
                    QuestionPaperPdfUrl = firstProjectPaper?.QuestionPaperPdfUrl ?? "",
                    IsActive = paper.IsActive,
                    UniversityId = paper.UniversityId,
                    ProjectId = firstProjectPaper?.ProjectId,
                    ProjectPaperId = firstProjectPaper?.Id,
                    SubjectIds = paper.SubjectPapers
                        .Select(sp => sp.SubjectId)
                        .ToList(),

                    SubjectNames = paper.SubjectPapers
                        .Select(sp => sp.Subject.SubName)
                        .ToList()
                };

                return Ok(paperDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<PaperDto>> CreatePaper(
            [FromBody] PaperDto paperDto)
        {
            try
            {
                Project? project = null;
                int? resolvedUniversityId = paperDto.UniversityId;

                // If ProjectId is provided, validate project exists and determine university
                if (paperDto.ProjectId.HasValue && paperDto.ProjectId.Value > 0)
                {
                    project = await _context.Projects.FindAsync(paperDto.ProjectId.Value);

                    if (project == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "Project not found"
                        });
                    }

                    if (!project.IsActive)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "Cannot add papers to an inactive project. Please activate the project first."
                        });
                    }

                    if (!resolvedUniversityId.HasValue || resolvedUniversityId.Value <= 0)
                    {
                        resolvedUniversityId = project.UniversityId;
                    }
                }
                else
                {
                    // Academic / Master paper without a project requires UniversityId
                    if (!resolvedUniversityId.HasValue || resolvedUniversityId.Value <= 0)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "University ID is required for master paper"
                        });
                    }

                    var uniExists = await _context.Universities.AnyAsync(u => u.UniversityId == resolvedUniversityId.Value);
                    if (!uniExists)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "University not found"
                        });
                    }
                }

                // Validate subjects exist
                if (paperDto.SubjectIds == null || !paperDto.SubjectIds.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "At least one subject is required"
                    });
                }

                if (paperDto.TotalQuestions <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Total Questions must be greater than 0"
                    });
                }

                var distinctSubjectIds = paperDto.SubjectIds.Distinct().ToList();
                var subjects = await _context.Subjects
                    .Where(s => distinctSubjectIds.Contains(s.SubjectId))
                    .ToListAsync();

                if (subjects.Count != distinctSubjectIds.Count)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "One or more subjects not found"
                    });
                }

                // Check duplicate paper code
                if (await _context.Papers
                    .AnyAsync(p => p.PaperCode == paperDto.PaperCode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Paper code already exists"
                    });
                }

                // If master sections provided, validate that their total questions matches paper total questions
                if (paperDto.MasterSectionIds != null && paperDto.MasterSectionIds.Any())
                {
                    var mappedSections = await _context.SectionMasters
                        .Where(sm => paperDto.MasterSectionIds.Contains(sm.Id))
                        .ToListAsync();

                    if (mappedSections.Any())
                    {
                        int sumQuestions = mappedSections.Sum(sm => sm.TotalQuestions);
                        decimal sumMarks = mappedSections.Sum(sm => sm.TotalMarks);

                        if (paperDto.TotalQuestions > 0 && sumQuestions != paperDto.TotalQuestions)
                        {
                            return BadRequest(new { 
                                success = false, 
                                message = $"Incorrect configuration: Selected master sections have a total of {sumQuestions} questions. Total Questions must be {sumQuestions} only." 
                            });
                        }

                        if (paperDto.MaxMarks > 0 && sumMarks > paperDto.MaxMarks)
                        {
                            return BadRequest(new { 
                                success = false, 
                                message = $"Cannot set max marks to {paperDto.MaxMarks}. Selected master sections require {sumMarks} marks." 
                            });
                        }
                    }
                }

                var paper = new Paper
                {
                    PaperCode = paperDto.PaperCode,
                    PaperName = paperDto.PaperName,
                    PaperNumber = paperDto.PaperNumber,
                    MaxMarks = Math.Round(paperDto.MaxMarks, 2, MidpointRounding.AwayFromZero),
                    TotalQuestions = paperDto.TotalQuestions,
                    Description = paperDto.Description,
                    UniversityId = resolvedUniversityId,
                    IsActive = paperDto.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Papers.Add(paper);
                await _context.SaveChangesAsync();

                // Create SubjectPaper mappings
                foreach (var subjectId in distinctSubjectIds)
                {
                    _context.SubjectPapers.Add(new SubjectPaper
                    {
                        SubjectId = subjectId,
                        PaperId = paper.PaperId
                    });
                }

                // Create ProjectPaper mapping if ProjectId is provided
                if (paperDto.ProjectId.HasValue && paperDto.ProjectId.Value > 0)
                {
                    _context.ProjectPapers.Add(new ProjectPaper
                    {
                        ProjectId = paperDto.ProjectId.Value,
                        PaperId = paper.PaperId,
                        CatchNo = paperDto.CatchNo ?? "",
                        QuestionPaperPdfUrl = paperDto.QuestionPaperPdfUrl ?? "",
                        IsActive = true,
                        IsSectionConfigured = _context.Sections.Any(s => s.PaperId == paper.PaperId),
                        IsExaminerAssigned = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();

                paperDto.PaperId = paper.PaperId;
                paperDto.UniversityId = resolvedUniversityId;

                return CreatedAtAction(
                    nameof(GetPaper),
                    new { id = paper.PaperId },
                    paperDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("import")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ImportPapers([FromBody] ImportPapersRequest request)
        {
            try
            {
                if (request == null || request.TargetProjectId <= 0 || request.SourcePaperIds == null || !request.SourcePaperIds.Any())
                {
                    return BadRequest(new { success = false, message = "Invalid import request parameters" });
                }

                var project = await _context.Projects.FindAsync(request.TargetProjectId);
                if (project == null)
                {
                    return NotFound(new { success = false, message = "Target project not found" });
                }

                if (!project.IsActive)
                {
                    return BadRequest(new { success = false, message = "Cannot import papers to an inactive project. Please activate the project first." });
                }

                int importedCount = 0;
                int sectionsConfiguredCount = 0;
                int examinersAssignedCount = 0;

                // Load explicit master sections if provided
                List<SectionMaster> explicitMasterSections = new List<SectionMaster>();
                if (request.MasterSectionIds != null && request.MasterSectionIds.Any())
                {
                    explicitMasterSections = await _context.SectionMasters
                        .Where(m => request.MasterSectionIds.Contains(m.Id))
                        .ToListAsync();
                }

                foreach (var paperId in request.SourcePaperIds.Distinct())
                {
                    var paper = await _context.Papers.FindAsync(paperId);
                    if (paper == null) continue;

                    // Locate source ProjectPaper if available (matching SourceProjectId or latest)
                    ProjectPaper? sourcePp = null;
                    if (request.SourceProjectId.HasValue && request.SourceProjectId.Value > 0)
                    {
                        sourcePp = await _context.ProjectPapers
                            .Include(pp => pp.PaperExaminers)
                            .FirstOrDefaultAsync(pp => pp.PaperId == paperId && pp.ProjectId == request.SourceProjectId.Value);
                    }

                    if (sourcePp == null)
                    {
                        sourcePp = await _context.ProjectPapers
                            .Include(pp => pp.PaperExaminers)
                            .Where(pp => pp.PaperId == paperId)
                            .OrderByDescending(pp => pp.UpdatedAt)
                            .FirstOrDefaultAsync();
                    }

                    var targetPp = await _context.ProjectPapers
                        .Include(pp => pp.PaperExaminers)
                        .FirstOrDefaultAsync(pp => pp.ProjectId == request.TargetProjectId && pp.PaperId == paperId);

                    string targetCatchNo = request.ImportCatchNo ? (sourcePp?.CatchNo ?? "") : "";

                    if (targetPp == null)
                    {
                        targetPp = new ProjectPaper
                        {
                            ProjectId = request.TargetProjectId,
                            PaperId = paperId,
                            CatchNo = targetCatchNo,
                            QuestionPaperPdfUrl = "",
                            IsActive = true,
                            IsSectionConfigured = false,
                            IsExaminerAssigned = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.ProjectPapers.Add(targetPp);
                        await _context.SaveChangesAsync();
                        importedCount++;
                    }
                    else
                    {
                        if (request.ImportCatchNo && string.IsNullOrEmpty(targetPp.CatchNo) && !string.IsNullOrEmpty(targetCatchNo))
                        {
                            targetPp.CatchNo = targetCatchNo;
                            targetPp.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    // 1. Configurable Sections Import
                    if (request.ImportSections)
                    {
                        if (sourcePp != null && sourcePp.BatchId.HasValue && sourcePp.BatchId.Value > 0)
                        {
                            targetPp.BatchId = sourcePp.BatchId;
                            targetPp.IsSectionConfigured = true;
                            targetPp.UpdatedAt = DateTime.UtcNow;
                            _context.ProjectPapers.Update(targetPp);
                            await _context.SaveChangesAsync();
                            sectionsConfiguredCount++;
                        }
                        else if (explicitMasterSections.Any())
                        {
                            targetPp.BatchId = explicitMasterSections.First().BatchId;
                            targetPp.IsSectionConfigured = true;
                            targetPp.UpdatedAt = DateTime.UtcNow;
                            _context.ProjectPapers.Update(targetPp);
                            await _context.SaveChangesAsync();
                            sectionsConfiguredCount++;
                        }
                    }

                    // 2. Configurable Examiner Import
                    if (request.ImportExaminers)
                    {
                        var sourceExaminers = new List<PaperExaminer>();
                        if (sourcePp != null && sourcePp.PaperExaminers != null && sourcePp.PaperExaminers.Any())
                        {
                            sourceExaminers = sourcePp.PaperExaminers.Where(pe => pe.IsActive).ToList();
                        }
                        else if (request.SourceProjectId.HasValue && request.SourceProjectId.Value > 0)
                        {
                            sourceExaminers = await _context.PaperExaminers
                                .Where(pe => pe.ProjectId == request.SourceProjectId.Value && pe.ProjectPaper.PaperId == paperId && pe.IsActive)
                                .ToListAsync();
                        }
                        else
                        {
                            sourceExaminers = await _context.PaperExaminers
                                .Where(pe => pe.ProjectPaper.PaperId == paperId && pe.IsActive)
                                .ToListAsync();
                        }

                        var existingTargetExaminerIds = await _context.PaperExaminers
                            .Where(pe => pe.ProjectPaperId == targetPp.Id && pe.IsActive)
                            .Select(pe => pe.ExaminerId)
                            .ToListAsync();

                        int newExamsForPaper = 0;
                        foreach (var se in sourceExaminers)
                        {
                            if (!existingTargetExaminerIds.Contains(se.ExaminerId))
                            {
                                _context.PaperExaminers.Add(new PaperExaminer
                                {
                                    ProjectPaperId = targetPp.Id,
                                    ProjectId = request.TargetProjectId,
                                    ExaminerId = se.ExaminerId,
                                    IsActive = true,
                                    AssignedAt = DateTime.UtcNow
                                });
                                existingTargetExaminerIds.Add(se.ExaminerId);
                                newExamsForPaper++;
                            }
                        }

                        if (existingTargetExaminerIds.Any())
                        {
                            targetPp.IsExaminerAssigned = true;
                        }
                        examinersAssignedCount += newExamsForPaper;
                    }
                }

                await _context.SaveChangesAsync();

                var details = new List<string>();
                if (request.ImportCatchNo) details.Add("Catch No");
                if (request.ImportSections) details.Add($"Sections: {sectionsConfiguredCount}");
                if (request.ImportExaminers) details.Add($"Examiners: {examinersAssignedCount}");

                string configInfo = details.Any() ? $" (Configured: {string.Join(", ", details)})" : "";
                string responseMsg = $"{importedCount} paper(s) imported successfully{configInfo}.";

                return Ok(new { 
                    success = true, 
                    message = responseMsg,
                    data = new {
                        importedCount,
                        sectionsConfiguredCount,
                        examinersAssignedCount
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdatePaper(int id, [FromBody] PaperDto paperDto)
        {
            try
            {
                var paper = await _context.Papers
                    .Include(p => p.SubjectPapers)
                    .Include(p => p.ProjectPapers)
                    .FirstOrDefaultAsync(p => p.PaperId == id);
                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                if (paperDto.TotalQuestions <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Total Questions must be greater than 0"
                    });
                }

                // Validate if TotalQuestions or MaxMarks conflicts with mapped master sections
                if (paperDto.MasterSectionIds != null && paperDto.MasterSectionIds.Any())
                {
                    var mappedSections = await _context.SectionMasters
                        .Where(sm => paperDto.MasterSectionIds.Contains(sm.Id))
                        .ToListAsync();

                    if (mappedSections.Any())
                    {
                        int sumQuestions = mappedSections.Sum(sm => sm.TotalQuestions);
                        decimal sumMarks = mappedSections.Sum(sm => sm.TotalMarks);

                        if (paperDto.TotalQuestions > 0 && sumQuestions != paperDto.TotalQuestions)
                        {
                            return BadRequest(new { 
                                success = false, 
                                message = $"Incorrect configuration: Selected master sections have a total of {sumQuestions} questions. Total Questions must be {sumQuestions} only." 
                            });
                        }

                        if (paperDto.MaxMarks > 0 && sumMarks > paperDto.MaxMarks)
                        {
                            return BadRequest(new { 
                                success = false, 
                                message = $"Cannot set max marks to {paperDto.MaxMarks}. Mapped sections require at least {sumMarks} marks." 
                            });
                        }
                    }
                }

                if (!string.IsNullOrEmpty(paperDto.PaperCode)) paper.PaperCode = paperDto.PaperCode;
                paper.PaperName = paperDto.PaperName;
                paper.PaperNumber = paperDto.PaperNumber;
                paper.MaxMarks = Math.Round(paperDto.MaxMarks, 2, MidpointRounding.AwayFromZero);
                paper.TotalQuestions = paperDto.TotalQuestions;
                paper.Description = paperDto.Description;
                paper.IsActive = paperDto.IsActive;
                if (paperDto.UniversityId.HasValue && paperDto.UniversityId.Value > 0)
                {
                    paper.UniversityId = paperDto.UniversityId.Value;
                }
                paper.UpdatedAt = DateTime.UtcNow;

                // Update ProjectPaper details if projectId is provided
                if (paperDto.ProjectId.HasValue && paperDto.ProjectId.Value > 0)
                {
                    var proj = await _context.Projects.FindAsync(paperDto.ProjectId.Value);
                    if (proj != null && !proj.IsActive)
                    {
                        return BadRequest(new { success = false, message = "Cannot update paper for an inactive project. Please activate the project first." });
                    }

                    var pp = paper.ProjectPapers.FirstOrDefault(x => x.ProjectId == paperDto.ProjectId.Value);
                    if (pp != null)
                    {
                        if (paperDto.CatchNo != null) pp.CatchNo = paperDto.CatchNo;
                        if (paperDto.QuestionPaperPdfUrl != null) pp.QuestionPaperPdfUrl = paperDto.QuestionPaperPdfUrl;
                        pp.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.ProjectPapers.Add(new ProjectPaper
                        {
                            ProjectId = paperDto.ProjectId.Value,
                            PaperId = paper.PaperId,
                            CatchNo = paperDto.CatchNo ?? "",
                            QuestionPaperPdfUrl = paperDto.QuestionPaperPdfUrl ?? "",
                            IsActive = true,
                            IsSectionConfigured = _context.Sections.Any(s => s.PaperId == paper.PaperId),
                            IsExaminerAssigned = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }
                else if (paperDto.CatchNo != null && paper.ProjectPapers.Any())
                {
                    foreach (var pp in paper.ProjectPapers)
                    {
                        pp.CatchNo = paperDto.CatchNo;
                        pp.UpdatedAt = DateTime.UtcNow;
                    }
                }

                // Update subjects mapping if provided
                if (paperDto.SubjectIds != null && paperDto.SubjectIds.Any())
                {
                    _context.SubjectPapers.RemoveRange(paper.SubjectPapers);
                    foreach (var sId in paperDto.SubjectIds)
                    {
                        _context.SubjectPapers.Add(new SubjectPaper
                        {
                            PaperId = paper.PaperId,
                            SubjectId = sId
                        });
                    }
                }

                _context.Papers.Update(paper);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Paper updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeletePaper(int id)
        {
            try
            {
                var paper = await _context.Papers.FirstOrDefaultAsync(p => p.PaperId == id);
                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                _context.Papers.Remove(paper);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Paper deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/sections")]
        public async Task<ActionResult<IEnumerable<object>>> GetPaperSections(int id)
        {
            try
            {
                var batchId = await _context.ProjectPapers
                    .Where(pp => pp.PaperId == id && pp.BatchId.HasValue && pp.BatchId.Value > 0)
                    .Select(pp => pp.BatchId!.Value)
                    .FirstOrDefaultAsync();

                if (batchId > 0)
                {
                    var masters = await _context.SectionMasters
                        .Where(sm => sm.BatchId == batchId)
                        .OrderBy(sm => sm.Id)
                        .ToListAsync();
                    return Ok(masters);
                }

                return Ok(new List<object>());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{id}/question-paper")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UploadQuestionPaper(int id, [FromQuery] int? projectId, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { success = false, message = "No file uploaded" });

                if (projectId.HasValue && projectId.Value > 0)
                {
                    var proj = await _context.Projects.FindAsync(projectId.Value);
                    if (proj != null && !proj.IsActive)
                    {
                        return BadRequest(new { success = false, message = "Cannot upload question paper for an inactive project. Please activate the project first." });
                    }
                }

                var paper = await _context.Papers
                    .Include(p => p.ProjectPapers)
                    .FirstOrDefaultAsync(p => p.PaperId == id);

                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                var basePath = _configuration["StorageSettings:BasePath"];
                var projFolder = (projectId.HasValue && projectId.Value > 0) ? projectId.Value.ToString() : "master";
                var targetFolder = Path.Combine(basePath, "OSM", projFolder, paper.PaperId.ToString(), "questionpaperpdf");
                if (!Directory.Exists(targetFolder))
                {
                    Directory.CreateDirectory(targetFolder);
                }

                var safeCode = string.Join("_", (paper.PaperCode ?? "QP").Split(Path.GetInvalidFileNameChars()));
                var uniqueFileName = $"QP_{safeCode}_{Guid.NewGuid():N}.pdf";
                var filePath = Path.Combine(targetFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }

                var fileUrl = $"/OSM/{projFolder}/{paper.PaperId}/questionpaperpdf/{uniqueFileName}";

                if (projectId.HasValue && projectId.Value > 0)
                {
                    var projectPaper = paper.ProjectPapers.FirstOrDefault(pp => pp.ProjectId == projectId.Value);
                    if (projectPaper != null)
                    {
                        projectPaper.QuestionPaperPdfUrl = fileUrl;
                        projectPaper.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.ProjectPapers.Add(new ProjectPaper
                        {
                            ProjectId = projectId.Value,
                            PaperId = paper.PaperId,
                            QuestionPaperPdfUrl = fileUrl,
                            IsActive = true,
                            IsSectionConfigured = _context.Sections.Any(s => s.PaperId == paper.PaperId),
                            IsExaminerAssigned = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    if (paper.ProjectPapers.Any())
                    {
                        foreach (var pp in paper.ProjectPapers)
                        {
                            pp.QuestionPaperPdfUrl = fileUrl;
                            pp.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                await _context.SaveChangesAsync();

                int? targetUniId = paper.UniversityId;
                if (projectId.HasValue && projectId.Value > 0)
                {
                    var pp = paper.ProjectPapers.FirstOrDefault(p => p.ProjectId == projectId.Value);
                    if (pp?.Project != null && pp.Project.UniversityId > 0)
                    {
                        targetUniId = pp.Project.UniversityId;
                    }
                }
                _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId);

                return Ok(new { success = true, url = fileUrl, message = "Question paper PDF uploaded successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}/question-paper")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RemoveQuestionPaper(int id, [FromQuery] int? projectId)
        {
            try
            {
                if (projectId.HasValue && projectId.Value > 0)
                {
                    var proj = await _context.Projects.FindAsync(projectId.Value);
                    if (proj != null && !proj.IsActive)
                    {
                        return BadRequest(new { success = false, message = "Cannot remove question paper from an inactive project. Please activate the project first." });
                    }
                }
                var paper = await _context.Papers
                    .Include(p => p.ProjectPapers)
                    .FirstOrDefaultAsync(p => p.PaperId == id);

                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                if (projectId.HasValue && projectId.Value > 0)
                {
                    var projectPaper = paper.ProjectPapers.FirstOrDefault(pp => pp.ProjectId == projectId.Value);
                    if (projectPaper != null)
                    {
                        projectPaper.QuestionPaperPdfUrl = null;
                        projectPaper.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else
                {
                    foreach (var pp in paper.ProjectPapers)
                    {
                        pp.QuestionPaperPdfUrl = null;
                        pp.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Question paper removed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("bulk-upload-question-papers")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> BulkUploadQuestionPapers([FromQuery] int? projectId, List<IFormFile> files)
        {
            try
            {
                if (files == null || !files.Any())
                {
                    return BadRequest(new { success = false, message = "No files uploaded" });
                }

                if (projectId.HasValue && projectId.Value > 0)
                {
                    var proj = await _context.Projects.FindAsync(projectId.Value);
                    if (proj != null && !proj.IsActive)
                    {
                        return BadRequest(new { success = false, message = "Cannot upload question papers for an inactive project. Please activate the project first." });
                    }
                }

                var papersQuery = _context.Papers
                    .Include(p => p.ProjectPapers)
                    .AsQueryable();

                if (projectId.HasValue && projectId.Value > 0)
                {
                    papersQuery = papersQuery.Where(p => p.ProjectPapers.Any(pp => pp.ProjectId == projectId.Value));
                }

                var allPapers = await papersQuery.ToListAsync();

                var basePath = _configuration["StorageSettings:BasePath"] 
                    ?? _configuration["StorageSettings:BaseOsmPath"] 
                    ?? Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "storage");

                var projFolder = (projectId.HasValue && projectId.Value > 0) ? projectId.Value.ToString() : "master";

                var results = new List<object>();
                int matchedCount = 0;
                int unmatchedCount = 0;

                foreach (var file in files)
                {
                    if (file == null || file.Length == 0) continue;

                    var originalFileName = Path.GetFileName(file.FileName);
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(originalFileName)?.Trim() ?? "";

                    string cleanFileName = fileNameWithoutExt;
                    if (cleanFileName.StartsWith("QP_", StringComparison.OrdinalIgnoreCase))
                        cleanFileName = cleanFileName.Substring(3);
                    else if (cleanFileName.StartsWith("QP-", StringComparison.OrdinalIgnoreCase))
                        cleanFileName = cleanFileName.Substring(3);
                    else if (cleanFileName.StartsWith("CATCH_", StringComparison.OrdinalIgnoreCase))
                        cleanFileName = cleanFileName.Substring(6);
                    else if (cleanFileName.StartsWith("CATCH-", StringComparison.OrdinalIgnoreCase))
                        cleanFileName = cleanFileName.Substring(6);
                    else if (cleanFileName.StartsWith("CATCH", StringComparison.OrdinalIgnoreCase))
                        cleanFileName = cleanFileName.Substring(5);

                    cleanFileName = cleanFileName.Trim('_', '-', ' ');

                    Paper? matchedPaper = null;
                    ProjectPaper? matchedProjectPaper = null;

                    if (projectId.HasValue && projectId.Value > 0)
                    {
                        matchedPaper = allPapers.FirstOrDefault(p =>
                            p.ProjectPapers.Any(pp => pp.ProjectId == projectId.Value &&
                                !string.IsNullOrEmpty(pp.CatchNo) &&
                                (pp.CatchNo.Trim().Equals(fileNameWithoutExt, StringComparison.OrdinalIgnoreCase) ||
                                 pp.CatchNo.Trim().Equals(cleanFileName, StringComparison.OrdinalIgnoreCase))
                            )
                        );

                        if (matchedPaper != null)
                        {
                            matchedProjectPaper = matchedPaper.ProjectPapers.FirstOrDefault(pp => pp.ProjectId == projectId.Value);
                        }
                    }

                    if (matchedPaper == null)
                    {
                        matchedPaper = allPapers.FirstOrDefault(p =>
                            p.ProjectPapers.Any(pp =>
                                !string.IsNullOrEmpty(pp.CatchNo) &&
                                (pp.CatchNo.Trim().Equals(fileNameWithoutExt, StringComparison.OrdinalIgnoreCase) ||
                                 pp.CatchNo.Trim().Equals(cleanFileName, StringComparison.OrdinalIgnoreCase))
                            )
                        );
                    }

                    if (matchedPaper == null)
                    {
                        matchedPaper = allPapers.FirstOrDefault(p =>
                            !string.IsNullOrEmpty(p.PaperCode) &&
                            (p.PaperCode.Trim().Equals(fileNameWithoutExt, StringComparison.OrdinalIgnoreCase) ||
                             p.PaperCode.Trim().Equals(cleanFileName, StringComparison.OrdinalIgnoreCase))
                        );
                    }

                    if (matchedPaper != null)
                    {
                        var targetFolder = Path.Combine(basePath, "osm", projFolder, matchedPaper.PaperId.ToString(), "questionpaperpdf");
                        if (!Directory.Exists(targetFolder))
                        {
                            Directory.CreateDirectory(targetFolder);
                        }

                        var safeCode = string.Join("_", (matchedPaper.PaperCode ?? "QP").Split(Path.GetInvalidFileNameChars()));
                        var uniqueFileName = $"QP_{safeCode}_{Guid.NewGuid():N}.pdf";
                        var filePath = Path.Combine(targetFolder, uniqueFileName);

                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(stream);
                        }

                        var fileUrl = $"/osm/{projFolder}/{matchedPaper.PaperId}/questionpaperpdf/{uniqueFileName}";

                        if (projectId.HasValue && projectId.Value > 0)
                        {
                            if (matchedProjectPaper == null)
                            {
                                matchedProjectPaper = matchedPaper.ProjectPapers.FirstOrDefault(pp => pp.ProjectId == projectId.Value);
                            }

                            if (matchedProjectPaper != null)
                            {
                                matchedProjectPaper.QuestionPaperPdfUrl = fileUrl;
                                matchedProjectPaper.UpdatedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                matchedProjectPaper = new ProjectPaper
                                {
                                    ProjectId = projectId.Value,
                                    PaperId = matchedPaper.PaperId,
                                    QuestionPaperPdfUrl = fileUrl,
                                    IsActive = true,
                                    IsSectionConfigured = _context.Sections.Any(s => s.PaperId == matchedPaper.PaperId),
                                    IsExaminerAssigned = false,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.ProjectPapers.Add(matchedProjectPaper);
                            }
                        }
                        else
                        {
                            foreach (var pp in matchedPaper.ProjectPapers)
                            {
                                pp.QuestionPaperPdfUrl = fileUrl;
                                pp.UpdatedAt = DateTime.UtcNow;
                            }
                        }

                        matchedCount++;
                        var matchedCatch = matchedProjectPaper?.CatchNo ?? matchedPaper.ProjectPapers.Select(pp => pp.CatchNo).FirstOrDefault() ?? "";

                        results.Add(new
                        {
                            fileName = originalFileName,
                            status = "Success",
                            message = $"Matched to Paper '{matchedPaper.PaperCode}' ({matchedPaper.PaperName})",
                            paperId = matchedPaper.PaperId,
                            paperCode = matchedPaper.PaperCode,
                            paperName = matchedPaper.PaperName,
                            catchNo = matchedCatch,
                            fileUrl = fileUrl
                        });
                    }
                    else
                    {
                        unmatchedCount++;
                        results.Add(new
                        {
                            fileName = originalFileName,
                            status = "Unmatched",
                            message = $"No paper found matching Catch No / Code '{fileNameWithoutExt}'",
                            paperId = (int?)null,
                            paperCode = "",
                            paperName = "",
                            catchNo = fileNameWithoutExt,
                            fileUrl = ""
                        });
                    }
                }

                await _context.SaveChangesAsync();

                if (projectId.HasValue && projectId.Value > 0)
                {
                    var proj = await _context.Projects.FindAsync(projectId.Value);
                    if (proj != null && proj.UniversityId > 0)
                    {
                        _dailyAllocationService.TriggerAutoAllocationBackground(proj.UniversityId);
                    }
                }

                return Ok(new
                {
                    success = true,
                    totalFiles = files.Count,
                    matchedCount = matchedCount,
                    unmatchedCount = unmatchedCount,
                    message = $"Processed {files.Count} files: {matchedCount} allocated to papers, {unmatchedCount} unmatched.",
                    results = results
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}

