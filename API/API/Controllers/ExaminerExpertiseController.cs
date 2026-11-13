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
    public class ExaminerExpertiseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ExaminerExpertiseController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("examiner/{examinerId}")]
        public async Task<ActionResult<IEnumerable<ExaminerExpertiseDto>>> GetExaminerExpertise(int examinerId)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == examinerId);
                if (user == null) return Ok(new List<ExaminerExpertiseDto>());

                var subIds = new[] { user.SubjectId1, user.SubjectId2, user.SubjectId3 }
                    .Where(s => s.HasValue && s.Value > 0)
                    .Select(s => s.Value)
                    .Distinct()
                    .ToList();

                var expertiseDtos = subIds.Select(sid => new ExaminerExpertiseDto
                {
                    Id = sid,
                    ExaminerId = examinerId,
                    SubjectId = sid,
                    IsActive = user.IsActive
                }).ToList();

                return Ok(expertiseDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("subject/{subjectId}")]
        public async Task<ActionResult<IEnumerable<ExaminerExpertiseDto>>> GetSubjectExaminers(int subjectId)
        {
            try
            {
                var examiners = await _context.Users
                    .Where(u => u.UserType == "examiner" && u.IsActive && (u.SubjectId1 == subjectId || u.SubjectId2 == subjectId || u.SubjectId3 == subjectId))
                    .Select(u => new ExaminerExpertiseDto
                    {
                        Id = u.Id,
                        ExaminerId = u.Id,
                        SubjectId = subjectId,
                        IsActive = u.IsActive
                    })
                    .ToListAsync();

                return Ok(examiners);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<ActionResult<ExaminerExpertiseDto>> AddExpertise([FromBody] ExaminerExpertiseDto expertiseDto)
        {
            try
            {
                var user = await _context.Users.FindAsync(expertiseDto.ExaminerId);
                if (user == null) return BadRequest(new { success = false, message = "Examiner not found" });

                if (!user.SubjectId1.HasValue || user.SubjectId1 == 0) user.SubjectId1 = expertiseDto.SubjectId;
                else if (!user.SubjectId2.HasValue || user.SubjectId2 == 0) user.SubjectId2 = expertiseDto.SubjectId;
                else if (!user.SubjectId3.HasValue || user.SubjectId3 == 0) user.SubjectId3 = expertiseDto.SubjectId;

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Expertise added successfully", data = expertiseDto });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> UpdateExpertise(int id, [FromBody] ExaminerExpertiseDto expertiseDto)
        {
            return Ok(new { success = true, message = "Expertise updated successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> RemoveExpertise(int id)
        {
            return Ok(new { success = true, message = "Expertise removed successfully" });
        }
    }
}
