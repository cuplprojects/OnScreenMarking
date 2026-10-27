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
    public class ScriptsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public ScriptsController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ScriptDto>>> GetScripts(
            [FromQuery] string status = null,
            [FromQuery] int? paperId = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10)
        {
            try
            {
                var query = _context.Scripts.AsQueryable();

                if (!string.IsNullOrEmpty(status) && Enum.TryParse<ScriptStatus>(status.Replace("-", "_"), true, out var parsedStatus))
                    query = query.Where(s => s.Status == parsedStatus);

                if (paperId.HasValue)
                    query = query.Where(s => s.ProjectPaper.PaperId == paperId.Value);

                var total = await query.CountAsync();
                var scripts = await query
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                        .ThenInclude(p => p.SubjectPapers)
                            .ThenInclude(sp => sp.Subject)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                var scriptDtos = scripts.Select(s => {
                    var subjectPaper = s.ProjectPaper?.Paper?.SubjectPapers?.FirstOrDefault();
                    return new ScriptDto
                    {
                        Id = s.Id,
                        GeneratedBarcode = s.GeneratedBarcode,
                        InBuiltBarCode = s.InBuiltBarcode,
                        PaperId = s.ProjectPaper.PaperId,
                        ProjectPaperId = s.ProjectPaperId,
                        CleanPdfUrl = s.CleanPdfUrl,
                        Status = s.Status,
                        IsReEvaluationRequested = s.IsReEvaluationRequested,
                        RollNumber = s.RollNumber,
                        TotalMarks = s.TotalMarks,
                        Percentage = s.Percentage,
                        Remarks = s.Remarks,
                        SubmittedAt = s.SubmittedAt,
                        PaperName = s.ProjectPaper?.Paper?.PaperName,
                        PaperCode = s.ProjectPaper?.Paper?.PaperCode,
                        SubjectId = subjectPaper?.SubjectId,
                        SubjectName = subjectPaper?.Subject?.SubName,
                        QuestionPaperPdfUrl = s.ProjectPaper?.QuestionPaperPdfUrl
                    };
                }).ToList();

                Response.Headers.Add("X-Total-Count", total.ToString());
                Response.Headers.Add("X-Page", page.ToString());
                Response.Headers.Add("X-Limit", limit.ToString());

                return Ok(scriptDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ScriptDto>> GetScript(int id)
        {
            try
            {
                var script = await _context.Scripts
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                        .ThenInclude(p => p.SubjectPapers)
                            .ThenInclude(sp => sp.Subject)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (script == null)
                    return NotFound(new { success = false, message = "Script not found" });

                var subjectPaper = script.ProjectPaper?.Paper?.SubjectPapers?.FirstOrDefault();
                var scriptDto = new ScriptDto
                {
                    Id = script.Id,
                    GeneratedBarcode = script.GeneratedBarcode,
                    InBuiltBarCode = script.InBuiltBarcode,
                    PaperId = script.ProjectPaper.PaperId,
                    ProjectPaperId = script.ProjectPaperId,
                    CleanPdfUrl = script.CleanPdfUrl,
                    Status = script.Status,
                    IsReEvaluationRequested = script.IsReEvaluationRequested,
                    RollNumber = script.RollNumber,
                    TotalMarks = script.TotalMarks,
                    Percentage = script.Percentage,
                    Remarks = script.Remarks,
                    SubmittedAt = script.SubmittedAt,
                    PaperName = script.ProjectPaper?.Paper?.PaperName,
                    PaperCode = script.ProjectPaper?.Paper?.PaperCode,
                    SubjectId = subjectPaper?.SubjectId,
                    SubjectName = subjectPaper?.Subject?.SubName,
                    QuestionPaperPdfUrl = script.ProjectPaper?.QuestionPaperPdfUrl
                };

                return Ok(scriptDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id:int}/pdf")]
        public async Task<IActionResult> GetScriptPdf(int id)
        {
            try
            {
                var script = await _context.Scripts.FindAsync(id);
                if (script == null || string.IsNullOrEmpty(script.CleanPdfUrl))
                    return NotFound(new { success = false, message = "Script or PDF path not found" });

                var basePath = _configuration["StorageSettings:BasePath"] ?? "";
                var fullPath = script.CleanPdfUrl;
                
                if (!string.IsNullOrEmpty(basePath) && !Path.IsPathRooted(script.CleanPdfUrl))
                {
                    fullPath = Path.Combine(basePath, script.CleanPdfUrl);
                }

                // Check if file exists
                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound(new { success = false, message = $"PDF file not found on disk at: {fullPath} (Stored as: {script.CleanPdfUrl})" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                return File(fileBytes, "application/pdf", System.IO.Path.GetFileName(fullPath));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("paper-counts")]
        public async Task<IActionResult> GetPaperScriptCounts([FromQuery] int paperId)
        {
            try
            {
                var totalScripts = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper != null && s.ProjectPaper.PaperId == paperId);

                var allocatedScripts = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper != null && s.ProjectPaper.PaperId == paperId && s.Status == ScriptStatus.allocated);

                var completedScripts = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper != null && s.ProjectPaper.PaperId == paperId && s.Status == ScriptStatus.completed);

                var pendingScripts = await _context.Scripts
                    .CountAsync(s => s.ProjectPaper != null && s.ProjectPaper.PaperId == paperId && s.Status == ScriptStatus.pending);

                var expertsCount = await _context.PaperExaminers
                    .CountAsync(pe => pe.PaperId == paperId);

                return Ok(new
                {
                    success = true,
                    paperId,
                    totalScripts,
                    pendingScripts,
                    allocatedScripts,
                    completedScripts,
                    expertsCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<ScriptDto>> CreateScript([FromBody] ScriptDto scriptDto)
        {
            try
            {
                // Validate paper exists
                var paper = await _context.Papers.FindAsync(scriptDto.PaperId);
                if (paper == null)
                    return BadRequest(new { success = false, message = "Paper not found" });

             
                var script = new Script
                {
                    ProjectPaperId = scriptDto.PaperId,
                    CleanPdfUrl = scriptDto.CleanPdfUrl,
                    RollNumber = scriptDto.RollNumber,
                    Status = ScriptStatus.pending,
                };

                _context.Scripts.Add(script);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetScript), new { id = script.Id }, scriptDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateScript(int id, [FromBody] ScriptStatusUpdateRequest request)
        {
            try
            {
                var existingScript = await _context.Scripts.FindAsync(id);
                if (existingScript == null)
                    return NotFound(new { success = false, message = "Script not found" });

                existingScript.Status = request.Status;
                existingScript.Remarks = request.Remarks;
                existingScript.UpdatedAt = DateTime.UtcNow;

                if (request.Status == ScriptStatus.completed)
                    existingScript.SubmittedAt = DateTime.UtcNow;

                _context.Scripts.Update(existingScript);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Script updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id:int}/assign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> AssignScript(int id, [FromBody] AssignScriptRequest request)
        {
            try
            {
                var script = await _context.Scripts
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .FirstOrDefaultAsync(s => s.Id == id);
                
                if (script == null)
                    return NotFound(new { success = false, message = "Script not found" });

                // Verify examiner exists
                var examiner = await _context.Users.FindAsync(request.ExaminerId);
                if (examiner == null)
                    return BadRequest(new { success = false, message = "Examiner not found" });

                // Create allocation
                var allocation = new Allocation
                {
                    ScriptId = id,
                    ExaminerId = request.ExaminerId,
                    AllocatedAt = DateTime.UtcNow,
                    Status = AllocationStatus.allocated
                };

                _context.Allocations.Add(allocation);
                script.Status = ScriptStatus.allocated;
                script.UpdatedAt = DateTime.UtcNow;

                _context.Scripts.Update(script);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Script assigned successfully", allocationId = allocation.AllocationId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<object>> GetExaminerScripts(
            int examinerId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string search = "",
            [FromQuery] string? sortField = null,
            [FromQuery] string? sortOrder = null,
            [FromQuery] string? statusFilter = null,
            [FromQuery] int? subjectFilter = null)
        {
            try
            {
                var allocations = await _context.Allocations
                    .Where(a => a.ExaminerId == examinerId)
                    .ToListAsync();

                var scriptIds = allocations.Select(a => a.ScriptId).ToList();

                var query = _context.Scripts
                    .Where(s => scriptIds.Contains(s.Id))
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                        .ThenInclude(p => p.SubjectPapers)
                            .ThenInclude(sp => sp.Subject)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "all" && Enum.TryParse<ScriptStatus>(statusFilter.Replace("-", "_"), true, out var parsedFilter))
                {
                    query = query.Where(s => s.Status == parsedFilter);
                }

                if (subjectFilter.HasValue)
                {
                    query = query.Where(s => s.ProjectPaper.Paper != null && (s.ProjectPaper.Paper.SubjectPapers.Any(sp => sp.SubjectId == subjectFilter.Value)));
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(sc => 
                        (sc.RollNumber != null && sc.RollNumber.ToLower().Contains(s)) ||
                        (sc.GeneratedBarcode != null && sc.GeneratedBarcode.ToLower().Contains(s))
                    );
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("rollNumber", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.RollNumber) : query.OrderBy(s => s.RollNumber);
                    else if (sortField.Equals("status", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.Status) : query.OrderBy(s => s.Status);
                    else if (sortField.Equals("submittedAt", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.SubmittedAt ?? s.CreatedAt) : query.OrderBy(s => s.SubmittedAt ?? s.CreatedAt);
                    else if (sortField.Equals("totalMarks", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(s => s.TotalMarks) : query.OrderBy(s => s.TotalMarks);
                    else
                        query = query.OrderByDescending(s => s.CreatedAt);
                }
                else
                {
                    query = query.OrderByDescending(s => s.CreatedAt);
                }

                List<Script> scripts;
                if (pageSize > 0)
                {
                    scripts = await query
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .ToListAsync();
                }
                else
                {
                    scripts = await query.ToListAsync();
                }

                var scriptDtos = scripts.Select(s => {
                    var alloc = allocations.FirstOrDefault(a => a.ScriptId == s.Id);
                    var subjectPaper = s.ProjectPaper?.Paper?.SubjectPapers?.FirstOrDefault();
                    return new ScriptDto
                    {
                        Id = s.Id,
                        GeneratedBarcode = s.GeneratedBarcode,
                        InBuiltBarCode = s.InBuiltBarcode,
                        PaperId = s.ProjectPaper.PaperId,
                        CleanPdfUrl = s.CleanPdfUrl,
                        Status = s.Status,
                        IsReEvaluationRequested = s.IsReEvaluationRequested,
                        RollNumber = s.RollNumber,
                        TotalMarks = s.TotalMarks,
                        Percentage = s.Percentage,
                        Remarks = s.Remarks,
                        SubmittedAt = s.SubmittedAt,
                        AllocationId = alloc?.AllocationId,
                        PaperName = s.ProjectPaper?.Paper?.PaperName,
                        PaperCode = s.ProjectPaper?.Paper?.PaperCode,
                        SubjectId = subjectPaper?.SubjectId,
                        SubjectName = subjectPaper?.Subject?.SubName,
                        QuestionPaperPdfUrl = s.ProjectPaper?.QuestionPaperPdfUrl
                    };
                }).ToList();

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = scriptDtos,
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

        [HttpGet("paper/{paperId}")]
        public async Task<ActionResult<IEnumerable<ScriptDto>>> GetPaperScripts(int paperId)
        {
            try
            {
                var scripts = await _context.Scripts
                    .Where(s => s.ProjectPaper.PaperId == paperId)
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                var scriptDtos = scripts.Select(s => new ScriptDto
                {
                    Id = s.Id,
                    GeneratedBarcode = s.GeneratedBarcode,
                    CleanPdfUrl = s.CleanPdfUrl,
                    PaperId = s.ProjectPaper.PaperId,
                    InBuiltBarCode = s.InBuiltBarcode,
                    Status = s.Status,
                    IsReEvaluationRequested = s.IsReEvaluationRequested,
                    RollNumber = s.RollNumber,
                    TotalMarks = s.TotalMarks,
                    Percentage = s.Percentage,
                    Remarks = s.Remarks,
                    SubmittedAt = s.SubmittedAt,
                    QuestionPaperPdfUrl = s.ProjectPaper?.QuestionPaperPdfUrl
                }).ToList();

                return Ok(scriptDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/scripts/pending (also supports /api/scripts/unallocated)
        /// Retrieves pending scripts university-wise:
        /// Script -> ProjectPaper -> Paper -> UniversityId.
        /// Resolves logged-in user's UniversityId from Users table,
        /// and identifies scripts that are pending allocation.
        /// </summary>
        [HttpGet("pending")]
        [HttpGet("unallocated")]
        public async Task<IActionResult> GetPendingScripts(
            [FromQuery] int? projectId = null,
            [FromQuery] int? paperId = null,
            [FromQuery] int? universityId = null,
            [FromQuery] string search = "",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize <= 0) pageSize = 50;
                if (pageSize > 500) pageSize = 500;
                if (page <= 0) page = 1;

                // 1. Get logged-in user's UniversityId from Users table
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

                // 2. Base query: Scripts -> ProjectPaper -> Paper
                var query = _context.Scripts
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Project)
                    .AsQueryable();

                // 3. Filter by UniversityId on Paper
                if (targetUniversityId.HasValue && targetUniversityId.Value > 0)
                {
                    query = query.Where(s => s.ProjectPaper != null && 
                                             s.ProjectPaper.Paper != null && 
                                             s.ProjectPaper.Paper.UniversityId == targetUniversityId.Value);
                }

                // 4. Filter by ProjectId if provided
                if (projectId.HasValue && projectId.Value > 0)
                {
                    query = query.Where(s => s.ProjectPaper != null && s.ProjectPaper.ProjectId == projectId.Value);
                }

                // 5. Filter by PaperId if provided
                if (paperId.HasValue && paperId.Value > 0)
                {
                    query = query.Where(s => s.ProjectPaper != null && s.ProjectPaper.PaperId == paperId.Value);
                }

                // 6. Check in Allocations: which scripts are assigned, and the ones NOT assigned are unallocated
                query = query.Where(s => !_context.Allocations.Any(a => a.ScriptId == s.Id && a.Status != AllocationStatus.cancelled) 
                                      && s.Status != ScriptStatus.completed);

                // Optional Search by barcode, paper code, roll number, or catch no
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var sLower = search.ToLower();
                    query = query.Where(s => 
                        (s.GeneratedBarcode != null && s.GeneratedBarcode.ToLower().Contains(sLower)) ||
                        (s.InBuiltBarcode != null && s.InBuiltBarcode.ToLower().Contains(sLower)) ||
                        (s.RollNumber != null && s.RollNumber.ToLower().Contains(sLower)) ||
                        (s.ProjectPaper != null && s.ProjectPaper.Paper != null && 
                            (s.ProjectPaper.Paper.PaperCode.ToLower().Contains(sLower) || 
                             s.ProjectPaper.Paper.PaperName.ToLower().Contains(sLower))) ||
                        (s.ProjectPaper != null && s.ProjectPaper.CatchNo != null && s.ProjectPaper.CatchNo.ToLower().Contains(sLower))
                    );
                }

                var totalCount = await query.CountAsync();

                // Paginated scripts list
                var scripts = await query
                    .OrderByDescending(s => s.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new
                    {
                        id = s.Id,
                        generatedBarcode = s.GeneratedBarcode,
                        inBuiltBarcode = s.InBuiltBarcode,
                        rollNumber = s.RollNumber,
                        cleanPdfUrl = s.CleanPdfUrl,
                        status = s.Status.ToString(),
                        projectPaperId = s.ProjectPaperId,
                        paperId = s.ProjectPaper != null ? s.ProjectPaper.PaperId : 0,
                        paperCode = s.ProjectPaper != null && s.ProjectPaper.Paper != null ? s.ProjectPaper.Paper.PaperCode : "",
                        paperName = s.ProjectPaper != null && s.ProjectPaper.Paper != null ? s.ProjectPaper.Paper.PaperName : "",
                        catchNo = s.ProjectPaper != null ? s.ProjectPaper.CatchNo : "",
                        projectId = s.ProjectPaper != null ? s.ProjectPaper.ProjectId : 0,
                        projectName = s.ProjectPaper != null && s.ProjectPaper.Project != null ? s.ProjectPaper.Project.ProjectName : "",
                        universityId = s.ProjectPaper != null && s.ProjectPaper.Paper != null ? s.ProjectPaper.Paper.UniversityId : null,
                        createdAt = s.CreatedAt
                    })
                    .ToListAsync();

                // Grouped summary by paper (for convenient rendering in Script Allocation UI table)
                var paperIds = await query
                    .Where(s => s.ProjectPaper != null)
                    .Select(s => s.ProjectPaper.PaperId)
                    .Distinct()
                    .ToListAsync();

                var papersSummary = new List<object>();
                if (paperIds.Count > 0)
                {
                    papersSummary = await _context.Papers
                        .Where(p => paperIds.Contains(p.PaperId))
                        .Select(p => new
                        {
                            paperId = p.PaperId,
                            projectPaperId = p.ProjectPapers.Where(pp => !projectId.HasValue || pp.ProjectId == projectId.Value).Select(pp => pp.Id).FirstOrDefault(),
                            paperCode = p.PaperCode,
                            paperName = p.PaperName,
                            catchNo = p.ProjectPapers.Where(pp => !projectId.HasValue || pp.ProjectId == projectId.Value).Select(pp => pp.CatchNo).FirstOrDefault() ?? "",
                            questionPaperPdfUrl = p.ProjectPapers.Where(pp => !projectId.HasValue || pp.ProjectId == projectId.Value).Select(pp => pp.QuestionPaperPdfUrl).FirstOrDefault() ?? "",
                            projectId = projectId ?? p.ProjectPapers.Select(pp => pp.ProjectId).FirstOrDefault(),
                            universityId = p.UniversityId,
                            maxMarks = p.MaxMarks,
                            totalScripts = _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (!projectId.HasValue || s.ProjectPaper.ProjectId == projectId.Value)),
                            allocatedScripts = _context.Allocations.Count(a => a.Script.ProjectPaper.PaperId == p.PaperId && a.Status != AllocationStatus.cancelled && (!projectId.HasValue || a.Script.ProjectPaper.ProjectId == projectId.Value)),
                            pendingScripts = _context.Scripts.Count(s => s.ProjectPaper.PaperId == p.PaperId && (!projectId.HasValue || s.ProjectPaper.ProjectId == projectId.Value) && !_context.Allocations.Any(a => a.ScriptId == s.Id && a.Status != AllocationStatus.cancelled)),
                            isSectionsConfigured = _context.ProjectPaperSections.Any(pps => pps.ProjectPaper.PaperId == p.PaperId && (!projectId.HasValue || pps.ProjectPaper.ProjectId == projectId.Value)) || _context.Sections.Any(sec => sec.PaperId == p.PaperId),
                            expertsCount = _context.PaperExaminers.Count(pe => pe.PaperId == p.PaperId)
                        })
                        .ToListAsync<object>();
                }

                // University Name
                string universityName = "";
                if (targetUniversityId.HasValue)
                {
                    universityName = await _context.Universities
                        .Where(u => u.UniversityId == targetUniversityId.Value)
                        .Select(u => u.UniversityName)
                        .FirstOrDefaultAsync() ?? "";
                }

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    success = true,
                    universityId = targetUniversityId,
                    universityName = universityName,
                    totalCount = totalCount,
                    totalPendingScripts = totalCount,
                    totalUnallocatedScripts = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = totalPages,
                    items = scripts,
                    papers = papersSummary
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
