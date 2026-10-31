using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;
using API.Services;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/allocations")]
    [Authorize]
    public class AllocationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IDailyAllocationService _dailyAllocationService;

        public AllocationController(ApplicationDbContext context, IDailyAllocationService dailyAllocationService)
        {
            _context = context;
            _dailyAllocationService = dailyAllocationService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Allocation>>> GetAllocations(
            [FromQuery] int? examinerId = null,
            [FromQuery] int? scriptId = null,
            [FromQuery] string status = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10)
        {
            try
            {
                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr))
                    {
                        return Unauthorized(new { success = false, message = "Invalid token claims" });
                    }
                    examinerId = int.Parse(loggedInUserIdStr);
                }

                var query = _context.Allocations.AsQueryable();

                if (examinerId.HasValue)
                    query = query.Where(a => a.ExaminerId == examinerId.Value);

                if (scriptId.HasValue)
                    query = query.Where(a => a.ScriptId == scriptId.Value);

                if (!string.IsNullOrEmpty(status))
                {
                    if (bool.TryParse(status, out var bStatus))
                    {
                        query = query.Where(a => a.AssignmentStatus == bStatus);
                    }
                    else if (Enum.TryParse<AllocationStatus>(status, true, out var enumStatus))
                    {
                        query = query.Where(a => a.Status == enumStatus);
                    }
                }
                else
                {
                    // By default, only get active allocations with AssignmentStatus == true
                    query = query.Where(a => a.AssignmentStatus);
                }

                var total = await query.CountAsync();
                
                if (limit > 0)
                {
                    query = query.Skip((page - 1) * limit).Take(limit);
                }

                var allocations = await query
                    .Include(a => a.Script)
                    .Include(a => a.Examiner)
                    .OrderByDescending(a => a.AllocatedAt)
                    .ToListAsync();

                Response.Headers.Add("X-Total-Count", total.ToString());

                return Ok(allocations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Allocation>> GetAllocation(int id)
        {
            try
            {
                var allocation = await _context.Allocations
                    .Include(a => a.Script)
                    .Include(a => a.Examiner)
                    .FirstOrDefaultAsync(a => a.AllocationId == id);

                if (allocation == null)
                    return NotFound(new { success = false, message = "Allocation not found" });

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || allocation.ExaminerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You can only view your own allocations." });
                    }
                }

                return Ok(allocation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<Allocation>> CreateAllocation([FromBody] AllocationDto allocationDto)
        {
            try
            {
                if (allocationDto.ScriptId <= 0)
                    return BadRequest(new { success = false, message = "Script ID is required" });

                if (allocationDto.ExaminerId <= 0)
                    return BadRequest(new { success = false, message = "Examiner ID is required" });

                // Verify script exists
                var script = await _context.Scripts
                    .Include(s => s.ProjectPaper)
                    .FirstOrDefaultAsync(s => s.Id == allocationDto.ScriptId);
                if (script == null)
                    return BadRequest(new { success = false, message = "Script not found" });

                if (string.IsNullOrEmpty(script.ProjectPaper?.QuestionPaperPdfUrl))
                    return BadRequest(new { success = false, message = "Cannot allocate script because the Question Paper PDF is not uploaded for this paper." });

                // Verify examiner exists
                var examiner = await _context.Users.FindAsync(allocationDto.ExaminerId);
                if (examiner == null)
                    return BadRequest(new { success = false, message = "Examiner not found" });

                // Check if active allocation already exists for this script
                var existingAllocation = await _context.Allocations
                    .FirstOrDefaultAsync(a => a.ScriptId == allocationDto.ScriptId && a.AssignmentStatus);

                if (existingAllocation != null)
                    return BadRequest(new { success = false, message = "Script already allocated" });

                var allocation = new Allocation
                {
                    ScriptId = allocationDto.ScriptId,
                    ExaminerId = allocationDto.ExaminerId,
                    ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                    AllocatedAt = DateTime.UtcNow,
                    Status = AllocationStatus.allocated,
                    AssignmentStatus = true
                };

                _context.Allocations.Add(allocation);
                
                // Update script status
                script.Status = ScriptStatus.allocated;
                script.UpdatedAt = DateTime.UtcNow;
                _context.Scripts.Update(script);

                // If there's an active request for this examiner & paper, mark it as fulfilled (requested = false)
                try
                {
                    var paperId = script.ProjectPaper?.PaperId;
                    if (paperId.HasValue && paperId.Value > 0)
                    {
                        var req = await _context.SubjectPaperRequests
                            .FirstOrDefaultAsync(r => r.PaperId == paperId.Value && r.ExaminerId == allocationDto.ExaminerId && r.Requested);
                        if (req != null)
                        {
                            req.Requested = false;
                            req.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
                catch { }

                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetAllocation), new { id = allocation.AllocationId }, allocation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}/start")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> StartMarking(int id)
        {
            try
            {
                var allocation = await _context.Allocations.FindAsync(id);
                if (allocation == null)
                    return NotFound(new { success = false, message = "Allocation not found" });

                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(loggedInUserIdStr) || allocation.ExaminerId != int.Parse(loggedInUserIdStr))
                {
                    return StatusCode(403, new { success = false, message = "You can only start marking your own allocations." });
                }

                if (!allocation.AssignmentStatus)
                    return BadRequest(new { success = false, message = "Allocation is inactive or reassigned" });

                allocation.StartedAt = DateTime.UtcNow;
                allocation.Status = AllocationStatus.in_progress;

                _context.Allocations.Update(allocation);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Marking started successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}/submit")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> SubmitMarking(int id)
        {
            try
            {
                var allocation = await _context.Allocations
                    .Include(a => a.Script)
                    .FirstOrDefaultAsync(a => a.AllocationId == id);

                if (allocation == null)
                    return NotFound(new { success = false, message = "Allocation not found" });

                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(loggedInUserIdStr) || allocation.ExaminerId != int.Parse(loggedInUserIdStr))
                {
                    return StatusCode(403, new { success = false, message = "You can only submit marking for your own allocations." });
                }

                if (!allocation.AssignmentStatus)
                    return BadRequest(new { success = false, message = "Allocation is inactive or reassigned" });

                allocation.SubmittedAt = DateTime.UtcNow;
                allocation.Status = AllocationStatus.submitted;

                if (allocation.StartedAt.HasValue)
                {
                    allocation.TimeTakenSeconds = (int)(allocation.SubmittedAt.Value - allocation.StartedAt.Value).TotalSeconds;
                }

                _context.Allocations.Update(allocation);

                // Update script status
                if (allocation.Script != null)
                {
                    allocation.Script.Status = ScriptStatus.completed;
                    allocation.Script.UpdatedAt = DateTime.UtcNow;
                    _context.Scripts.Update(allocation.Script);
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Marking submitted successfully", timeTaken = allocation.TimeTakenSeconds });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> CancelAllocation(int id)
        {
            try
            {
                var allocation = await _context.Allocations
                    .Include(a => a.Script)
                    .FirstOrDefaultAsync(a => a.AllocationId == id);

                if (allocation == null)
                    return NotFound(new { success = false, message = "Allocation not found" });

                allocation.AssignmentStatus = false;
                allocation.Status = AllocationStatus.cancelled;

                _context.Allocations.Update(allocation);

                // Reset script status
                if (allocation.Script != null)
                {
                    allocation.Script.Status = ScriptStatus.pending;
                    allocation.Script.UpdatedAt = DateTime.UtcNow;
                    _context.Scripts.Update(allocation.Script);
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Allocation cancelled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<IEnumerable<Allocation>>> GetExaminerAllocations(int examinerId)
        {
            try
            {
                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || examinerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You can only view your own allocations." });
                    }
                }

                var allocations = await _context.Allocations
                    .Where(a => a.ExaminerId == examinerId)
                    .Include(a => a.Script)
                    .Include(a => a.Examiner)
                    .OrderByDescending(a => a.AllocatedAt)
                    .ToListAsync();

                return Ok(allocations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("script/{scriptId}")]
        public async Task<ActionResult<Allocation>> GetScriptAllocation(int scriptId)
        {
            try
            {
                var allocation = await _context.Allocations
                    .Include(a => a.Script)
                    .Include(a => a.Examiner)
                    .FirstOrDefaultAsync(a => a.ScriptId == scriptId && a.AssignmentStatus);

                if (allocation == null)
                    return NotFound(new { success = false, message = "No active allocation found for this script" });

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || allocation.ExaminerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You can only view allocations assigned to you." });
                    }
                }

                return Ok(allocation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("paper/{paperId}/pending-scripts")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<dynamic>> GetPendingScriptsByPaper(int paperId)
        {
            try
            {
                // Get the paper with its subjects
                var paper = await _context.Papers
                    .Include(p => p.SubjectPapers)
                    .ThenInclude(sp => sp.Subject)
                    .FirstOrDefaultAsync(p => p.PaperId == paperId);

                if (paper == null)
                    return NotFound(new { success = false, message = "Paper not found" });

                // Get all subject IDs associated with this paper
                var subjectIds = paper.SubjectPapers.Select(sp => sp.SubjectId).ToList();

                if (!subjectIds.Any())
                    return Ok(new { scripts = new List<object>(), examiners = new List<object>(), paper = new { } });

                // Get pending scripts for this paper
                var scripts = await _context.Scripts
                    .Where(s => s.ProjectPaper.PaperId == paperId && s.Status == ScriptStatus.pending)
                    .OrderBy(s => s.Id)
                    .ToListAsync();

                // Get examiners with expertise in ANY of the subjects associated with this paper
                var examiners = await _context.ExaminerExpertises
                    .Where(ee => subjectIds.Contains(ee.SubjectId) && ee.IsActive)
                    .Include(ee => ee.Examiner)
                    .Include(ee => ee.Subject)
                    .GroupBy(ee => ee.ExaminerId)
                    .Select(g => new
                    {
                        UserId = g.First().Examiner.Id,
                        FirstName = g.First().Examiner.Name,
                        Email = g.First().Examiner.Email,
                        Expertise = g.Select(ee => ee.Subject.SubName).Distinct().ToList(),
                        AllocatedCount = _context.Allocations
                            .Where(a => a.ExaminerId == g.Key && a.AssignmentStatus)
                            .Count()
                    })
                    .ToListAsync();

                var scriptDtos = scripts.Select(s => new
                {
                    s.Id,
                    s.ProjectPaper.PaperId,
                    s.Status,
                    s.CreatedAt
                }).ToList();

                var paperDto = new
                {
                    paper.PaperId,
                    paper.PaperCode,
                    paper.PaperName,
                    paper.PaperNumber,
                    paper.MaxMarks,
                    Subjects = paper.SubjectPapers.Select(sp => new
                    {
                        sp.Subject.SubjectId,
                        sp.Subject.SubName,
                        sp.Subject.SubCode
                    }).ToList()
                };

                return Ok(new
                {
                    scripts = scriptDtos,
                    examiners = examiners,
                    paper = paperDto
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("bulk-allocate")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<dynamic>> BulkAllocateScripts([FromBody] BulkAllocationRequest request)
        {
            try
            {
                if (request?.Allocations == null || !request.Allocations.Any())
                    return BadRequest(new { success = false, message = "No allocations provided" });

                if (request.PaperId <= 0)
                    return BadRequest(new { success = false, message = "Valid Paper ID is required" });

                var projectPaper = await _context.ProjectPapers.FirstOrDefaultAsync(pp => pp.PaperId == request.PaperId);
                if (projectPaper == null || string.IsNullOrEmpty(projectPaper.QuestionPaperPdfUrl))
                    return BadRequest(new { success = false, message = "Cannot allocate scripts because the Question Paper PDF is not uploaded for this paper." });

                // Get pending scripts for this paper
                var pendingScripts = await _context.Scripts
                    .Where(s => s.ProjectPaper.PaperId == request.PaperId && 
                               (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any())))
                    .ToListAsync();

                var totalRequested = request.Allocations.Sum(a => a.Count);
                if (totalRequested > pendingScripts.Count)
                {
                    return BadRequest(new { success = false, message = $"Total requested scripts ({totalRequested}) exceeds available pending scripts ({pendingScripts.Count})" });
                }

                // Randomize/Shuffle scripts in memory
                var random = new Random();
                var shuffledScripts = pendingScripts.OrderBy(x => random.Next()).ToList();

                var results = new List<object>();
                var errors = new List<string>();
                int scriptIndex = 0;

                foreach (var alloc in request.Allocations)
                {
                    try
                    {
                        // Verify examiner exists
                        var examiner = await _context.Users.FindAsync(alloc.ExaminerId);
                        if (examiner == null)
                        {
                            errors.Add($"Examiner {alloc.ExaminerId} not found");
                            continue;
                        }

                        for (int i = 0; i < alloc.Count; i++)
                        {
                            if (scriptIndex >= shuffledScripts.Count) break;

                            var script = shuffledScripts[scriptIndex++];

                            // Check if allocation already exists
                            var existingAllocation = await _context.Allocations
                                .FirstOrDefaultAsync(a => a.ScriptId == script.Id && a.AssignmentStatus);

                            if (existingAllocation != null)
                            {
                                errors.Add($"Script {script.Id} already allocated");
                                continue;
                            }

                            var allocation = new Allocation
                            {
                                ScriptId = script.Id,
                                ExaminerId = alloc.ExaminerId,
                                ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                                AllocatedAt = DateTime.UtcNow,
                                Status = AllocationStatus.allocated,
                                AssignmentStatus = true
                            };

                            _context.Allocations.Add(allocation);
                            script.Status = ScriptStatus.allocated;
                            script.UpdatedAt = DateTime.UtcNow;
                            _context.Scripts.Update(script);

                            results.Add(new
                            {
                                scriptId = script.Id,
                                examinerId = alloc.ExaminerId,
                                success = true
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Error allocating to examiner {alloc.ExaminerId}: {ex.Message}");
                    }
                }

                // Mark active SubjectPaperRequests as fulfilled (requested = false) for examiners who received scripts
                try
                {
                    var allocatedExaminerIds = request.Allocations.Select(a => a.ExaminerId).Distinct().ToList();
                    var matchingRequests = await _context.SubjectPaperRequests
                        .Where(r => r.PaperId == request.PaperId && allocatedExaminerIds.Contains(r.ExaminerId) && r.Requested)
                        .ToListAsync();

                    foreach (var req in matchingRequests)
                    {
                        req.Requested = false;
                        req.UpdatedAt = DateTime.UtcNow;
                    }
                }
                catch { }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = errors.Count == 0,
                    totalAllocations = results.Count,
                    successfulAllocations = results.Count,
                    failedAllocations = errors.Count,
                    results = results,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        
        [HttpPost("paper/{paperId}/revoke-all")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RevokeAllForPaper(int paperId)
        {
            try
            {
                var allocations = await _context.Allocations
                    .Include(a => a.Script)
                    .Where(a => a.Script.ProjectPaper.PaperId == paperId && a.AssignmentStatus)
                    .ToListAsync();
                    
                if (!allocations.Any()) return Ok(new { success = true, message = "No allocations to revoke." });

                var scripts = allocations.Select(a => a.Script).Where(s => s != null).ToList();
                foreach (var script in scripts)
                {
                    script.Status = ScriptStatus.pending;
                }
                foreach (var a in allocations)
                {
                    a.AssignmentStatus = false;
                    a.Status = AllocationStatus.cancelled;
                }
                
                _context.Allocations.UpdateRange(allocations);
                _context.Scripts.UpdateRange(scripts);
                
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = $"Successfully revoked {allocations.Count} allocations." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        
        [HttpPost("revoke")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RevokeAllocations([FromBody] RevokeAllocationRequest request)
        {
            try
            {
                var allocations = await _context.Allocations
                    .Where(a => request.AllocationIds.Contains(a.AllocationId) && a.AssignmentStatus)
                    .ToListAsync();
                    
                if (!allocations.Any()) return NotFound(new { success = false, message = "No allocations found" });

                var scriptIds = allocations.Select(a => a.ScriptId).ToList();
                var scripts = await _context.Scripts.Where(s => scriptIds.Contains(s.Id)).ToListAsync();
                
                foreach (var script in scripts)
                {
                    script.Status = ScriptStatus.pending;
                }
                foreach (var a in allocations)
                {
                    a.AssignmentStatus = false;
                    a.Status = AllocationStatus.cancelled;
                }
                
                _context.Allocations.UpdateRange(allocations);
                _context.Scripts.UpdateRange(scripts);
                
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = $"Successfully revoked {allocations.Count} allocations." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("reassign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ReassignAllocations([FromBody] ReassignAllocationRequest request)
        {
            try
            {
                if (request?.AllocationIds == null || !request.AllocationIds.Any())
                    return BadRequest(new { success = false, message = "No allocations selected to reassign" });

                if (request.TargetExaminerId <= 0)
                    return BadRequest(new { success = false, message = "Target examiner is required" });

                var targetExaminer = await _context.Users.FindAsync(request.TargetExaminerId);
                if (targetExaminer == null)
                    return BadRequest(new { success = false, message = "Target examiner not found" });

                var allocations = await _context.Allocations
                    .Where(a => request.AllocationIds.Contains(a.AllocationId) && a.AssignmentStatus)
                    .ToListAsync();

                if (!allocations.Any())
                    return NotFound(new { success = false, message = "No matching allocations found" });

                foreach (var alloc in allocations)
                {
                    alloc.AssignmentStatus = false;
                    alloc.Status = AllocationStatus.cancelled;
                    _context.Allocations.Add(new Allocation
                    {
                        ScriptId = alloc.ScriptId,
                        ExaminerId = request.TargetExaminerId,
                        ProjectId = alloc.ProjectId ?? alloc.Script?.ProjectId ?? alloc.Script?.ProjectPaper?.ProjectId,
                        AllocatedAt = DateTime.UtcNow,
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true,
                        Deadline = alloc.Deadline
                    });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = $"Successfully reassigned {allocations.Count} allocation(s) to {targetExaminer.Name}." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        
        [HttpPost("project/{projectId}/auto-allocate")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ProjectAutoAllocate(int projectId)
        {
            try
            {
                var projectPapers = await _context.ProjectPapers
                    .Include(pp => pp.Paper)
                    .Where(pp => pp.ProjectId == projectId && pp.IsActive)
                    .ToListAsync();

                if (!projectPapers.Any())
                {
                    return BadRequest(new { success = false, message = "No active papers found for this project." });
                }

                // Check if ALL papers of this project have been assigned an examiner in PaperExaminers
                var projectPaperIds = projectPapers.Select(pp => pp.Id).ToList();
                var assignedPaperIds = await _context.PaperExaminers
                    .Where(pe => projectPaperIds.Contains(pe.ProjectPaperId) && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                    .Select(pe => pe.ProjectPaperId)
                    .Distinct()
                    .ToListAsync();

                var missingPapers = projectPapers.Where(pp => !assignedPaperIds.Contains(pp.Id)).ToList();
                if (missingPapers.Any())
                {
                    var missingPaperNames = missingPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}").ToList();
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Cannot allocate: All papers of this project must be assigned an examiner in PaperExaminers first. Missing examiners for {missingPapers.Count} paper(s): {string.Join(", ", missingPaperNames)}.",
                        unassignedPapers = missingPaperNames
                    });
                }

                int totalAllocated = 0;

                foreach (var pp in projectPapers)
                {
                    var examiners = await _context.PaperExaminers
                        .Where(pe => pe.ProjectPaperId == pp.Id && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                        .Select(pe => pe.ExaminerId)
                        .ToListAsync();

                    if (!examiners.Any())
                    {
                        continue;
                    }

                    var pendingScripts = await _context.Scripts
                        .Where(s => s.ProjectPaperId == pp.Id && 
                                   (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any(a => a.AssignmentStatus))))
                        .ToListAsync();

                    if (!pendingScripts.Any()) continue;

                    int scriptCount = pendingScripts.Count;
                    int baseShare = scriptCount / examiners.Count;
                    int remainder = scriptCount % examiners.Count;

                    int scriptIndex = 0;
                    for (int i = 0; i < examiners.Count; i++)
                    {
                        int share = baseShare + (i < remainder ? 1 : 0);
                        if (share == 0) continue;

                        var examinerId = examiners[i];
                        for (int j = 0; j < share; j++)
                        {
                            if (scriptIndex >= pendingScripts.Count) break;

                            var script = pendingScripts[scriptIndex++];

                            var allocation = new Allocation
                            {
                                ScriptId = script.Id,
                                ExaminerId = examinerId,
                                ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                                AllocatedAt = DateTime.UtcNow,
                                Deadline = DateTime.UtcNow.AddDays(7),
                                Status = AllocationStatus.allocated,
                                AssignmentStatus = true
                            };

                            _context.Allocations.Add(allocation);
                            script.Status = ScriptStatus.allocated;
                            _context.Scripts.Update(script);
                            totalAllocated++;
                        }
                    }

                    // Leftover fail-safe: distribute any remaining odd scripts round-robin
                    while (scriptIndex < pendingScripts.Count)
                    {
                        var script = pendingScripts[scriptIndex];
                        var examinerId = examiners[scriptIndex % examiners.Count];
                        scriptIndex++;

                        var allocation = new Allocation
                        {
                            ScriptId = script.Id,
                            ExaminerId = examinerId,
                            ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                            AllocatedAt = DateTime.UtcNow,
                            Deadline = DateTime.UtcNow.AddDays(7),
                            Status = AllocationStatus.allocated,
                            AssignmentStatus = true
                        };

                        _context.Allocations.Add(allocation);
                        script.Status = ScriptStatus.allocated;
                        _context.Scripts.Update(script);
                        totalAllocated++;
                    }
                }

                await _context.SaveChangesAsync();

                string msg = $"Successfully auto-allocated {totalAllocated} scripts across project to assigned examiners from PaperExaminers.";
                return Ok(new { success = true, message = msg, totalAllocated });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        [HttpPost("cleanup-expired")]
        [Authorize]
        public async Task<IActionResult> CleanupExpiredAllocations()
        {
            try
            {
                var expiredAllocations = await _context.Allocations
                    .Include(a => a.Script)
                    .Where(a => a.AssignmentStatus && a.Deadline.HasValue && a.Deadline.Value < DateTime.UtcNow && !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted))
                    .ToListAsync();
                    
                if (!expiredAllocations.Any())
                    return Ok(new { success = true, message = "No expired allocations found.", count = 0 });

                var scriptsToReset = expiredAllocations.Select(a => a.Script).Where(s => s != null).ToList();
                foreach(var s in scriptsToReset)
                {
                    s.Status = ScriptStatus.pending;
                }
                
                foreach(var a in expiredAllocations)
                {
                    a.AssignmentStatus = false;
                    a.Status = AllocationStatus.cancelled;
                }
                _context.Scripts.UpdateRange(scriptsToReset);
                await _context.SaveChangesAsync();
                
                return Ok(new { success = true, message = $"Cleaned up {expiredAllocations.Count} expired allocations.", count = expiredAllocations.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        
        [HttpPost("request-scripts")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> RequestScripts([FromBody] DynamicPullRequest request)
        {
            try
            {
                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(loggedInUserIdStr))
                    return Unauthorized(new { success = false, message = "Invalid user token" });
                    
                int examinerId = int.Parse(loggedInUserIdStr);
                
                if (request.RequestCount <= 0 || request.RequestCount > 50)
                    return BadRequest(new { success = false, message = "Request count must be between 1 and 50 scripts." });

                // Cleanup expired ones first to be safe
                var expiredAllocations = await _context.Allocations
                    .Include(a => a.Script)
                    .Where(a => a.ExaminerId == examinerId && a.AssignmentStatus && a.Deadline.HasValue && a.Deadline.Value < DateTime.UtcNow && !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted))
                    .ToListAsync();
                
                if (expiredAllocations.Any())
                {
                    var scriptsToReset = expiredAllocations.Select(a => a.Script).Where(s => s != null).ToList();
                    foreach(var s in scriptsToReset) s.Status = ScriptStatus.pending;
                    foreach(var a in expiredAllocations) { a.AssignmentStatus = false; a.Status = AllocationStatus.cancelled; }
                    _context.Scripts.UpdateRange(scriptsToReset);
                    await _context.SaveChangesAsync();
                }

                // Check active allocations count
                var activeCount = await _context.Allocations
                    .CountAsync(a => a.ExaminerId == examinerId && a.AssignmentStatus && !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted));
                
                if (activeCount + request.RequestCount > 50)
                {
                    return BadRequest(new { success = false, message = $"Cannot request {request.RequestCount} scripts. You already have {activeCount} active scripts. Maximum allowed active scripts is 50." });
                }

                // Check if examiner already has assigned scripts for this paper that are not yet submitted in Markings table
                var hasUnsubmittedForPaper = await _context.Allocations.AnyAsync(a =>
                    a.ExaminerId == examinerId &&
                    a.AssignmentStatus &&
                    a.Script.ProjectPaper.PaperId == request.PaperId &&
                    !_context.Markings.Any(m =>
                        m.AllocationId == a.AllocationId &&
                        m.Status == MarkingStatus.submitted));

                if (hasUnsubmittedForPaper)
                {
                    return BadRequest(new { success = false, message = "You have assigned scripts for this paper that are not yet marked as submitted evaluate it before requesting more" });
                }

                var pendingScripts = await _context.Scripts
                    .Where(s => s.ProjectPaper.PaperId == request.PaperId && 
                               (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any(a => a.AssignmentStatus))))
                    .Take(request.RequestCount)
                    .ToListAsync();

                if (!pendingScripts.Any())
                    return Ok(new { success = false, message = "No pending scripts available for this paper." });

                var endOfDay = DateTime.UtcNow.Date.AddDays(1).AddTicks(-1); // End of current UTC day
                
                var newAllocations = new List<Allocation>();
                foreach (var script in pendingScripts)
                {
                    script.Status = ScriptStatus.allocated;
                    newAllocations.Add(new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = examinerId,
                        ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                        AllocatedAt = DateTime.UtcNow,
                        Deadline = endOfDay,
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true
                    });
                }

                _context.Scripts.UpdateRange(pendingScripts);
                await _context.Allocations.AddRangeAsync(newAllocations);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = $"Successfully allocated {newAllocations.Count} scripts. Deadline is end of today.", allocatedCount = newAllocations.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("deallocation-stats")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> GetDeallocationStats([FromQuery] int projectId, [FromQuery] int? paperId)
        {
            try
            {
                if (projectId <= 0) return BadRequest(new { success = false, message = "Valid Project ID is required" });

                var projectPapers = await _context.ProjectPapers
                    .Where(pp => pp.ProjectId == projectId)
                    .Select(pp => pp.PaperId)
                    .ToListAsync();

                if (!projectPapers.Any())
                {
                    return Ok(new
                    {
                        success = true,
                        summary = new { pendingScripts = 0, allocatedScripts = 0, completedScripts = 0, totalScripts = 0 },
                        examiners = new List<object>()
                    });
                }

                var targetPaperIds = paperId.HasValue && paperId.Value > 0 ? new List<int> { paperId.Value } : projectPapers;

                var pendingScriptsCount = await _context.Scripts
                    .CountAsync(s => targetPaperIds.Contains(s.ProjectPaper.PaperId) && (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any(a => a.AssignmentStatus))));

                var allocatedScriptsCount = await _context.Allocations
                    .CountAsync(a => targetPaperIds.Contains(a.Script.ProjectPaper.PaperId) && a.AssignmentStatus && !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted));

                var completedScriptsCount = await _context.Allocations
                    .CountAsync(a => targetPaperIds.Contains(a.Script.ProjectPaper.PaperId) && a.AssignmentStatus && (_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted) || a.Script.Status == ScriptStatus.completed));

                var paperExaminersList = await _context.PaperExaminers
                    .Where(pe => pe.ProjectPaper != null && targetPaperIds.Contains(pe.ProjectPaper.PaperId))
                    .Include(pe => pe.Examiner)
                    .Include(pe => pe.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .ToListAsync();

                var resultList = new List<object>();

                foreach (var pe in paperExaminersList)
                {
                    var exId = pe.ExaminerId;
                    var pId = pe.ProjectPaper?.PaperId ?? pe.PaperId;

                    var activeAllocations = await _context.Allocations
                        .Include(a => a.Script)
                        .Where(a => a.ExaminerId == exId && a.Script.ProjectPaper.PaperId == pId && a.AssignmentStatus)
                        .ToListAsync();

                    int allocatedCount = activeAllocations.Count(a => !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted) && a.Script.Status != ScriptStatus.completed);
                    int completedCount = activeAllocations.Count(a => _context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted) || a.Script.Status == ScriptStatus.completed);
                    int paperPending = await _context.Scripts
                        .CountAsync(s => s.ProjectPaper.PaperId == pId && (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any(a => a.AssignmentStatus))));

                    resultList.Add(new
                    {
                        examinerId = exId,
                        examinerName = pe.Examiner?.Name ?? ("Examiner #" + exId),
                        email = pe.Examiner?.Email ?? "",
                        paperId = pId,
                        projectPaperId = pe.ProjectPaperId,
                        paperCode = pe.ProjectPaper?.Paper?.PaperCode ?? "",
                        paperName = pe.ProjectPaper?.Paper?.PaperName ?? "",
                        pendingScripts = paperPending,
                        allocatedCount = allocatedCount,
                        completedCount = completedCount,
                        totalAllocatedCount = allocatedCount + completedCount
                    });
                }

                return Ok(new
                {
                    success = true,
                    summary = new
                    {
                        pendingScripts = pendingScriptsCount,
                        allocatedScripts = allocatedScriptsCount,
                        completedScripts = completedScriptsCount,
                        totalScripts = pendingScriptsCount + allocatedScriptsCount + completedScriptsCount
                    },
                    examiners = resultList
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("overwrite-examiner-count")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> OverwriteExaminerCount([FromBody] OverwriteExaminerCountRequest request)
        {
            try
            {
                if (request == null || request.PaperId <= 0 || request.ExaminerId <= 0 || request.TargetCount < 0)
                {
                    return BadRequest(new { success = false, message = "Invalid parameters provided." });
                }

                var currentAllocations = await _context.Allocations
                    .Include(a => a.Script)
                    .Where(a => a.ExaminerId == request.ExaminerId && 
                                a.Script.ProjectPaper.PaperId == request.PaperId && 
                                a.AssignmentStatus && 
                                a.Script.Status != ScriptStatus.completed &&
                                !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted))
                    .ToListAsync();

                int currentCount = currentAllocations.Count;

                if (request.TargetCount == currentCount)
                {
                    return Ok(new { success = true, message = "Allocation count remains unchanged." });
                }

                if (request.TargetCount < currentCount)
                {
                    int numToRemove = currentCount - request.TargetCount;
                    var allocationsToRemove = currentAllocations.Take(numToRemove).ToList();

                    var scriptsToReset = allocationsToRemove.Select(a => a.Script).Where(s => s != null).ToList();
                    foreach (var s in scriptsToReset)
                    {
                        s.Status = ScriptStatus.pending;
                        s.UpdatedAt = DateTime.UtcNow;
                    }

                    foreach (var a in allocationsToRemove)
                    {
                        a.AssignmentStatus = false;
                        a.Status = AllocationStatus.cancelled;
                    }
                    _context.Scripts.UpdateRange(scriptsToReset);
                    await _context.SaveChangesAsync();

                    return Ok(new { success = true, message = $"Successfully updated allocation count to {request.TargetCount}." });
                }
                else
                {
                    int numToAdd = request.TargetCount - currentCount;

                    var pendingScripts = await _context.Scripts
                        .Where(s => s.ProjectPaper.PaperId == request.PaperId && 
                                   (s.Status == ScriptStatus.pending || (s.Status != ScriptStatus.completed && !s.Allocations.Any(a => a.AssignmentStatus))))
                        .Take(numToAdd)
                        .ToListAsync();

                    if (pendingScripts.Count < numToAdd)
                    {
                        return BadRequest(new { success = false, message = $"Cannot set allocation to {request.TargetCount}. Only {pendingScripts.Count} pending scripts available." });
                    }

                    foreach (var script in pendingScripts)
                    {
                        script.Status = ScriptStatus.allocated;
                        script.UpdatedAt = DateTime.UtcNow;

                        _context.Allocations.Add(new Allocation
                        {
                            ScriptId = script.Id,
                            ExaminerId = request.ExaminerId,
                            ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                            AllocatedAt = DateTime.UtcNow,
                            Status = AllocationStatus.allocated,
                            AssignmentStatus = true
                        });
                    }

                    _context.Scripts.UpdateRange(pendingScripts);

                    // Mark active SubjectPaperRequest as fulfilled (requested = false)
                    try
                    {
                        var req = await _context.SubjectPaperRequests
                            .FirstOrDefaultAsync(r => r.PaperId == request.PaperId && r.ExaminerId == request.ExaminerId && r.Requested);
                        if (req != null)
                        {
                            req.Requested = false;
                            req.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    catch { }

                    await _context.SaveChangesAsync();

                    return Ok(new { success = true, message = $"Successfully updated allocation count to {request.TargetCount}." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Daily allocation for a specific university if configured with 'Daily allocation'
        /// </summary>
        [HttpPost("university/{universityId}/daily-allocate")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DailyAllocateByUniversity(int universityId)
        {
            try
            {
                var result = await _dailyAllocationService.PerformDailyAllocationForUniversityAsync(universityId);
                return Ok(new
                {
                    success = result.success,
                    allocatedCount = result.allocatedCount,
                    reassignedCount = result.reassignedCount,
                    message = result.message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Equal distribution allocation for a specific university
        /// </summary>
        [HttpPost("university/{universityId}/equal-distribute")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> EqualDistributeByUniversity(int universityId)
        {
            try
            {
                var result = await _dailyAllocationService.PerformEqualDistributionForUniversityAsync(universityId);
                return Ok(new
                {
                    success = result.success,
                    allocatedCount = result.allocatedCount,
                    message = result.message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Daily allocation triggered for all universities configured with 'Daily allocation'
        /// </summary>
        [HttpPost("daily-allocate")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DailyAllocateAll()
        {
            try
            {
                var (totalAllocated, totalReassigned) = await _dailyAllocationService.PerformDailyAllocationForAllUniversitiesAsync();
                return Ok(new
                {
                    success = true,
                    message = $"Daily allocation completed. Allocated {totalAllocated} scripts, reassigned {totalReassigned} scripts.",
                    totalAllocated,
                    totalReassigned
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Checks and reassigns overdue allocations for a university where scripts are not in Markings table
        /// Sets allocation.Status = false (0) and resets scripts to pending.
        /// </summary>
        [HttpPost("university/{universityId}/reassign-expired")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> ReassignExpiredByUniversity(int universityId)
        {
            try
            {
                var reassignedCount = await _dailyAllocationService.PerformReassignmentForUniversityAsync(universityId);
                return Ok(new { success = true, message = $"Successfully deactivated {reassignedCount} expired allocations for reassignment.", reassignedCount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class RevokeAllocationRequest
    {
        public List<int> AllocationIds { get; set; }
    }

    public class ReassignAllocationRequest
    {
        public List<int> AllocationIds { get; set; }
        public int TargetExaminerId { get; set; }
    }

    public class BulkAllocationRequest
    {
        public int PaperId { get; set; }
        public List<AllocationItem> Allocations { get; set; }
    }

    public class AllocationItem
    {
        public int ExaminerId { get; set; }
        public int Count { get; set; }
    }

    public class DynamicPullRequest
    {
        public int PaperId { get; set; }
        public int RequestCount { get; set; }
    }

    public class OverwriteExaminerCountRequest
    {
        public int PaperId { get; set; }
        public int ExaminerId { get; set; }
        public int TargetCount { get; set; }
    }
}
