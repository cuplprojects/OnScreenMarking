using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MarkingController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IDistributedCache _cache;

        public MarkingController(ApplicationDbContext context, IDistributedCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpPost]
        [Authorize(Roles = "examiner")]
        public async Task<ActionResult<MarkingDto>> CreateMarking([FromBody] SubmitMarkingRequest request)
        {
            try
            {
                // Verify allocation exists
                var allocation = await _context.Allocations
                    .Include(a => a.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .FirstOrDefaultAsync(a => a.AllocationId == request.AllocationId);

                if (allocation == null)
                    return BadRequest(new { success = false, message = "Allocation not found" });

                if (allocation.ExaminerId != request.ExaminerId)
                    return BadRequest(new { success = false, message = "Allocation not assigned to this examiner" });

                var timePerCopy = await GetTimePerCopyMinutesForScriptAsync(allocation.ScriptId);

                decimal maxMarks = allocation.Script?.ProjectPaper?.Paper?.MaxMarks ?? 100;
                if (maxMarks <= 0) maxMarks = 100;

                // Load ALL markings for this ScriptId + ExaminerId combination
                var allMarkingsForScript = await _context.Markings
                    .Where(m => m.ScriptId == allocation.ScriptId && m.ExaminerId == request.ExaminerId)
                    .OrderByDescending(m => m.Status == MarkingStatus.submitted) // submitted first
                    .ThenByDescending(m => m.UpdatedAt)
                    .ToListAsync();

                if (allMarkingsForScript.Any())
                {
                    // Keep the most relevant one (submitted > latest updated draft)
                    var existingMarking = allMarkingsForScript.First();

                    // Remove any extra duplicate draft rows for this script+examiner
                    var duplicateDrafts = allMarkingsForScript
                        .Skip(1)
                        .Where(m => m.Status == MarkingStatus.draft)
                        .ToList();
                    if (duplicateDrafts.Any())
                    {
                        _context.Markings.RemoveRange(duplicateDrafts);
                        await _context.SaveChangesAsync();
                    }

                    // Return existing without modifying it (examiner resumes from where they left off)
                    var existingMarkingDto = new MarkingDto
                    {
                        Id = existingMarking.Id,
                        ScriptId = existingMarking.ScriptId,
                        ExaminerId = existingMarking.ExaminerId,
                        AllocationId = existingMarking.AllocationId,
                        TotalMarks = existingMarking.TotalMarks,
                        Percentage = existingMarking.Percentage,
                        Remarks = existingMarking.Remarks,
                        Status = existingMarking.Status,
                        StartedAt = existingMarking.StartedAt,
                        TimePerCopyMinutes = timePerCopy,
                        ProjectId = existingMarking.ProjectId
                    };
                    return Ok(existingMarkingDto);
                }

                var marking = new Marking
                {
                    ScriptId = allocation.ScriptId,
                    ExaminerId = request.ExaminerId,
                    AllocationId = request.AllocationId,
                    ProjectId = allocation.ProjectId ?? allocation.Script?.ProjectId ?? allocation.Script?.ProjectPaper?.ProjectId,
                    TotalMarks = Math.Round(request.TotalMarks, 2),
                    Percentage = Math.Round((request.TotalMarks / maxMarks) * 100, 2),
                    Remarks = request.Remarks ?? "",
                    Status = MarkingStatus.draft,
                    StartedAt = DateTime.UtcNow,
                    EvaluatedPdfUrl = "" // Avoid Column 'EvaluatedPdfUrl' cannot be null error
                };

                try
                {
                    _context.Markings.Add(marking);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    // Concurrency safeguard: existing marking inserted simultaneously, fetch and return it
                    _context.ChangeTracker.Clear();
                    var concurrentMarking = await _context.Markings
                        .FirstOrDefaultAsync(m => m.ScriptId == allocation.ScriptId && m.ExaminerId == request.ExaminerId);

                    if (concurrentMarking != null)
                    {
                        return Ok(new MarkingDto
                        {
                            Id = concurrentMarking.Id,
                            ScriptId = concurrentMarking.ScriptId,
                            ExaminerId = concurrentMarking.ExaminerId,
                            AllocationId = concurrentMarking.AllocationId,
                            TotalMarks = concurrentMarking.TotalMarks,
                            Percentage = concurrentMarking.Percentage,
                            Remarks = concurrentMarking.Remarks,
                            Status = concurrentMarking.Status,
                            StartedAt = concurrentMarking.StartedAt,
                            TimePerCopyMinutes = timePerCopy
                        });
                    }
                    throw;
                }

                var markingDto = new MarkingDto
                {
                    Id = marking.Id,
                    ScriptId = marking.ScriptId,
                    ExaminerId = marking.ExaminerId,
                    AllocationId = marking.AllocationId,
                    TotalMarks = marking.TotalMarks,
                    Percentage = marking.Percentage,
                    Remarks = marking.Remarks,
                    Status = marking.Status,
                    StartedAt = marking.StartedAt,
                    TimePerCopyMinutes = timePerCopy
                };

                return CreatedAtAction(nameof(GetMarking), new { id = marking.Id }, markingDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MarkingDto>> GetMarking(int id)
        {
            try
            {
                var marking = await _context.Markings
                    .Include(m => m.Script)
                    .Include(m => m.Examiner)
                    .Include(m => m.Allocation)
                    .FirstOrDefaultAsync(m => m.Id == id);

                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || marking.ExaminerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You do not have permission to view this marking." });
                    }
                }

                var timePerCopy = await GetTimePerCopyMinutesForScriptAsync(marking.ScriptId);

                var markingDto = new MarkingDto
                {
                    Id = marking.Id,
                    ScriptId = marking.ScriptId,
                    ExaminerId = marking.ExaminerId,
                    AllocationId = marking.AllocationId,
                    TotalMarks = marking.TotalMarks,
                    Percentage = marking.Percentage,
                    Remarks = marking.Remarks,
                    Status = marking.Status,
                    StartedAt = marking.StartedAt,
                    SubmittedAt = marking.SubmittedAt,
                    TimePerCopyMinutes = timePerCopy
                };

                return Ok(markingDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> UpdateMarking(int id, [FromBody] SubmitMarkingRequest request)
        {
            try
            {
                var existingMarking = await _context.Markings
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .FirstOrDefaultAsync(m => m.Id == id);

                if (existingMarking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                if (!string.IsNullOrEmpty(loggedInUserIdStr) && existingMarking.ExaminerId != int.Parse(loggedInUserIdStr))
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to modify this marking." });
                }

                decimal maxMarks = existingMarking.Script?.ProjectPaper?.Paper?.MaxMarks ?? 100;
                if (maxMarks <= 0) maxMarks = 100;

                existingMarking.TotalMarks = Math.Round(request.TotalMarks, 2);
                existingMarking.Percentage = Math.Round((request.TotalMarks / maxMarks) * 100, 2);
                existingMarking.Remarks = request.Remarks;
                existingMarking.EvaluatedPdfUrl = request.EvaluatedPdfUrl ?? "";
                existingMarking.UpdatedAt = DateTime.UtcNow;

                // If previously submitted, allow examiner to re-evaluate/update marks and transition to in_progress
                if (existingMarking.Status == MarkingStatus.submitted)
                {
                    existingMarking.Status = MarkingStatus.in_progress;
                    if (existingMarking.Script != null && existingMarking.Script.Status == ScriptStatus.completed)
                    {
                        existingMarking.Script.Status = ScriptStatus.marking;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Marking updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{scriptId}/draft")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> SaveDraftMarks(int scriptId, [FromBody] DraftMarksRequest request)
        {
            try
            {
                // 1. Save to Redis Cache (for fast in-memory access)
                try
                {
                    var cacheKey = $"draft_marks_{scriptId}_{request.ExaminerId}";
                    var serializedData = JsonSerializer.Serialize(request.DraftData);
                    
                    var options = new DistributedCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromDays(7));
                    
                    await _cache.SetStringAsync(cacheKey, serializedData, options);
                }
                catch (Exception)
                {
                    // Ignore cache errors so database persistence continues
                }

                // 2. Persist Draft Question Marks to MySQL Database
                try
                {
                    var marking = await _context.Markings
                        .Include(m => m.QuestionMarks)
                        .Include(m => m.Script)
                            .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                        .FirstOrDefaultAsync(m => m.ScriptId == scriptId && m.ExaminerId == request.ExaminerId);

                    if (marking == null)
                    {
                        var allocation = await _context.Allocations
                            .FirstOrDefaultAsync(a => a.ScriptId == scriptId && a.ExaminerId == request.ExaminerId && a.AssignmentStatus);

                        if (allocation != null)
                        {
                            marking = new Marking
                            {
                                ScriptId = scriptId,
                                ExaminerId = request.ExaminerId,
                                AllocationId = allocation.AllocationId,
                                ProjectId = allocation.ProjectId,
                                TotalMarks = 0,
                                Percentage = 0,
                                Remarks = "",
                                Status = MarkingStatus.draft,
                                StartedAt = DateTime.UtcNow,
                                EvaluatedPdfUrl = ""
                            };
                            _context.Markings.Add(marking);
                            await _context.SaveChangesAsync();
                        }
                    }

                    if (marking != null)
                    {
                        var parsedQuestionMarks = new List<(int QuestionId, decimal MarksAwarded, bool IsSkipped, string Remarks, bool IsAttempted)>();

                        if (request.DraftData.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var prop in request.DraftData.EnumerateObject())
                            {
                                if (int.TryParse(prop.Name, out int qId))
                                {
                                    var item = prop.Value;
                                    decimal marksAwarded = item.TryGetProperty("marksAwarded", out var mp) && mp.ValueKind == JsonValueKind.Number ? Math.Round(mp.GetDecimal(), 2, MidpointRounding.AwayFromZero) : 0;
                                    bool isSkipped = item.TryGetProperty("isSkipped", out var sp) && (sp.ValueKind == JsonValueKind.True || sp.ValueKind == JsonValueKind.False) && sp.GetBoolean();
                                    string remarks = item.TryGetProperty("remarks", out var rp) && rp.ValueKind == JsonValueKind.String ? rp.GetString() ?? "" : "";
                                    bool isAttempted = item.TryGetProperty("isAttempted", out var ap) && (ap.ValueKind == JsonValueKind.True || ap.ValueKind == JsonValueKind.False) && ap.GetBoolean();

                                    parsedQuestionMarks.Add((qId, marksAwarded, isSkipped, remarks, isAttempted));
                                }
                            }
                        }
                        else if (request.DraftData.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in request.DraftData.EnumerateArray())
                            {
                                int qId = item.TryGetProperty("questionId", out var qp) && qp.ValueKind == JsonValueKind.Number ? qp.GetInt32() : 0;
                                if (qId > 0)
                                {
                                    decimal marksAwarded = item.TryGetProperty("marksAwarded", out var mp) && mp.ValueKind == JsonValueKind.Number ? Math.Round(mp.GetDecimal(), 2, MidpointRounding.AwayFromZero) : 0;
                                    bool isSkipped = item.TryGetProperty("isSkipped", out var sp) && (sp.ValueKind == JsonValueKind.True || sp.ValueKind == JsonValueKind.False) && sp.GetBoolean();
                                    string remarks = item.TryGetProperty("remarks", out var rp) && rp.ValueKind == JsonValueKind.String ? rp.GetString() ?? "" : "";
                                    bool isAttempted = item.TryGetProperty("isAttempted", out var ap) && (ap.ValueKind == JsonValueKind.True || ap.ValueKind == JsonValueKind.False) && ap.GetBoolean();

                                    parsedQuestionMarks.Add((qId, marksAwarded, isSkipped, remarks, isAttempted));
                                }
                            }
                        }

                        if (parsedQuestionMarks.Any())
                        {
                            var existingMap = marking.QuestionMarks.ToDictionary(qm => qm.QuestionId);
                            decimal totalMarks = 0;

                            foreach (var qm in parsedQuestionMarks)
                            {
                                if (existingMap.TryGetValue(qm.QuestionId, out var existingQm))
                                {
                                    existingQm.MarksAwarded = Math.Round(qm.MarksAwarded, 2, MidpointRounding.AwayFromZero);
                                    existingQm.IsSkipped = qm.IsSkipped;
                                    existingQm.Remarks = qm.Remarks ?? "";
                                    existingQm.IsAttempted = qm.IsAttempted;
                                    _context.Entry(existingQm).State = EntityState.Modified;
                                }
                                else
                                {
                                    var newQm = new QuestionMark
                                    {
                                        MarkingId = marking.Id,
                                        QuestionId = qm.QuestionId,
                                        MarksAwarded = Math.Round(qm.MarksAwarded, 2, MidpointRounding.AwayFromZero),
                                        IsSkipped = qm.IsSkipped,
                                        Remarks = qm.Remarks ?? "",
                                        IsAttempted = qm.IsAttempted
                                    };
                                    _context.QuestionMarks.Add(newQm);
                                }

                                if (!qm.IsSkipped)
                                {
                                    totalMarks += qm.MarksAwarded;
                                }
                            }

                            decimal maxMarks = marking.Script?.ProjectPaper?.Paper?.MaxMarks ?? 100;
                            if (maxMarks <= 0) maxMarks = 100;

                            marking.TotalMarks = Math.Round(totalMarks, 2);
                            marking.Percentage = Math.Round((totalMarks / maxMarks) * 100, 2);
                            marking.UpdatedAt = DateTime.UtcNow;
                            await _context.SaveChangesAsync();
                        }
                    }
                }
                catch (Exception)
                {
                    // Ignore DB errors in background draft save so response is fast
                }

                return Ok(new { success = true, message = "Draft saved successfully" });
            }
            catch (Exception ex)
            {
                // Return success=true to ignore errors
                return Ok(new { success = true, message = "Draft save skipped due to error", error = ex.Message });
            }
        }

        [HttpGet("{scriptId}/draft/{examinerId}")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> GetDraftMarks(int scriptId, int examinerId)
        {
            try
            {
                // 1. Try Redis cache first
                var cacheKey = $"draft_marks_{scriptId}_{examinerId}";
                string draftDataStr = null;
                try
                {
                    draftDataStr = await _cache.GetStringAsync(cacheKey);
                }
                catch {}

                if (!string.IsNullOrEmpty(draftDataStr))
                {
                    var draftData = JsonSerializer.Deserialize<JsonElement>(draftDataStr);
                    return Ok(new { success = true, draftData });
                }

                // 2. Fallback to Database QuestionMarks if cache is empty or unavailable
                var marking = await _context.Markings
                    .Include(m => m.QuestionMarks)
                    .FirstOrDefaultAsync(m => m.ScriptId == scriptId && m.ExaminerId == examinerId);

                if (marking != null && marking.QuestionMarks.Any())
                {
                    var qIds = marking.QuestionMarks.Select(qm => qm.QuestionId).Distinct().ToList();
                    var qMasters = await _context.QuestionMasters
                        .Where(qm => qIds.Contains(qm.Id))
                        .ToDictionaryAsync(qm => qm.Id, qm => new { qm.Marks, qm.Question });

                    var dbDraft = new Dictionary<string, object>();
                    foreach (var qm in marking.QuestionMarks)
                    {
                        qMasters.TryGetValue(qm.QuestionId, out var qmInfo);
                        dbDraft[qm.QuestionId.ToString()] = new
                        {
                            marksAwarded = qm.MarksAwarded,
                            isSkipped = qm.IsSkipped,
                            remarks = qm.Remarks ?? "",
                            isAttempted = qm.IsAttempted,
                            maxMarks = qmInfo?.Marks ?? 0,
                            questionNo = qmInfo?.Question ?? ""
                        };
                    }
                    return Ok(new { success = true, draftData = dbDraft });
                }

                return Ok(new { success = true, draftData = (object)null });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, draftData = (object)null, error = ex.Message });
            }
        }

        [HttpPut("{id}/submit")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> SubmitMarking(int id)
        {
            try
            {
                var marking = await _context.Markings
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper)
                            .ThenInclude(pp => pp.Paper)
                    .Include(m => m.QuestionMarks)
                    .FirstOrDefaultAsync(m => m.Id == id);

                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                if (marking.Script == null)
                    return BadRequest(new { success = false, message = "Script not found for this marking" });

                // Allow re-submission if script status is not completed (means previous submit failed)
                bool isResubmission = marking.Status == MarkingStatus.submitted && marking.Script.Status != ScriptStatus.completed;

                // Enforce minimum required evaluation time if TimePerCopy is configured
                var timePerCopy = await GetTimePerCopyMinutesForScriptAsync(marking.ScriptId);
                if (timePerCopy.HasValue && timePerCopy.Value > 0)
                {
                    var minTimeRequired = marking.StartedAt.AddMinutes(timePerCopy.Value);
                    if (DateTime.UtcNow < minTimeRequired)
                    {
                        var remainingSeconds = (int)(minTimeRequired - DateTime.UtcNow).TotalSeconds;
                        return BadRequest(new { success = false, message = $"Minimum required evaluation time ({timePerCopy.Value} minutes) has not elapsed. Please spend at least {timePerCopy.Value} minutes on this script ({remainingSeconds} seconds remaining)." });
                    }
                }

                // Recalculate total marks from question marks to ensure accuracy
                decimal totalMarks = marking.QuestionMarks
                    .Where(qm => !qm.IsSkipped)
                    .Sum(qm => qm.MarksAwarded);

                marking.TotalMarks = Math.Round(totalMarks, 2);

                // Recalculate percentage
                decimal maxMarks = marking.Script?.ProjectPaper?.Paper?.MaxMarks ?? 100;
                if (maxMarks <= 0) maxMarks = 100;
                marking.Percentage = Math.Round((totalMarks / maxMarks) * 100, 2);

                marking.Status = MarkingStatus.submitted;
                marking.SubmittedAt = DateTime.UtcNow;
                marking.UpdatedAt = DateTime.UtcNow;

                // Update script status
                marking.Script.Status = ScriptStatus.completed;
                marking.Script.TotalMarks = Math.Round(totalMarks, 2);
                marking.Script.Percentage = Math.Round(marking.Percentage, 2);
                marking.Script.Remarks = marking.Remarks;
                marking.Script.SubmittedAt = DateTime.UtcNow;
                marking.Script.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Clear the draft from Redis
                var cacheKey = $"draft_marks_{marking.Script.Id}_{marking.ExaminerId}";
                await _cache.RemoveAsync(cacheKey);

                return Ok(new { 
                    success = true, 
                    message = isResubmission ? "Marking re-submitted successfully" : "Marking submitted successfully",
                    totalMarks = marking.TotalMarks,
                    percentage = marking.Percentage,
                    scriptStatus = marking.Script.Status,
                    isResubmission = isResubmission
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<IEnumerable<MarkingDto>>> GetExaminerMarkings(
            int examinerId,
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
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || examinerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You can only view your own markings." });
                    }
                }

                var query = _context.Markings
                    .Where(m => m.ExaminerId == examinerId)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status) && Enum.TryParse<MarkingStatus>(status.Replace("-", "_"), true, out var parsedStatus))
                    query = query.Where(m => m.Status == parsedStatus);

                var total = await query.CountAsync();
                var markings = await query
                    .Include(m => m.Script)
                    .Include(m => m.Examiner)
                    .Include(m => m.Allocation)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .OrderByDescending(m => m.CreatedAt)
                    .ToListAsync();

                var markingDtos = markings.Select(m => new MarkingDto
                {
                    Id = m.Id,
                    ScriptId = m.ScriptId,
                    ExaminerId = m.ExaminerId,
                    AllocationId = m.AllocationId,
                    TotalMarks = m.TotalMarks,
                    Percentage = m.Percentage,
                    Remarks = m.Remarks,
                    Status = m.Status,
                    StartedAt = m.StartedAt,
                    SubmittedAt = m.SubmittedAt
                }).ToList();

                Response.Headers.Add("X-Total-Count", total.ToString());

                return Ok(markingDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("script/{scriptId}")]
        public async Task<ActionResult<MarkingDto>> GetScriptMarking(int scriptId)
        {
            try
            {
                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                // Build query: prefer submitted marking for this script, filtered by examiner if examiner role
                var query = _context.Markings
                    .Include(m => m.Script)
                    .Include(m => m.Examiner)
                    .Include(m => m.Allocation)
                    .Where(m => m.ScriptId == scriptId);

                if (loggedInUserType == "examiner" && !string.IsNullOrEmpty(loggedInUserIdStr) && int.TryParse(loggedInUserIdStr, out int loggedInExaminerId))
                {
                    // Examiner can only see their own marking for this script
                    query = query.Where(m => m.ExaminerId == loggedInExaminerId);
                }

                // Return submitted marking first (if any), otherwise latest draft
                var marking = await query
                    .OrderByDescending(m => m.Status == MarkingStatus.submitted)
                    .ThenByDescending(m => m.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found for this script" });

                var timePerCopy = await GetTimePerCopyMinutesForScriptAsync(marking.ScriptId);

                var markingDto = new MarkingDto
                {
                    Id = marking.Id,
                    ScriptId = marking.ScriptId,
                    ExaminerId = marking.ExaminerId,
                    AllocationId = marking.AllocationId,
                    TotalMarks = marking.TotalMarks,
                    Percentage = marking.Percentage,
                    Remarks = marking.Remarks,
                    Status = marking.Status,
                    StartedAt = marking.StartedAt,
                    SubmittedAt = marking.SubmittedAt,
                    TimePerCopyMinutes = timePerCopy
                };

                return Ok(markingDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{markingId}/details")]
        public async Task<ActionResult<object>> GetMarkingDetails(int markingId)
        {
            try
            {
                var marking = await _context.Markings
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .Include(m => m.Examiner)
                    .Include(m => m.Allocation)
                    .Include(m => m.QuestionMarks)
                    .FirstOrDefaultAsync(m => m.Id == markingId);

                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || marking.ExaminerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You do not have permission to view this marking." });
                    }
                }

                int secBatchId = marking.Script?.BatchId ?? marking.Script?.ProjectPaper?.BatchId ?? 0;
                if (secBatchId <= 0 && marking.Script?.ProjectPaper?.PaperId != null)
                {
                    secBatchId = await _context.ProjectPapers
                        .Where(pp => pp.PaperId == marking.Script.ProjectPaper.PaperId && pp.BatchId != null && pp.BatchId > 0)
                        .Select(pp => pp.BatchId!.Value)
                        .FirstOrDefaultAsync();
                }

                var sectionMasters = secBatchId > 0
                    ? await _context.SectionMasters.Where(sm => sm.BatchId == secBatchId).OrderBy(sm => sm.Id).ToListAsync()
                    : new List<SectionMaster>();

                var questionMasters = secBatchId > 0
                    ? await _context.QuestionMasters
                        .Include(qm => qm.QuestionType)
                        .Where(qm => qm.BatchId == secBatchId)
                        .OrderBy(qm => qm.Id)
                        .ToListAsync()
                    : new List<QuestionMaster>();

                // Fallback: If sectionMasters is empty but questionMasters exist, synthesize sections dynamically
                if (sectionMasters.Count == 0 && questionMasters.Count > 0)
                {
                    var groupedBySection = questionMasters
                        .GroupBy(qm => string.IsNullOrWhiteSpace(qm.Section) ? "Section A" : qm.Section)
                        .ToList();

                    int syntheticId = 1;
                    foreach (var group in groupedBySection)
                    {
                        var groupList = group.ToList();
                        var firstQ = groupList.First().Question;
                        var lastQ = groupList.Last().Question;
                        var sumMarks = groupList.Sum(q => q.Marks);
                        int startQ = int.TryParse(firstQ, out int sq) ? sq : 1;
                        int endQ = int.TryParse(lastQ, out int eq) ? eq : (startQ + groupList.Count - 1);

                        sectionMasters.Add(new SectionMaster
                        {
                            Id = syntheticId++,
                            BatchId = secBatchId,
                            Name = group.Key,
                            Description = group.Key,
                            TotalQuestions = groupList.Count,
                            TotalMarks = sumMarks,
                            StartQuestion = startQ,
                            EndQuestion = endQ,
                            MaxQuestionsToAttempt = groupList.Count
                        });
                    }
                }

                decimal paperMaxMarks = marking.Script?.ProjectPaper?.Paper?.MaxMarks ?? 0;
                if (paperMaxMarks <= 0 && questionMasters.Any(q => q.Marks > 0))
                {
                    paperMaxMarks = questionMasters.Sum(q => q.Marks);
                }
                if (paperMaxMarks <= 0)
                {
                    paperMaxMarks = 100;
                }

                var sections = sectionMasters.Select(sm => new
                {
                    id = sm.Id,
                    name = sm.Name,
                    description = sm.Description,
                    totalQuestions = sm.TotalQuestions,
                    totalMarks = sm.TotalMarks,
                    startQuestion = sm.StartQuestion,
                    endQuestion = sm.EndQuestion,
                    maxQuestionsToAttempt = sm.MaxQuestionsToAttempt,
                    questions = questionMasters
                        .Where(qm => qm.Section == sm.Name)
                        .Select(q => new
                        {
                            questionId = q.Id,
                            questionNo = q.Question,
                            marks = q.Marks > 0 ? q.Marks : (decimal?)null,
                            type = q.QuestionType != null ? q.QuestionType.QuestionTypeName : "MCQ",
                            typeId = q.QuestionTypeId,
                            questionTypeId = q.QuestionTypeId,
                            isOptional = !string.IsNullOrEmpty(q.Group),
                            optionalGroupCode = q.Group,
                            sectionId = sm.Id,
                            marksAwarded = marking.QuestionMarks
                                .FirstOrDefault(qm => qm.QuestionId == q.Id)?.MarksAwarded ?? 0,
                            isSkipped = marking.QuestionMarks
                                .FirstOrDefault(qm => qm.QuestionId == q.Id)?.IsSkipped ?? false,
                            remarks = marking.QuestionMarks
                                .FirstOrDefault(qm => qm.QuestionId == q.Id)?.Remarks ?? "",
                            isAttempted = marking.QuestionMarks
                                .FirstOrDefault(qm => qm.QuestionId == q.Id)?.IsAttempted ?? false
                        }).ToList()
                }).ToList();

                return Ok(new
                {
                    marking = new
                    {
                        id = marking.Id,
                        scriptId = marking.ScriptId,
                        examinerId = marking.ExaminerId,
                        examinerName = marking.Examiner.Name,
                        allocationId = marking.AllocationId,
                        totalMarks = marking.TotalMarks,
                        percentage = marking.Percentage,
                        remarks = marking.Remarks,
                        status = marking.Status,
                        startedAt = marking.StartedAt,
                        submittedAt = marking.SubmittedAt
                    },
                    script = new
                    {
                        id = marking.Script.Id,
                        paperId = marking.Script.ProjectPaper.PaperId,
                        projectPaperId = marking.Script.ProjectPaperId,
                        cleanPdfUrl = marking.Script.CleanPdfUrl,
                        status = marking.Script.Status,
                        batchId = secBatchId > 0 ? secBatchId : (marking.Script.BatchId ?? marking.Script.ProjectPaper?.BatchId),
                        maxMarks = paperMaxMarks
                    },
                    sections = sections
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{markingId}/question-marks")]
        [Authorize(Roles = "examiner")]
        public async Task<IActionResult> SaveQuestionMarks(int markingId, [FromBody] List<QuestionMarkDto> questionMarks)
        {
            try
            {
                var marking = await _context.Markings
                    .Include(m => m.QuestionMarks)
                    .Include(m => m.Script)
                        .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .FirstOrDefaultAsync(m => m.Id == markingId);

                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                var loggedInUserIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(loggedInUserIdStr) || marking.ExaminerId != int.Parse(loggedInUserIdStr))
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to modify this marking." });
                }

                // If previously submitted, allow re-evaluation — reset status so marks can be updated
                if (marking.Status == MarkingStatus.submitted)
                {
                    marking.Status = MarkingStatus.in_progress;
                    if (marking.Script != null && marking.Script.Status == ScriptStatus.completed)
                    {
                        marking.Script.Status = ScriptStatus.marking;
                        marking.Script.UpdatedAt = DateTime.UtcNow;
                    }
                    marking.UpdatedAt = DateTime.UtcNow;
                }

                var questionIds = questionMarks.Select(qm => qm.QuestionId).ToList();
                var qMasters = await _context.QuestionMasters
                    .Where(qm => questionIds.Contains(qm.Id))
                    .ToListAsync();

                var batchId = qMasters.FirstOrDefault()?.BatchId ?? 0;
                var sMasters = batchId > 0
                    ? await _context.SectionMasters.Where(sm => sm.BatchId == batchId).ToListAsync()
                    : new List<SectionMaster>();

                // 1. Question-wise validation
                foreach (var qm in questionMarks)
                {
                    if (qm.IsSkipped) continue;

                    var q = qMasters.FirstOrDefault(x => x.Id == qm.QuestionId);
                    if (q == null)
                        return BadRequest(new { success = false, message = $"Question with ID {qm.QuestionId} not found" });

                    if (qm.MarksAwarded < 0)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"Marks awarded for Question {q.Question} ({qm.MarksAwarded}) cannot be negative" 
                        });
                    }

                    if (q.Marks > 0 && qm.MarksAwarded > q.Marks)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"Marks awarded for Question {q.Question} ({qm.MarksAwarded}) cannot exceed maximum question marks ({q.Marks})" 
                        });
                    }
                }

                // 2. Section-wise validation
                var marksBySection = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
                foreach (var qm in questionMarks)
                {
                    if (qm.IsSkipped) continue;

                    var q = qMasters.FirstOrDefault(x => x.Id == qm.QuestionId);
                    if (q != null && !string.IsNullOrEmpty(q.Section))
                    {
                        if (!marksBySection.ContainsKey(q.Section))
                            marksBySection[q.Section] = 0;
                        marksBySection[q.Section] += qm.MarksAwarded;
                    }
                }

                foreach (var entry in marksBySection)
                {
                    var sm = sMasters.FirstOrDefault(s => s.Name.Equals(entry.Key, StringComparison.OrdinalIgnoreCase));
                    if (sm != null && sm.TotalMarks > 0 && entry.Value > sm.TotalMarks)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"Total marks in Section '{sm.Name}' ({entry.Value}) cannot exceed the maximum section marks ({sm.TotalMarks})" 
                        });
                    }
                }

                // 3. Max attempted questions validation per section
                var attemptedCountBySection = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                foreach (var qm in questionMarks)
                {
                    if (qm.IsSkipped) continue;

                    var q = qMasters.FirstOrDefault(x => x.Id == qm.QuestionId);
                    if (q != null && !string.IsNullOrEmpty(q.Section))
                    {
                        var isAttempted = qm.IsAttempted || qm.MarksAwarded > 0;
                        if (isAttempted)
                        {
                            if (!attemptedCountBySection.ContainsKey(q.Section))
                            {
                                attemptedCountBySection[q.Section] = 0;
                            }
                            attemptedCountBySection[q.Section]++;
                        }
                    }
                }

                foreach (var entry in attemptedCountBySection)
                {
                    var sm = sMasters.FirstOrDefault(s => s.Name.Equals(entry.Key, StringComparison.OrdinalIgnoreCase));
                    var sectionName = sm?.Name ?? entry.Key;
                    var maxAttempts = sm?.MaxQuestionsToAttempt ?? 0;

                    if (maxAttempts > 0 && entry.Value > maxAttempts)
                    {
                        return BadRequest(new { 
                            success = false, 
                            message = $"You have attempted {entry.Value} questions in Section '{sectionName}', which exceeds the maximum allowed attempts of {maxAttempts}." 
                        });
                    }
                }

                // 4. Optional group mutual exclusivity validation (at most 1 attempted question per group)
                var groupsAttempted = new Dictionary<string, string>();
                foreach (var qm in questionMarks)
                {
                    if (qm.IsSkipped) continue;

                    var isAttempted = qm.IsAttempted || qm.MarksAwarded > 0;
                    if (!isAttempted) continue;

                    var q = qMasters.FirstOrDefault(x => x.Id == qm.QuestionId);
                    if (q != null && !string.IsNullOrWhiteSpace(q.Group))
                    {
                        var groupCode = q.Group.Trim().ToUpper();
                        var groupKey = $"{q.Section}_{groupCode}";
                        if (groupsAttempted.TryGetValue(groupKey, out var existingQNo))
                        {
                            return BadRequest(new { 
                                success = false, 
                                message = $"Question {q.Question} and Question {existingQNo} both belong to Optional Group '{groupCode}'. Only one question from this group can be awarded marks." 
                            });
                        }
                        groupsAttempted[groupKey] = q.Question;
                    }
                }

                // Remove existing question marks
                _context.QuestionMarks.RemoveRange(marking.QuestionMarks);

                // Add new question marks
                decimal totalMarks = 0;
                foreach (var qm in questionMarks)
                {
                    var q = qMasters.FirstOrDefault(x => x.Id == qm.QuestionId);
                    if (q == null)
                        continue;

                    var questionMark = new QuestionMark
                    {
                        MarkingId = markingId,
                        QuestionId = qm.QuestionId,
                        MarksAwarded = Math.Round(qm.MarksAwarded, 2, MidpointRounding.AwayFromZero),
                        IsSkipped = qm.IsSkipped,
                        Remarks = qm.Remarks ?? "",
                        IsAttempted = qm.IsAttempted
                    };

                    _context.QuestionMarks.Add(questionMark);
                    if (!qm.IsSkipped)
                        totalMarks += qm.MarksAwarded;
                }

                // Update marking totals
                decimal maxMarks = marking.Script?.ProjectPaper?.Paper?.MaxMarks ?? 100;
                if (maxMarks <= 0) maxMarks = 100;

                marking.TotalMarks = Math.Round(totalMarks, 2, MidpointRounding.AwayFromZero);
                marking.Percentage = Math.Round((totalMarks / maxMarks) * 100, 2, MidpointRounding.AwayFromZero);
                marking.UpdatedAt = DateTime.UtcNow;

                _context.Markings.Update(marking);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Question marks saved successfully", totalMarks = totalMarks });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{markingId}/question-marks")]
        public async Task<ActionResult<List<QuestionMarkDto>>> GetQuestionMarks(int markingId)
        {
            try
            {
                var marking = await _context.Markings.FindAsync(markingId);
                if (marking == null)
                    return NotFound(new { success = false, message = "Marking not found" });

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (loggedInUserType == "examiner")
                {
                    if (string.IsNullOrEmpty(loggedInUserIdStr) || marking.ExaminerId != int.Parse(loggedInUserIdStr))
                    {
                        return StatusCode(403, new { success = false, message = "You do not have permission to view this marking's question marks." });
                    }
                }

                var rawList = await _context.QuestionMarks
                    .Where(qm => qm.MarkingId == markingId)
                    .ToListAsync();

                var qIds = rawList.Select(x => x.QuestionId).Distinct().ToList();
                var qMasters = await _context.QuestionMasters
                    .Where(qm => qIds.Contains(qm.Id))
                    .ToDictionaryAsync(qm => qm.Id, qm => qm.Question);

                var questionMarks = rawList.Select(qm => new QuestionMarkDto
                {
                    QuestionId = qm.QuestionId,
                    QuestionNo = qMasters.TryGetValue(qm.QuestionId, out var qmNo) ? qmNo : "",
                    MarksAwarded = Math.Round(qm.MarksAwarded, 2, MidpointRounding.AwayFromZero),
                    IsSkipped = qm.IsSkipped,
                    Remarks = qm.Remarks,
                    IsAttempted = qm.IsAttempted
                }).ToList();

                return Ok(questionMarks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private async Task<int?> GetTimePerCopyMinutesForScriptAsync(int scriptId)
        {
            try
            {
                var universityId = await _context.Scripts
                    .Where(s => s.Id == scriptId)
                    .Select(s => (int?)s.ProjectPaper.Paper.UniversityId)
                    .FirstOrDefaultAsync();

                if (universityId.HasValue)
                {
                    var assignmentType = await _context.AssignmentTypes
                        .FirstOrDefaultAsync(at => at.UniversityId == universityId.Value);

                    if (assignmentType != null && assignmentType.TimePerCopy > 0)
                    {
                        return assignmentType.TimePerCopy;
                    }
                }
            }
            catch { }

            return null;
        }
    }
}
