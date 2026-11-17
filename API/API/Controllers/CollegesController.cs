using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CollegesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CollegesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<College>>> GetColleges()
        {
            try
            {
                var colleges = await _context.Colleges.OrderBy(c => c.CollegeName).ToListAsync();
                return Ok(colleges);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<College>> GetCollege(int id)
        {
            try
            {
                var college = await _context.Colleges.FindAsync(id);
                if (college == null)
                    return NotFound(new { success = false, message = "College not found" });

                return Ok(college);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<College>> CreateCollege([FromBody] College college)
        {
            try
            {
                if (string.IsNullOrEmpty(college.CollegeName))
                    return BadRequest(new { success = false, message = "College name is required" });

                if (string.IsNullOrEmpty(college.CollegeCode))
                    return BadRequest(new { success = false, message = "College code is required" });

                // Check duplicate code
                var duplicate = await _context.Colleges.AnyAsync(c => c.CollegeCode == college.CollegeCode);
                if (duplicate)
                    return BadRequest(new { success = false, message = $"College code '{college.CollegeCode}' is already in use" });

                college.Id = 0; // Prevent mass assignment primary key overwrite (M8)
                college.IsActive = true;
                _context.Colleges.Add(college);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetCollege), new { id = college.Id }, college);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateCollege(int id, [FromBody] College collegeData)
        {
            try
            {
                var college = await _context.Colleges.FindAsync(id);
                if (college == null)
                    return NotFound(new { success = false, message = "College not found" });

                college.CollegeName = collegeData.CollegeName;
                college.CollegeCode = collegeData.CollegeCode;
                college.CollegeType = collegeData.CollegeType;
                college.Address = collegeData.Address;
                college.District = collegeData.District;
                college.IsActive = collegeData.IsActive;

                _context.Colleges.Update(college);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "College updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteCollege(int id)
        {
            try
            {
                var college = await _context.Colleges.FindAsync(id);
                if (college == null)
                    return NotFound(new { success = false, message = "College not found" });

                _context.Colleges.Remove(college);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "College deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpGet("template")]
        [AllowAnonymous]
        public IActionResult DownloadTemplate()
        {
            var csv = new StringBuilder();
            csv.AppendLine("CollegeName,CollegeCode,CollegeType,Address,District,IsActive");
            csv.AppendLine("Albert Einstein College of Technology,AECT001,Engineering,\"123 Science Park, Tech District\",Metropolis,True");
            csv.AppendLine("Royal College of Arts and Commerce,RCAC002,Arts & Commerce,\"456 Culture Avenue\",Heritage City,True");

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return File(bytes, "text/csv", "college_import_template.csv");
        }

        [HttpPost("import")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> ImportColleges(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, message = "Please upload a valid CSV file" });
                }

                var extension = Path.GetExtension(file.FileName).ToLower();
                if (extension != ".csv")
                {
                    return BadRequest(new { success = false, message = "Only CSV files are supported for import. Please save your Excel sheet as CSV and upload." });
                }

                var list = new List<College>();
                var errorRows = new List<string>();
                int rowIndex = 1;

                using (var reader = new StreamReader(file.OpenReadStream()))
                {
                    var headerLine = await reader.ReadLineAsync();
                    if (headerLine == null)
                    {
                        return BadRequest(new { success = false, message = "The uploaded file is empty" });
                    }

                    var headers = ParseCsvLine(headerLine);
                    // Minimal validation of headers
                    if (!headers.Contains("CollegeName") || !headers.Contains("CollegeCode"))
                    {
                        return BadRequest(new { success = false, message = "Missing required column headers: 'CollegeName' and 'CollegeCode' are required." });
                    }

                    while (!reader.EndOfStream)
                    {
                        var line = await reader.ReadLineAsync();
                        rowIndex++;

                        if (string.IsNullOrWhiteSpace(line)) continue;

                        var fields = ParseCsvLine(line);
                        if (fields.Count < 2 || string.IsNullOrEmpty(fields[0]))
                        {
                            errorRows.Add($"Row {rowIndex}: Missing College Name or required fields.");
                            continue;
                        }

                        var collegeName = fields[0];
                        var collegeCode = fields[1];
                        var collegeType = fields.Count > 2 ? fields[2] : "";
                        var address = fields.Count > 3 ? fields[3] : "";
                        var district = fields.Count > 4 ? fields[4] : "";
                        var isActiveStr = fields.Count > 5 ? fields[5] : "True";
                        bool isActive = !string.IsNullOrEmpty(isActiveStr) && (isActiveStr.ToLower() == "true" || isActiveStr == "1" || isActiveStr.ToLower() == "yes");

                        // Validate college code duplicates in db
                        var existsInDb = await _context.Colleges.AnyAsync(c => c.CollegeCode == collegeCode);
                        var existsInBatch = list.Any(c => c.CollegeCode == collegeCode);

                        if (existsInDb || existsInBatch)
                        {
                            errorRows.Add($"Row {rowIndex}: College Code '{collegeCode}' already exists.");
                            continue;
                        }

                        list.Add(new College
                        {
                            CollegeName = collegeName,
                            CollegeCode = collegeCode,
                            CollegeType = collegeType,
                            Address = address,
                            District = district,
                            IsActive = isActive
                        });
                    }
                }

                if (list.Count > 0)
                {
                    _context.Colleges.AddRange(list);
                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    success = true,
                    importedCount = list.Count,
                    failedCount = errorRows.Count,
                    errors = errorRows,
                    message = $"Successfully imported {list.Count} colleges. Failed rows: {errorRows.Count}"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        private List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            bool inQuotes = false;
            var currentField = new StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    inQuotes = !inQuotes;
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(currentField.ToString().Trim(' ', '"'));
                    currentField.Clear();
                }
                else
                {
                    currentField.Append(c);
                }
            }
            result.Add(currentField.ToString().Trim(' ', '"'));
            return result;
        }
    }
}
