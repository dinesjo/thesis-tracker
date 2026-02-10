export type BoardTask = {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  description: string | null;
  statusColumn: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high";
  startAt: string;
  endAt: string;
  columnOrder: number;
  linkedDeliverableIds: string[];
};

export type BoardPhase = {
  id: string;
  name: string;
  orderIndex: number;
  startDate: string;
  endDate: string;
  colorToken: string;
};

export type BoardDeliverable = {
  id: string;
  title: string;
  phaseId: string | null;
  dueDate: string | null;
  status: "not_started" | "in_progress" | "done";
};
