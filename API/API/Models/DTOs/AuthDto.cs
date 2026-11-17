using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace API.Models.DTOs
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is required.")]
        [MaxLength(128)]
        public string? Password { get; set; }
    }

    public class RegisterRequest
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(150)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; }

        [MaxLength(128)]
        public string? Password { get; set; } = null;

        [MaxLength(50)]
        public string? UserType { get; set; } // examiner, coordinator, admin

        public int? UniversityId { get; set; }

        [MaxLength(100)]
        public string? InvitationToken { get; set; }

        public int? SubjectId1 { get; set; }
        public int? SubjectId2 { get; set; }
        public int? SubjectId3 { get; set; }
        public int? EmpId { get; set; }

        [MaxLength(150)]
        public string? Fname { get; set; }

        [MaxLength(20)]
        public string? AadharNo { get; set; }

        [MaxLength(20)]
        public string? PanNo { get; set; }

        public int? CollegeId { get; set; }

        [MaxLength(100)]
        public string? Experience { get; set; }

        [MaxLength(25)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(3_000_000, ErrorMessage = "Profile image data exceeds maximum allowed size.")]
        public string? ProfileImage { get; set; } // Base64 encoded image or image URL
    }

    public class AuthResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Token { get; set; }
        public UserDto User { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string UserType { get; set; }
        public int? UniversityId { get; set; }
        public int? SubjectId1 { get; set; }
        public int? SubjectId2 { get; set; }
        public int? SubjectId3 { get; set; }
        public int? EmpId { get; set; }
        public string? Fname { get; set; }
        public string? AadharNo { get; set; }
        public string? PanNo { get; set; }
        public int? CollegeId { get; set; }
        public string? Experience { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string ProfileImage { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsApproved { get; set; } = false;
        public University University { get; set; }
        public string? UniversityName { get; set; }
        public List<int> SubjectIds { get; set; } = new List<int>();
        public List<string> Permissions { get; set; } = new List<string>();
    }

    public class ExaminerExpertiseDto
    {
        public int Id { get; set; }
        public int ExaminerId { get; set; }
        public int SubjectId { get; set; }
        public bool IsActive { get; set; }
    }

    public class PaperDto
    {
        public int PaperId { get; set; }
        public List<int> SubjectIds { get; set; }
        public List<string>? SubjectNames { get; set; }
        public int? ProjectId { get; set; }
        public int? ProjectPaperId { get; set; }
        public int? BatchId { get; set; }
        public int? UniversityId { get; set; }
        public string PaperCode { get; set; }
        public string PaperName { get; set; }
        public int PaperNumber { get; set; }
        public decimal MaxMarks { get; set; }
        public int TotalQuestions { get; set; }
        public string? Description { get; set; }
        public string? CatchNo { get; set; }
        public string? QuestionPaperPdfUrl { get; set; }
        public bool IsActive { get; set; }
        public List<int>? MasterSectionIds { get; set; }
        public List<string>? MasterSectionNames { get; set; }
        public int SectionsCount { get; set; }
        public int ExaminersCount { get; set; }
        public List<string>? ExaminerNames { get; set; }
    }

    public class AcceptInvitationRequest
    {
        [Required(ErrorMessage = "Invitation token is required.")]
        [MaxLength(100)]
        public string Token { get; set; }

        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(150)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [MaxLength(128)]
        public string Password { get; set; }

        [MaxLength(25)]
        public string Phone { get; set; }

        [MaxLength(500)]
        public string Address { get; set; }

        [MaxLength(3_000_000)]
        public string ProfileImage { get; set; }
    }

    public class InvitationDetailsDto
    {
        public string Email { get; set; }
        public int UniversityId { get; set; }
        public string UniversityName { get; set; }
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string UserType { get; set; }
    }

    public class InviteRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; }

        [Required(ErrorMessage = "UniversityId is required.")]
        public int UniversityId { get; set; }

        public int? DepartmentId { get; set; }

        [MaxLength(50)]
        public string UserType { get; set; } = "examiner";
    }

    public class UpdateUserRequest
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string UserType { get; set; }

        public int? UniversityId { get; set; }
        public int? SubjectId1 { get; set; }
        public int? SubjectId2 { get; set; }
        public int? SubjectId3 { get; set; }
        public int? EmpId { get; set; }

        [MaxLength(150)]
        public string? Fname { get; set; }

        [MaxLength(20)]
        public string? AadharNo { get; set; }

        [MaxLength(20)]
        public string? PanNo { get; set; }

        public int? CollegeId { get; set; }

        [MaxLength(100)]
        public string? Experience { get; set; }

        public bool? IsActive { get; set; }
        public List<int>? SubjectIds { get; set; }
    }

    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyResetOtpRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "OTP is required.")]
        [MaxLength(20)]
        public string Otp { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "OTP is required.")]
        [MaxLength(20)]
        public string Otp { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [MaxLength(128)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "Current password is required.")]
        [MaxLength(128)]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [MaxLength(128)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(25)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(3_000_000)]
        public string? ProfileImage { get; set; }

        [MaxLength(150)]
        public string? Fname { get; set; }

        [MaxLength(100)]
        public string? Experience { get; set; }

        public int? CollegeId { get; set; }

        [MaxLength(20)]
        public string? AadharNo { get; set; }

        [MaxLength(20)]
        public string? PanNo { get; set; }

        public List<int>? SubjectIds { get; set; }
    }

    public class SendOtpRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; }
    }

    public class VerifyOtpRequest
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string Email { get; set; }

        [Required(ErrorMessage = "OTP is required.")]
        [MaxLength(20)]
        public string Otp { get; set; }
    }

    public class SendPhoneOtpRequest
    {
        [Required(ErrorMessage = "Phone number is required.")]
        [MaxLength(25)]
        public string Phone { get; set; }
    }

    public class VerifyPhoneOtpRequest
    {
        [Required(ErrorMessage = "Phone number is required.")]
        [MaxLength(25)]
        public string Phone { get; set; }

        [Required(ErrorMessage = "OTP is required.")]
        [MaxLength(20)]
        public string Otp { get; set; }
    }
}
