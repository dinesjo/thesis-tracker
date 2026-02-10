import { z } from "zod";
import {
  DELIVERABLE_STATUS,
  PRIORITIES,
  STATUS_COLUMNS,
} from "@/lib/domain/constants";

export const statusColumnSchema = z.enum(STATUS_COLUMNS);
export const deliverableStatusSchema = z.enum(DELIVERABLE_STATUS);
export const prioritySchema = z.enum(PRIORITIES);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const createTaskSchema = z.object({
  phaseId: z.string().uuid(),
  title: z.string().min(1).max(160),
  description: z.string().max(4_000).nullable().optional(),
  statusColumn: statusColumnSchema.default("todo"),
  priority: prioritySchema.default("medium"),
  startAt: dateStringSchema,
  endAt: dateStringSchema,
  linkedDeliverableIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4_000).nullable().optional(),
  phaseId: z.string().uuid().optional(),
  statusColumn: statusColumnSchema.optional(),
  priority: prioritySchema.optional(),
  startAt: dateStringSchema.optional(),
  endAt: dateStringSchema.optional(),
});

export const reorderTaskSchema = z.object({
  taskId: z.string().uuid(),
  targetColumn: statusColumnSchema,
  targetIndex: z.number().int().min(0),
  orderedTaskIds: z.array(z.string().uuid()),
});

export const linkDeliverableSchema = z.object({
  deliverableId: z.string().uuid(),
});

export const createDeliverableSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4_000).nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  dueDate: dateStringSchema.nullable().optional(),
  status: deliverableStatusSchema.default("not_started"),
  resourceLinks: z.array(z.string().url()).optional().default([]),
});

export const updateDeliverableSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4_000).nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  dueDate: dateStringSchema.nullable().optional(),
  status: deliverableStatusSchema.optional(),
  resourceLinks: z.array(z.string().url()).optional(),
});

export const createPhaseSchema = z.object({
  name: z.string().min(1).max(120),
  colorToken: z.string().min(1).max(80),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

export const updatePhasesSchema = z.object({
  phases: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(120),
      startDate: dateStringSchema,
      endDate: dateStringSchema,
    }),
  ).min(1),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4_000).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdatePhasesInput = z.infer<typeof updatePhasesSchema>;
