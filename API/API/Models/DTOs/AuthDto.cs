namespace API.Models.DTOs
{
    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string UserType { get; set; } // examiner, coordinator, admin
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
        public string ProfileImage { get; set; } // Base64 encoded image or image URL
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
    }

    public class AcceptInvitationRequest
    {
        public string Token { get; set; }
        public string Name { get; set; }
        public string Password { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
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
        public string Email { get; set; }
        public int UniversityId { get; set; }
        public int? DepartmentId { get; set; }
        public string UserType { get; set; } = "examiner";
    }

    public class UpdateUserRequest
    {
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
    }
}
