export const JOB_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
export const DEFAULT_JOB_DURATION_MINUTES = 120;

export const PAGINATION_DEFAULTS = { page: 1, limit: 10, maxLimit: 100 };
