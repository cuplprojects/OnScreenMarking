using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    public class Allocation
    {
        [Key]
        public int AllocationId { get; set; }

        public int ScriptId { get; set; }
        public Script Script { get; set; }

        public int? ProjectId { get; set; }
        public Project? Project { get; set; }

        public int ExaminerId { get; set; }
        public User Examiner { get; set; }

        public DateTime AllocatedAt { get; set; }

        public DateTime? StartedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public int TimeTakenSeconds { get; set; }

        public AllocationStatus Status { get; set; } = AllocationStatus.allocated;

        public bool AssignmentStatus { get; set; } = true; // 1 = Active, 0 = Inactive/Reassigned

        public DateTime? Deadline { get; set; }
    }
}