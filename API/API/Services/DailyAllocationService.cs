using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using API.Data;
using API.Models;

namespace API.Services
{
    public class DailyAllocationService : IDailyAllocationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DailyAllocationService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public DailyAllocationService(
            ApplicationDbContext context, 
            ILogger<DailyAllocationService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public async Task<int> PerformReassignmentForUniversityAsync(int universityId)
        {
            try
            {
                var assignType = await _context.AssignmentTypes
                    .Where(at => at.UniversityId == universityId)
                    .OrderByDescending(at => at.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (assignType == null)
                {
                    assignType = await _context.AssignmentTypes
                        .Where(at => at.UniversityId == null)
                        .OrderByDescending(at => at.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                int reassignmentHours = (assignType?.ReassignmentHours.HasValue == true && assignType.ReassignmentHours.Value > 0) ? assignType.ReassignmentHours.Value : 24;
                var cutoffTime = DateTime.UtcNow.AddHours(-reassignmentHours);

                // Find active allocations (AssignmentStatus == true) for this university where:
                // 1. (Deadline.HasValue ? Deadline <= DateTime.UtcNow : AllocatedAt <= cutoffTime)
                // 2. Paper belongs to this university
                // 3. Script marking is NOT submitted
                var expiredAllocations = await _context.Allocations
                    .Include(a => a.Script)
                        .ThenInclude(s => s.ProjectPaper)
                            .ThenInclude(pp => pp.Paper)
                    .Include(a => a.Script)
                        .ThenInclude(s => s.ProjectPaper)
                            .ThenInclude(pp => pp.Project)
                    .Where(a => a.AssignmentStatus &&
                                (a.Deadline.HasValue ? a.Deadline.Value <= DateTime.UtcNow : a.AllocatedAt <= cutoffTime) &&
                                ((a.Script.ProjectPaper.Paper != null && a.Script.ProjectPaper.Paper.UniversityId == universityId) ||
                                 (a.Script.ProjectPaper.Project != null && a.Script.ProjectPaper.Project.UniversityId == universityId)) &&
                                !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted) &&
                                a.Script.Status != ScriptStatus.completed)
                    .ToListAsync();

                if (!expiredAllocations.Any()) return 0;

                foreach (var alloc in expiredAllocations)
                {
                    // Deactivate allocation: set AssignmentStatus to false (0) and Status to cancelled
                    alloc.AssignmentStatus = false;
                    alloc.Status = AllocationStatus.cancelled;

                    // Reset script to pending so it can be re-allocated
                    if (alloc.Script != null)
                    {
                        alloc.Script.Status = ScriptStatus.pending;
                        alloc.Script.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Reassigned {Count} overdue daily allocations for university {UniversityId}", expiredAllocations.Count, universityId);
                return expiredAllocations.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while performing reassignment for university {UniversityId}", universityId);
                return 0;
            }
        }

        public async Task<(bool success, int allocatedCount, int reassignedCount, string message)> PerformDailyAllocationForUniversityAsync(int universityId)
        {
            try
            {
                var assignType = await _context.AssignmentTypes
                    .Where(at => at.UniversityId == universityId)
                    .OrderByDescending(at => at.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (assignType == null)
                {
                    assignType = await _context.AssignmentTypes
                        .Where(at => at.UniversityId == null)
                        .OrderByDescending(at => at.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                if (assignType == null)
                {
                    return (false, 0, 0, $"No AssignmentType configuration found for university ID {universityId}.");
                }

                if (string.IsNullOrWhiteSpace(assignType.Type) ||
                    (!assignType.Type.Contains("Daily", StringComparison.OrdinalIgnoreCase) &&
                     !assignType.Type.Contains("daily", StringComparison.OrdinalIgnoreCase)))
                {
                    return (false, 0, 0, $"University ID {universityId} assignment type is '{assignType.Type}', not 'Daily allocation'.");
                }

                int dailyLimit = assignType.DailyLimit > 0 ? assignType.DailyLimit : 30;
                int reassignmentHours = (assignType.ReassignmentHours.HasValue && assignType.ReassignmentHours.Value > 0) ? assignType.ReassignmentHours.Value : 24;

                // 1. Reassign expired allocations first (after reassignment hours have elapsed)
                int reassignedCount = await PerformReassignmentForUniversityAsync(universityId);

                // 2. Find pending unassigned & unmarked scripts belonging to this university in Scripts table
                var pendingScripts = await _context.Scripts
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Project)
                    .Where(s => s.ProjectPaper != null &&
                                ((s.ProjectPaper.Paper != null && s.ProjectPaper.Paper.UniversityId == universityId) ||
                                 (s.ProjectPaper.Project != null && s.ProjectPaper.Project.UniversityId == universityId)) &&
                                s.Status == ScriptStatus.pending &&
                                !_context.Markings.Any(m => m.ScriptId == s.Id && m.Status == MarkingStatus.submitted) &&
                                !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))
                    .ToListAsync();

                if (!pendingScripts.Any())
                {
                    return (true, 0, reassignedCount, reassignedCount > 0 
                        ? $"Reassigned {reassignedCount} expired allocation(s). No pending scripts found for university {universityId}. No allocation performed."
                        : $"No pending scripts found for university {universityId}. No allocation performed.");
                }

                // 3. Group pending scripts by ProjectId to enforce that ALL papers of a project must have assigned examiners
                var scriptsByProject = pendingScripts
                    .Where(s => s.ProjectPaper != null && s.ProjectPaper.ProjectId > 0)
                    .GroupBy(s => s.ProjectPaper.ProjectId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var eligibleScripts = new List<Script>();
                var unassignedProjectsInfo = new List<string>();

                foreach (var (projId, projScripts) in scriptsByProject)
                {
                    var allPapersInProject = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .Where(pp => pp.ProjectId == projId && pp.IsActive)
                        .ToListAsync();

                    if (!allPapersInProject.Any())
                    {
                        continue;
                    }

                    var projectPaperIds = allPapersInProject.Select(pp => pp.Id).ToList();
                    var assignedPaperIds = await _context.PaperExaminers
                        .Where(pe => projectPaperIds.Contains(pe.ProjectPaperId) && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                        .Select(pe => pe.ProjectPaperId)
                        .Distinct()
                        .ToListAsync();

                    // Check all 3 conditions for each paper in this project:
                    // 1. Examiner is assigned (IsExaminerAssigned flag on ProjectPaper or active in PaperExaminers)
                    // 2. Question paper PDF is uploaded (QuestionPaperPdfUrl is present)
                    // 3. Sections are configured (IsSectionConfigured is true)
                    var missingExaminerPapers = allPapersInProject
                        .Where(pp => !pp.IsExaminerAssigned && !assignedPaperIds.Contains(pp.Id))
                        .ToList();

                    var missingQpPapers = allPapersInProject
                        .Where(pp => string.IsNullOrWhiteSpace(pp.QuestionPaperPdfUrl))
                        .ToList();

                    var missingSectionPapers = allPapersInProject
                        .Where(pp => !pp.IsSectionConfigured)
                        .ToList();

                    if (missingExaminerPapers.Any() || missingQpPapers.Any() || missingSectionPapers.Any())
                    {
                        var issues = new List<string>();
                        if (missingExaminerPapers.Any())
                        {
                            var names = missingExaminerPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"examiner not assigned ({string.Join(", ", names)})");
                        }
                        if (missingQpPapers.Any())
                        {
                            var names = missingQpPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"QP PDF not uploaded ({string.Join(", ", names)})");
                        }
                        if (missingSectionPapers.Any())
                        {
                            var names = missingSectionPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"sections not configured ({string.Join(", ", names)})");
                        }

                        unassignedProjectsInfo.Add($"Project #{projId}: {string.Join("; ", issues)}");
                        _logger.LogInformation("Daily allocation skipped for Project {ProjectId}: Not all papers are fully ready. Issues: {Issues}",
                            projId, string.Join("; ", issues));
                        // Crucial requirement: ONLY run when ALL papers of that project have an examiner assigned, QP uploaded, and sections configured. Skip this project!
                        continue;
                    }

                    eligibleScripts.AddRange(projScripts);
                }

                if (!eligibleScripts.Any())
                {
                    string info = unassignedProjectsInfo.Any()
                        ? $" Cannot allocate: all papers of a project must have an assigned examiner, question paper PDF, and configured sections. Unready projects: {string.Join("; ", unassignedProjectsInfo)}."
                        : " No eligible projects found where all papers have examiners, question paper PDF, and configured sections.";
                    return (false, 0, reassignedCount, $"No scripts allocated for university {universityId}.{info}");
                }

                // 4. Group eligible scripts by ProjectPaperId
                var scriptsByProjectPaper = eligibleScripts
                    .Where(s => s.ProjectPaperId > 0)
                    .GroupBy(s => s.ProjectPaperId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var eligibleProjectPaperIds = scriptsByProjectPaper.Keys.ToList();

                // 5. Look up assigned examiners for these project papers from PaperExaminers table
                var paperExaminersEntries = await _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Where(pe => eligibleProjectPaperIds.Contains(pe.ProjectPaperId) && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                    .ToListAsync();

                var paperExaminersMap = paperExaminersEntries
                    .GroupBy(pe => pe.ProjectPaperId)
                    .ToDictionary(g => g.Key, g => g.Select(pe => pe.Examiner).DistinctBy(e => e.Id).ToList());

                var allAssignedExaminers = paperExaminersMap.Values.SelectMany(list => list).DistinctBy(e => e.Id).ToList();
                if (!allAssignedExaminers.Any())
                {
                    return (false, 0, reassignedCount, $"No active examiners assigned in PaperExaminers table for the eligible project papers of university {universityId}. Please assign examiners to papers first.");
                }

                var examinerIds = allAssignedExaminers.Select(e => e.Id).ToList();
                var examinerActiveAllocCounts = await _context.Allocations
                    .Where(a => examinerIds.Contains(a.ExaminerId) && 
                                a.AssignmentStatus && 
                                !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted))
                    .GroupBy(a => a.ExaminerId)
                    .Select(g => new { ExaminerId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.ExaminerId, g => g.Count);

                var examinerCapacity = allAssignedExaminers.ToDictionary(
                    e => e.Id,
                    e => Math.Max(0, dailyLimit - (examinerActiveAllocCounts.ContainsKey(e.Id) ? examinerActiveAllocCounts[e.Id] : 0))
                );

                int totalAllocated = 0;
                var newAllocations = new List<Allocation>();
                var updatedScripts = new List<Script>();

                // 6. For each ProjectPaperId, allocate its scripts ONLY to examiners assigned to this ProjectPaperId in PaperExaminers
                foreach (var kvp in scriptsByProjectPaper)
                {
                    int projectPaperId = kvp.Key;
                    var paperScripts = kvp.Value;

                    if (!paperExaminersMap.TryGetValue(projectPaperId, out var paperExaminers) || !paperExaminers.Any())
                    {
                        continue;
                    }

                    DistributeDailyForPaper(
                        paperScripts,
                        paperExaminers,
                        examinerCapacity,
                        dailyLimit,
                        reassignmentHours,
                        newAllocations,
                        updatedScripts,
                        ref totalAllocated);
                }

                if (newAllocations.Any())
                {
                    await _context.Allocations.AddRangeAsync(newAllocations);
                    _context.Scripts.UpdateRange(updatedScripts);
                    await _context.SaveChangesAsync();
                }

                string msg = $"Successfully allocated {totalAllocated} script(s) to examiners from PaperExaminers with daily limit {dailyLimit} and reassigned {reassignedCount} expired allocations (after {reassignmentHours}h limit).";
                if (unassignedProjectsInfo.Any())
                {
                    msg += $" Note: {unassignedProjectsInfo.Count} project(s) skipped because not all their papers have examiners assigned: {string.Join("; ", unassignedProjectsInfo)}.";
                }

                return (true, totalAllocated, reassignedCount, msg);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Daily Allocation for university {UniversityId}", universityId);
                return (false, 0, 0, ex.Message);
            }
        }

        public async Task<(bool success, int allocatedCount, string message)> PerformEqualDistributionForUniversityAsync(int universityId)
        {
            try
            {
                var assignType = await _context.AssignmentTypes
                    .Where(at => at.UniversityId == universityId)
                    .OrderByDescending(at => at.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (assignType == null)
                {
                    assignType = await _context.AssignmentTypes
                        .Where(at => at.UniversityId == null)
                        .OrderByDescending(at => at.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                if (assignType == null)
                {
                    return (false, 0, $"No AssignmentType configuration found for university ID {universityId}.");
                }

                if (string.IsNullOrWhiteSpace(assignType.Type) ||
                    (!assignType.Type.Contains("Equal", StringComparison.OrdinalIgnoreCase) &&
                     !assignType.Type.Contains("equal", StringComparison.OrdinalIgnoreCase)))
                {
                    return (false, 0, $"University ID {universityId} assignment type is '{assignType.Type}', not 'Equal Distribution'.");
                }

                var deadline = assignType.CompletionDate.HasValue
                    ? (assignType.CompletionDate.Value.TimeOfDay == TimeSpan.Zero
                        ? assignType.CompletionDate.Value.Date.AddDays(1).AddTicks(-1)
                        : assignType.CompletionDate.Value)
                    : DateTime.UtcNow.AddDays(7);

                bool crossedCompletionDate = DateTime.UtcNow > deadline;
                int reassignedCount = 0;

                if (crossedCompletionDate)
                {
                    // Equal distribution crossed completion date!
                    // Example: Completion date was 31/10/2026, so on 01/11/2026 it reruns:
                    // 1. Set assignmentstatus in allocation table as 0 (false) for unsubmitted allocations
                    var expiredAllocations = await _context.Allocations
                        .Include(a => a.Script)
                            .ThenInclude(s => s.ProjectPaper)
                                .ThenInclude(pp => pp.Paper)
                        .Include(a => a.Script)
                            .ThenInclude(s => s.ProjectPaper)
                                .ThenInclude(pp => pp.Project)
                        .Where(a => a.AssignmentStatus &&
                                    (a.Deadline.HasValue ? a.Deadline.Value <= DateTime.UtcNow : a.AllocatedAt <= deadline) &&
                                    ((a.Script.ProjectPaper.Paper != null && a.Script.ProjectPaper.Paper.UniversityId == universityId) ||
                                     (a.Script.ProjectPaper.Project != null && a.Script.ProjectPaper.Project.UniversityId == universityId)) &&
                                    !_context.Markings.Any(m => m.AllocationId == a.AllocationId && m.Status == MarkingStatus.submitted) &&
                                    a.Script.Status != ScriptStatus.completed)
                        .ToListAsync();

                    if (expiredAllocations.Any())
                    {
                        foreach (var alloc in expiredAllocations)
                        {
                            alloc.AssignmentStatus = false; // set assignmentstatus in allocation table as 0
                            alloc.Status = AllocationStatus.cancelled;

                            if (alloc.Script != null)
                            {
                                alloc.Script.Status = ScriptStatus.pending;
                                alloc.Script.UpdatedAt = DateTime.UtcNow;
                            }
                        }

                        await _context.SaveChangesAsync();
                        reassignedCount = expiredAllocations.Count;
                        _logger.LogInformation("Equal distribution crossed completion date {Deadline:yyyy-MM-dd}. Deactivated {Count} incomplete allocation(s) (set AssignmentStatus = 0) for university {UniversityId}",
                            deadline, reassignedCount, universityId);
                    }

                    // 2. Extend completion date for the next cycle so background service won't loop every minute
                    int cycleDays = 7;
                    if (assignType.CompletionDate.HasValue)
                    {
                        var duration = (assignType.CompletionDate.Value.Date - assignType.CreatedAt.Date).TotalDays;
                        if (duration >= 1)
                        {
                            cycleDays = (int)Math.Round(duration);
                        }
                    }

                    var newCompletionDate = DateTime.UtcNow.Date.AddDays(cycleDays).AddDays(1).AddTicks(-1);
                    assignType.CompletionDate = newCompletionDate;
                    assignType.UpdatedAt = DateTime.UtcNow;
                    _context.AssignmentTypes.Update(assignType);
                    await _context.SaveChangesAsync();

                    deadline = newCompletionDate;
                }
                else
                {
                    // If deadline has not been crossed, check if all scripts have already been allocated
                    var activeCount = await _context.Allocations
                        .CountAsync(a => a.AssignmentStatus &&
                                         ((a.Script.ProjectPaper.Paper != null && a.Script.ProjectPaper.Paper.UniversityId == universityId) ||
                                          (a.Script.ProjectPaper.Project != null && a.Script.ProjectPaper.Project.UniversityId == universityId)));

                    var hasPendingScripts = await _context.Scripts
                        .AnyAsync(s => s.ProjectPaper != null &&
                                       ((s.ProjectPaper.Paper != null && s.ProjectPaper.Paper.UniversityId == universityId) ||
                                        (s.ProjectPaper.Project != null && s.ProjectPaper.Project.UniversityId == universityId)) &&
                                       s.Status == ScriptStatus.pending &&
                                       !_context.Markings.Any(m => m.ScriptId == s.Id && m.Status == MarkingStatus.submitted) &&
                                       !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus));

                    if (activeCount > 0 && !hasPendingScripts)
                    {
                        // Active and waiting for completion date
                        return (true, 0, $"Equal distribution is active until {deadline:yyyy-MM-dd HH:mm:ss} UTC. It will only rerun when it crosses the completion date.");
                    }
                }

                // 3. Find pending unassigned & unmarked scripts belonging to this university in Scripts table
                var pendingScripts = await _context.Scripts
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Project)
                    .Where(s => s.ProjectPaper != null &&
                                ((s.ProjectPaper.Paper != null && s.ProjectPaper.Paper.UniversityId == universityId) ||
                                 (s.ProjectPaper.Project != null && s.ProjectPaper.Project.UniversityId == universityId)) &&
                                s.Status == ScriptStatus.pending &&
                                !_context.Markings.Any(m => m.ScriptId == s.Id && m.Status == MarkingStatus.submitted) &&
                                !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))
                    .ToListAsync();

                if (!pendingScripts.Any())
                {
                    return (true, 0, reassignedCount > 0
                        ? $"Reassigned {reassignedCount} expired allocation(s) upon crossing completion date. No pending scripts to allocate."
                        : $"No pending scripts found in scripts table for university {universityId}. No allocation performed.");
                }

                // 4. Group pending scripts by ProjectId to enforce that ALL papers of a project must have assigned examiners
                var scriptsByProject = pendingScripts
                    .Where(s => s.ProjectPaper != null && s.ProjectPaper.ProjectId > 0)
                    .GroupBy(s => s.ProjectPaper.ProjectId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var eligibleScripts = new List<Script>();
                var unassignedProjectsInfo = new List<string>();

                foreach (var (projId, projScripts) in scriptsByProject)
                {
                    var allPapersInProject = await _context.ProjectPapers
                        .Include(pp => pp.Paper)
                        .Where(pp => pp.ProjectId == projId && pp.IsActive)
                        .ToListAsync();

                    if (!allPapersInProject.Any())
                    {
                        continue;
                    }

                    var projectPaperIds = allPapersInProject.Select(pp => pp.Id).ToList();
                    var assignedPaperIds = await _context.PaperExaminers
                        .Where(pe => projectPaperIds.Contains(pe.ProjectPaperId) && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                        .Select(pe => pe.ProjectPaperId)
                        .Distinct()
                        .ToListAsync();

                    // Check all 3 conditions for each paper in this project:
                    // 1. Examiner is assigned (IsExaminerAssigned flag on ProjectPaper or active in PaperExaminers)
                    // 2. Question paper PDF is uploaded (QuestionPaperPdfUrl is present)
                    // 3. Sections are configured (IsSectionConfigured is true)
                    var missingExaminerPapers = allPapersInProject
                        .Where(pp => !pp.IsExaminerAssigned && !assignedPaperIds.Contains(pp.Id))
                        .ToList();

                    var missingQpPapers = allPapersInProject
                        .Where(pp => string.IsNullOrWhiteSpace(pp.QuestionPaperPdfUrl))
                        .ToList();

                    var missingSectionPapers = allPapersInProject
                        .Where(pp => !pp.IsSectionConfigured)
                        .ToList();

                    if (missingExaminerPapers.Any() || missingQpPapers.Any() || missingSectionPapers.Any())
                    {
                        var issues = new List<string>();
                        if (missingExaminerPapers.Any())
                        {
                            var names = missingExaminerPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"examiner not assigned ({string.Join(", ", names)})");
                        }
                        if (missingQpPapers.Any())
                        {
                            var names = missingQpPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"QP PDF not uploaded ({string.Join(", ", names)})");
                        }
                        if (missingSectionPapers.Any())
                        {
                            var names = missingSectionPapers.Select(pp => pp.Paper?.PaperName ?? pp.Paper?.PaperCode ?? $"Paper #{pp.PaperId}");
                            issues.Add($"sections not configured ({string.Join(", ", names)})");
                        }

                        unassignedProjectsInfo.Add($"Project #{projId}: {string.Join("; ", issues)}");
                        _logger.LogInformation("Equal distribution skipped for Project {ProjectId}: Not all papers are fully ready. Issues: {Issues}",
                            projId, string.Join("; ", issues));
                        // Crucial requirement: ONLY run when ALL papers of that project have an examiner assigned, QP uploaded, and sections configured. Skip this project!
                        continue;
                    }

                    eligibleScripts.AddRange(projScripts);
                }

                if (!eligibleScripts.Any())
                {
                    string info = unassignedProjectsInfo.Any()
                        ? $" Cannot allocate: all papers of a project must have an assigned examiner, question paper PDF, and configured sections. Unready projects: {string.Join("; ", unassignedProjectsInfo)}."
                        : " No eligible projects found where all papers have examiners, question paper PDF, and configured sections.";
                    return (false, 0, $"No scripts distributed for university {universityId}.{info}");
                }

                // 5. Group eligible scripts by ProjectPaperId
                var scriptsByProjectPaper = eligibleScripts
                    .Where(s => s.ProjectPaperId > 0)
                    .GroupBy(s => s.ProjectPaperId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var eligibleProjectPaperIds = scriptsByProjectPaper.Keys.ToList();

                // 6. Look up assigned examiners for these project papers from PaperExaminers table
                var paperExaminersEntries = await _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Where(pe => eligibleProjectPaperIds.Contains(pe.ProjectPaperId) && pe.IsActive && pe.Examiner != null && pe.Examiner.IsActive)
                    .ToListAsync();

                var paperExaminersMap = paperExaminersEntries
                    .GroupBy(pe => pe.ProjectPaperId)
                    .ToDictionary(g => g.Key, g => g.Select(pe => pe.Examiner).DistinctBy(e => e.Id).ToList());

                var allAssignedExaminers = paperExaminersMap.Values.SelectMany(list => list).DistinctBy(e => e.Id).ToList();
                if (!allAssignedExaminers.Any())
                {
                    return (false, 0, $"No active examiners assigned in PaperExaminers table for the eligible project papers of university {universityId}. Please assign examiners to papers first.");
                }

                int totalAllocated = 0;
                var newAllocations = new List<Allocation>();
                var updatedScripts = new List<Script>();

                // 7. For each ProjectPaperId, distribute its scripts equally among examiners assigned to this ProjectPaperId in PaperExaminers
                foreach (var kvp in scriptsByProjectPaper)
                {
                    int projectPaperId = kvp.Key;
                    var paperScripts = kvp.Value;

                    if (!paperExaminersMap.TryGetValue(projectPaperId, out var paperExaminers) || !paperExaminers.Any())
                    {
                        continue;
                    }

                    DistributeEqually(
                        paperScripts,
                        paperExaminers,
                        deadline,
                        newAllocations,
                        updatedScripts,
                        ref totalAllocated);
                }

                if (newAllocations.Any())
                {
                    await _context.Allocations.AddRangeAsync(newAllocations);
                    _context.Scripts.UpdateRange(updatedScripts);
                    await _context.SaveChangesAsync();
                }

                string msg = $"Successfully equally distributed {totalAllocated} script(s) to examiners from PaperExaminers with completion deadline {deadline:yyyy-MM-dd}.";
                if (reassignedCount > 0)
                {
                    msg += $" (Reassigned {reassignedCount} expired allocations from crossed completion date).";
                }
                if (unassignedProjectsInfo.Any())
                {
                    msg += $" Note: {unassignedProjectsInfo.Count} project(s) skipped because not all their papers have examiners assigned: {string.Join("; ", unassignedProjectsInfo)}.";
                }

                return (true, totalAllocated, msg);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Equal Distribution for university {UniversityId}", universityId);
                return (false, 0, ex.Message);
            }
        }

        private static void DistributeEqually(
            List<Script> scripts,
            List<User> examiners,
            DateTime deadline,
            List<Allocation> newAllocations,
            List<Script> updatedScripts,
            ref int totalAllocated)
        {
            if (!examiners.Any() || !scripts.Any()) return;

            int scriptCount = scripts.Count;
            int examinerCount = examiners.Count;
            int baseShare = scriptCount / examinerCount;
            int remainder = scriptCount % examinerCount;

            // Step 1: Base share + remainder distribution (e.g. 11 scripts / 3 examiners => 4, 4, 3)
            int scriptIndex = 0;
            for (int i = 0; i < examinerCount; i++)
            {
                int share = baseShare + (i < remainder ? 1 : 0);
                if (share <= 0) continue;

                var examiner = examiners[i];
                for (int j = 0; j < share; j++)
                {
                    if (scriptIndex >= scripts.Count) break;

                    var script = scripts[scriptIndex++];
                    var allocation = new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = examiner.Id,
                        ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                        AllocatedAt = DateTime.UtcNow,
                        Deadline = deadline,
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true
                    };

                    newAllocations.Add(allocation);
                    script.Status = ScriptStatus.allocated;
                    script.UpdatedAt = DateTime.UtcNow;
                    updatedScripts.Add(script);
                    totalAllocated++;
                }
            }

            // Step 2: Fail-safe guarantee — if any leftover scripts remain for any reason, add them to examiners among them round-robin
            while (scriptIndex < scripts.Count)
            {
                var script = scripts[scriptIndex];
                var examiner = examiners[scriptIndex % examinerCount];
                scriptIndex++;

                var allocation = new Allocation
                {
                    ScriptId = script.Id,
                    ExaminerId = examiner.Id,
                    ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                    AllocatedAt = DateTime.UtcNow,
                    Deadline = deadline,
                    Status = AllocationStatus.allocated,
                    AssignmentStatus = true
                };

                newAllocations.Add(allocation);
                script.Status = ScriptStatus.allocated;
                script.UpdatedAt = DateTime.UtcNow;
                updatedScripts.Add(script);
                totalAllocated++;
            }
        }

        private static void DistributeDailyForPaper(
            List<Script> paperScripts,
            List<User> paperExaminers,
            Dictionary<int, int> examinerCapacity,
            int dailyLimit,
            int reassignmentHours,
            List<Allocation> newAllocations,
            List<Script> updatedScripts,
            ref int totalAllocated)
        {
            if (!paperExaminers.Any() || !paperScripts.Any()) return;

            // Examiners with remaining daily capacity, ordered by who has received fewest today
            var eligibleExaminers = paperExaminers
                .Where(e => examinerCapacity.ContainsKey(e.Id) && examinerCapacity[e.Id] > 0)
                .OrderBy(e => dailyLimit - examinerCapacity[e.Id])
                .ToList();

            if (!eligibleExaminers.Any()) return;

            int totalCapacity = eligibleExaminers.Sum(e => examinerCapacity[e.Id]);
            int countToAllocate = Math.Min(paperScripts.Count, totalCapacity);
            if (countToAllocate <= 0) return;

            int examinerCount = eligibleExaminers.Count;
            int baseShare = countToAllocate / examinerCount;
            int remainder = countToAllocate % examinerCount;

            // Remainder distribution: e.g., 11 scripts / 3 examiners => 4, 4, 3
            var assignedShares = new int[examinerCount];
            for (int i = 0; i < examinerCount; i++)
            {
                assignedShares[i] = baseShare + (i < remainder ? 1 : 0);
            }

            // Cap by each examiner's remaining capacity and redistribute any excess
            for (int i = 0; i < examinerCount; i++)
            {
                var examiner = eligibleExaminers[i];
                if (assignedShares[i] > examinerCapacity[examiner.Id])
                {
                    int overflow = assignedShares[i] - examinerCapacity[examiner.Id];
                    assignedShares[i] = examinerCapacity[examiner.Id];

                    for (int j = 0; j < examinerCount && overflow > 0; j++)
                    {
                        if (j != i && assignedShares[j] < examinerCapacity[eligibleExaminers[j].Id])
                        {
                            int space = examinerCapacity[eligibleExaminers[j].Id] - assignedShares[j];
                            int add = Math.Min(space, overflow);
                            assignedShares[j] += add;
                            overflow -= add;
                        }
                    }
                }
            }

            int scriptIndex = 0;
            for (int i = 0; i < examinerCount; i++)
            {
                var examiner = eligibleExaminers[i];
                int share = assignedShares[i];

                for (int j = 0; j < share; j++)
                {
                    if (scriptIndex >= paperScripts.Count) break;

                    var script = paperScripts[scriptIndex++];
                    var allocation = new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = examiner.Id,
                        ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                        AllocatedAt = DateTime.UtcNow,
                        Deadline = DateTime.UtcNow.AddHours(reassignmentHours),
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true
                    };

                    newAllocations.Add(allocation);
                    script.Status = ScriptStatus.allocated;
                    script.UpdatedAt = DateTime.UtcNow;
                    updatedScripts.Add(script);

                    examinerCapacity[examiner.Id]--;
                    totalAllocated++;
                }
            }

            // Fail-safe guarantee for daily allocation: assign any remaining unallocated count to examiners with remaining capacity
            while (scriptIndex < countToAllocate)
            {
                var examiner = eligibleExaminers.FirstOrDefault(e => examinerCapacity[e.Id] > 0);
                if (examiner == null) break;

                var script = paperScripts[scriptIndex++];
                var allocation = new Allocation
                {
                    ScriptId = script.Id,
                    ExaminerId = examiner.Id,
                    ProjectId = script.ProjectId ?? script.ProjectPaper?.ProjectId,
                    AllocatedAt = DateTime.UtcNow,
                    Deadline = DateTime.UtcNow.AddHours(reassignmentHours),
                    Status = AllocationStatus.allocated,
                    AssignmentStatus = true
                };

                newAllocations.Add(allocation);
                script.Status = ScriptStatus.allocated;
                script.UpdatedAt = DateTime.UtcNow;
                updatedScripts.Add(script);

                examinerCapacity[examiner.Id]--;
                totalAllocated++;
            }
        }

        public async Task<(int totalAllocated, int totalReassigned)> PerformDailyAllocationForAllUniversitiesAsync()
        {
            int totalAllocated = 0;
            int totalReassigned = 0;

            try
            {
                var allConfigs = await _context.AssignmentTypes
                    .ToListAsync();

                var latestConfigs = allConfigs
                    .Where(at => at.UniversityId.HasValue)
                    .GroupBy(at => at.UniversityId.Value)
                    .Select(g => g.OrderByDescending(at => at.UpdatedAt).First())
                    .ToList();

                var processedUniIds = new HashSet<int>();

                foreach (var config in latestConfigs)
                {
                    int uniId = config.UniversityId.Value;
                    processedUniIds.Add(uniId);

                    if (config.Type != null && config.Type.ToLower().Contains("equal"))
                    {
                        var res = await PerformEqualDistributionForUniversityAsync(uniId);
                        totalAllocated += res.allocatedCount;
                    }
                    else if (config.Type != null && config.Type.ToLower().Contains("daily"))
                    {
                        var res = await PerformDailyAllocationForUniversityAsync(uniId);
                        totalAllocated += res.allocatedCount;
                        totalReassigned += res.reassignedCount;
                    }
                }

                // Check universities using global configuration if present
                var globalConfig = allConfigs
                    .Where(at => at.UniversityId == null)
                    .OrderByDescending(at => at.UpdatedAt)
                    .FirstOrDefault();

                if (globalConfig != null)
                {
                    var otherUniIds = await _context.Universities
                        .Where(u => !processedUniIds.Contains(u.UniversityId))
                        .Select(u => u.UniversityId)
                        .ToListAsync();

                    foreach (var uniId in otherUniIds)
                    {
                        if (globalConfig.Type != null && globalConfig.Type.ToLower().Contains("equal"))
                        {
                            var res = await PerformEqualDistributionForUniversityAsync(uniId);
                            totalAllocated += res.allocatedCount;
                        }
                        else if (globalConfig.Type != null && globalConfig.Type.ToLower().Contains("daily"))
                        {
                            var res = await PerformDailyAllocationForUniversityAsync(uniId);
                            totalAllocated += res.allocatedCount;
                            totalReassigned += res.reassignedCount;
                        }
                    }
                }

                _logger.LogInformation("Automatic allocation cycle completed. Total allocated: {Allocated}, Total reassigned: {Reassigned}", totalAllocated, totalReassigned);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running Automatic allocation cycle across all universities.");
            }

            return (totalAllocated, totalReassigned);
        }

        public async Task<(bool success, int allocatedCount, string message)> TriggerAutoAllocationForUniversityAsync(int universityId)
        {
            try
            {
                var config = await _context.AssignmentTypes
                    .Where(at => at.UniversityId == universityId)
                    .OrderByDescending(at => at.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (config == null)
                {
                    config = await _context.AssignmentTypes
                        .Where(at => at.UniversityId == null)
                        .OrderByDescending(at => at.UpdatedAt)
                        .FirstOrDefaultAsync();
                }

                if (config == null)
                {
                    return (false, 0, $"No AssignmentType configuration found for university ID {universityId}.");
                }

                if (config.Type != null && config.Type.ToLower().Contains("equal"))
                {
                    var res = await PerformEqualDistributionForUniversityAsync(universityId);
                    return (res.success, res.allocatedCount, res.message);
                }
                else if (config.Type != null && config.Type.ToLower().Contains("daily"))
                {
                    var res = await PerformDailyAllocationForUniversityAsync(universityId);
                    return (res.success, res.allocatedCount, res.message);
                }
                else
                {
                    return (false, 0, $"Unknown assignment type '{config.Type}' for university {universityId}.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running TriggerAutoAllocationForUniversityAsync for university {UniversityId}", universityId);
                return (false, 0, ex.Message);
            }
        }

        public void TriggerAutoAllocationBackground(int? universityId)
        {
            if (!universityId.HasValue || universityId.Value <= 0) return;
            int uniId = universityId.Value;

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var allocService = scope.ServiceProvider.GetRequiredService<IDailyAllocationService>();
                    await allocService.TriggerAutoAllocationForUniversityAsync(uniId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background auto-allocation failed for university {UniversityId}", uniId);
                }
            });
        }
    }
}
