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
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;

        public UsersController(ApplicationDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        private async Task<bool> HasPermissionAsync(string permission)
        {
            var userType = User.FindFirst("userType")?.Value;
            if (string.IsNullOrEmpty(userType)) return false;

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName.ToLower() == userType.ToLower());
            if (role == null)
            {
                return userType.Equals("admin", StringComparison.OrdinalIgnoreCase);
            }

            return role.PermissionsList.Contains(permission);
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserDto>> GetMe()
        {
            try
            {
                var userIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(userIdStr))
                {
                    return Unauthorized(new { success = false, message = "Invalid token claims" });
                }

                int userId = int.Parse(userIdStr);
                var user = await _context.Users
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    UserType = user.UserType,
                    UniversityId = user.UniversityId,
                    SubjectId1 = user.SubjectId1,
                    SubjectId2 = user.SubjectId2,
                    SubjectId3 = user.SubjectId3,
                    EmpId = user.EmpId,
                    Fname = user.Fname,
                    AadharNo = user.AadharNo,
                    PanNo = user.PanNo,
                    CollegeId = user.CollegeId,
                    Experience = user.Experience,
                    Phone = user.Phone,
                    Address = user.Address,
                    ProfileImage = user.ProfileImage,
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved,
                    University = user.University != null ? new University { UniversityId = user.University.UniversityId, UniversityName = user.University.UniversityName } : null
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetUsers(
            [FromQuery] int? universityId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? sortField = null,
            [FromQuery] string? sortOrder = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] string? userType = null,
            [FromQuery] string? activeTab = null)
        {
            if (!await HasPermissionAsync("READ_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view users." });
            }

            try
            {
                var query = _context.Users.AsQueryable();

                if (universityId.HasValue && universityId.Value > 0)
                {
                    query = query.Where(u => u.UniversityId == universityId.Value);
                }

                if (activeTab == "pending")
                {
                    query = query.Where(u => u.IsApproved == false && u.UserType.ToLower() != "admin");
                }

                if (isActive.HasValue)
                {
                    query = query.Where(u => u.IsActive == isActive.Value);
                }

                if (!string.IsNullOrEmpty(userType))
                {
                    query = query.Where(u => u.UserType.ToLower() == userType.ToLower());
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var s = search.ToLower();
                    query = query.Where(u => (u.Name != null && u.Name.ToLower().Contains(s)) || 
                                             (u.Email != null && u.Email.ToLower().Contains(s)));
                }

                var totalCount = await query.CountAsync();

                // Sorting
                if (!string.IsNullOrEmpty(sortField))
                {
                    bool isDesc = sortOrder?.ToLower() == "desc";
                    
                    if (sortField.Equals("name", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.Name) : query.OrderBy(u => u.Name);
                    else if (sortField.Equals("email", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email);
                    else if (sortField.Equals("userType", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.UserType) : query.OrderBy(u => u.UserType);
                    else if (sortField.Equals("universityName", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.University.UniversityName) : query.OrderBy(u => u.University.UniversityName);
                    else if (sortField.Equals("isActive", StringComparison.OrdinalIgnoreCase))
                        query = isDesc ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive);
                    else
                        query = query.OrderBy(u => u.Name);
                }
                else
                {
                    query = query.OrderBy(u => u.Name);
                }

                // Pagination
                if (pageSize > 0)
                {
                    query = query.Skip((page - 1) * pageSize).Take(pageSize);
                }

                var users = await query.Include(u => u.University).ToListAsync();

                var userDtos = users.Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    UserType = u.UserType,
                    UniversityId = u.UniversityId,
                    SubjectId1 = u.SubjectId1,
                    SubjectId2 = u.SubjectId2,
                    SubjectId3 = u.SubjectId3,
                    EmpId = u.EmpId,
                    Fname = u.Fname,
                    AadharNo = u.AadharNo,
                    PanNo = u.PanNo,
                    CollegeId = u.CollegeId,
                    Experience = u.Experience,
                    Phone = u.Phone,
                    Address = u.Address,
                    ProfileImage = u.ProfileImage,
                    IsActive = u.IsActive,
                    IsApproved = u.IsApproved,
                    University = u.University != null ? new University { UniversityId = u.University.UniversityId, UniversityName = u.University.UniversityName } : null
                }).ToList();

                var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 1;

                return Ok(new
                {
                    items = userDtos,
                    totalCount = totalCount,
                    totalPages = totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }


        [HttpGet("examiners/workload")]
        public async Task<IActionResult> GetExaminersWorkload([FromQuery] int universityId)
        {
            try
            {
                var examiners = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.UniversityId == universityId && u.UserType.ToLower() == "examiner")
                    .Select(u => new
                    {
                        id = u.Id,
                        name = u.Name,
                        email = u.Email,
                        phone = u.Phone,
                        allocatedCount = _context.Allocations.Count(a => a.ExaminerId == u.Id)
                    })
                    .ToListAsync();

                return Ok(examiners);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUserById(int id)
        {
            if (!await HasPermissionAsync("READ_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view user details." });
            }

            try
            {
                var user = await _context.Users
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    UserType = user.UserType,
                    UniversityId = user.UniversityId,
                    SubjectId1 = user.SubjectId1,
                    SubjectId2 = user.SubjectId2,
                    SubjectId3 = user.SubjectId3,
                    EmpId = user.EmpId,
                    Fname = user.Fname,
                    AadharNo = user.AadharNo,
                    PanNo = user.PanNo,
                    CollegeId = user.CollegeId,
                    Experience = user.Experience,
                    Phone = user.Phone,
                    Address = user.Address,
                    ProfileImage = user.ProfileImage,
                    IsActive = user.IsActive,
                    IsApproved = user.IsApproved,
                    University = user.University != null ? new University { UniversityId = user.University.UniversityId, UniversityName = user.University.UniversityName } : null
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("examiners")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetExaminers([FromQuery] int? universityId = null, [FromQuery] int? subjectId = null)
        {
            if (!await HasPermissionAsync("READ_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view examiners." });
            }

            try
            {
                var query = _context.Users
                    .Where(u => u.UserType == "examiner" && u.IsActive)
                    .AsQueryable();

                if (universityId.HasValue)
                {
                    query = query.Where(u => u.UniversityId == universityId.Value);
                }

                if (subjectId.HasValue)
                {
                    // Filter by expertise
                    query = query.Where(u => u.Expertise.Any(e => e.SubjectId == subjectId.Value && e.IsActive));
                }

                var examiners = await query
                    .Include(u => u.University)
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                var userDtos = examiners.Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    UserType = u.UserType,
                    UniversityId = u.UniversityId,
                    SubjectId1 = u.SubjectId1,
                    SubjectId2 = u.SubjectId2,
                    SubjectId3 = u.SubjectId3,
                    EmpId = u.EmpId,
                    Fname = u.Fname,
                    AadharNo = u.AadharNo,
                    PanNo = u.PanNo,
                    CollegeId = u.CollegeId,
                    Experience = u.Experience,
                    Phone = u.Phone,
                    ProfileImage = u.ProfileImage,
                    IsActive = u.IsActive
                }).ToList();

                return Ok(userDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveUser(int id)
        {
            if (!await HasPermissionAsync("UPDATE_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to approve users." });
            }

            try
            {
                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (string.IsNullOrEmpty(loggedInUserIdStr))
                {
                    return Unauthorized(new { success = false, message = "Invalid token claims" });
                }

                int loggedInUserId = int.Parse(loggedInUserIdStr);
                var currentUser = await _context.Users.FindAsync(loggedInUserId);
                
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                var targetUser = await _context.Users.FindAsync(id);
                if (targetUser == null)
                {
                    return NotFound(new { success = false, message = "Examiner not found" });
                }

                // If logged-in user is a coordinator, they can only approve examiners of their own university!
                if (loggedInUserType == "coordinator")
                {
                    if (targetUser.UniversityId != currentUser.UniversityId)
                    {
                        return StatusCode(403, new { success = false, message = "You can only approve examiners for your own university." });
                    }
                }
                else if (loggedInUserType != "admin")
                {
                    return StatusCode(403, new { success = false, message = "Only coordinators or admins can approve users." });
                }

                targetUser.IsApproved = true;
                targetUser.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "User approved successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("invite")]
        public async Task<IActionResult> InviteUser([FromBody] InviteRequest request)
        {
            if (!await HasPermissionAsync("CREATE_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to invite users." });
            }

            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new { success = false, message = "Email is required" });
                }

                var loggedInUserType = User.FindFirst("userType")?.Value;
                var loggedInUserIdStr = User.FindFirst("id")?.Value;

                if (string.IsNullOrEmpty(loggedInUserIdStr))
                {
                    return Unauthorized(new { success = false, message = "Invalid token claims" });
                }

                int loggedInUserId = int.Parse(loggedInUserIdStr);
                var currentUser = await _context.Users.FindAsync(loggedInUserId);
                
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                // Verify permissions
                if (loggedInUserType == "coordinator")
                {
                    if (request.UniversityId != currentUser.UniversityId)
                    {
                        return StatusCode(403, new { success = false, message = "You can only invite examiners for your own university." });
                    }
                }
                else if (loggedInUserType != "admin")
                {
                    return StatusCode(403, new { success = false, message = "Only coordinators or admins can invite users." });
                }

                // Check if user already exists in system
                if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                {
                    return BadRequest(new { success = false, message = "A user with this email address is already registered." });
                }

                // Generate a unique token for the invitation
                var token = Guid.NewGuid().ToString("N");
                
                // Create invitation record
                var invitation = new Invitation
                {
                    Email = request.Email.Trim().ToLower(),
                    Token = token,
                    UniversityId = request.UniversityId,
                    DepartmentId = request.DepartmentId,
                    UserType = string.IsNullOrWhiteSpace(request.UserType) ? "examiner" : request.UserType.Trim().ToLower(),
                    ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                    IsUsed = false
                };

                _context.Invitations.Add(invitation);
                await _context.SaveChangesAsync();

                // Build a simulated invitation link
                var invitationLink = $"http://localhost:5173/accept-invitation?token={token}";

                bool emailSent = true;
                string emailError = null;

                // Send the actual invitation email
                try
                {
                    await _emailService.SendInvitationEmailAsync(invitation.Email, invitationLink);
                }
                catch (Exception ex)
                {
                    emailSent = false;
                    emailError = ex.Message;
                    Console.WriteLine($"Failed to send invitation email: {ex.Message}");
                }

                return Ok(new
                {
                    success = true,
                    message = emailSent ? "Invitation generated and email sent successfully." : "Invitation generated, but email failed to send.",
                    emailSent = emailSent,
                    emailError = emailError,
                    invitation = new
                    {
                        invitation.Id,
                        invitation.Email,
                        invitation.Token,
                        invitation.UniversityId,
                        invitation.DepartmentId,
                        invitation.UserType,
                        invitation.ExpiresAt,
                        InvitationLink = invitationLink
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            if (!await HasPermissionAsync("UPDATE_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to update users." });
            }

            try
            {
                if (request == null)
                {
                    return BadRequest(new { success = false, message = "Invalid request payload" });
                }

                var loggedInUserType = User.FindFirst("userType")?.Value;
                if (loggedInUserType != "admin" && loggedInUserType != "coordinator")
                {
                    return StatusCode(403, new { success = false, message = "Only coordinators or admins can update users." });
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                if (!string.IsNullOrWhiteSpace(request.UserType))
                {
                    user.UserType = request.UserType.Trim().ToLower();
                }

                if (request.UniversityId.HasValue)
                {
                    user.UniversityId = request.UniversityId.Value > 0 ? request.UniversityId.Value : null;
                }

                if (request.SubjectId1.HasValue) user.SubjectId1 = request.SubjectId1.Value > 0 ? request.SubjectId1.Value : null;
                if (request.SubjectId2.HasValue) user.SubjectId2 = request.SubjectId2.Value > 0 ? request.SubjectId2.Value : null;
                if (request.SubjectId3.HasValue) user.SubjectId3 = request.SubjectId3.Value > 0 ? request.SubjectId3.Value : null;
                if (request.EmpId.HasValue) user.EmpId = request.EmpId.Value > 0 ? request.EmpId.Value : null;
                if (request.CollegeId.HasValue) user.CollegeId = request.CollegeId.Value > 0 ? request.CollegeId.Value : null;

                if (request.Fname != null) user.Fname = request.Fname;
                if (request.AadharNo != null) user.AadharNo = request.AadharNo;
                if (request.PanNo != null) user.PanNo = request.PanNo;
                if (request.Experience != null) user.Experience = request.Experience;

                user.UpdatedAt = DateTime.UtcNow;
                _context.Entry(user).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        [HttpGet("project-examiners/{projectId}")]
        public async Task<IActionResult> GetProjectExaminers(
            int projectId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5,
            [FromQuery] string? search = null,
            [FromQuery] string? statusFilter = null)
        {
            try
            {
                var userIdStr = User.FindFirst("id")?.Value;
                if (!int.TryParse(userIdStr, out int userId))
                    return Unauthorized(new { success = false, message = "Invalid token claims" });

                var currentUser = await _context.Users.FindAsync(userId);
                if (currentUser == null || !currentUser.UniversityId.HasValue)
                    return Unauthorized(new { success = false, message = "User not associated with a university." });

                var universityId = currentUser.UniversityId.Value;

                // 1. Get papers for this project to calculate project specific allocations
                var projectPaperIds = await _context.ProjectPapers
                    .Where(p => p.ProjectId == projectId)
                    .Select(p => p.PaperId)
                    .ToListAsync();

                // 2. Query examiners in this university
                var examinersQuery = _context.Users
                    .Include(u => u.Expertise)
                        .ThenInclude(ee => ee.Subject)
                    .Where(u => u.UniversityId == universityId && u.UserType == "examiner");

                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.ToLower();
                    examinersQuery = examinersQuery.Where(u => 
                        (u.Name != null && u.Name.ToLower().Contains(search)) ||
                        (u.Email != null && u.Email.ToLower().Contains(search)));
                }

                // Retrieve all matching examiners first, then calculate allocations/workload
                var examinersList = await examinersQuery.ToListAsync();
                var examinerIds = examinersList.Select(e => e.Id).ToList();

                // Get all allocations for these examiners
                var allAllocations = await _context.Allocations
                    .Include(a => a.Script)
                        .ThenInclude(s => s.ProjectPaper)
                    .Where(a => examinerIds.Contains(a.ExaminerId))
                    .ToListAsync();

                var processedExaminers = new List<ProjectExaminerDto>();

                foreach (var ex in examinersList)
                {
                    var examinerAllocations = allAllocations.Where(a => a.ExaminerId == ex.Id).ToList();
                    var projAllocationsCount = examinerAllocations.Count(a => a.Script != null && projectPaperIds.Contains(a.Script.ProjectPaper.PaperId));
                    var totalAllocatedCount = examinerAllocations.Count;

                    string workload = "Free";
                    if (totalAllocatedCount > 20) workload = "Fully Allocated";
                    else if (totalAllocatedCount > 0) workload = "Partially Allocated";

                    // Only include active/available examiners (either allocated to this project, or generally have allocations)
                    if (projAllocationsCount > 0 || totalAllocatedCount >= 0)
                    {
                        var subjects = ex.Expertise != null 
                            ? string.Join(", ", ex.Expertise.Where(ee => ee.Subject != null).Select(ee => ee.Subject.SubName))
                            : "";

                        processedExaminers.Add(new ProjectExaminerDto
                        {
                            Id = ex.Id,
                            Name = ex.Name ?? "",
                            Email = ex.Email ?? "",
                            AllocatedCount = totalAllocatedCount,
                            ProjectAllocatedCount = projAllocationsCount,
                            Workload = workload,
                            SubjectExpertise = subjects
                        });
                    }
                }

                // Apply status filter
                if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
                {
                    if (statusFilter == "Free")
                    {
                        processedExaminers = processedExaminers.Where(e => e.Workload == "Free").ToList();
                    }
                    else if (statusFilter == "Busy")
                    {
                        processedExaminers = processedExaminers.Where(e => e.Workload != "Free").ToList();
                    }
                }

                var totalCount = processedExaminers.Count;
                var paginatedItems = processedExaminers
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                return Ok(new
                {
                    items = paginatedItems,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
