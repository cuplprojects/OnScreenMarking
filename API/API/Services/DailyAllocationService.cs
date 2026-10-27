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

        public DailyAllocationService(ApplicationDbContext context, ILogger<DailyAllocationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<int> PerformReassignmentForUniversityAsync(int universityId)
        {
            try
            {
                var assignType = await _context.AssignmentTypes
                    .FirstOrDefaultAsync(at => at.UniversityId == universityId);

                int reassignmentHours = assignType?.ReassignmentHours > 0 ? assignType.ReassignmentHours : 24;
                var cutoffTime = DateTime.UtcNow.AddHours(-reassignmentHours);

                // Find active allocations (Status == true) for this university where:
                // 1. AllocatedAt <= cutoffTime
                // 2. Paper belongs to this university
                // 3. Script is NOT in Markings table
                var expiredAllocations = await _context.Allocations
                    .Include(a => a.Script)
                        .ThenInclude(s => s.ProjectPaper)
                            .ThenInclude(pp => pp.Paper)
                    .Where(a => a.AssignmentStatus &&
                                a.AllocatedAt <= cutoffTime &&
                                a.Script.ProjectPaper.Paper.UniversityId == universityId &&
                                !_context.Markings.Any(m => m.ScriptId == a.ScriptId))
                    .ToListAsync();

                if (!expiredAllocations.Any()) return 0;

                foreach (var alloc in expiredAllocations)
                {
                    // Deactivate allocation: set AssignmentStatus to false and Status to cancelled
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
                _logger.LogInformation("Reassigned {Count} overdue allocations for university {UniversityId}", expiredAllocations.Count, universityId);
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
                    .FirstOrDefaultAsync(at => at.UniversityId == universityId);

                if (assignType == null)
                {
                    return (false, 0, 0, $"No AssignmentType configuration found for university ID {universityId}.");
                }

                if (!assignType.Type.Trim().Equals("Daily allocation", StringComparison.OrdinalIgnoreCase) &&
                    !assignType.Type.Trim().Equals("Daily Allocation", StringComparison.OrdinalIgnoreCase))
                {
                    return (false, 0, 0, $"University ID {universityId} assignment type is '{assignType.Type}', not 'Daily allocation'.");
                }

                int dailyLimit = assignType.DailyLimit > 0 ? assignType.DailyLimit : 30;
                int reassignmentHours = assignType.ReassignmentHours > 0 ? assignType.ReassignmentHours : 24;

                // 1. Reassign expired allocations first
                int reassignedCount = await PerformReassignmentForUniversityAsync(universityId);

                // 2. Get all examiners for this university who are active and approved
                var examiners = await _context.Users
                    .Where(u => u.UserType == "examiner" && 
                                u.UniversityId == universityId && 
                                u.IsActive && 
                                u.SubjectId1.HasValue)
                    .ToListAsync();

                if (!examiners.Any())
                {
                    return (true, 0, reassignedCount, $"No active examiners with assigned subjects found for university {universityId}.");
                }

                // Calculate each examiner's remaining allocation limit for today
                var todayUtc = DateTime.UtcNow.Date;
                var examinerIds = examiners.Select(e => e.Id).ToList();

                var examinerTodayAllocCounts = await _context.Allocations
                    .Where(a => examinerIds.Contains(a.ExaminerId) && 
                                a.AssignmentStatus && 
                                a.AllocatedAt >= todayUtc)
                    .GroupBy(a => a.ExaminerId)
                    .Select(g => new { ExaminerId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.ExaminerId, g => g.Count);

                var examinerCapacity = examiners.ToDictionary(
                    e => e.Id,
                    e => Math.Max(0, dailyLimit - (examinerTodayAllocCounts.ContainsKey(e.Id) ? examinerTodayAllocCounts[e.Id] : 0))
                );

                // 3. Find unassigned & unmarked scripts belonging to this university
                // Relationship: Script -> ProjectPaperId -> ProjectPaper.PaperId -> Paper.UniversityId
                // And Paper has SubjectPapers for subject matching
                var pendingScripts = await _context.Scripts
                    .Include(s => s.ProjectPaper)
                        .ThenInclude(pp => pp.Paper)
                            .ThenInclude(p => p.SubjectPapers)
                    .Where(s => s.ProjectPaper.Paper.UniversityId == universityId &&
                                s.ProjectPaper.Paper.IsActive &&
                                !_context.Markings.Any(m => m.ScriptId == s.Id) &&
                                !_context.Allocations.Any(a => a.ScriptId == s.Id && a.AssignmentStatus))
                    .ToListAsync();

                if (!pendingScripts.Any())
                {
                    return (true, 0, reassignedCount, $"No pending unallocated scripts found for university {universityId}.");
                }

                int totalAllocated = 0;
                var newAllocations = new List<Allocation>();
                var updatedScripts = new List<Script>();

                // Group scripts by Paper's SubjectId
                // A paper's subject is in Paper.SubjectPapers (sp.SubjectId)
                foreach (var script in pendingScripts)
                {
                    var paper = script.ProjectPaper?.Paper;
                    if (paper == null) continue;

                    var subjectIds = paper.SubjectPapers.Select(sp => sp.SubjectId).ToList();
                    if (!subjectIds.Any()) continue;

                    // Find eligible examiners whose SubjectId1 matches any subject of this paper and who have remaining capacity
                    var eligibleExaminer = examiners
                        .Where(e => e.SubjectId1.HasValue && subjectIds.Contains(e.SubjectId1.Value) && examinerCapacity[e.Id] > 0)
                        .OrderBy(e => dailyLimit - examinerCapacity[e.Id]) // round-robin: pick examiner who has received fewest today
                        .FirstOrDefault();

                    if (eligibleExaminer == null)
                    {
                        // No examiner available with remaining capacity for this subject today
                        continue;
                    }

                    // Allocate script to this examiner
                    var allocation = new Allocation
                    {
                        ScriptId = script.Id,
                        ExaminerId = eligibleExaminer.Id,
                        AllocatedAt = DateTime.UtcNow,
                        Deadline = DateTime.UtcNow.AddHours(reassignmentHours),
                        Status = AllocationStatus.allocated,
                        AssignmentStatus = true
                    };

                    newAllocations.Add(allocation);
                    script.Status = ScriptStatus.allocated;
                    script.UpdatedAt = DateTime.UtcNow;
                    updatedScripts.Add(script);

                    examinerCapacity[eligibleExaminer.Id]--;
                    totalAllocated++;
                }

                if (newAllocations.Any())
                {
                    await _context.Allocations.AddRangeAsync(newAllocations);
                    _context.Scripts.UpdateRange(updatedScripts);
                    await _context.SaveChangesAsync();
                }

                return (true, totalAllocated, reassignedCount, $"Successfully allocated {totalAllocated} scripts to examiners with daily limit {dailyLimit} and reassigned {reassignedCount} expired allocations.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Daily Allocation for university {UniversityId}", universityId);
                return (false, 0, 0, ex.Message);
            }
        }

        public async Task<(int totalAllocated, int totalReassigned)> PerformDailyAllocationForAllUniversitiesAsync()
        {
            int totalAllocated = 0;
            int totalReassigned = 0;

            try
            {
                var dailyConfigs = await _context.AssignmentTypes
                    .Where(at => at.UniversityId.HasValue && at.Type.ToLower().Contains("daily"))
                    .ToListAsync();

                foreach (var config in dailyConfigs)
                {
                    var res = await PerformDailyAllocationForUniversityAsync(config.UniversityId.Value);
                    totalAllocated += res.allocatedCount;
                    totalReassigned += res.reassignedCount;
                }

                _logger.LogInformation("Automatic Daily Allocation cycle completed. Total allocated: {Allocated}, Total reassigned: {Reassigned}", totalAllocated, totalReassigned);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running Automatic Daily Allocation cycle across all universities.");
            }

            return (totalAllocated, totalReassigned);
        }
    }
}
