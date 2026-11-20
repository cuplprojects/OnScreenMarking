using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using API.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace API.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public class RequirePermissionAttribute : Attribute, IAsyncActionFilter
    {
        private readonly string[] _permissions;

        public RequirePermissionAttribute(params string[] permissions)
        {
            _permissions = permissions ?? Array.Empty<string>();
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var user = context.HttpContext.User;
            if (user?.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new ObjectResult(new { success = false, message = "Authentication required." })
                {
                    StatusCode = 401
                };
                return;
            }

            var userType = user.FindFirst("userType")?.Value ?? user.FindFirst(ClaimTypes.Role)?.Value;
            if (string.IsNullOrWhiteSpace(userType))
            {
                context.Result = new ObjectResult(new { success = false, message = "User role not identified." })
                {
                    StatusCode = 403
                };
                return;
            }

            // Admin always has full access
            if (userType.Equals("admin", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }

            if (_permissions == null || _permissions.Length == 0)
            {
                await next();
                return;
            }

            var permissionService = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();

            // Check if user has ANY of the specified permissions
            bool hasAccess = false;
            foreach (var perm in _permissions)
            {
                if (await permissionService.HasPermissionAsync(userType, perm))
                {
                    hasAccess = true;
                    break;
                }
            }

            if (!hasAccess)
            {
                context.Result = new ObjectResult(new 
                { 
                    success = false, 
                    message = $"Access denied. You do not have the required permission: {string.Join(" or ", _permissions)}" 
                })
                {
                    StatusCode = 403
                };
                return;
            }

            await next();
        }
    }
}
