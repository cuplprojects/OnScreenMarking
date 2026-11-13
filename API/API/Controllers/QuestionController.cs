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
        public async Task<ActionResult<IEnumerable<Question>>> GetQuestions([FromQuery] int? sectionId = null)
        {
            try
            {
                var query = _context.Questions.AsQueryable();

                if (sectionId.HasValue)
                    query = query.Where(q => q.SectionId == sectionId.Value);

                var questions = await query
                    .Include(q => q.Section)
                    .OrderBy(q => q.QuestionNo)
                    .ToListAsync();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Question>> GetQuestion(int id)
        {
            try
            {
                var question = await _context.Questions
                    .Include(q => q.Section)
                    
                    .FirstOrDefaultAsync(q => q.QuestionId == id);

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
        public async Task<ActionResult<Question>> CreateQuestion([FromBody] QuestionDto questionDto)
        {
            try
            {
                if (questionDto.SectionId <= 0)
                    return BadRequest(new { success = false, message = "Section ID is required" });

                if (questionDto.Marks <= 0)
                    return BadRequest(new { success = false, message = "Marks must be greater than 0" });

                // Verify section exists
                var section = await _context.Sections.FindAsync(questionDto.SectionId);
                if (section == null)
                    return BadRequest(new { success = false, message = "Section not found" });

                var question = new Question
                {
                    SectionId = questionDto.SectionId,
                    QuestionNo = questionDto.QuestionNo,
                    Marks = questionDto.Marks,
                    Type = questionDto.Type,
                    IsOptional = questionDto.IsOptional,
                    OptionalGroupCode = questionDto.OptionalGroupCode,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Questions.Add(question);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetQuestion), new { id = question.QuestionId }, question);
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
                var question = await _context.Questions.FindAsync(id);
                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                question.QuestionNo = questionDto.QuestionNo;
                question.Marks = questionDto.Marks;
                question.Type = questionDto.Type;
                question.IsOptional = questionDto.IsOptional;
                question.OptionalGroupCode = questionDto.OptionalGroupCode;

                _context.Questions.Update(question);
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
                var question = await _context.Questions.FindAsync(id);
                if (question == null)
                    return NotFound(new { success = false, message = "Question not found" });

                _context.Questions.Remove(question);
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
