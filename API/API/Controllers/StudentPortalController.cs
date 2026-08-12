using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // Open access for student roll number queries
    public class StudentPortalController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StudentPortalController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("scripts")]
        public async Task<ActionResult<IEnumerable<object>>> GetStudentScripts([FromQuery] string rollNumber)
        {
            try
            {
                if (string.IsNullOrEmpty(rollNumber))
                {
                    return BadRequest(new { success = false, message = "Roll number is required" });
                }

                // Retrieve all completed evaluated scripts matching the roll number
                var scripts = await _context.Scripts
                    .Include(s => s.Paper)
                        .ThenInclude(p => p.SubjectPapers)
                            .ThenInclude(sp => sp.Subject)
                    .Include(s => s.Markings)
                    .Where(s => s.RollNumber == rollNumber && s.Status == "completed")
                    .OrderByDescending(s => s.SubmittedAt)
                    .ToListAsync();

                var results = scripts.Select(s => {
                    var subjectPaper = s.Paper?.SubjectPapers?.FirstOrDefault();
                    var submittedMarking = s.Markings?.FirstOrDefault(m => m.Status == "submitted");
                    return new
                    {
                        ScriptId = s.Id,
                        RollNumber = s.RollNumber,
                        PaperName = s.Paper?.PaperName ?? "N/A",
                        PaperCode = s.Paper?.PaperCode ?? "N/A",
                        SubjectName = subjectPaper?.Subject?.SubName ?? "N/A",
                        TotalMarks = s.TotalMarks ?? 0,
                        Percentage = s.Percentage ?? 0,
                        IsReEvaluationRequested = s.IsReEvaluationRequested ?? false,
                        EvaluatedPdfUrl = submittedMarking?.EvaluatedPdfUrl ?? "",
                        SubmittedAt = s.SubmittedAt
                    };
                }).ToList();

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("reevaluation/{scriptId}")]
        public async Task<IActionResult> RequestReEvaluation(int scriptId)
        {
            try
            {
                var script = await _context.Scripts.FindAsync(scriptId);
                if (script == null)
                {
                    return NotFound(new { success = false, message = "Answer copy/script not found" });
                }

                if (script.Status != "completed")
                {
                    return BadRequest(new { success = false, message = "Only fully evaluated scripts can be marked for re-evaluation" });
                }

                if (script.IsReEvaluationRequested == true)
                {
                    return BadRequest(new { success = false, message = "Re-evaluation has already been requested for this script" });
                }

                // Reset status to pending and flag it for re-evaluation
                script.IsReEvaluationRequested = true;
                script.Status = "pending"; 
                script.UpdatedAt = DateTime.UtcNow;

                _context.Scripts.Update(script);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Marked for re-evaluation successfully. The answer copy status has been reset to pending for a new evaluation round." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
