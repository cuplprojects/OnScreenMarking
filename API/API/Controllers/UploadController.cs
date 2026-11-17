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
using API.Models;
using API.Services;
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
        private readonly IDailyAllocationService _dailyAllocationService;

        public UploadController(
            IWebHostEnvironment environment, 
            ApplicationDbContext context, 
            IConfiguration configuration,
            IDailyAllocationService dailyAllocationService)
        {
            _environment = environment;
            _context = context;
            _configuration = configuration;
            _dailyAllocationService = dailyAllocationService;
        }

        [HttpPost]
        public async Task<IActionResult> UploadFile(
            IFormFile file, 
            [FromQuery] int? markingId,
            [FromQuery(Name = "paperId")] int? queryPaperId,
            [FromQuery(Name = "projectId")] int? queryProjectId,
            [FromQuery] int? projectPaperId)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No file uploaded" });
                }

                // Whitelist allowed extensions and prevent executable/script uploads (Stored XSS defense)
                var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(ext))
                {
                    return BadRequest(new { success = false, message = "Invalid file type. Only PDF and image files (.jpg, .jpeg, .png) are permitted." });
                }

                if (file.Length > 52428800) // 50MB
                {
                    return BadRequest(new { success = false, message = "File size exceeds the 50MB limit." });
                }

                // Verify file header signature (magic bytes)
                using (var stream = file.OpenReadStream())
                {
                    var header = new byte[8];
                    int bytesRead = await stream.ReadAsync(header, 0, header.Length);
                    if (bytesRead < 4)
                    {
                        return BadRequest(new { success = false, message = "Corrupted or empty file." });
                    }

                    bool isValid = false;
                    if (ext == ".pdf" && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46) // %PDF
                    {
                        isValid = true;
                    }
                    else if ((ext == ".jpg" || ext == ".jpeg") && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) // JPEG
                    {
                        isValid = true;
                    }
                    else if (ext == ".png" && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) // PNG
                    {
                        isValid = true;
                    }

                    if (!isValid)
                    {
                        return BadRequest(new { success = false, message = "File content signature does not match the file extension." });
                    }
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
                        var paperId = marking.Script.ProjectPaper.PaperId;
                        var barcode = !string.IsNullOrEmpty(marking.Script.GeneratedBarcode) 
                            ? marking.Script.GeneratedBarcode 
                            : (!string.IsNullOrEmpty(marking.Script.InBuiltBarcode) ? marking.Script.InBuiltBarcode : marking.ScriptId.ToString());

                        var uniqueFileName = $"{barcode}_evaluated.pdf";
                        var baseOsmPath = _configuration["StorageSettings:BasePath"] ?? _configuration["StorageSettings:BaseOsmPath"] ?? Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "storage");
                        var targetFolder = Path.Combine(baseOsmPath, "osm", projectId.ToString(), paperId.ToString(), "evaluatedcopies");
                        
                        if (!Directory.Exists(targetFolder))
                        {
                            Directory.CreateDirectory(targetFolder);
                        }

                        var filePath = Path.Combine(targetFolder, uniqueFileName);
                        var fileUrl = $"/osm/{projectId}/{paperId}/evaluatedcopies/{uniqueFileName}";

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        // Also update EvaluatedPdfUrl in marking record
                        marking.EvaluatedPdfUrl = fileUrl;
                        await _context.SaveChangesAsync();

                    }
                }

                // If paperId or projectPaperId is passed, this is an answer script upload
                if (projectPaperId.HasValue || queryPaperId.HasValue)
                {
                    ProjectPaper? targetProjectPaper = null;
                    if (projectPaperId.HasValue && projectPaperId.Value > 0)
                    {
                        targetProjectPaper = await _context.ProjectPapers
                            .Include(pp => pp.Paper)
                            .Include(pp => pp.Project)
                            .FirstOrDefaultAsync(pp => pp.Id == projectPaperId.Value);
                    }
                    else if (queryPaperId.HasValue && queryPaperId.Value > 0)
                    {
                        var ppQuery = _context.ProjectPapers
                            .Include(pp => pp.Paper)
                            .Include(pp => pp.Project)
                            .Where(pp => pp.PaperId == queryPaperId.Value || pp.Id == queryPaperId.Value);

                        if (queryProjectId.HasValue && queryProjectId.Value > 0)
                        {
                            ppQuery = ppQuery.Where(pp => pp.ProjectId == queryProjectId.Value);
                        }

                        targetProjectPaper = await ppQuery.FirstOrDefaultAsync();
                    }

                    if (targetProjectPaper != null)
                    {
                        var originalFileName = Path.GetFileName(file.FileName);
                        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(originalFileName)?.Trim() ?? "";

                        var pId = targetProjectPaper.ProjectId;
                        var papId = targetProjectPaper.PaperId;
                        var baseOsmPath = _configuration["StorageSettings:BasePath"] ?? _configuration["StorageSettings:BaseOsmPath"] ?? Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "storage");
                        var targetFolder = Path.Combine(baseOsmPath, "osm", pId.ToString(), papId.ToString(), "cleancopies");

                        if (!Directory.Exists(targetFolder))
                        {
                            Directory.CreateDirectory(targetFolder);
                        }

                        var uniqueFileName = $"{Guid.NewGuid():N}_{originalFileName}";
                        var filePath = Path.Combine(targetFolder, uniqueFileName);
                        var fileUrl = $"/osm/{pId}/{papId}/cleancopies/{uniqueFileName}";

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        var barcode = fileNameWithoutExt.Length >= 6 
                            ? fileNameWithoutExt 
                            : $"SC-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}".Substring(0, 24).ToUpper();

                        var script = new Script
                        {
                            ProjectPaperId = targetProjectPaper.Id,
                            ProjectId = targetProjectPaper.ProjectId,
                            BatchId = targetProjectPaper.BatchId,
                            InBuiltBarcode = barcode,
                            GeneratedBarcode = barcode,
                            CleanPdfUrl = fileUrl,
                            RollNumber = barcode,
                            Status = ScriptStatus.pending,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.Scripts.Add(script);
                        await _context.SaveChangesAsync();

                        int? targetUniId = targetProjectPaper.Paper?.UniversityId ?? targetProjectPaper.Project?.UniversityId;
                        if (targetUniId.HasValue && targetUniId.Value > 0)
                        {
                            _dailyAllocationService.TriggerAutoAllocationBackground(targetUniId.Value);
                        }

                        return Ok(new { success = true, scriptId = script.Id, url = fileUrl, message = "Script uploaded successfully" });
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
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }
    }
}
