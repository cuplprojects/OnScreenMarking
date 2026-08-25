using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.Models.DTOs;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaperExaminersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaperExaminersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("paper/{paperId}")]
        public async Task<ActionResult<IEnumerable<PaperExaminer>>> GetPaperExaminers(int paperId)
        {
            try
            {
                var assignments = await _context.PaperExaminers
                    .Include(pe => pe.Examiner)
                    .Where(pe => pe.PaperId == paperId)
                    .ToListAsync();

                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetExaminerPapers(int examinerId)
        {
            try
            {
                var assignments = await _context.PaperExaminers
                    .Include(pe => pe.Paper)
                    .Where(pe => pe.ExaminerId == examinerId)
                    .Select(pe => new {
                        pe.PaperId,
                        pe.Paper.PaperCode,
                        pe.Paper.PaperName
                    })
                    .ToListAsync();

                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("assign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> AssignExaminer([FromBody] PaperExaminerAssignDto assignDto)
        {
            try
            {
                // Validate that paper and examiner exist
                var paper = await _context.Papers.FindAsync(assignDto.PaperId);
                if (paper == null)
                {
                    return NotFound(new { success = false, message = "Paper not found" });
                }

                var examiner = await _context.Users.FindAsync(assignDto.ExaminerId);
                if (examiner == null)
                {
                    return NotFound(new { success = false, message = "Examiner not found" });
                }

                // Check if already assigned
                if (await _context.PaperExaminers.AnyAsync(pe => pe.PaperId == assignDto.PaperId && pe.ExaminerId == assignDto.ExaminerId))
                {
                    return BadRequest(new { success = false, message = "Examiner already assigned to this paper" });
                }

                var assignment = new PaperExaminer
                {
                    PaperId = assignDto.PaperId,
                    ExaminerId = assignDto.ExaminerId,
                    MaxScriptLimit = assignDto.MaxScriptLimit,
                    AssignedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.PaperExaminers.Add(assignment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Examiner assigned successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("remove/{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RemoveAssignment(int id)
        {
            try
            {
                var assignment = await _context.PaperExaminers.FindAsync(id);
                if (assignment == null)
                    return NotFound(new { success = false, message = "Assignment not found" });

                _context.PaperExaminers.Remove(assignment);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Examiner removed from paper" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        [HttpPost("bulk-assign")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> BulkAssign([FromBody] BulkAssignRequest request)
        {
            try
            {
                int assignedCount = 0;
                
                foreach (var paperId in request.PaperIds)
                {
                    foreach (var examinerId in request.ExaminerIds)
                    {
                        var exists = await _context.PaperExaminers
                            .AnyAsync(pe => pe.PaperId == paperId && pe.ExaminerId == examinerId);
                            
                        if (!exists)
                        {
                            _context.PaperExaminers.Add(new PaperExaminer
                            {
                                PaperId = paperId,
                                ExaminerId = examinerId
                            });
                            assignedCount++;
                        }
                    }
                }
                
                if (assignedCount > 0)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = $"Successfully assigned {request.ExaminerIds.Count} examiners to {request.PaperIds.Count} papers. ({assignedCount} new assignments)" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class BulkAssignRequest
    {
        public List<int> PaperIds { get; set; }
        public List<int> ExaminerIds { get; set; }
    }
}
