namespace API.Models.DTOs
{
    public class CourseDto
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public int? DepartmentId { get; set; }
        public int? UniversityId { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
