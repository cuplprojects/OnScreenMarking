namespace API.Models.DTOs
{
    public class ImportPapersRequest
    {
        public int TargetProjectId { get; set; }
        public List<int> SourcePaperIds { get; set; } = new List<int>();
    }
}
