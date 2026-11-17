using System.Security.Claims;
using System.Threading.Tasks;

namespace API.Services
{
    public interface IScriptSecurityService
    {
        (int? UserId, string UserType) GetUserInfo(ClaimsPrincipal user);
        Task<int?> GetUserUniversityIdAsync(ClaimsPrincipal user);
        Task<(bool Allowed, string Reason, int StatusCode)> CanViewScriptAsync(ClaimsPrincipal user, int scriptId);
        Task<(bool Allowed, string Reason, int StatusCode)> CanUpdateScriptAsync(ClaimsPrincipal user, int scriptId);
        Task<(bool Allowed, string Reason, int StatusCode)> CanViewMarkingAsync(ClaimsPrincipal user, int markingId);
        Task<(bool Allowed, string Reason, int StatusCode)> CanUpdateMarkingAsync(ClaimsPrincipal user, int markingId);
        Task<(bool Allowed, string Reason, int StatusCode)> CanViewExaminerScriptsAsync(ClaimsPrincipal user, int examinerId);
        Task<(bool Allowed, string Reason, int StatusCode)> CanViewPaperScriptsAsync(ClaimsPrincipal user, int paperId);
    }
}
