import { primaryKey, sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  DELIVERABLE_STATUS,
  PRIORITIES,
  STATUS_COLUMNS,
} from "@/lib/domain/constants";

const createId = () => crypto.randomUUID();
const now = () => Date.now();

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (table) => ({
    usernameUnique: uniqueIndex("users_username_unique").on(table.username),
  }),
);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("Europe/Stockholm"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    ownerId: text("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (table) => ({
    ownerUnique: uniqueIndex("projects_owner_unique").on(table.ownerId),
  }),
);

export const phases = sqliteTable(
  "phases",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    colorToken: text("color_token").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (table) => ({
    projectOrderUnique: uniqueIndex("phases_project_order_unique").on(table.projectId, table.orderIndex),
  }),
);

export const deliverables = sqliteTable("deliverables", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: text("phase_id").references(() => phases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  status: text("status", { enum: DELIVERABLE_STATUS }).$type<(typeof DELIVERABLE_STATUS)[number]>().notNull().default("not_started"),
  resourceLinks: text("resource_links", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: text("phase_id").notNull().references(() => phases.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description"),
  statusColumn: text("status_column", { enum: STATUS_COLUMNS }).$type<(typeof STATUS_COLUMNS)[number]>().notNull().default("todo"),
  priority: text("priority", { enum: PRIORITIES }).$type<(typeof PRIORITIES)[number]>().notNull().default("medium"),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  columnOrder: integer("column_order").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(now),
  updatedAt: integer("updated_at").notNull().$defaultFn(now),
});

export const taskDeliverables = sqliteTable(
  "task_deliverables",
  {
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.deliverableId] }),
  }),
);

export type Profile = typeof profiles.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;
export type Task = typeof tasks.$inferSelect;
