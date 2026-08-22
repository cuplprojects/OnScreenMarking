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
    public class AllocationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AllocationController(ApplicationDbContext context)
        {
            _context = context;
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
                    query = query.Where(a => a.Status == status);

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

        [HttpGet("{id}")]
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
                var script = await _context.Scripts.FindAsync(allocationDto.ScriptId);
                if (script == null)
                    return BadRequest(new { success = false, message = "Script not found" });

                // Verify examiner exists
                var examiner = await _context.Users.FindAsync(allocationDto.ExaminerId);
                if (examiner == null)
                    return BadRequest(new { success = false, message = "Examiner not found" });

                // Check if allocation already exists for this script
                var existingAllocation = await _context.Allocations
                    .FirstOrDefaultAsync(a => a.ScriptId == allocationDto.ScriptId && a.Status != "cancelled");

                if (existingAllocation != null)
                    return BadRequest(new { success = false, message = "Script already allocated" });

                var allocation = new Allocation
                {
                    ScriptId = allocationDto.ScriptId,
                    ExaminerId = allocationDto.ExaminerId,
                    AllocatedAt = DateTime.UtcNow,
                    Status = "allocated"
                };

                _context.Allocations.Add(allocation);
                
                // Update script status
                script.Status = "allocated";
                script.UpdatedAt = DateTime.UtcNow;
                _context.Scripts.Update(script);

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

                if (allocation.Status != "allocated")
                    return BadRequest(new { success = false, message = "Allocation is not in allocated status" });

                allocation.StartedAt = DateTime.UtcNow;
                allocation.Status = "in_progress";

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

                if (allocation.Status != "in_progress")
                    return BadRequest(new { success = false, message = "Allocation is not in progress" });

                allocation.SubmittedAt = DateTime.UtcNow;
                allocation.Status = "submitted";

                if (allocation.StartedAt.HasValue)
                {
                    allocation.TimeTakenSeconds = (int)(allocation.SubmittedAt.Value - allocation.StartedAt.Value).TotalSeconds;
                }

                _context.Allocations.Update(allocation);

                // Update script status
                if (allocation.Script != null)
                {
                    allocation.Script.Status = "completed";
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

                allocation.Status = "cancelled";

                _context.Allocations.Update(allocation);

                // Reset script status
                if (allocation.Script != null)
                {
                    allocation.Script.Status = "pending";
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
                    .FirstOrDefaultAsync(a => a.ScriptId == scriptId && a.Status != "cancelled");

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
                    .Where(s => s.ProjectPaper.PaperId == paperId && s.Status == "pending")
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
                            .Where(a => a.ExaminerId == g.Key && a.Status != "cancelled")
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

                // Get pending scripts for this paper
                var pendingScripts = await _context.Scripts
                    .Where(s => s.ProjectPaper.PaperId == request.PaperId && s.Status == "pending")
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
                                .FirstOrDefaultAsync(a => a.ScriptId == script.Id && a.Status != "cancelled");

                            if (existingAllocation != null)
                            {
                                errors.Add($"Script {script.Id} already allocated");
                                continue;
                            }

                            var allocation = new Allocation
                            {
                                ScriptId = script.Id,
                                ExaminerId = alloc.ExaminerId,
                                AllocatedAt = DateTime.UtcNow,
                                Status = "allocated"
                            };

                            _context.Allocations.Add(allocation);
                            script.Status = "allocated";
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
}
