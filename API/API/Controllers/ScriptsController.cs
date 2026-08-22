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

        public ScriptsController(ApplicationDbContext context)
        {
            _context = context;
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

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(s => s.Status == status);

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
                        SubjectName = subjectPaper?.Subject?.SubName
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

        [HttpGet("{id}")]
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
                    SubjectName = subjectPaper?.Subject?.SubName
                };

                return Ok(scriptDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetScriptPdf(int id)
        {
            try
            {
                var script = await _context.Scripts.FindAsync(id);
                if (script == null || string.IsNullOrEmpty(script.CleanPdfUrl))
                    return NotFound(new { success = false, message = "Script or PDF path not found" });

                // Check if file exists
                if (!System.IO.File.Exists(script.CleanPdfUrl))
                {
                    return NotFound(new { success = false, message = $"PDF file not found on disk at: {script.CleanPdfUrl}" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(script.CleanPdfUrl);
                return File(fileBytes, "application/pdf", System.IO.Path.GetFileName(script.CleanPdfUrl));
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
                    Status = "pending",
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

        [HttpPut("{id}")]
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

                if (request.Status == "completed")
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

        [HttpPut("{id}/assign")]
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
                    Status = "allocated"
                };

                _context.Allocations.Add(allocation);
                script.Status = "allocated";
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

                if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "all")
                {
                    query = query.Where(s => s.Status == statusFilter);
                }

                if (subjectFilter.HasValue)
                {
                    query = query.Where(s => s.ProjectPaper.Paper != null && s.ProjectPaper?.Paper?.SubjectPapers.Any(sp => sp.SubjectId == subjectFilter.Value));
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
                        SubjectName = subjectPaper?.Subject?.SubName
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
                    SubmittedAt = s.SubmittedAt
                }).ToList();

                return Ok(scriptDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
