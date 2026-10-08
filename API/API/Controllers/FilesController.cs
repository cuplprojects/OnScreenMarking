using Microsoft.AspNetCore.Mvc;
using System.IO;
using Microsoft.Extensions.Configuration;

namespace API.Controllers
{
    [ApiController]
    public class FilesController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public FilesController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet("/osm/{**filePath}")]
        public IActionResult GetOsmFile(string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
            {
                return BadRequest("File path is required.");
            }

            var basePath = _configuration["StorageSettings:BasePath"] 
                ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage");

            var requestedUrl = "OSM/" + filePath.TrimStart('/', '\\');
            var fullPath = Path.Combine(basePath, requestedUrl);

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound($"File not found at: {fullPath}");
            }

            var contentType = GetContentType(fullPath);
            return PhysicalFile(fullPath, contentType);
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
