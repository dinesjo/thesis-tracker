export const STATUS_COLUMNS = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
] as const;

export const DELIVERABLE_STATUS = [
  "not_started",
  "in_progress",
  "done",
] as const;

export const PRIORITIES = ["low", "medium", "high"] as const;

export const DEFAULT_PROJECT_TITLE =
  "Graph Serialization Strategies for Retrieval-Augmented Generation";

export const DEFAULT_PROJECT_DESCRIPTION =
  "Comparative analysis of vector-based and graph-based indexing in industrial knowledge graphs.";

export const DEFAULT_TIMEZONE = "Europe/Stockholm";

export const DEFAULT_PHASES = [
  {
    name: "Pre-study",
    colorToken: "phase-prestudy",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
  },
  {
    name: "Implementation",
    colorToken: "phase-implementation",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  },
  {
    name: "Evaluation / Benchmarking",
    colorToken: "phase-evaluation",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
  },
  {
    name: "Writing",
    colorToken: "phase-writing",
    startDate: "2026-04-16",
    endDate: "2026-05-10",
  },
  {
    name: "Review, Opposition + Defense",
    colorToken: "phase-review",
    startDate: "2026-05-11",
    endDate: "2026-05-31",
  },
] as const;

export const DEFAULT_DELIVERABLES = [
  "Project proposal & kickoff notes",
  "Pre-study literature summary",
  "Strategy A prototype ready",
  "Strategy B prototype ready",
  "Strategy C prototype ready",
  "Ground truth & benchmark suite ready",
  "Benchmark report + comparative analysis",
  "Thesis draft v1",
  "Final thesis manuscript",
  "Presentation + opposition package",
] as const;

export type StatusColumn = (typeof STATUS_COLUMNS)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUS)[number];
export type Priority = (typeof PRIORITIES)[number];

export const STATUS_COLUMN_LABELS: Record<StatusColumn, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};
