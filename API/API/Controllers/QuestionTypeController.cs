using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QuestionTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionTypeController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionType>>> GetQuestionTypes()
        {
            try
            {
                var types = await _context.QuestionTypes
                    .ToListAsync();
                return Ok(types);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<QuestionType>> CreateQuestionType([FromBody] QuestionTypeDto dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.QuestionTypeName))
                {
                    return BadRequest(new { success = false, message = "Question type name is required." });
                }

                string nameNormalized = dto.QuestionTypeName.Trim();

                // Check for duplicates
                var exists = await _context.QuestionTypes
                    .AnyAsync(qt => qt.QuestionTypeName.ToLower() == nameNormalized.ToLower());
                
                if (exists)
                {
                    return BadRequest(new { success = false, message = "This question type already exists." });
                }

                var questionType = new QuestionType
                {
                    QuestionTypeName = nameNormalized
                };

                _context.QuestionTypes.Add(questionType);
                await _context.SaveChangesAsync();

                return Ok(questionType);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteQuestionType(int id)
        {
            try
            {
                var questionType = await _context.QuestionTypes.FindAsync(id);
                if (questionType == null)
                {
                    return NotFound(new { success = false, message = "Question type not found." });
                }

                _context.QuestionTypes.Remove(questionType);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Question type deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An unexpected error occurred while processing your request." });
            }
        }
    }

    public class QuestionTypeDto
    {
        public string QuestionTypeName { get; set; } = string.Empty;
    }
}
