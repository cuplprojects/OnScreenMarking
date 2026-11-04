using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Text.Json.Serialization;
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
        private readonly IPasswordGenerationService _passwordGenerationService;
        private readonly IDistributedCache _cache;
        private readonly IPermissionService _permissionService;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            ReferenceHandler = ReferenceHandler.IgnoreCycles
        };

        public UsersController(
            ApplicationDbContext context, 
            IEmailService emailService, 
            IPasswordGenerationService passwordGenerationService,
            IDistributedCache cache,
            IPermissionService permissionService)
        {
            _context = context;
            _emailService = emailService;
            _passwordGenerationService = passwordGenerationService;
            _cache = cache;
            _permissionService = permissionService;
        }

        private static string HashPassword(string password)
        {
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private async Task<bool> HasPermissionAsync(string permission)
        {
            var userType = User.FindFirst("userType")?.Value;
            return await _permissionService.HasPermissionAsync(userType, permission);
        }

        private async Task<List<int>> GetUserSubjectIdsAsync(int userId, int? s1, int? s2, int? s3)
        {
            var subjectIds = await _context.ExaminerExpertises
                .Where(ee => ee.ExaminerId == userId && ee.IsActive)
                .Select(ee => ee.SubjectId)
                .ToListAsync();

            if (s1.HasValue && s1.Value > 0 && !subjectIds.Contains(s1.Value)) subjectIds.Add(s1.Value);
            if (s2.HasValue && s2.Value > 0 && !subjectIds.Contains(s2.Value)) subjectIds.Add(s2.Value);
            if (s3.HasValue && s3.Value > 0 && !subjectIds.Contains(s3.Value)) subjectIds.Add(s3.Value);

            return subjectIds;
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
                var cacheKey = $"user_details_{userId}";

                // 1. Check Redis Cache first
                try
                {
                    var cachedJson = await _cache.GetStringAsync(cacheKey);
                    if (!string.IsNullOrEmpty(cachedJson))
                    {
                        var cachedUser = JsonSerializer.Deserialize<UserDto>(cachedJson, _jsonOptions);
                        if (cachedUser != null)
                        {
                            return Ok(cachedUser);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Cache lookup error for user {userId}: {ex.Message}");
                }

                // 2. Query Database on cache miss
                var user = await _context.Users
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var permissions = await _permissionService.GetRolePermissionsAsync(user.UserType);
                var subjectIds = await GetUserSubjectIdsAsync(user.Id, user.SubjectId1, user.SubjectId2, user.SubjectId3);

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
                    University = user.University != null ? new University { UniversityId = user.University.UniversityId, UniversityName = user.University.UniversityName } : null,
                    UniversityName = user.University?.UniversityName,
                    SubjectIds = subjectIds,
                    Permissions = permissions
                };

                // 3. Cache into Redis
                try
                {
                    var cacheOptions = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(8)
                    };
                    await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(userDto, _jsonOptions), cacheOptions);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Failed to cache user {userId} in Redis: {ex.Message}");
                }

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
                else if (isActive.HasValue)
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

        [HttpGet("counts")]
        public async Task<IActionResult> GetUserCounts([FromQuery] int? universityId = null)
        {
            if (!await HasPermissionAsync("READ_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view user counts." });
            }

            try
            {
                var query = _context.Users.AsQueryable();

                if (universityId.HasValue && universityId.Value > 0)
                {
                    query = query.Where(u => u.UniversityId == universityId.Value);
                }

                var totalUsers = await query.CountAsync();
                var pendingUsers = await query.CountAsync(u => u.IsApproved == false && u.UserType.ToLower() != "admin");

                return Ok(new
                {
                    totalUsers = totalUsers,
                    pendingUsers = pendingUsers
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("pending-approvals")]
        public async Task<IActionResult> GetPendingApprovals([FromQuery] int? universityId = null)
        {
            if (!await HasPermissionAsync("READ_USER"))
            {
                return StatusCode(403, new { success = false, message = "You do not have permission to view pending approvals." });
            }

            try
            {
                var query = _context.Users
                    .AsNoTracking()
                    .Include(u => u.University)
                    .Where(u => u.IsApproved == false && u.UserType.ToLower() != "admin");

                int? effectiveUniId = universityId;
                if (!effectiveUniId.HasValue || effectiveUniId.Value <= 0)
                {
                    var userType = User.FindFirst("userType")?.Value?.ToLower();
                    var userIdStr = User.FindFirst("id")?.Value;
                    if (userType == "coordinator" && !string.IsNullOrEmpty(userIdStr) && int.TryParse(userIdStr, out int currentUserId))
                    {
                        var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
                        if (currentUser?.UniversityId.HasValue == true)
                        {
                            effectiveUniId = currentUser.UniversityId.Value;
                        }
                    }
                }

                if (effectiveUniId.HasValue && effectiveUniId.Value > 0)
                {
                    query = query.Where(u => u.UniversityId == effectiveUniId.Value);
                }

                var pendingUsers = await query
                    .OrderByDescending(u => u.CreatedAt)
                    .Select(u => new
                    {
                        u.Id,
                        u.Name,
                        u.Email,
                        u.UserType,
                        u.ProfileImage,
                        u.UniversityId,
                        UniversityName = u.University != null ? u.University.UniversityName : null,
                        u.CreatedAt,
                        u.Phone
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = pendingUsers.Count,
                    items = pendingUsers
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
                        allocatedCount = _context.Allocations.Count(a => a.ExaminerId == u.Id && a.AssignmentStatus)
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
                var cacheKey = $"user_details_{id}";

                // 1. Check Redis Cache
                try
                {
                    var cachedJson = await _cache.GetStringAsync(cacheKey);
                    if (!string.IsNullOrEmpty(cachedJson))
                    {
                        var cachedUser = JsonSerializer.Deserialize<UserDto>(cachedJson, _jsonOptions);
                        if (cachedUser != null)
                        {
                            return Ok(cachedUser);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Cache lookup error for user {id}: {ex.Message}");
                }

                var user = await _context.Users
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var permissions = await _permissionService.GetRolePermissionsAsync(user.UserType);
                var subjectIds = await GetUserSubjectIdsAsync(user.Id, user.SubjectId1, user.SubjectId2, user.SubjectId3);

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
                    University = user.University != null ? new University { UniversityId = user.University.UniversityId, UniversityName = user.University.UniversityName } : null,
                    UniversityName = user.University?.UniversityName,
                    SubjectIds = subjectIds,
                    Permissions = permissions
                };

                // Cache in Redis
                try
                {
                    var cacheOptions = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(8)
                    };
                    await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(userDto, _jsonOptions), cacheOptions);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Failed to cache user {id}: {ex.Message}");
                }

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
                    // Filter examiners whose SubjectId1 is the same as paper's subject
                    query = query.Where(u => u.SubjectId1 == subjectId.Value);
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

                // Generate autogenerated password upon approval and email the examiner
                string generatedPassword = "";
                if (string.IsNullOrWhiteSpace(targetUser.PasswordHash) || string.IsNullOrWhiteSpace(targetUser.AutoGeneratedPassword))
                {
                    generatedPassword = _passwordGenerationService.GeneratePassword();
                    targetUser.AutoGeneratedPassword = generatedPassword;
                    targetUser.PasswordHash = HashPassword(generatedPassword);
                }
                else if (!string.IsNullOrWhiteSpace(targetUser.AutoGeneratedPassword))
                {
                    generatedPassword = targetUser.AutoGeneratedPassword;
                }

                targetUser.IsApproved = true;
                targetUser.IsActive = true;
                targetUser.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();

                // Invalidate Redis Cache
                try
                {
                    await _cache.RemoveAsync($"user_details_{targetUser.Id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Failed to invalidate cache for user {targetUser.Id}: {ex.Message}");
                }

                // Initiate email with autogenerated password upon approval
                if (!string.IsNullOrWhiteSpace(generatedPassword))
                {
                    try
                    {
                        await _emailService.SendAutoGeneratedPasswordAsync(targetUser.Email, targetUser.Name, generatedPassword);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send approval password email: {ex.Message}");
                    }
                }

                return Ok(new { success = true, message = "User approved successfully and credentials emailed." });
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

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { success = false, message = "Invalid request payload" });
                }

                var userIdStr = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    return Unauthorized(new { success = false, message = "Invalid token claims" });
                }

                var user = await _context.Users
                    .Include(u => u.University)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                if (!string.IsNullOrWhiteSpace(request.Name)) user.Name = request.Name.Trim();
                if (request.Phone != null) user.Phone = request.Phone.Trim();
                if (request.Address != null) user.Address = request.Address.Trim();
                if (request.ProfileImage != null) user.ProfileImage = request.ProfileImage;
                if (request.Fname != null) user.Fname = request.Fname.Trim();
                if (request.Experience != null) user.Experience = request.Experience.Trim();
                if (request.AadharNo != null) user.AadharNo = request.AadharNo.Trim();
                if (request.PanNo != null) user.PanNo = request.PanNo.Trim();
                if (request.CollegeId.HasValue && request.CollegeId.Value > 0) user.CollegeId = request.CollegeId.Value;

                // Sync Subjects
                if (request.SubjectIds != null)
                {
                    user.SubjectId1 = request.SubjectIds.Count > 0 ? request.SubjectIds[0] : null;
                    user.SubjectId2 = request.SubjectIds.Count > 1 ? request.SubjectIds[1] : null;
                    user.SubjectId3 = request.SubjectIds.Count > 2 ? request.SubjectIds[2] : null;

                    var existingExpertise = await _context.ExaminerExpertises
                        .Where(ee => ee.ExaminerId == user.Id)
                        .ToListAsync();

                    foreach (var subId in request.SubjectIds)
                    {
                        var existing = existingExpertise.FirstOrDefault(ee => ee.SubjectId == subId);
                        if (existing != null)
                        {
                            existing.IsActive = true;
                        }
                        else
                        {
                            _context.ExaminerExpertises.Add(new ExaminerExpertise
                            {
                                ExaminerId = user.Id,
                                SubjectId = subId,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    foreach (var existing in existingExpertise)
                    {
                        if (!request.SubjectIds.Contains(existing.SubjectId))
                        {
                            existing.IsActive = false;
                        }
                    }
                }

                user.UpdatedAt = DateTime.UtcNow;
                _context.Entry(user).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                // Invalidate Redis Cache
                try
                {
                    await _cache.RemoveAsync($"user_details_{user.Id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Failed to invalidate cache for user {user.Id}: {ex.Message}");
                }

                var permissions = await _permissionService.GetRolePermissionsAsync(user.UserType);
                var finalSubjectIds = await GetUserSubjectIdsAsync(user.Id, user.SubjectId1, user.SubjectId2, user.SubjectId3);

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
                    University = user.University != null ? new University { UniversityId = user.University.UniversityId, UniversityName = user.University.UniversityName } : null,
                    UniversityName = user.University?.UniversityName,
                    SubjectIds = finalSubjectIds,
                    Permissions = permissions
                };

                return Ok(new { success = true, message = "Profile updated successfully", data = userDto });
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

                if (request.SubjectIds != null)
                {
                    user.SubjectId1 = request.SubjectIds.Count > 0 ? request.SubjectIds[0] : null;
                    user.SubjectId2 = request.SubjectIds.Count > 1 ? request.SubjectIds[1] : null;
                    user.SubjectId3 = request.SubjectIds.Count > 2 ? request.SubjectIds[2] : null;

                    var existingExpertise = await _context.ExaminerExpertises
                        .Where(ee => ee.ExaminerId == user.Id)
                        .ToListAsync();

                    foreach (var subId in request.SubjectIds)
                    {
                        var existing = existingExpertise.FirstOrDefault(ee => ee.SubjectId == subId);
                        if (existing != null)
                        {
                            existing.IsActive = true;
                        }
                        else
                        {
                            _context.ExaminerExpertises.Add(new ExaminerExpertise
                            {
                                ExaminerId = user.Id,
                                SubjectId = subId,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    foreach (var existing in existingExpertise)
                    {
                        if (!request.SubjectIds.Contains(existing.SubjectId))
                        {
                            existing.IsActive = false;
                        }
                    }
                }
                if (request.EmpId.HasValue) user.EmpId = request.EmpId.Value > 0 ? request.EmpId.Value : null;
                if (request.CollegeId.HasValue) user.CollegeId = request.CollegeId.Value > 0 ? request.CollegeId.Value : null;

                if (request.Fname != null) user.Fname = request.Fname;
                if (request.AadharNo != null) user.AadharNo = request.AadharNo;
                if (request.PanNo != null) user.PanNo = request.PanNo;
                if (request.Experience != null) user.Experience = request.Experience;
                
                if (!string.IsNullOrWhiteSpace(request.Name)) user.Name = request.Name;
                if (!string.IsNullOrWhiteSpace(request.Email)) user.Email = request.Email;
                if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

                user.UpdatedAt = DateTime.UtcNow;
                _context.Entry(user).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                // Invalidate Redis Cache
                try
                {
                    await _cache.RemoveAsync($"user_details_{user.Id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Redis Cache] Failed to invalidate cache for user {user.Id}: {ex.Message}");
                }

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
                    .Where(a => examinerIds.Contains(a.ExaminerId) && a.AssignmentStatus)
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
