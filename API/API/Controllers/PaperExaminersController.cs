using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using API.Data;
using API.Models;
using API.Models.DTOs;
using API.Services;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaperExaminersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IDailyAllocationService _dailyAllocationService;

        public PaperExaminersController(
            ApplicationDbContext context, 
            IServiceScopeFactory scopeFactory,
            IDailyAllocationService dailyAllocationService)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _dailyAllocationService = dailyAllocationService;
        }

        private void TriggerAutoAllocationIfEligible(int? universityId)
        {
            if (!universityId.HasValue || universityId.Value <= 0) return;
            _dailyAllocationService.TriggerAutoAllocationBackground(universityId.Value);
        }

        [HttpGet("paper/{paperId}")]
        public async Task<ActionResult<IEnumerable<PaperExaminer>>> GetPaperExaminers(
            int paperId, 
            [FromQuery] int? projectId = null, 
            [FromQuery] int? projectPaperId = null)
        {
            try
            {
                var query = _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Include(pe => pe.ProjectPaper)
                    .Where(pe => pe.IsActive);

                if (projectPaperId.HasValue && projectPaperId.Value > 0)
                {
                    query = query.Where(pe => pe.ProjectPaperId == projectPaperId.Value);
                }
                else if (projectId.HasValue && projectId.Value > 0)
                {
                    var targetPp = await _context.ProjectPapers
                        .FirstOrDefaultAsync(pp => pp.PaperId == paperId && pp.ProjectId == projectId.Value);

                    if (targetPp != null)
                    {
                        query = query.Where(pe => pe.ProjectPaperId == targetPp.Id);
                    }
                    else
                    {
                        return Ok(new List<PaperExaminer>());
                    }
                }
                else
                {
                    query = query.Where(pe => pe.ProjectPaperId == paperId || (pe.ProjectPaper != null && pe.ProjectPaper.PaperId == paperId));
                }

                var assignments = await query.ToListAsync();

                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("project-paper/{projectPaperId}")]
        public async Task<ActionResult<IEnumerable<PaperExaminer>>> GetProjectPaperExaminers(int projectPaperId)
        {
            try
            {
                var assignments = await _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Include(pe => pe.ProjectPaper)
                    .Where(pe => pe.ProjectPaperId == projectPaperId && pe.IsActive)
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
                            a.AssignmentStatus &&
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
                            a.AssignmentStatus),
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
                                !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))
                    .Take(countToAllocate)
                    .ToListAsync();

                if (!availableScripts.Any())
                {
                    return BadRequest(new { success = false, message = "No pending scripts available in pool for this paper." });
                }

                int actualAllocated = 0;
                var now = DateTime.UtcNow;

                foreach (var script in availableScripts)
                {
                    var allocation = new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = request.ExaminerId,
                        ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                        AllocatedAt = now,
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true
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

        private async Task<(bool success, string message, int transferredCount, int keptMarkedCount)> UpdateExaminerAssignmentInternalAsync(
            int projectPaperId,
            int oldExaminerId,
            int newExaminerId,
            int? assignmentId = null)
        {
            if (oldExaminerId <= 0 || newExaminerId <= 0)
            {
                return (false, "Both old examiner ID and new examiner ID are required.", 0, 0);
            }

            if (oldExaminerId == newExaminerId)
            {
                return (true, "Examiner is already assigned (old and new examiners are identical).", 0, 0);
            }

            var newExaminer = await _context.Users.FindAsync(newExaminerId);
            if (newExaminer == null)
            {
                return (false, $"New examiner #{newExaminerId} not found.", 0, 0);
            }

            var projectPaper = await _context.ProjectPapers
                .Include(pp => pp.Project)
                .Include(pp => pp.Paper)
                .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

            if (projectPaper == null)
            {
                return (false, $"Project paper #{projectPaperId} not found.", 0, 0);
            }

            // Find old assignment record
            PaperExaminer? oldAssignment = null;
            if (assignmentId.HasValue && assignmentId.Value > 0)
            {
                oldAssignment = await _context.PaperExaminers.FindAsync(assignmentId.Value);
            }
            if (oldAssignment == null)
            {
                oldAssignment = await _context.PaperExaminers
                    .FirstOrDefaultAsync(pe => pe.ProjectPaperId == projectPaperId && pe.ExaminerId == oldExaminerId);
            }

            // Check if new examiner already has an assignment record
            var newAssignment = await _context.PaperExaminers
                .FirstOrDefaultAsync(pe => pe.ProjectPaperId == projectPaperId && pe.ExaminerId == newExaminerId);

            // Get all active allocations for the old examiner for this project paper
            var oldAllocations = await _context.Allocations
                .Include(a => a.Script)
                .Where(a => a.ExaminerId == oldExaminerId 
                         && a.Script.ProjectPaperId == projectPaperId 
                         && a.AssignmentStatus)
                .ToListAsync();

            int transferredCount = 0;
            int keptMarkedCount = 0;

            if (oldAllocations.Any())
            {
                var allocScriptIds = oldAllocations.Select(a => a.ScriptId).Distinct().ToList();
                var allocIds = oldAllocations.Select(a => a.AllocationId).Distinct().ToList();

                // Check markings table for any evaluation activity by old examiner
                var markings = await _context.Markings
                    .Where(m => (allocScriptIds.Contains(m.ScriptId) || allocIds.Contains(m.AllocationId)) 
                             && m.ExaminerId == oldExaminerId)
                    .ToListAsync();

                var markedScriptIds = new HashSet<int>(markings.Select(m => m.ScriptId));
                var markedAllocIds = new HashSet<int>(markings.Select(m => m.AllocationId));

                var now = DateTime.UtcNow;

                foreach (var alloc in oldAllocations)
                {
                    bool isScriptInMarkingTable = markedAllocIds.Contains(alloc.AllocationId) || markedScriptIds.Contains(alloc.ScriptId);

                    if (isScriptInMarkingTable)
                    {
                        // Script is in marking table: leave it assigned to the old examiner!
                        keptMarkedCount++;
                    }
                    else
                    {
                        // Script is NOT in marking table:
                        // 1. Cancel old examiner's allocation (AssignmentStatus = 0, Status = cancelled)
                        alloc.AssignmentStatus = false;
                        alloc.Status = AllocationStatus.cancelled;

                        // 2. Assign to newly assigned examiner (AssignmentStatus = 1, Status = allocated)
                        var newAllocation = new Allocation
                        {
                            ScriptId = alloc.ScriptId,
                            ExaminerId = newExaminerId,
                            ProjectId = alloc.ProjectId ?? alloc.Script?.ProjectId ?? projectPaper.ProjectId,
                            AllocatedAt = now,
                            Deadline = alloc.Deadline ?? now.AddDays(7),
                            Status = AllocationStatus.allocated,
                            AssignmentStatus = true
                        };
                        _context.Allocations.Add(newAllocation);

                        if (alloc.Script != null)
                        {
                            alloc.Script.Status = ScriptStatus.allocated;
                            alloc.Script.UpdatedAt = now;
                            _context.Scripts.Update(alloc.Script);
                        }

                        transferredCount++;
                    }
                }

                _context.Allocations.UpdateRange(oldAllocations.Where(a => !a.AssignmentStatus));
            }

            // Update PaperExaminers table
            if (keptMarkedCount > 0)
            {
                // Some scripts exist in marking table, so old examiner must retain their assignment record
                if (oldAssignment != null)
                {
                    oldAssignment.IsActive = true;
                    _context.PaperExaminers.Update(oldAssignment);
                }

                // Ensure new examiner also has a PaperExaminer record
                if (newAssignment == null)
                {
                    _context.PaperExaminers.Add(new PaperExaminer
                    {
                        ProjectPaperId = projectPaperId,
                        ExaminerId = newExaminerId,
                        ProjectId = projectPaper.ProjectId,
                        AssignedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
                else
                {
                    newAssignment.IsActive = true;
                    _context.PaperExaminers.Update(newAssignment);
                }
            }
            else
            {
                // 0 scripts in marking table:
                if (newAssignment != null)
                {
                    newAssignment.IsActive = true;
                    _context.PaperExaminers.Update(newAssignment);

                    if (oldAssignment != null)
                    {
                        _context.PaperExaminers.Remove(oldAssignment);
                    }
                }
                else if (oldAssignment != null)
                {
                    // Update ExaminerId in PaperExaminer table directly
                    oldAssignment.ExaminerId = newExaminerId;
                    oldAssignment.AssignedAt = DateTime.UtcNow;
                    oldAssignment.IsActive = true;
                    _context.PaperExaminers.Update(oldAssignment);
                }
                else
                {
                    _context.PaperExaminers.Add(new PaperExaminer
                    {
                        ProjectPaperId = projectPaperId,
                        ExaminerId = newExaminerId,
                        ProjectId = projectPaper.ProjectId,
                        AssignedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            projectPaper.IsExaminerAssigned = true;
            projectPaper.UpdatedAt = DateTime.UtcNow;
            _context.ProjectPapers.Update(projectPaper);

            await _context.SaveChangesAsync();

            int? uniId = projectPaper.Project?.UniversityId ?? projectPaper.Paper?.UniversityId;
            TriggerAutoAllocationIfEligible(uniId);

            string summaryMsg = keptMarkedCount > 0
                ? $"Examiner updated. {transferredCount} unmarked script(s) reassigned to {newExaminer.Name}; {keptMarkedCount} script(s) already in marking table retained with previous examiner."
                : $"Examiner updated successfully to {newExaminer.Name}. {transferredCount} script(s) reassigned.";

            return (true, summaryMsg, transferredCount, keptMarkedCount);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateAssignment(int id, [FromBody] PaperExaminerUpdateDto dto)
        {
            try
            {
                var assignment = await _context.PaperExaminers.FindAsync(id);
                if (assignment == null)
                    return NotFound(new { success = false, message = "Assignment not found" });

                int newExaminerId = dto.ResolvedNewExaminerId;
                if (newExaminerId <= 0)
                    return BadRequest(new { success = false, message = "Valid new examiner ID is required." });

                // If caller provided a projectPaperId and it doesn't match this assignment's projectPaperId,
                // do NOT modify the wrong project paper!
                if (dto.ProjectPaperId.HasValue && dto.ProjectPaperId.Value > 0 && dto.ProjectPaperId.Value != assignment.ProjectPaperId)
                {
                    int targetPpId = dto.ProjectPaperId.Value;
                    var targetAssignment = await _context.PaperExaminers
                        .FirstOrDefaultAsync(pe => pe.ProjectPaperId == targetPpId && pe.IsActive);

                    if (targetAssignment != null)
                    {
                        assignment = targetAssignment;
                    }
                    else
                    {
                        // No active assignment on the intended project paper: create a new assignment for it
                        return await AssignExaminer(new PaperExaminerAssignDto
                        {
                            ProjectPaperId = targetPpId,
                            ExaminerId = newExaminerId,
                            ProjectId = dto.ProjectId
                        });
                    }
                }

                var result = await UpdateExaminerAssignmentInternalAsync(
                    assignment.ProjectPaperId,
                    assignment.ExaminerId,
                    newExaminerId,
                    assignment.Id);

                if (!result.success)
                    return BadRequest(new { success = false, message = result.message });

                return Ok(new
                {
                    success = true,
                    message = result.message,
                    transferredCount = result.transferredCount,
                    keptMarkedCount = result.keptMarkedCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("update")]
        [HttpPost("update")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateExaminerAssignment([FromBody] PaperExaminerUpdateDto dto)
        {
            try
            {
                int newExaminerId = dto.ResolvedNewExaminerId;
                if (newExaminerId <= 0)
                    return BadRequest(new { success = false, message = "Valid new examiner ID is required." });

                int projectPaperId = dto.ProjectPaperId ?? 0;
                int oldExaminerId = dto.OldExaminerId ?? 0;
                int? assignmentId = dto.Id;

                if (assignmentId.HasValue && assignmentId.Value > 0)
                {
                    var pe = await _context.PaperExaminers.FindAsync(assignmentId.Value);
                    if (pe != null)
                    {
                        projectPaperId = pe.ProjectPaperId;
                        if (oldExaminerId <= 0) oldExaminerId = pe.ExaminerId;
                    }
                }

                if (projectPaperId <= 0 && dto.PaperId.HasValue && dto.PaperId.Value > 0)
                {
                    var ppQuery = _context.ProjectPapers.Where(p => p.PaperId == dto.PaperId.Value);
                    if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
                    {
                        ppQuery = ppQuery.Where(p => p.ProjectId == dto.ProjectId.Value);
                    }
                    var pp = await ppQuery.FirstOrDefaultAsync();
                    if (pp != null)
                    {
                        projectPaperId = pp.Id;
                    }
                }

                if (projectPaperId <= 0)
                {
                    return BadRequest(new { success = false, message = "Project paper ID or Paper ID is required." });
                }

                if (oldExaminerId <= 0)
                {
                    // Default old examiner to the currently assigned examiner for this project paper
                    var existingPe = await _context.PaperExaminers
                        .Where(pe => pe.ProjectPaperId == projectPaperId && pe.ExaminerId != newExaminerId && pe.IsActive)
                        .OrderByDescending(pe => pe.AssignedAt)
                        .FirstOrDefaultAsync();

                    if (existingPe != null)
                    {
                        oldExaminerId = existingPe.ExaminerId;
                        assignmentId = existingPe.Id;
                    }
                }

                if (oldExaminerId <= 0)
                {
                    return BadRequest(new { success = false, message = "Old examiner ID could not be determined. Please specify OldExaminerId or Id." });
                }

                var result = await UpdateExaminerAssignmentInternalAsync(
                    projectPaperId,
                    oldExaminerId,
                    newExaminerId,
                    assignmentId);

                if (!result.success)
                    return BadRequest(new { success = false, message = result.message });

                return Ok(new
                {
                    success = true,
                    message = result.message,
                    transferredCount = result.transferredCount,
                    keptMarkedCount = result.keptMarkedCount
                });
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
                int projectPaperId = assignDto.ProjectPaperId ?? 0;
                if (projectPaperId <= 0 && assignDto.PaperId.HasValue && assignDto.PaperId.Value > 0)
                {
                    var ppQuery = _context.ProjectPapers.Where(pp => pp.PaperId == assignDto.PaperId.Value);
                    if (assignDto.ProjectId.HasValue && assignDto.ProjectId.Value > 0)
                    {
                        ppQuery = ppQuery.Where(pp => pp.ProjectId == assignDto.ProjectId.Value);
                    }
                    var matchedPp = await ppQuery.FirstOrDefaultAsync();
                    if (matchedPp != null)
                    {
                        projectPaperId = matchedPp.Id;
                    }
                    else
                    {
                        projectPaperId = assignDto.PaperId.Value;
                    }
                }

                // Validate that project paper exists
                var projectPaper = await _context.ProjectPapers
                    .Include(pp => pp.Project)
                    .Include(pp => pp.Paper)
                    .FirstOrDefaultAsync(pp => pp.Id == projectPaperId);

                // If projectPaper doesn't match requested ProjectId and PaperId, correct it
                if (assignDto.ProjectId.HasValue && assignDto.ProjectId.Value > 0 && assignDto.PaperId.HasValue && assignDto.PaperId.Value > 0
                    && (projectPaper == null || projectPaper.ProjectId != assignDto.ProjectId.Value))
                {
                    var correctPp = await _context.ProjectPapers
                        .Include(pp => pp.Project)
                        .Include(pp => pp.Paper)
                        .FirstOrDefaultAsync(pp => pp.PaperId == assignDto.PaperId.Value && pp.ProjectId == assignDto.ProjectId.Value);
                    if (correctPp != null)
                    {
                        projectPaper = correctPp;
                        projectPaperId = correctPp.Id;
                    }
                }

                if (projectPaper == null)
                {
                    return NotFound(new { success = false, message = "Project paper not found" });
                }

                var examiner = await _context.Users.FindAsync(assignDto.ExaminerId);
                if (examiner == null)
                {
                    return NotFound(new { success = false, message = "Examiner not found" });
                }

                // If OldExaminerId is supplied and different from new examiner, route to update logic
                if (assignDto.OldExaminerId.HasValue && assignDto.OldExaminerId.Value > 0 && assignDto.OldExaminerId.Value != assignDto.ExaminerId)
                {
                    var updateResult = await UpdateExaminerAssignmentInternalAsync(
                        projectPaperId,
                        assignDto.OldExaminerId.Value,
                        assignDto.ExaminerId);

                    return Ok(new
                    {
                        success = updateResult.success,
                        message = updateResult.message,
                        transferredCount = updateResult.transferredCount,
                        keptMarkedCount = updateResult.keptMarkedCount
                    });
                }

                // Check if already assigned
                var existingAssignment = await _context.PaperExaminers
                    .FirstOrDefaultAsync(pe => pe.ProjectPaperId == projectPaperId && pe.ExaminerId == assignDto.ExaminerId);

                if (existingAssignment != null)
                {
                    if (existingAssignment.IsActive)
                    {
                        return BadRequest(new { success = false, message = "Examiner already assigned to this project paper" });
                    }
                    else
                    {
                        // Reactivate previously inactive assignment
                        existingAssignment.IsActive = true;
                        existingAssignment.AssignedAt = DateTime.UtcNow;
                        _context.PaperExaminers.Update(existingAssignment);
                        projectPaper.IsExaminerAssigned = true;
                        projectPaper.UpdatedAt = DateTime.UtcNow;
                        _context.ProjectPapers.Update(projectPaper);
                        await _context.SaveChangesAsync();

                        int? uId = projectPaper.Project?.UniversityId ?? projectPaper.Paper?.UniversityId;
                        TriggerAutoAllocationIfEligible(uId);

                        return Ok(new { success = true, message = "Examiner reactivated successfully" });
                    }
                }

                var assignment = new PaperExaminer
                {
                    ProjectPaperId = projectPaperId,
                    ExaminerId = assignDto.ExaminerId,
                    ProjectId = projectPaper.ProjectId,
                    AssignedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.PaperExaminers.Add(assignment);
                projectPaper.IsExaminerAssigned = true;
                projectPaper.UpdatedAt = DateTime.UtcNow;
                _context.ProjectPapers.Update(projectPaper);
                await _context.SaveChangesAsync();

                int? uniId = projectPaper.Project?.UniversityId ?? projectPaper.Paper?.UniversityId;
                TriggerAutoAllocationIfEligible(uniId);

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

                var activeAllocations = await _context.Allocations
                    .Include(a => a.Script)
                    .ThenInclude(s => s.ProjectPaper)
                    .Where(a => a.ExaminerId == assignment.ExaminerId 
                             && a.Script.ProjectPaperId == assignment.ProjectPaperId 
                             && a.AssignmentStatus)
                    .ToListAsync();

                var allocScriptIds = activeAllocations.Select(a => a.ScriptId).Distinct().ToList();
                var allocIds = activeAllocations.Select(a => a.AllocationId).Distinct().ToList();

                var markings = await _context.Markings
                    .Where(m => (allocScriptIds.Contains(m.ScriptId) || allocIds.Contains(m.AllocationId)) 
                             && m.ExaminerId == assignment.ExaminerId)
                    .ToListAsync();

                var markedScriptIds = new HashSet<int>(markings.Select(m => m.ScriptId));
                var markedAllocIds = new HashSet<int>(markings.Select(m => m.AllocationId));

                // Only cancel allocations that are NOT in Markings table
                var unmarkedAllocations = activeAllocations
                    .Where(a => !markedAllocIds.Contains(a.AllocationId) && !markedScriptIds.Contains(a.ScriptId))
                    .ToList();

                foreach (var allocation in unmarkedAllocations)
                {
                    allocation.AssignmentStatus = false;
                    allocation.Status = AllocationStatus.cancelled;
                    if (allocation.Script != null)
                    {
                        allocation.Script.Status = ScriptStatus.pending;
                        allocation.Script.UpdatedAt = DateTime.UtcNow;
                        _context.Scripts.Update(allocation.Script);
                    }
                }
                
                _context.Allocations.UpdateRange(unmarkedAllocations);

                if (markings.Any())
                {
                    // Preserve PaperExaminer record as inactive so existing marks stay intact
                    assignment.IsActive = false;
                    _context.PaperExaminers.Update(assignment);
                }
                else
                {
                    _context.PaperExaminers.Remove(assignment);
                }

                var pp = await _context.ProjectPapers
                    .Include(p => p.Project)
                    .Include(p => p.Paper)
                    .FirstOrDefaultAsync(p => p.Id == assignment.ProjectPaperId);

                if (pp != null)
                {
                    bool hasActiveExaminers = await _context.PaperExaminers
                        .AnyAsync(pe => pe.ProjectPaperId == assignment.ProjectPaperId && pe.Id != assignment.Id && pe.IsActive);
                    pp.IsExaminerAssigned = hasActiveExaminers;
                    pp.UpdatedAt = DateTime.UtcNow;
                    _context.ProjectPapers.Update(pp);
                }

                await _context.SaveChangesAsync();

                int? uniId = pp?.Project?.UniversityId ?? pp?.Paper?.UniversityId;
                TriggerAutoAllocationIfEligible(uniId);

                string msg = markings.Any()
                    ? $"Examiner deactivated from project paper. {unmarkedAllocations.Count} unmarked script(s) cancelled, while {markings.Count} evaluated script(s) were preserved."
                    : "Examiner removed from project paper";

                return Ok(new { success = true, message = msg });
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
                var targetProjectPaperIds = new HashSet<int>();

                if (request.ProjectPaperIds != null && request.ProjectPaperIds.Any())
                {
                    foreach (var id in request.ProjectPaperIds)
                    {
                        if (id > 0) targetProjectPaperIds.Add(id);
                    }
                }

                if (request.PaperIds != null && request.PaperIds.Any())
                {
                    foreach (var id in request.PaperIds)
                    {
                        if (id <= 0) continue;

                        if (request.ProjectId.HasValue && request.ProjectId.Value > 0)
                        {
                            var ppIds = await _context.ProjectPapers
                                .Where(pp => (pp.PaperId == id || pp.Id == id) && pp.ProjectId == request.ProjectId.Value)
                                .Select(pp => pp.Id)
                                .ToListAsync();

                            foreach (var ppid in ppIds)
                            {
                                targetProjectPaperIds.Add(ppid);
                            }
                        }
                        else
                        {
                            // Check if id is directly a ProjectPaper.Id
                            if (await _context.ProjectPapers.AnyAsync(pp => pp.Id == id))
                            {
                                targetProjectPaperIds.Add(id);
                            }
                            else
                            {
                                var ppIds = await _context.ProjectPapers
                                    .Where(pp => pp.PaperId == id)
                                    .Select(pp => pp.Id)
                                    .ToListAsync();

                                foreach (var ppid in ppIds)
                                {
                                    targetProjectPaperIds.Add(ppid);
                                }
                            }
                        }
                    }
                }

                var pps = await _context.ProjectPapers
                    .Where(pp => targetProjectPaperIds.Contains(pp.Id))
                    .ToListAsync();
                var ppProjectMap = pps.ToDictionary(pp => pp.Id, pp => pp.ProjectId);

                foreach (var projectPaperId in targetProjectPaperIds)
                {
                    foreach (var examinerId in request.ExaminerIds)
                    {
                        var existing = await _context.PaperExaminers
                            .FirstOrDefaultAsync(pe => pe.ProjectPaperId == projectPaperId && pe.ExaminerId == examinerId);
                            
                        if (existing == null)
                        {
                            _context.PaperExaminers.Add(new PaperExaminer
                            {
                                ProjectPaperId = projectPaperId,
                                ExaminerId = examinerId,
                                ProjectId = ppProjectMap.TryGetValue(projectPaperId, out var pId) ? pId : (int?)null,
                                AssignedAt = DateTime.UtcNow,
                                IsActive = true
                            });
                            assignedCount++;
                        }
                        else if (!existing.IsActive)
                        {
                            existing.IsActive = true;
                            existing.AssignedAt = DateTime.UtcNow;
                            _context.PaperExaminers.Update(existing);
                            assignedCount++;
                        }
                    }
                }
                
                if (assignedCount > 0)
                {
                    foreach (var pp in pps)
                    {
                        pp.IsExaminerAssigned = true;
                        pp.UpdatedAt = DateTime.UtcNow;
                    }
                    _context.ProjectPapers.UpdateRange(pps);

                    await _context.SaveChangesAsync();

                    var uniId = await _context.ProjectPapers
                        .Where(pp => targetProjectPaperIds.Contains(pp.Id))
                        .Select(pp => (int?)(pp.Project.UniversityId > 0 ? pp.Project.UniversityId : (pp.Paper != null ? pp.Paper.UniversityId : null)))
                        .FirstOrDefaultAsync();

                    TriggerAutoAllocationIfEligible(uniId);
                }

                return Ok(new { success = true, message = $"Successfully assigned {request.ExaminerIds.Count} examiners to {targetProjectPaperIds.Count} project paper(s). ({assignedCount} new assignments)" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class BulkAssignRequest
    {
        public List<int>? ProjectPaperIds { get; set; }
        public List<int>? PaperIds { get; set; }
        public List<int> ExaminerIds { get; set; } = new List<int>();
        public int? ProjectId { get; set; }
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

