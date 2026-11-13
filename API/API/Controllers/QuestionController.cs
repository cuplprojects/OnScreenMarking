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
    public class QuestionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionMaster>>> GetQuestions([FromQuery] int? sectionId = null, [FromQuery] int? batchId = null)
        {
            try
            {
                var query = _context.QuestionMasters.AsQueryable();

                if (sectionId.HasValue)
                {
                    // Look up section name from SectionMasters
                    var section = await _context.SectionMasters.FindAsync(sectionId.Value);
                    if (section != null)
                        query = query.Where(q => q.BatchId == section.BatchId && q.Section == section.Name);
                }

                if (batchId.HasValue)
                    query = query.Where(q => q.BatchId == batchId.Value);

                var questions = await query
                    .OrderBy(q => q.Id)
                    .ToListAsync();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionMaster>> GetQuestion(int id)
        {
            try
            {
                var question = await _context.QuestionMasters
                    .FirstOrDefaultAsync(q => q.Id == id);

                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                return Ok(question);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<QuestionMaster>> CreateQuestion([FromBody] QuestionDto questionDto)
        {
            try
            {
                if (questionDto.Marks <= 0)
                    return BadRequest(new { success = false, message = "Marks must be greater than 0" });

                // Resolve BatchId and Section name from SectionMasters
                int batchId = 0;
                string? sectionName = null;
                if (questionDto.SectionId.HasValue && questionDto.SectionId.Value > 0)
                {
                    var sm = await _context.SectionMasters.FindAsync(questionDto.SectionId.Value);
                    if (sm != null)
                    {
                        batchId     = sm.BatchId;
                        sectionName = sm.Name;
                    }
                }

                int qTypeId = questionDto.QuestionTypeId ?? questionDto.TypeId ?? 0;
                if (qTypeId <= 0)
                {
                    var defQt = await _context.QuestionTypes.FirstOrDefaultAsync();
                    if (defQt != null) qTypeId = defQt.QuestionTypeId;
                }

                var question = new QuestionMaster
                {
                    BatchId        = batchId,
                    Section        = sectionName,
                    Question       = questionDto.QuestionNo,
                    QuestionTypeId = qTypeId,
                    Marks          = questionDto.Marks,
                    Group          = questionDto.OptionalGroupCode,
                    Status         = true,
                    CreatedAt      = DateTime.UtcNow
                };

                _context.QuestionMasters.Add(question);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetQuestion), new { id = question.Id }, question);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateQuestion(int id, [FromBody] QuestionDto questionDto)
        {
            try
            {
                var question = await _context.QuestionMasters.FindAsync(id);
                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                question.Question = questionDto.QuestionNo;
                question.Marks    = questionDto.Marks;
                if ((questionDto.QuestionTypeId ?? questionDto.TypeId).HasValue)
                {
                    question.QuestionTypeId = (questionDto.QuestionTypeId ?? questionDto.TypeId)!.Value;
                }
                question.Group    = questionDto.OptionalGroupCode;

                _context.QuestionMasters.Update(question);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Question updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            try
            {
                var question = await _context.QuestionMasters.FindAsync(id);
                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                _context.QuestionMasters.Remove(question);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Question deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/marks")]
        public async Task<ActionResult<IEnumerable<QuestionMark>>> GetQuestionMarks(int id)
        {
            try
            {
                var marks = await _context.QuestionMarks
                    .Where(qm => qm.QuestionMasterId == id)
                    .Include(qm => qm.Marking)
                    .ToListAsync();

                return Ok(marks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
