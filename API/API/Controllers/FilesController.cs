using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Services;

namespace API.Controllers
{
    [ApiController]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly IScriptSecurityService _scriptSecurityService;

        public FilesController(
            IConfiguration configuration,
            ApplicationDbContext context,
            IScriptSecurityService scriptSecurityService)
        {
            _configuration = configuration;
            _context = context;
            _scriptSecurityService = scriptSecurityService;
        }

        [HttpGet("/osm/{**filePath}")]
        public async Task<IActionResult> GetOsmFile(string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
            {
                return BadRequest("File path is required.");
            }

            var (userId, userType) = _scriptSecurityService.GetUserInfo(User);
            if (!userId.HasValue)
            {
                return Unauthorized(new { success = false, message = "Authentication required." });
            }

            var cleanPath = filePath.TrimStart('/', '\\').Replace('\\', '/');
            string relativePath = cleanPath;
            if (relativePath.StartsWith("osm/", StringComparison.OrdinalIgnoreCase))
            {
                relativePath = relativePath.Substring(4);
            }
            var parts = relativePath.Split('/', System.StringSplitOptions.RemoveEmptyEntries);

            // Path pattern check: osm/{projectId}/{paperId}/...
            if (parts.Length >= 2 && int.TryParse(parts[0], out int projectId) && int.TryParse(parts[1], out int paperId))
            {
                if (userType == "coordinator")
                {
                    var coordUniId = await _scriptSecurityService.GetUserUniversityIdAsync(User);
                    var paperUniId = await _context.Papers
                        .Where(p => p.PaperId == paperId)
                        .Select(p => p.UniversityId)
                        .FirstOrDefaultAsync();

                    if (!coordUniId.HasValue || paperUniId != coordUniId.Value)
                    {
                        return StatusCode(403, new { success = false, message = "Access denied. File belongs to another university." });
                    }
                }
                else if (userType == "examiner")
                {
                    var hasAccess = await _context.Allocations
                        .AnyAsync(a => a.ExaminerId == userId.Value && 
                                       a.AssignmentStatus && 
                                       a.Script.ProjectPaper.PaperId == paperId);

                    if (!hasAccess)
                    {
                        return StatusCode(403, new { success = false, message = "Access denied. You are not allocated to scripts in this paper." });
                    }
                }
            }

            var basePath = _configuration["StorageSettings:BasePath"] 
                ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage");

            var fullPath = Path.Combine(basePath, "OSM", relativePath);
            if (!System.IO.File.Exists(fullPath))
            {
                fullPath = Path.Combine(basePath, "osm", relativePath);
            }

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound($"File not found at: {fullPath}");
            }

            var contentType = GetContentType(fullPath);
            return PhysicalFile(fullPath, contentType, enableRangeProcessing: true);
        }

        private string GetContentType(string path)
        {
            var types = new Dictionary<string, string>
            {
                {".txt", "text/plain"},
                {".pdf", "application/pdf"},
                {".doc", "application/vnd.ms-word"},
                {".docx", "application/vnd.ms-word"},
                {".xls", "application/vnd.ms-excel"},
                {".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
                {".png", "image/png"},
                {".jpg", "image/jpeg"},
                {".jpeg", "image/jpeg"},
                {".gif", "image/gif"},
                {".csv", "text/csv"}
            };

            var ext = Path.GetExtension(path).ToLowerInvariant();
            return types.ContainsKey(ext) ? types[ext] : "application/octet-stream";
        }
    }
}
