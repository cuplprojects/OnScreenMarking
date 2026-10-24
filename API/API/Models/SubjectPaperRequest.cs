using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    /// <summary>
    /// Tracks which examiner has requested (or is allowed to request) copies for a paper.
    /// A row is created when an examiner requests scripts for a paper.
    /// Requested = true  → examiner has already placed a request.
    /// Requested = false → request is pending / not yet placed.
    /// </summary>
    public class SubjectPaperRequest
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        // FK → Papers.PaperId
        public int PaperId { get; set; }
        public Paper Paper { get; set; }

        // FK → Subjects.SubjectId  (nullable – a paper may not always have a subject)
        public int? SubjectId { get; set; }
        public Subject Subject { get; set; }

        // FK → Users.Id  (the examiner who raised the request)
        public int ExaminerId { get; set; }
        public User Examiner { get; set; }

        // FK → Universities.UniversityId (examiner's university at the time of request)
        public int? UniversityId { get; set; }
        public University University { get; set; }

        /// <summary>
        /// true  = examiner has successfully requested / received scripts for this paper.
        /// false = request row created but not yet fulfilled.
        /// </summary>
        public bool Requested { get; set; } = false;

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}

