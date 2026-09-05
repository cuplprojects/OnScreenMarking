using Microsoft.EntityFrameworkCore;
using API.Models;

namespace API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // DbSet entries for all models
        public DbSet<User> Users { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<College> Colleges { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Session> Sessions { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Paper> Papers { get; set; }
        public DbSet<ProjectPaper> ProjectPapers { get; set; }
        public DbSet<Section> Sections { get; set; }
        public DbSet<SectionMaster> SectionMasters { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<QuestionMark> QuestionMarks { get; set; }
        public DbSet<ExaminerExpertise> ExaminerExpertises { get; set; }
        public DbSet<Script> Scripts { get; set; }
        public DbSet<Allocation> Allocations { get; set; }
        public DbSet<Marking> Markings { get; set; }
        public DbSet<PaperExaminer> PaperExaminers { get; set; }
        public DbSet<EventLog> EventLogs { get; set; }
        public DbSet<ErrorLog> ErrorLogs { get; set; }
        public DbSet<SubjectPaper> SubjectPapers { get; set; }
        public DbSet<DepartmentSubject> DepartmentSubjects { get; set; }
        public DbSet<Courses> Courses { get; set; }
        public DbSet<CourseSubject> CourseSubjects { get; set; }
        public DbSet<Invitation> Invitations { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<QuestionType> QuestionTypes { get; set; }
        public DbSet<DepartmentCourse> DepartmentCourses { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // University configuration
            modelBuilder.Entity<University>()
                .HasKey(u => u.UniversityId);
            modelBuilder.Entity<University>()
                .HasMany(u => u.Departments)
                .WithOne(d => d.University)
                .HasForeignKey(d => d.UniversityId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<University>()
                .HasMany(u => u.Projects)
                .WithOne(p => p.University)
                .HasForeignKey(p => p.UniversityId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<University>()
                .HasMany(u => u.Users)
                .WithOne(u => u.University)
                .HasForeignKey(u => u.UniversityId)
                .OnDelete(DeleteBehavior.Cascade);

            // College configuration
            modelBuilder.Entity<College>()
                .HasKey(c => c.Id);

            // Department configuration
            modelBuilder.Entity<Department>()
                .HasKey(d => d.DepartmentId);
            modelBuilder.Entity<Department>()
                .HasIndex(d => new { d.UniversityId, d.Name })
                .IsUnique();

            // Courses configuration
            modelBuilder.Entity<Courses>()
                .HasKey(c => c.Id);

            // DepartmentCourse configuration
            modelBuilder.Entity<DepartmentCourse>()
                .HasKey(dc => dc.Id);
            modelBuilder.Entity<DepartmentCourse>()
                .HasIndex(dc => new { dc.DepartmentId, dc.CourseId })
                .IsUnique();
            modelBuilder.Entity<DepartmentCourse>()
                .HasOne(dc => dc.Department)
                .WithMany(d => d.DepartmentCourses)
                .HasForeignKey(dc => dc.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<DepartmentCourse>()
                .HasOne(dc => dc.Course)
                .WithMany(c => c.DepartmentCourses)
                .HasForeignKey(dc => dc.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // CourseSubject configuration
            modelBuilder.Entity<CourseSubject>()
                .HasKey(cs => cs.Id);
            modelBuilder.Entity<CourseSubject>()
                .HasIndex(cs => new { cs.CourseId, cs.SubjectId })
                .IsUnique();
            modelBuilder.Entity<CourseSubject>()
                .HasOne(cs => cs.Course)
                .WithMany(c => c.CourseSubjects)
                .HasForeignKey(cs => cs.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<CourseSubject>()
                .HasOne(cs => cs.Subject)
                .WithMany(s => s.CourseSubjects)
                .HasForeignKey(cs => cs.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // User configuration
            modelBuilder.Entity<User>()
                .HasKey(u => u.Id);
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
            modelBuilder.Entity<User>()
                .HasOne(u => u.University)
                .WithMany(u => u.Users)
                .HasForeignKey(u => u.UniversityId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<User>()
                .HasMany(u => u.Expertise)
                .WithOne(ee => ee.Examiner)
                .HasForeignKey(ee => ee.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<User>()
                .HasMany(u => u.Allocations)
                .WithOne(a => a.Examiner)
                .HasForeignKey(a => a.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<User>()
                .HasMany(u => u.Markings)
                .WithOne(m => m.Examiner)
                .HasForeignKey(m => m.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Session configuration
            modelBuilder.Entity<Session>()
                .HasKey(s => s.SessionId);
            modelBuilder.Entity<Session>()
                .HasMany(s => s.Projects)
                .WithOne(p => p.Session)
                .HasForeignKey(p => p.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Project configuration
            modelBuilder.Entity<Project>()
                .HasKey(p => p.ProjectId);
            modelBuilder.Entity<Project>()
                .HasMany(p => p.ProjectPapers)
                .WithOne(pp => pp.Project)
                .HasForeignKey(pp => pp.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Subject configuration
            modelBuilder.Entity<Subject>()
                .HasKey(s => s.SubjectId);
            modelBuilder.Entity<DepartmentSubject>()
    .HasOne(ds => ds.Department)
    .WithMany(d => d.DepartmentSubjects)
    .HasForeignKey(ds => ds.DepartmentId)
    .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<DepartmentSubject>()
    .HasOne(ds => ds.Subject)
    .WithMany(s => s.DepartmentSubjects)
    .HasForeignKey(ds => ds.SubjectId)
    .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<SubjectPaper>()
    .HasOne(sp => sp.Paper)
    .WithMany(p => p.SubjectPapers)
    .HasForeignKey(sp => sp.PaperId)
    .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<SubjectPaper>()
    .HasOne(sp => sp.Subject)
    .WithMany(s => s.SubjectPapers)
    .HasForeignKey(sp => sp.SubjectId)
    .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Subject>()
                .HasMany(s => s.ExaminerExpertises)
                .WithOne(ee => ee.Subject)
                .HasForeignKey(ee => ee.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Paper configuration
            modelBuilder.Entity<Paper>()
                .HasKey(p => p.PaperId);
            modelBuilder.Entity<Paper>()
                .HasIndex(p => new { p.PaperCode, p.UniversityId })
                .IsUnique();
            modelBuilder.Entity<Paper>()
                .HasMany(p => p.ProjectPapers)
                .WithOne(pp => pp.Paper)
                .HasForeignKey(pp => pp.PaperId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Paper>()
                .HasMany(p => p.Sections)
                .WithOne(s => s.Paper)
                .HasForeignKey(s => s.PaperId)
                .OnDelete(DeleteBehavior.Cascade);
            // ProjectPaper configuration
            modelBuilder.Entity<ProjectPaper>()
                .HasKey(pp => pp.Id);
            modelBuilder.Entity<ProjectPaper>()
                .HasIndex(pp => new { pp.ProjectId, pp.PaperId })
                .IsUnique();
            modelBuilder.Entity<ProjectPaper>()
                .HasMany(pp => pp.Scripts)
                .WithOne(s => s.ProjectPaper)
                .HasForeignKey(s => s.ProjectPaperId)
                .OnDelete(DeleteBehavior.Cascade);

            // Section configuration
            modelBuilder.Entity<Section>()
                .HasKey(s => s.Id);
            modelBuilder.Entity<Section>()
                .HasOne(s => s.SectionMaster)
                .WithMany()
                .HasForeignKey(s => s.SectionMasterId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Section>()
                .HasMany(s => s.Questions)
                .WithOne(q => q.Section)
                .HasForeignKey(q => q.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            // SectionMaster configuration
            modelBuilder.Entity<SectionMaster>()
                .HasKey(sm => sm.Id);
            modelBuilder.Entity<SectionMaster>()
                .HasIndex(sm => sm.Name)
                .IsUnique();

            // Question configuration
            modelBuilder.Entity<Question>()
                .HasKey(q => q.QuestionId);
            modelBuilder.Entity<Question>()
                .HasMany(q => q.QuestionMarks)
                .WithOne(qm => qm.Question)
                .HasForeignKey(qm => qm.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ExaminerExpertise configuration
            modelBuilder.Entity<ExaminerExpertise>()
                .HasKey(ee => ee.Id);
            modelBuilder.Entity<ExaminerExpertise>()
                .HasIndex(ee => new { ee.ExaminerId, ee.SubjectId })
                .IsUnique();

            // Script configuration
            modelBuilder.Entity<Script>()
                .HasKey(s => s.Id);
            modelBuilder.Entity<Script>()
                .HasIndex(s => s.GeneratedBarcode)
                .IsUnique();
            modelBuilder.Entity<Script>()
                .HasMany(s => s.Allocations)
                .WithOne(a => a.Script)
                .HasForeignKey(a => a.ScriptId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Script>()
                .HasMany(s => s.Markings)
                .WithOne(m => m.Script)
                .HasForeignKey(m => m.ScriptId)
                .OnDelete(DeleteBehavior.Cascade);

            // Allocation configuration
            modelBuilder.Entity<Allocation>()
                .HasKey(a => a.AllocationId);
            modelBuilder.Entity<Allocation>()
                .HasOne(a => a.Script)
                .WithMany(s => s.Allocations)
                .HasForeignKey(a => a.ScriptId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Allocation>()
                .HasOne(a => a.Examiner)
                .WithMany(u => u.Allocations)
                .HasForeignKey(a => a.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Marking configuration
            modelBuilder.Entity<Marking>()
                .HasKey(m => m.Id);
            modelBuilder.Entity<Marking>()
                .HasOne(m => m.Script)
                .WithMany(s => s.Markings)
                .HasForeignKey(m => m.ScriptId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Marking>()
                .HasOne(m => m.Examiner)
                .WithMany(u => u.Markings)
                .HasForeignKey(m => m.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Marking>()
                .HasOne(m => m.Allocation)
                .WithMany()
                .HasForeignKey(m => m.AllocationId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Marking>()
                .HasMany(m => m.QuestionMarks)
                .WithOne(qm => qm.Marking)
                .HasForeignKey(qm => qm.MarkingId)
                .OnDelete(DeleteBehavior.Cascade);

            // PaperExaminer configuration
            modelBuilder.Entity<PaperExaminer>()
                .HasKey(pe => pe.Id);
            modelBuilder.Entity<PaperExaminer>()
                .HasOne(pe => pe.Paper)
                .WithMany()
                .HasForeignKey(pe => pe.PaperId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<PaperExaminer>()
                .HasOne(pe => pe.Examiner)
                .WithMany()
                .HasForeignKey(pe => pe.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);

            // QuestionMark configuration
            modelBuilder.Entity<QuestionMark>()
                .HasKey(qm => qm.Id);

            // Invitation configuration
            modelBuilder.Entity<Invitation>()
                .HasKey(i => i.Id);
            modelBuilder.Entity<Invitation>()
                .HasOne(i => i.University)
                .WithMany()
                .HasForeignKey(i => i.UniversityId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Invitation>()
                .HasOne(i => i.Department)
                .WithMany()
                .HasForeignKey(i => i.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<PaperExaminer>()
    .HasIndex(pe => new { pe.PaperId, pe.ExaminerId })
    .IsUnique();
            // Attendance configuration
            modelBuilder.Entity<Attendance>()
                .HasKey(a => a.AttendanceId);
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Examiner)
                .WithMany()
                .HasForeignKey(a => a.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);

            // QuestionType configuration
            modelBuilder.Entity<QuestionType>()
                .HasKey(qt => qt.QuestionTypeId);
        }
    }
}
