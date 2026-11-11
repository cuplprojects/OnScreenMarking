using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AttendanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/attendance
        [HttpGet]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult> GetAllAttendance([FromQuery] string? status, [FromQuery] string? date)
        {
            try
            {
                var query = _context.Attendances
                    .Include(a => a.Examiner)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(a => a.Status.ToLower() == status.ToLower().Trim());
                }

                if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out DateTime parsedDate))
                {
                    query = query.Where(a => a.Date.Date == parsedDate.Date);
                }

                var attendanceList = await query
                    .OrderByDescending(a => a.Date)
                    .ToListAsync();

                var attendanceDtos = attendanceList.Select(a => new AttendanceDto
                {
                    AttendanceId = a.AttendanceId,
                    ExaminerId = a.ExaminerId,
                    ExaminerName = a.Examiner.Name,
                    ExaminerEmail = a.Examiner.Email,
                    Date = a.Date,
                    Status = a.Status,
                    Remarks = a.Remarks,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                }).ToList();

                return Ok(new { success = true, data = attendanceDtos });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/attendance/bulk-import
        [HttpPost("bulk-import")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult> BulkImportAttendance([FromBody] List<BulkImportAttendanceRequest> requests)
        {
            try
            {
                if (requests == null || requests.Count == 0)
                {
                    return BadRequest(new { success = false, message = "No attendance data provided" });
                }

                int importedCount = 0;
                var failedEmails = new List<string>();

                foreach (var request in requests)
                {
                    if (string.IsNullOrWhiteSpace(request.Email))
                    {
                        failedEmails.Add("Row with missing Email address");
                        continue;
                    }

                    // 1. Look up the examiner
                    var emailTrimmed = request.Email.ToLower().Trim();
                    var examiner = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailTrimmed);
                    
                    if (examiner == null)
                    {
                        failedEmails.Add($"{request.Email} (Examiner email not found)");
                        continue;
                    }

                    // 2. Parse the date
                    if (string.IsNullOrWhiteSpace(request.Date) || !DateTime.TryParse(request.Date, out DateTime parsedDate))
                    {
                        failedEmails.Add($"{request.Email} (Invalid date: '{request.Date}')");
                        continue;
                    }

                    // 3. Normalize status
                    var status = string.IsNullOrWhiteSpace(request.Status) ? "Present" : request.Status.Trim();

                    // 4. Check if record already exists for the examiner on this exact date
                    var existingRecord = await _context.Attendances
                        .FirstOrDefaultAsync(a => a.ExaminerId == examiner.Id && a.Date.Date == parsedDate.Date);

                    if (existingRecord != null)
                    {
                        // Update existing record
                        existingRecord.Status = status;
                        existingRecord.Remarks = request.Remarks;
                        existingRecord.UpdatedAt = DateTime.UtcNow;
                        _context.Entry(existingRecord).State = EntityState.Modified;
                    }
                    else
                    {
                        // Create new record
                        var newRecord = new Attendance
                        {
                            ExaminerId = examiner.Id,
                            Date = parsedDate.Date,
                            Status = status,
                            Remarks = request.Remarks,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Attendances.Add(newRecord);
                    }

                    importedCount++;
                }

                if (importedCount > 0)
                {
                    await _context.SaveChangesAsync();
                }

                var response = new BulkImportResponse
                {
                    Success = true,
                    TotalProcessed = requests.Count,
                    TotalImported = importedCount,
                    FailedEmails = failedEmails,
                    Message = $"Successfully imported/updated {importedCount} of {requests.Count} attendance records."
                };

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/attendance/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> DeleteAttendance(int id)
        {
            try
            {
                var record = await _context.Attendances.FindAsync(id);
                if (record == null)
                {
                    return NotFound(new { success = false, message = "Attendance record not found" });
                }

                _context.Attendances.Remove(record);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Attendance record deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
