export const ScriptStatus = Object.freeze({
  PENDING: 'pending',
  ALLOCATED: 'allocated',
  MARKING: 'marking',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
});

export const AllocationStatus = Object.freeze({
  ALLOCATED: 'allocated',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  CANCELLED: 'cancelled',
});

export const MarkingStatus = Object.freeze({
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
});
