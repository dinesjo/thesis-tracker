export type ProjectDateWindow = {
  startDate: string;
  endDate: string;
};

export function validateTaskDates(project: ProjectDateWindow, startAt: string, endAt: string) {
  if (startAt > endAt) {
    return { ok: false as const, reason: "Task start date must be before or equal to end date" };
  }

  if (startAt < project.startDate || endAt > project.endDate) {
    return { ok: false as const, reason: "Task dates must be within project date range" };
  }

  return { ok: true as const };
}
