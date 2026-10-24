using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using API.Data;
using API.Models;
using API.Models.DTOs;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaperExaminersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaperExaminersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("paper/{paperId}")]
        public async Task<ActionResult<IEnumerable<PaperExaminer>>> GetPaperExaminers(int paperId)
        {
            try
            {
                var assignments = await _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Where(pe => pe.PaperId == paperId)
                    .ToListAsync();

                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetExaminerPapers(int examinerId)
        {
            try
            {
                // Resolve this examiner's universityId so we can filter papers to the same university.
                var examiner = await _context.Users
                    .Where(u => u.Id == examinerId)
                    .Select(u => new { u.UniversityId })
                    .FirstOrDefaultAsync();

                if (examiner == null)
                    return NotFound(new { success = false, message = "Examiner not found" });

                // Step 1: Take projectpaperid from scripts table (which is same as id in projectpapers table),
                // and for that id get the paperid
                var paperIdsFromScripts = await _context.Scripts
                    .Select(s => s.ProjectPaper.PaperId)
                    .Distinct()
                    .ToListAsync();

                if (!paperIdsFromScripts.Any())
                {
                    return Ok(new List<object>());
                }

                // Safely check SubjectPaperRequests without failing if table is not created in DB yet
                var requestedPaperIds = new HashSet<int>();
                try
                {
                    var reqs = await _context.SubjectPaperRequests
                        .Where(r => r.ExaminerId == examinerId && r.Requested)
                        .Select(r => r.PaperId)
                        .ToListAsync();
                    requestedPaperIds = new HashSet<int>(reqs);
                }
                catch
                {
                    // Table not created yet or not accessible, default to none
                }

                // Step 2: From Papers table, get only those papers whose PaperId is in paperIdsFromScripts
                // and whose UniversityId matches examiner's UniversityId
                var papers = await _context.Papers
                    .Where(p =>
                        paperIdsFromScripts.Contains(p.PaperId) &&
                        (examiner.UniversityId == null || p.UniversityId == examiner.UniversityId)
                    )
                    .Select(p => new {
                        p.PaperId,
                        p.PaperCode,
                        p.PaperName,
                        p.UniversityId,
                        subjectId = _context.SubjectPapers
                            .Where(sp => sp.PaperId == p.PaperId)
                            .Select(sp => (int?)sp.SubjectId)
                            .FirstOrDefault(),
                        subjectName = _context.SubjectPapers
                            .Where(sp => sp.PaperId == p.PaperId)
                            .Select(sp => sp.Subject.SubName)
                            .FirstOrDefault(),
                        // True if the examiner has assigned scripts for this paper that are not yet marked as submitted in Markings
                        hasUnsubmittedAllocations = _context.Allocations.Any(a =>
                            a.ExaminerId == examinerId &&
                            a.Status != AllocationStatus.cancelled &&
                            a.Script.ProjectPaper.PaperId == p.PaperId &&
                            !_context.Markings.Any(m =>
                                m.AllocationId == a.AllocationId &&
                                m.Status == MarkingStatus.submitted))
                    })
                    .Distinct()
                    .ToListAsync();

                var result = papers.Select(p => new {
                    p.PaperId,
                    p.PaperCode,
                    p.PaperName,
                    p.UniversityId,
                    p.subjectId,
                    p.subjectName,
                    hasAlreadyRequested = requestedPaperIds.Contains(p.PaperId),
                    p.hasUnsubmittedAllocations
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Called when an examiner clicks the "Request" button.
        /// Creates (or updates) a SubjectPaperRequest row to record the request.
        /// POST /api/PaperExaminers/request-paper
        /// Body: { paperId, subjectId?, examinerId?, universityId?, requested }
        /// </summary>
        [HttpPost("request-paper")]
        [Authorize(Roles = "examiner,Examiner")]
        public async Task<IActionResult> RequestPaper([FromBody] SubjectPaperRequestDto dto)
        {
            try
            {
                if (dto.PaperId <= 0)
                    return BadRequest(new { success = false, message = "Valid PaperId is required." });

                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                int examinerId = 0;
                if (!string.IsNullOrEmpty(loggedInUserIdStr))
                {
                    examinerId = int.Parse(loggedInUserIdStr);
                }
                else if (dto.ExaminerId.HasValue && dto.ExaminerId.Value > 0)
                {
                    examinerId = dto.ExaminerId.Value;
                }
                else
                {
                    return Unauthorized(new { success = false, message = "Invalid user token" });
                }

                // If universityId not sent, fetch from user
                int? universityId = dto.UniversityId;
                if (!universityId.HasValue)
                {
                    var user = await _context.Users.FindAsync(examinerId);
                    universityId = user?.UniversityId;
                }

                // If subjectId not sent, fetch from SubjectPapers
                int? subjectId = dto.SubjectId;
                if (!subjectId.HasValue)
                {
                    subjectId = await _context.SubjectPapers
                        .Where(sp => sp.PaperId == dto.PaperId)
                        .Select(sp => (int?)sp.SubjectId)
                        .FirstOrDefaultAsync();
                }

                // Upsert: if a row already exists update it, otherwise insert
                var existing = await _context.SubjectPaperRequests
                    .FirstOrDefaultAsync(r => r.PaperId == dto.PaperId && r.ExaminerId == examinerId);

                if (existing != null)
                {
                    existing.Requested    = true;
                    existing.SubjectId    = subjectId ?? existing.SubjectId;
                    existing.UniversityId = universityId ?? existing.UniversityId;
                    existing.UpdatedAt    = DateTime.UtcNow;
                    _context.SubjectPaperRequests.Update(existing);
                }
                else
                {
                    _context.SubjectPaperRequests.Add(new SubjectPaperRequest
                    {
                        PaperId      = dto.PaperId,
                        SubjectId    = subjectId,
                        ExaminerId   = examinerId,
                        UniversityId = universityId,
                        Requested    = true,
                        RequestedAt  = DateTime.UtcNow,
                        UpdatedAt    = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Request recorded successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves subject paper requests for coordinators (filtered by coordinator's UniversityId)
        /// or for admins (optionally filtered by universityId query parameter).
        /// GET /api/PaperExaminers/subject-paper-requests
        /// </summary>
        [HttpGet("subject-paper-requests")]
        [Authorize(Roles = "coordinator,Coordinator,admin,Admin")]
        public async Task<IActionResult> GetSubjectPaperRequests([FromQuery] int? universityId = null)
        {
            try
            {
                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                var userType = User.FindFirst("userType")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;

                int? targetUniversityId = universityId;

                // If user is a coordinator, strictly enforce their universityId from the users table
                if (userType != null && userType.Equals("coordinator", StringComparison.OrdinalIgnoreCase))
                {
                    if (int.TryParse(loggedInUserIdStr, out int userId))
                    {
                        var coordinator = await _context.Users
                            .Where(u => u.Id == userId)
                            .Select(u => new { u.UniversityId })
                            .FirstOrDefaultAsync();

                        targetUniversityId = coordinator?.UniversityId;
                    }
                }

                var query = _context.SubjectPaperRequests
                    .Include(r => r.Paper)
                    .Include(r => r.Subject)
                    .Include(r => r.Examiner)
                    .Include(r => r.University)
                    .AsQueryable();

                if (targetUniversityId.HasValue)
                {
                    query = query.Where(r => r.UniversityId == targetUniversityId.Value 
                        || (r.UniversityId == null && r.Paper.UniversityId == targetUniversityId.Value));
                }

                var requests = await query
                    .OrderByDescending(r => r.RequestedAt)
                    .Select(r => new
                    {
                        r.Id,
                        r.PaperId,
                        paperCode = r.Paper != null ? r.Paper.PaperCode : "",
                        paperName = r.Paper != null ? r.Paper.PaperName : "",
                        r.SubjectId,
                        subjectCode = r.Subject != null ? r.Subject.SubCode : "",
                        subjectName = r.Subject != null ? r.Subject.SubName : "",
                        r.ExaminerId,
                        examinerName = r.Examiner != null ? r.Examiner.Name : "",
                        examinerEmail = r.Examiner != null ? r.Examiner.Email : "",
                        r.UniversityId,
                        universityName = r.University != null ? r.University.UniversityName : (r.Paper != null && r.Paper.University != null ? r.Paper.University.UniversityName : ""),
                        r.Requested,
                        r.RequestedAt,
                        r.UpdatedAt,
                        // Count of scripts for this paper that are not submitted in Marking table
                        availableScriptsCount = _context.Scripts.Count(s =>
                            s.ProjectPaper.PaperId == r.PaperId &&
                            !_context.Markings.Any(m => m.ScriptId == s.Id && m.Status == MarkingStatus.submitted)),
                        // Count of scripts currently allocated to this examiner for this paper
                        allocatedToExaminerCount = _context.Allocations.Count(a =>
                            a.ExaminerId == r.ExaminerId &&
                            a.Script.ProjectPaper.PaperId == r.PaperId &&
                            a.Status != AllocationStatus.cancelled),
                        // Count of scripts submitted by this examiner for this paper
                        submittedByExaminerCount = _context.Markings.Count(m =>
                            m.ExaminerId == r.ExaminerId &&
                            m.Script.ProjectPaper.PaperId == r.PaperId &&
                            m.Status == MarkingStatus.submitted)
                    })
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Updates the requested status of a subject paper request
        /// PATCH /api/PaperExaminers/subject-paper-requests/{id}/toggle-status
        /// </summary>
        [HttpPatch("subject-paper-requests/{id}/toggle-status")]
        [Authorize(Roles = "coordinator,Coordinator,admin,Admin")]
        public async Task<IActionResult> ToggleSubjectPaperRequestStatus(int id)
        {
            try
            {
                var request = await _context.SubjectPaperRequests.FindAsync(id);
                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                request.Requested = !request.Requested;
                request.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Status updated successfully", requested = request.Requested });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Allocates a specified number of available scripts to the examiner and marks the request as fulfilled (requested = false)
        /// POST /api/PaperExaminers/subject-paper-requests/{id}/allocate-and-fulfill
        /// </summary>
        [HttpPost("subject-paper-requests/{id}/allocate-and-fulfill")]
        [Authorize(Roles = "coordinator,Coordinator,admin,Admin")]
        public async Task<IActionResult> AllocateAndFulfill(int id, [FromBody] AllocateAndFulfillDto dto)
        {
            try
            {
                var request = await _context.SubjectPaperRequests
                    .Include(r => r.Paper)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                int countToAllocate = dto?.Count ?? 1;
                if (countToAllocate <= 0)
                    return BadRequest(new { success = false, message = "Count to allocate must be at least 1." });

                // Find candidate scripts for this paper:
                // 1. Belongs to this paper
                // 2. Not marked as submitted in Markings table
                // 3. Not currently actively allocated to any examiner
                var availableScripts = await _context.Scripts
                    .Include(s => s.ProjectPaper)
                    .Where(s => s.ProjectPaper.PaperId == request.PaperId &&
                                !_context.Markings.Any(m => m.ScriptId == s.Id && m.Status == MarkingStatus.submitted) &&
                                !_context.Allocations.Any(a => a.ScriptId == s.Id && a.Status != AllocationStatus.cancelled))
                    .Take(countToAllocate)
                    .ToListAsync();

                if (!availableScripts.Any())
                {
                    return BadRequest(new { success = false, message = "No unallocated scripts available in pool for this paper." });
                }

                int actualAllocated = 0;
                var now = DateTime.UtcNow;

                foreach (var script in availableScripts)
                {
                    var allocation = new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = request.ExaminerId,
                        AllocatedAt = now,
                        Status = AllocationStatus.allocated
                    };

                    _context.Allocations.Add(allocation);

                    script.Status = ScriptStatus.allocated;
                    script.UpdatedAt = now;
                    _context.Scripts.Update(script);

                    actualAllocated++;
                }

                // Mark request as fulfilled (requested = false / 0)
                request.Requested = false;
                request.UpdatedAt = now;
                _context.SubjectPaperRequests.Update(request);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Successfully allocated {actualAllocated} script(s) and marked request as fulfilled.",
                    allocatedCount = actualAllocated,
                    requested = request.Requested
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a subject paper request
        /// DELETE /api/PaperExaminers/subject-paper-requests/{id}
        /// </summary>
        [HttpDelete("subject-paper-requests/{id}")]
        [Authorize(Roles = "coordinator,Coordinator,admin,Admin")]
        public async Task<IActionResult> DeleteSubjectPaperRequest(int id)
        {
            try
            {
                var request = await _context.SubjectPaperRequests.FindAsync(id);
                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                _context.SubjectPaperRequests.Remove(request);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Request removed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("assign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> AssignExaminer([FromBody] PaperExaminerAssignDto assignDto)
        {
            try
            {
                // Validate that paper and examiner exist
                var paper = await _context.Papers.FindAsync(assignDto.PaperId);
                if (paper == null)
                {
                    return NotFound(new { success = false, message = "Paper not found" });
                }

                var examiner = await _context.Users.FindAsync(assignDto.ExaminerId);
                if (examiner == null)
                {
                    return NotFound(new { success = false, message = "Examiner not found" });
                }

                // Check if already assigned
                if (await _context.PaperExaminers.AnyAsync(pe => pe.PaperId == assignDto.PaperId && pe.ExaminerId == assignDto.ExaminerId))
                {
                    return BadRequest(new { success = false, message = "Examiner already assigned to this paper" });
                }

                var assignment = new PaperExaminer
                {
                    PaperId = assignDto.PaperId,
                    ExaminerId = assignDto.ExaminerId,
                    MaxScriptLimit = assignDto.MaxScriptLimit,
                    AssignedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.PaperExaminers.Add(assignment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Examiner assigned successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("remove/{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RemoveAssignment(int id)
        {
            try
            {
                var assignment = await _context.PaperExaminers.FindAsync(id);
                if (assignment == null)
                    return NotFound(new { success = false, message = "Assignment not found" });

                var allocationsToRemove = await _context.Allocations
                    .Include(a => a.Script)
                    .ThenInclude(s => s.ProjectPaper)
                    .Where(a => a.ExaminerId == assignment.ExaminerId 
                             && a.Script.ProjectPaper.PaperId == assignment.PaperId 
                             && a.Status == AllocationStatus.allocated)
                    .ToListAsync();

                foreach (var allocation in allocationsToRemove)
                {
                    allocation.Script.Status = ScriptStatus.pending;
                }
                
                _context.Allocations.RemoveRange(allocationsToRemove);
                _context.PaperExaminers.Remove(assignment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Examiner removed from paper" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        [HttpPost("bulk-assign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> BulkAssign([FromBody] BulkAssignRequest request)
        {
            try
            {
                int assignedCount = 0;
                
                foreach (var paperId in request.PaperIds)
                {
                    foreach (var examinerId in request.ExaminerIds)
                    {
                        var exists = await _context.PaperExaminers
                            .AnyAsync(pe => pe.PaperId == paperId && pe.ExaminerId == examinerId);
                            
                        if (!exists)
                        {
                            _context.PaperExaminers.Add(new PaperExaminer
                            {
                                PaperId = paperId,
                                ExaminerId = examinerId
                            });
                            assignedCount++;
                        }
                    }
                }
                
                if (assignedCount > 0)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = $"Successfully assigned {request.ExaminerIds.Count} examiners to {request.PaperIds.Count} papers. ({assignedCount} new assignments)" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class BulkAssignRequest
    {
        public List<int> PaperIds { get; set; }
        public List<int> ExaminerIds { get; set; }
    }

    public class SubjectPaperRequestDto
    {
        public int PaperId { get; set; }
        public int? SubjectId { get; set; }
        public int? ExaminerId { get; set; }
        public int? UniversityId { get; set; }
        public bool Requested { get; set; } = true;
    }

    public class AllocateAndFulfillDto
    {
        public int Count { get; set; } = 1;
    }
}

