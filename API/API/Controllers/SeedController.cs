using Microsoft.AspNetCore.Mvc;
using Bogus;
using API.Data;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeedController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SeedController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateTestData(int count = 10)
        {
            try
            {
                // Ensure at least one University exists
                var university = await _context.Universities.FirstOrDefaultAsync();
                if (university == null)
                {
                    university = new University { UniversityName = "Test University", IsActive = true };
                    _context.Universities.Add(university);
                    await _context.SaveChangesAsync();
                }

                // Ensure at least one Session exists
                var session = await _context.Sessions.FirstOrDefaultAsync();
                if (session == null)
                {
                    session = new Session { SessionName = "Test Session 2024", IsActive = true };
                    _context.Sessions.Add(session);
                    await _context.SaveChangesAsync();
                }
                
                // 1. Generate Fake Departments
                var departmentFaker = new Faker<Department>()
                    .RuleFor(d => d.Name, f => f.Commerce.Department())
                    .RuleFor(d => d.IsActive, true)
                    .RuleFor(d => d.UniversityId, university.UniversityId);
                var departments = departmentFaker.Generate(3);
                _context.Departments.AddRange(departments);
                await _context.SaveChangesAsync();

                // 2. Generate Fake Courses
                var courseFaker = new Faker<Courses>()
                    .RuleFor(c => c.Name, f => f.Company.CatchPhrase())
                    .RuleFor(c => c.Type, f => f.PickRandom(new[] { "Undergraduate", "Postgraduate", "Diploma" }))
                    .RuleFor(c => c.IsActive, true);
                
                var courses = new List<Courses>();
                foreach (var dept in departments)
                {
                    var deptCourses = courseFaker.Clone()
                        .RuleFor(c => c.DepartmentId, dept.DepartmentId)
                        .Generate(2);
                    courses.AddRange(deptCourses);
                }
                _context.Courses.AddRange(courses);
                await _context.SaveChangesAsync();

                // 3. Generate Fake Subjects
                var subjectFaker = new Faker<Subject>()
                    .RuleFor(s => s.SubName, f => f.Commerce.ProductName())
                    .RuleFor(s => s.SubCode, f => f.Random.AlphaNumeric(5).ToUpper())
                    .RuleFor(s => s.Status, true);
                var subjects = subjectFaker.Generate(10);
                _context.Subjects.AddRange(subjects);
                await _context.SaveChangesAsync();

                // 4. Generate Fake Projects
                var projectFaker = new Faker<Project>()
                    .RuleFor(p => p.ProjectName, f => f.Commerce.Department() + " Examination")
                    .RuleFor(p => p.SessionId, session.SessionId)
                    .RuleFor(p => p.UniversityId, university.UniversityId)
                    .RuleFor(p => p.IsActive, true);
                
                var projects = projectFaker.Generate(2);
                _context.Projects.AddRange(projects);
                await _context.SaveChangesAsync();

                // 5. Generate Fake Papers
                var paperFaker = new Faker<Paper>()
                    .RuleFor(p => p.PaperCode, f => f.Random.AlphaNumeric(6).ToUpper())
                    .RuleFor(p => p.PaperName, f => f.Company.CatchPhrase())
                    .RuleFor(p => p.PaperNumber, f => f.Random.Int(1, 10))
                    .RuleFor(p => p.MaxMarks, f => f.Random.Int(50, 100))
                    .RuleFor(p => p.TotalQuestions, f => f.Random.Int(10, 30))
                    .RuleFor(p => p.Description, f => f.Lorem.Sentence())
                    .RuleFor(p => p.IsActive, true)
                    .RuleFor(p => p.UniversityId, university.UniversityId);

                var papers = paperFaker.Generate(5);
                _context.Papers.AddRange(papers);
                await _context.SaveChangesAsync();

                // 6. Generate Fake ProjectPapers
                var projectPapers = new List<ProjectPaper>();
                foreach (var project in projects)
                {
                    foreach (var paper in papers.Take(3)) // Map 3 random papers to each project
                    {
                        projectPapers.Add(new ProjectPaper
                        {
                            ProjectId = project.ProjectId,
                            PaperId = paper.PaperId,
                            CatchNo = new Faker().Random.AlphaNumeric(4).ToUpper(),
                            IsActive = true
                        });
                    }
                }
                _context.ProjectPapers.AddRange(projectPapers);
                await _context.SaveChangesAsync();

                // 7. Generate Fake Scripts
                var scriptFaker = new Faker<Script>()
                    .RuleFor(s => s.InBuiltBarcode, f => f.Random.AlphaNumeric(10))
                    .RuleFor(s => s.GeneratedBarcode, f => f.Random.AlphaNumeric(10))
                    .RuleFor(s => s.CleanPdfUrl, f => "https://example.com/sample.pdf")
                    .RuleFor(s => s.Status, f => f.PickRandom(new[] { "pending", "in_progress", "completed" }))
                    .RuleFor(s => s.RollNumber, f => f.Random.Number(100000, 999999).ToString());

                var scripts = new List<Script>();
                foreach (var pp in projectPapers)
                {
                    var ppScripts = scriptFaker.Clone()
                        .RuleFor(s => s.ProjectPaperId, pp.Id)
                        .Generate(count);
                    scripts.AddRange(ppScripts);
                }
                _context.Scripts.AddRange(scripts);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    Message = "Test data generated successfully",
                    DepartmentsCreated = departments.Count,
                    CoursesCreated = courses.Count,
                    SubjectsCreated = subjects.Count,
                    ProjectsCreated = projects.Count, 
                    PapersCreated = papers.Count, 
                    ProjectPapersCreated = projectPapers.Count, 
                    ScriptsCreated = scripts.Count 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Failed to generate test data", Error = ex.Message, InnerError = ex.InnerException?.Message });
            }
        }
    }
}
