using System;
using System.Linq;
using System.Threading.Tasks;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LogsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/logs/events
        [HttpGet("events")]
        public async Task<IActionResult> GetEventLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? method = null,
            [FromQuery] string? userId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var query = _context.EventLogs.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(method))
                {
                    query = query.Where(l => l.Method == method.ToUpper());
                }

                if (!string.IsNullOrWhiteSpace(userId))
                {
                    query = query.Where(l => l.UserId == userId);
                }

                if (fromDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp >= fromDate.Value);
                }

                if (toDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp <= toDate.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(l => l.Path.ToLower().Contains(s) ||
                                             l.Message.ToLower().Contains(s) ||
                                             (l.UserId != null && l.UserId.ToLower().Contains(s)) ||
                                             (l.IpAddress != null && l.IpAddress.ToLower().Contains(s)));
                }

                var totalCount = await query.CountAsync();
                var items = await query.OrderByDescending(l => l.Timestamp)
                                       .Skip((page - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();

                return Ok(new
                {
                    success = true,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET: api/logs/errors
        [HttpGet("errors")]
        public async Task<IActionResult> GetErrorLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] int? statusCode = null,
            [FromQuery] string? method = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var query = _context.ErrorLogs.AsNoTracking().AsQueryable();

                if (statusCode.HasValue)
                {
                    query = query.Where(l => l.StatusCode == statusCode.Value);
                }

                if (!string.IsNullOrWhiteSpace(method))
                {
                    query = query.Where(l => l.Method == method.ToUpper());
                }

                if (fromDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp >= fromDate.Value);
                }

                if (toDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp <= toDate.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(l => l.Path.ToLower().Contains(s) ||
                                             l.Message.ToLower().Contains(s) ||
                                             l.StackTrace.ToLower().Contains(s));
                }

                var totalCount = await query.CountAsync();
                var items = await query.OrderByDescending(l => l.Timestamp)
                                       .Skip((page - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();

                return Ok(new
                {
                    success = true,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/logs/events
        [HttpPost("events")]
        public async Task<IActionResult> CreateEventLog([FromBody] CreateEventLogRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { success = false, message = "Invalid log payload" });
                }

                var eventLog = new EventLog
                {
                    Timestamp = request.Timestamp ?? DateTime.UtcNow,
                    Method = request.Method ?? "POST",
                    Path = request.Path ?? string.Empty,
                    QueryString = request.QueryString ?? string.Empty,
                    Headers = request.Headers ?? string.Empty,
                    Body = request.Body ?? string.Empty,
                    UserId = request.UserId ?? User.FindFirst("id")?.Value,
                    Message = request.Message ?? string.Empty,
                    IpAddress = request.IpAddress ?? (HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown")
                };

                _context.EventLogs.Add(eventLog);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Event log created successfully", data = eventLog });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/logs/errors
        [HttpPost("errors")]
        public async Task<IActionResult> CreateErrorLog([FromBody] CreateErrorLogRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { success = false, message = "Invalid log payload" });
                }

                var errorLog = new ErrorLog
                {
                    Timestamp = request.Timestamp ?? DateTime.UtcNow,
                    Method = request.Method ?? "ERROR",
                    Path = request.Path ?? string.Empty,
                    QueryString = request.QueryString ?? string.Empty,
                    StatusCode = request.StatusCode ?? 500,
                    Message = request.Message ?? string.Empty,
                    StackTrace = request.StackTrace ?? string.Empty,
                    InnerException = request.InnerException
                };

                _context.ErrorLogs.Add(errorLog);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Error log created successfully", data = errorLog });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT: api/logs/events/{id}
        [HttpPut("events/{id}")]
        public async Task<IActionResult> UpdateEventLog(int id, [FromBody] UpdateEventLogRequest request)
        {
            try
            {
                var eventLog = await _context.EventLogs.FindAsync(id);
                if (eventLog == null)
                {
                    return NotFound(new { success = false, message = "Event log not found" });
                }

                if (request.Message != null) eventLog.Message = request.Message;
                if (request.Method != null) eventLog.Method = request.Method;
                if (request.Path != null) eventLog.Path = request.Path;
                if (request.QueryString != null) eventLog.QueryString = request.QueryString;
                if (request.Headers != null) eventLog.Headers = request.Headers;
                if (request.Body != null) eventLog.Body = request.Body;
                if (request.UserId != null) eventLog.UserId = request.UserId;
                if (request.IpAddress != null) eventLog.IpAddress = request.IpAddress;

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Event log updated successfully", data = eventLog });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PATCH: api/logs/events/{id}
        [HttpPatch("events/{id}")]
        public async Task<IActionResult> PatchEventLog(int id, [FromBody] PatchEventLogRequest request)
        {
            try
            {
                var eventLog = await _context.EventLogs.FindAsync(id);
                if (eventLog == null)
                {
                    return NotFound(new { success = false, message = "Event log not found" });
                }

                if (!string.IsNullOrWhiteSpace(request.Message))
                {
                    eventLog.Message = request.Message;
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Event log patched successfully", data = eventLog });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/logs/events/{id}
        [HttpDelete("events/{id}")]
        public async Task<IActionResult> DeleteEventLog(int id)
        {
            try
            {
                var eventLog = await _context.EventLogs.FindAsync(id);
                if (eventLog == null)
                {
                    return NotFound(new { success = false, message = "Event log not found" });
                }

                _context.EventLogs.Remove(eventLog);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Event log deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/logs/errors/{id}
        [HttpDelete("errors/{id}")]
        public async Task<IActionResult> DeleteErrorLog(int id)
        {
            try
            {
                var errorLog = await _context.ErrorLogs.FindAsync(id);
                if (errorLog == null)
                {
                    return NotFound(new { success = false, message = "Error log not found" });
                }

                _context.ErrorLogs.Remove(errorLog);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Error log deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class CreateEventLogRequest
    {
        public DateTime? Timestamp { get; set; }
        public string? Method { get; set; }
        public string? Path { get; set; }
        public string? QueryString { get; set; }
        public string? Headers { get; set; }
        public string? Body { get; set; }
        public string? UserId { get; set; }
        public string? Message { get; set; }
        public string? IpAddress { get; set; }
    }

    public class CreateErrorLogRequest
    {
        public DateTime? Timestamp { get; set; }
        public string? Method { get; set; }
        public string? Path { get; set; }
        public string? QueryString { get; set; }
        public int? StatusCode { get; set; }
        public string? Message { get; set; }
        public string? StackTrace { get; set; }
        public string? InnerException { get; set; }
    }

    public class UpdateEventLogRequest
    {
        public string? Method { get; set; }
        public string? Path { get; set; }
        public string? QueryString { get; set; }
        public string? Headers { get; set; }
        public string? Body { get; set; }
        public string? UserId { get; set; }
        public string? Message { get; set; }
        public string? IpAddress { get; set; }
    }

    public class PatchEventLogRequest
    {
        public string? Message { get; set; }
    }
}

