using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Linq;
using API.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public UploadController(IWebHostEnvironment environment, ApplicationDbContext context, IConfiguration configuration)
        {
            _environment = environment;
            _context = context;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> UploadFile(IFormFile file, [FromQuery] int? markingId)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No file uploaded" });
                }

                // If markingId is passed, dynamically map to BaseOsmPath\{projectId}\{barcode}_evaluated.pdf
                if (markingId.HasValue)
                {
                    var marking = await _context.Markings
                        .Include(m => m.Script)
                            .ThenInclude(s => s.ProjectPaper)
                        .FirstOrDefaultAsync(m => m.Id == markingId.Value);

                    if (marking != null && marking.Script != null && marking.Script.ProjectPaper != null)
                    {
                        var projectId = marking.Script.ProjectPaper.ProjectId;
                        var barcode = !string.IsNullOrEmpty(marking.Script.GeneratedBarcode) 
                            ? marking.Script.GeneratedBarcode 
                            : (!string.IsNullOrEmpty(marking.Script.InBuiltBarcode) ? marking.Script.InBuiltBarcode : marking.ScriptId.ToString());

                        var uniqueFileName = $"{barcode}_evaluated.pdf";
                        var baseOsmPath = _configuration["StorageSettings:BaseOsmPath"] ?? "Z:\\OSM";
                        var targetFolder = Path.Combine(baseOsmPath, projectId.ToString());
                        var filePath = "";
                        var fileUrl = "";

                        try
                        {
                            if (!Directory.Exists(targetFolder))
                            {
                                Directory.CreateDirectory(targetFolder);
                            }
                            filePath = Path.Combine(targetFolder, uniqueFileName);
                            fileUrl = Path.Combine(targetFolder, uniqueFileName); // Physical path stored as path
                        }
                        catch (Exception)
                        {
                            // Graceful fallback to wwwroot/uploads if Z:\ drive is offline or unmapped on the server
                            var fallbackFolder = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", projectId.ToString());
                            if (!Directory.Exists(fallbackFolder))
                            {
                                Directory.CreateDirectory(fallbackFolder);
                            }
                            filePath = Path.Combine(fallbackFolder, uniqueFileName);
                            fileUrl = $"/uploads/{projectId}/{uniqueFileName}";
                        }

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        return Ok(new { success = true, url = fileUrl.Replace('\\', '/'), message = "File uploaded successfully" });
                    }
                }

                // Default fallback to wwwroot/uploads for standard uploads
                var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var defaultUniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var defaultFilePath = Path.Combine(uploadsFolder, defaultUniqueFileName);

                using (var fileStream = new FileStream(defaultFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }

                var defaultFileUrl = $"/uploads/{defaultUniqueFileName}";
                return Ok(new { success = true, url = defaultFileUrl, message = "File uploaded successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
