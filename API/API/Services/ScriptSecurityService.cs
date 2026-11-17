using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;

namespace API.Services
{
    public class ScriptSecurityService : IScriptSecurityService
    {
        private readonly ApplicationDbContext _context;

        public ScriptSecurityService(ApplicationDbContext context)
        {
            _context = context;
        }

        public (int? UserId, string UserType) GetUserInfo(ClaimsPrincipal user)
        {
            if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
            {
                return (null, string.Empty);
            }

            var idClaim = user.FindFirst("id")?.Value 
                       ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            int? userId = int.TryParse(idClaim, out int uid) ? uid : null;

            var userType = (user.FindFirst("userType")?.Value 
                        ?? user.FindFirst(ClaimTypes.Role)?.Value 
                        ?? string.Empty).Trim().ToLowerInvariant();

            return (userId, userType);
        }

        public async Task<int?> GetUserUniversityIdAsync(ClaimsPrincipal user)
        {
            var (userId, _) = GetUserInfo(user);
            if (!userId.HasValue) return null;

            var uniClaim = user.FindFirst("universityId")?.Value;
            if (int.TryParse(uniClaim, out int uniId) && uniId > 0)
            {
                return uniId;
            }

            var userDb = await _context.Users
                .Where(u => u.Id == userId.Value)
                .Select(u => u.UniversityId)
                .FirstOrDefaultAsync();

            return userDb;
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanViewScriptAsync(ClaimsPrincipal user, int scriptId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required to access script.", 401);
            }

            // 1. Admin / SuperAdmin can view any script (read-only audit/inspection)
            if (userType == "admin" || userType == "superadmin")
            {
                return (true, "Admin read-only access granted.", 200);
            }

            // 2. Examiner: ONLY allocated scripts may be viewed
            if (userType == "examiner")
            {
                var isAllocated = await _context.Allocations
                    .AnyAsync(a => a.ScriptId == scriptId && a.ExaminerId == userId.Value && a.AssignmentStatus);

                if (isAllocated)
                {
                    return (true, "Examiner allocated access granted.", 200);
                }

                return (false, "Access denied. This script is not allocated to your examiner account.", 403);
            }

            // 3. Coordinator: ONLY scripts belonging to their allocated university
            if (userType == "coordinator")
            {
                var coordinatorUniId = await GetUserUniversityIdAsync(user);
                if (!coordinatorUniId.HasValue || coordinatorUniId.Value <= 0)
                {
                    return (false, "Access denied. Coordinator has no assigned university.", 403);
                }

                var script = await _context.Scripts
                    .Include(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                    .Include(s => s.Project)
                    .FirstOrDefaultAsync(s => s.Id == scriptId);

                if (script == null)
                {
                    return (false, "Script not found.", 404);
                }

                int? scriptUniId = script.ProjectPaper?.Paper?.UniversityId 
                                ?? script.Project?.UniversityId;

                if (scriptUniId.HasValue && scriptUniId.Value == coordinatorUniId.Value)
                {
                    return (true, "Coordinator university access granted.", 200);
                }

                return (false, "Access denied. This script belongs to another university.", 403);
            }

            return (false, "Access denied. Insufficient permissions to view script.", 403);
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanUpdateScriptAsync(ClaimsPrincipal user, int scriptId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required to update script.", 401);
            }

            // 1. Admin: STRICTLY READ-ONLY — cannot modify or update scripts or marks
            if (userType == "admin" || userType == "superadmin")
            {
                return (false, "Admins have read-only access and are not authorized to update scripts or marks.", 403);
            }

            // 2. Coordinator: READ-ONLY for scripts & evaluation marks
            if (userType == "coordinator")
            {
                return (false, "Coordinators have read-only access and cannot update script markings.", 403);
            }

            // 3. Examiner: ONLY the allocated examiner with active assignment can update
            if (userType == "examiner")
            {
                var isAllocated = await _context.Allocations
                    .AnyAsync(a => a.ScriptId == scriptId && a.ExaminerId == userId.Value && a.AssignmentStatus);

                if (isAllocated)
                {
                    return (true, "Examiner update access granted.", 200);
                }

                return (false, "Access denied. Only the actively allocated examiner can update this script.", 403);
            }

            return (false, "Access denied. Insufficient permissions to update script.", 403);
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanViewMarkingAsync(ClaimsPrincipal user, int markingId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required.", 401);
            }

            var marking = await _context.Markings
                .Include(m => m.Script)
                    .ThenInclude(s => s.ProjectPaper).ThenInclude(pp => pp.Paper)
                .Include(m => m.Script)
                    .ThenInclude(s => s.Project)
                .FirstOrDefaultAsync(m => m.Id == markingId);

            if (marking == null)
            {
                return (false, "Marking not found.", 404);
            }

            // Admin: read-only view
            if (userType == "admin" || userType == "superadmin")
            {
                return (true, "Admin read-only access granted.", 200);
            }

            // Examiner: only their own marking
            if (userType == "examiner")
            {
                if (marking.ExaminerId == userId.Value)
                {
                    return (true, "Examiner access granted.", 200);
                }
                return (false, "Access denied. You can only view your own markings.", 403);
            }

            // Coordinator: only if script belongs to their university
            if (userType == "coordinator")
            {
                var coordUniId = await GetUserUniversityIdAsync(user);
                int? scriptUniId = marking.Script?.ProjectPaper?.Paper?.UniversityId 
                                ?? marking.Script?.Project?.UniversityId;

                if (coordUniId.HasValue && scriptUniId.HasValue && coordUniId.Value == scriptUniId.Value)
                {
                    return (true, "Coordinator university access granted.", 200);
                }
                return (false, "Access denied. This marking belongs to another university.", 403);
            }

            return (false, "Access denied.", 403);
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanUpdateMarkingAsync(ClaimsPrincipal user, int markingId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required.", 401);
            }

            // Admin: strictly read-only
            if (userType == "admin" || userType == "superadmin")
            {
                return (false, "Admins have read-only access and cannot modify markings.", 403);
            }

            // Coordinator: cannot modify markings
            if (userType == "coordinator")
            {
                return (false, "Coordinators have read-only access and cannot modify markings.", 403);
            }

            // Examiner: must own this marking and be actively allocated to the script
            if (userType == "examiner")
            {
                var marking = await _context.Markings.FindAsync(markingId);
                if (marking == null)
                {
                    return (false, "Marking not found.", 404);
                }

                if (marking.ExaminerId != userId.Value)
                {
                    return (false, "Access denied. You cannot modify another examiner's marking.", 403);
                }

                var isAllocated = await _context.Allocations
                    .AnyAsync(a => a.ScriptId == marking.ScriptId && a.ExaminerId == userId.Value && a.AssignmentStatus);

                if (!isAllocated)
                {
                    return (false, "Access denied. You are no longer actively allocated to this script.", 403);
                }

                return (true, "Examiner update access granted.", 200);
            }

            return (false, "Access denied.", 403);
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanViewExaminerScriptsAsync(ClaimsPrincipal user, int examinerId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required.", 401);
            }

            // Admin: read-only access to any examiner's scripts
            if (userType == "admin" || userType == "superadmin")
            {
                return (true, "Admin read-only access granted.", 200);
            }

            // Examiner: can ONLY view their own allocated scripts
            if (userType == "examiner")
            {
                if (examinerId == userId.Value)
                {
                    return (true, "Examiner own scripts access granted.", 200);
                }
                return (false, "Access denied. You are only authorized to access scripts allocated to your own examiner ID.", 403);
            }

            // Coordinator: can only view examiners that belong to their university
            if (userType == "coordinator")
            {
                var coordUniId = await GetUserUniversityIdAsync(user);
                var examinerUniId = await _context.Users
                    .Where(u => u.Id == examinerId)
                    .Select(u => u.UniversityId)
                    .FirstOrDefaultAsync();

                if (coordUniId.HasValue && examinerUniId.HasValue && coordUniId.Value == examinerUniId.Value)
                {
                    return (true, "Coordinator university examiner access granted.", 200);
                }

                return (false, "Access denied. Examiner does not belong to your university.", 403);
            }

            return (false, "Access denied.", 403);
        }

        public async Task<(bool Allowed, string Reason, int StatusCode)> CanViewPaperScriptsAsync(ClaimsPrincipal user, int paperId)
        {
            var (userId, userType) = GetUserInfo(user);
            if (!userId.HasValue)
            {
                return (false, "Authentication required.", 401);
            }

            if (userType == "admin" || userType == "superadmin")
            {
                return (true, "Admin read-only access granted.", 200);
            }

            if (userType == "examiner")
            {
                // Examiner is allowed to query the paper endpoint, but controller MUST filter down to allocated scripts only
                return (true, "Examiner paper view allowed (filtered).", 200);
            }

            if (userType == "coordinator")
            {
                var coordUniId = await GetUserUniversityIdAsync(user);
                var paperUniId = await _context.Papers
                    .Where(p => p.PaperId == paperId)
                    .Select(p => p.UniversityId)
                    .FirstOrDefaultAsync();

                if (coordUniId.HasValue && paperUniId == coordUniId.Value)
                {
                    return (true, "Coordinator university paper access granted.", 200);
                }

                return (false, "Access denied. This paper does not belong to your university.", 403);
            }

            return (false, "Access denied.", 403);
        }
    }
}
