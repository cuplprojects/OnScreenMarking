namespace API.Models.DTOs
{
    public class ImportPapersRequest
    {
        public int TargetProjectId { get; set; }
        public int? SourceProjectId { get; set; }
        public List<int> SourcePaperIds { get; set; } = new List<int>();
        public List<int>? MasterSectionIds { get; set; } = new List<int>();
        public bool ImportCatchNo { get; set; } = true;
        public bool ImportExaminers { get; set; } = false;
        public bool ImportSections { get; set; } = true;
    }
}
