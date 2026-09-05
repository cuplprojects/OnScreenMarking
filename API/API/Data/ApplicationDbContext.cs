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
        public DbSet<TemplateConfiguration> TemplateConfigurations { get; set; }
        public DbSet<BarcodeConfiguration> BarcodeConfigurations { get; set; }
        public DbSet<ProjectConfiguration> ProjectConfigurations { get; set; }
        public DbSet<PdfRecord> PdfRecords { get; set; }
        public DbSet<ExamBatch> ExamBatches { get; set; }
        public DbSet<Operator> Operators { get; set; }
        public DbSet<BookletConfig> BookletConfigs { get; set; }
        public DbSet<ScanSession> ScanSessions { get; set; }
        public DbSet<Booklet> Booklets { get; set; }
        public DbSet<ScannedPage> ScannedPages { get; set; }
        public DbSet<PageEvent> PageEvents { get; set; }
        public DbSet<GeneratedPdf> GeneratedPdfs { get; set; }
        public DbSet<UploadQueue> UploadQueues { get; set; }
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
            modelBuilder.Entity<PaperExaminer>()
                .HasIndex(pe => new { pe.PaperId, pe.ExaminerId })
                .IsUnique();

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

            // TemplateConfiguration configuration
            modelBuilder.Entity<TemplateConfiguration>()
                .HasKey(tc => tc.TemplateId);
            modelBuilder.Entity<TemplateConfiguration>()
                .HasIndex(tc => tc.Status);
            modelBuilder.Entity<TemplateConfiguration>()
                .HasIndex(tc => tc.SkipPages);

            // BarcodeConfiguration configuration
            modelBuilder.Entity<BarcodeConfiguration>()
                .HasKey(bc => bc.BarcodeId);
            modelBuilder.Entity<BarcodeConfiguration>()
                .HasIndex(bc => bc.Barcode)
                .IsUnique();
            modelBuilder.Entity<BarcodeConfiguration>()
                .HasIndex(bc => bc.SubjectCode);

            // ProjectConfiguration configuration
            modelBuilder.Entity<ProjectConfiguration>()
                .HasKey(pc => pc.ProjectConfigId);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasOne(pc => pc.Project)
                .WithMany()
                .HasForeignKey(pc => pc.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasOne(pc => pc.Subject)
                .WithMany()
                .HasForeignKey(pc => pc.SubjectId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasOne(pc => pc.TemplateConfiguration)
                .WithMany()
                .HasForeignKey(pc => pc.TemplateId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasOne(pc => pc.BarcodeConfiguration)
                .WithMany()
                .HasForeignKey(pc => pc.BarcodeId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasOne(pc => pc.Paper)
                .WithMany()
                .HasForeignKey(pc => pc.PaperId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasIndex(pc => pc.ProjectId);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasIndex(pc => pc.SubjectId);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasIndex(pc => pc.TemplateId);
            modelBuilder.Entity<ProjectConfiguration>()
                .HasIndex(pc => pc.PaperId);

            // PdfRecord configuration
            modelBuilder.Entity<PdfRecord>()
                .HasKey(pr => pr.PdfId);
            modelBuilder.Entity<PdfRecord>()
                .HasIndex(pr => pr.GeneratedBarcode);

            // ExamBatch configuration
            modelBuilder.Entity<ExamBatch>()
                .HasKey(eb => eb.Id);
            modelBuilder.Entity<ExamBatch>()
                .HasMany(eb => eb.ScanSessions)
                .WithOne(ss => ss.ExamBatch)
                .HasForeignKey(ss => ss.ExamBatchId)
                .OnDelete(DeleteBehavior.Cascade);

            // Operator configuration
            modelBuilder.Entity<Operator>()
                .HasKey(o => o.Id);
            modelBuilder.Entity<Operator>()
                .HasMany(o => o.ScanSessions)
                .WithOne(ss => ss.Operator)
                .HasForeignKey(ss => ss.OperatorId)
                .OnDelete(DeleteBehavior.Cascade);

            // BookletConfig configuration
            modelBuilder.Entity<BookletConfig>()
                .HasKey(bc => bc.Id);
            modelBuilder.Entity<BookletConfig>()
                .HasMany(bc => bc.ScanSessions)
                .WithOne(ss => ss.BookletConfig)
                .HasForeignKey(ss => ss.BookletConfigId)
                .OnDelete(DeleteBehavior.Cascade);

            // ScanSession configuration
            modelBuilder.Entity<ScanSession>()
                .HasKey(ss => ss.Id);
            modelBuilder.Entity<ScanSession>()
                .HasOne(ss => ss.ExamBatch)
                .WithMany(eb => eb.ScanSessions)
                .HasForeignKey(ss => ss.ExamBatchId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScanSession>()
                .HasOne(ss => ss.Operator)
                .WithMany(o => o.ScanSessions)
                .HasForeignKey(ss => ss.OperatorId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScanSession>()
                .HasOne(ss => ss.BookletConfig)
                .WithMany(bc => bc.ScanSessions)
                .HasForeignKey(ss => ss.BookletConfigId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScanSession>()
                .HasMany(ss => ss.Booklets)
                .WithOne(b => b.ScanSession)
                .HasForeignKey(b => b.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScanSession>()
                .HasMany(ss => ss.ScannedPages)
                .WithOne(sp => sp.ScanSession)
                .HasForeignKey(sp => sp.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Booklet configuration
            modelBuilder.Entity<Booklet>()
                .HasKey(b => b.Id);
            modelBuilder.Entity<Booklet>()
                .HasOne(b => b.ScanSession)
                .WithMany(ss => ss.Booklets)
                .HasForeignKey(b => b.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Booklet>()
                .HasMany(b => b.ScannedPages)
                .WithOne(sp => sp.Booklet)
                .HasForeignKey(sp => sp.BookletId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Booklet>()
                .HasMany(b => b.GeneratedPdfs)
                .WithOne(gp => gp.Booklet)
                .HasForeignKey(gp => gp.BookletId)
                .OnDelete(DeleteBehavior.Cascade);

            // ScannedPage configuration
            modelBuilder.Entity<ScannedPage>()
                .HasKey(sp => sp.Id);
            modelBuilder.Entity<ScannedPage>()
                .HasOne(sp => sp.ScanSession)
                .WithMany(ss => ss.ScannedPages)
                .HasForeignKey(sp => sp.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScannedPage>()
                .HasOne(sp => sp.Booklet)
                .WithMany(b => b.ScannedPages)
                .HasForeignKey(sp => sp.BookletId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScannedPage>()
                .HasMany(sp => sp.PageEvents)
                .WithOne(pe => pe.ScannedPage)
                .HasForeignKey(pe => pe.PageId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ScannedPage>()
                .HasIndex(sp => sp.BookletId);

            // PageEvent configuration
            modelBuilder.Entity<PageEvent>()
                .HasKey(pe => pe.Id);
            modelBuilder.Entity<PageEvent>()
                .HasOne(pe => pe.ScannedPage)
                .WithMany(sp => sp.PageEvents)
                .HasForeignKey(pe => pe.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            // GeneratedPdf configuration
            modelBuilder.Entity<GeneratedPdf>()
                .HasKey(gp => gp.Id);
            modelBuilder.Entity<GeneratedPdf>()
                .HasOne(gp => gp.Booklet)
                .WithMany(b => b.GeneratedPdfs)
                .HasForeignKey(gp => gp.BookletId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<GeneratedPdf>()
                .HasMany(gp => gp.UploadQueues)
                .WithOne(uq => uq.GeneratedPdf)
                .HasForeignKey(uq => uq.PdfId)
                .OnDelete(DeleteBehavior.Cascade);

            // UploadQueue configuration
            modelBuilder.Entity<UploadQueue>()
                .HasKey(uq => uq.Id);
            modelBuilder.Entity<UploadQueue>()
                .HasOne(uq => uq.GeneratedPdf)
                .WithMany(gp => gp.UploadQueues)
                .HasForeignKey(uq => uq.PdfId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
