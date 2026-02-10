import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  deliverables,
  phases,
  profiles,
  projects,
  taskDeliverables,
  tasks,
} from "@/lib/db/schema";
import {
  DEFAULT_PHASES,
  DEFAULT_TIMEZONE,
  type StatusColumn,
} from "@/lib/domain/constants";
import { applyTaskReorder } from "@/lib/domain/reorder";
import { buildSeedTemplate } from "@/lib/domain/bootstrap";
import {
  type CreateDeliverableInput,
  type CreateTaskInput,
  type ReorderTaskInput,
  type UpdateDeliverableInput,
  type UpdatePhasesInput,
  type UpdateProjectInput,
  type UpdateTaskInput,
} from "@/lib/validators/schemas";
import { validatePhaseSequence } from "@/lib/validators/phase";
import { validateTaskDates } from "@/lib/validators/task";

function assertTaskWithinProject(project: { startDate: string; endDate: string }, start: string, end: string) {
  const validation = validateTaskDates(project, start, end);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
}

export async function ensureProfile(userId: string, displayName?: string | null) {
  await db
    .insert(profiles)
    .values({
      id: userId,
      displayName: displayName ?? null,
      timezone: DEFAULT_TIMEZONE,
    })
    .onConflictDoNothing();
}

export async function getProjectForUser(userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.ownerId, userId)).limit(1);
  return project ?? null;
}

export async function updateProject(userId: string, input: UpdateProjectInput) {
  const project = await getOwnedProjectOrThrow(userId);

  const [updated] = await db
    .update(projects)
    .set({
      title: input.title ?? project.title,
      description: input.description !== undefined ? input.description : project.description,
    })
    .where(and(eq(projects.id, project.id), eq(projects.ownerId, userId)))
    .returning();

  return updated;
}

export async function updatePhases(userId: string, input: UpdatePhasesInput) {
  const project = await getOwnedProjectOrThrow(userId);
  const existingPhases = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, project.id))
    .orderBy(asc(phases.orderIndex));

  if (existingPhases.length === 0) {
    throw new Error("No phases found");
  }

  if (input.phases.length !== existingPhases.length) {
    throw new Error("All existing phases must be provided");
  }

  const existingById = new Map(existingPhases.map((phase) => [phase.id, phase]));
  const inputById = new Map(input.phases.map((phase) => [phase.id, phase]));

  for (const phase of existingPhases) {
    if (!inputById.has(phase.id)) {
      throw new Error("Phase payload does not match project phases");
    }
  }

  const ordered = existingPhases.map((phase) => {
    const patch = inputById.get(phase.id);
    if (!patch) {
      throw new Error("Phase payload does not match project phases");
    }
    return patch;
  });

  const sequenceValidation = validatePhaseSequence(
    ordered.map((phase) => ({
      startDate: phase.startDate,
      endDate: phase.endDate,
    })),
  );
  if (!sequenceValidation.ok) {
    throw new Error(sequenceValidation.reason);
  }

  const newProjectStart = ordered[0].startDate;
  const newProjectEnd = ordered[ordered.length - 1].endDate;
  const projectWindow = { startDate: newProjectStart, endDate: newProjectEnd };

  const existingTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
  for (const task of existingTasks) {
    const validation = validateTaskDates(projectWindow, task.startAt, task.endAt);
    if (!validation.ok) {
      throw new Error(`Task "${task.title}" falls outside the updated phase window`);
    }
  }

  db.transaction((tx) => {
    tx
      .update(projects)
      .set({
        startDate: newProjectStart,
        endDate: newProjectEnd,
      })
      .where(and(eq(projects.id, project.id), eq(projects.ownerId, userId)))
      .run();

    for (const phasePatch of ordered) {
      const existing = existingById.get(phasePatch.id);
      if (!existing) {
        throw new Error("Phase payload does not match project phases");
      }

      tx
        .update(phases)
        .set({
          name: phasePatch.name,
          startDate: phasePatch.startDate,
          endDate: phasePatch.endDate,
        })
        .where(and(eq(phases.id, phasePatch.id), eq(phases.projectId, project.id)))
        .run();
    }
  });

  return db.select().from(phases).where(eq(phases.projectId, project.id)).orderBy(asc(phases.orderIndex));
}

export async function bootstrapWorkspace(userId: string, displayName?: string | null) {
  await ensureProfile(userId, displayName);
  return db.transaction((tx) => {
    const existingProject = tx
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .limit(1)
      .get();
    if (existingProject) {
      return existingProject;
    }

    const phaseValidation = validatePhaseSequence(
      DEFAULT_PHASES.map((phase) => ({
        startDate: phase.startDate,
        endDate: phase.endDate,
      })),
    );

    if (!phaseValidation.ok) {
      throw new Error(phaseValidation.reason);
    }

    const seed = buildSeedTemplate(userId);

    const project = tx.insert(projects).values(seed.project).returning().get();
    if (!project) {
      throw new Error("Failed to create project");
    }

    const createdPhases = tx
      .insert(phases)
      .values(
        seed.phases.map((phase) => ({
          projectId: project.id,
          name: phase.name,
          orderIndex: phase.orderIndex,
          startDate: phase.startDate,
          endDate: phase.endDate,
          colorToken: phase.colorToken,
        })),
      )
      .returning()
      .all();

    const phaseByIndex = new Map<number, (typeof createdPhases)[number]>();
    createdPhases.forEach((phase) => {
      phaseByIndex.set(phase.orderIndex, phase);
    });

    const deliverableRows: typeof deliverables.$inferInsert[] = seed.deliverables.map(
      (deliverableTemplate) => {
        const assignedPhase = phaseByIndex.get(deliverableTemplate.phaseIndex);
        return {
          projectId: project.id,
          phaseId: assignedPhase?.id ?? null,
          title: deliverableTemplate.title,
          description: null,
          dueDate: assignedPhase?.endDate ?? null,
          status: "not_started" as const,
          resourceLinks: [] as string[],
        };
      },
    );

    tx.insert(deliverables).values(deliverableRows).run();

    return project;
  });
}

async function getOwnedProjectOrThrow(userId: string) {
  const project = await getProjectForUser(userId);
  if (!project) {
    throw new Error("Project not found. Run bootstrap first.");
  }
  return project;
}

export async function getBoardData(userId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  const [phaseRows, taskRows, deliverableRows] = await Promise.all([
    db.select().from(phases).where(eq(phases.projectId, project.id)).orderBy(asc(phases.orderIndex)),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, project.id))
      .orderBy(asc(tasks.statusColumn), asc(tasks.columnOrder), asc(tasks.createdAt)),
    db.select().from(deliverables).where(eq(deliverables.projectId, project.id)).orderBy(asc(deliverables.createdAt)),
  ]);

  const taskDeliverableRows =
    taskRows.length > 0
      ? await db
          .select()
          .from(taskDeliverables)
          .where(inArray(taskDeliverables.taskId, taskRows.map((task) => task.id)))
      : [];

  const linksByTask = new Map<string, string[]>();
  taskDeliverableRows.forEach((link) => {
    const existing = linksByTask.get(link.taskId) ?? [];
    existing.push(link.deliverableId);
    linksByTask.set(link.taskId, existing);
  });

  return {
    project,
    phases: phaseRows,
    tasks: taskRows.map((task) => ({
      ...task,
      linkedDeliverableIds: linksByTask.get(task.id) ?? [],
    })),
    deliverables: deliverableRows,
  };
}

export async function getTimelineData(userId: string) {
  const board = await getBoardData(userId);
  const now = new Date().toISOString().slice(0, 10);

  const currentPhase =
    board.phases.find((phase) => phase.startDate <= now && now <= phase.endDate) ?? null;

  return {
    project: board.project,
    phases: board.phases,
    tasks: board.tasks,
    currentPhase,
  };
}

export async function listDeliverablesForUser(userId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  const deliverableRows = await db
    .select({
      id: deliverables.id,
      projectId: deliverables.projectId,
      phaseId: deliverables.phaseId,
      title: deliverables.title,
      description: deliverables.description,
      dueDate: deliverables.dueDate,
      status: deliverables.status,
      resourceLinks: deliverables.resourceLinks,
      createdAt: deliverables.createdAt,
      linkedTaskCount: sql<number>`(
        select count(*)
        from ${taskDeliverables}
        where ${taskDeliverables.deliverableId} = ${deliverables.id}
      )`,
      completedTaskCount: sql<number>`(
        select count(*)
        from ${taskDeliverables}
        join ${tasks} on ${tasks.id} = ${taskDeliverables.taskId}
        where ${taskDeliverables.deliverableId} = ${deliverables.id}
          and ${tasks.statusColumn} = 'done'
      )`,
    })
    .from(deliverables)
    .where(eq(deliverables.projectId, project.id))
    .orderBy(asc(deliverables.dueDate), asc(deliverables.createdAt));

  return deliverableRows;
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const project = await getOwnedProjectOrThrow(userId);
  assertTaskWithinProject(project, input.startAt, input.endAt);

  const [phase] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.id, input.phaseId), eq(phases.projectId, project.id)))
    .limit(1);

  if (!phase) {
    throw new Error("Selected phase does not belong to project");
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${tasks.columnOrder}), -1)` })
    .from(tasks)
    .where(and(eq(tasks.projectId, project.id), eq(tasks.statusColumn, input.statusColumn as StatusColumn)));

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: project.id,
      phaseId: input.phaseId,
      title: input.title,
      description: input.description ?? null,
      statusColumn: input.statusColumn,
      priority: input.priority,
      startAt: input.startAt,
      endAt: input.endAt,
      columnOrder: (maxOrder ?? -1) + 1,
    })
    .returning();

  if (input.linkedDeliverableIds.length > 0) {
    const validDeliverables = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.projectId, project.id),
          inArray(deliverables.id, input.linkedDeliverableIds),
        ),
      );

    if (validDeliverables.length > 0) {
      await db.insert(taskDeliverables).values(
        validDeliverables.map((deliverable) => ({
          taskId: task.id,
          deliverableId: deliverable.id,
        })),
      );
    }
  }

  return task;
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  const project = await getOwnedProjectOrThrow(userId);

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, project.id)))
    .limit(1);

  if (!existing) {
    throw new Error("Task not found");
  }

  const merged = {
    startAt: input.startAt ?? existing.startAt,
    endAt: input.endAt ?? existing.endAt,
    phaseId: input.phaseId ?? existing.phaseId,
    statusColumn: input.statusColumn ?? existing.statusColumn,
  };

  assertTaskWithinProject(project, merged.startAt, merged.endAt);

  const [phase] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.id, merged.phaseId), eq(phases.projectId, project.id)))
    .limit(1);
  if (!phase) {
    throw new Error("Selected phase does not belong to project");
  }

  const patch: Partial<typeof tasks.$inferInsert> = {
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    phaseId: merged.phaseId,
    startAt: merged.startAt,
    endAt: merged.endAt,
    statusColumn: merged.statusColumn,
    priority: input.priority ?? existing.priority,
  };

  if (input.statusColumn && input.statusColumn !== existing.statusColumn) {
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${tasks.columnOrder}), -1)` })
      .from(tasks)
      .where(and(eq(tasks.projectId, project.id), eq(tasks.statusColumn, input.statusColumn)));
    patch.columnOrder = (maxOrder ?? -1) + 1;
  }

  const [updated] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, project.id)))
    .returning();

  return updated;
}

export async function deleteTask(userId: string, taskId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, project.id)))
    .returning({ id: tasks.id });

  if (!deleted) {
    throw new Error("Task not found");
  }

  return { ok: true };
}

export async function reorderTask(userId: string, input: ReorderTaskInput) {
  const project = await getOwnedProjectOrThrow(userId);

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));

  const updates = applyTaskReorder(
    projectTasks.map((task) => ({
      id: task.id,
      statusColumn: task.statusColumn,
      columnOrder: task.columnOrder,
    })),
    input.taskId,
    input.targetColumn,
    input.targetIndex,
  );

  db.transaction((tx) => {
    for (const update of updates) {
      tx
        .update(tasks)
        .set({
          statusColumn: update.statusColumn,
          columnOrder: update.columnOrder,
        })
        .where(and(eq(tasks.id, update.id), eq(tasks.projectId, project.id)))
        .run();
    }
  });

  return { ok: true };
}

export async function linkTaskToDeliverable(userId: string, taskId: string, deliverableId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, project.id)))
    .limit(1);
  if (!task) throw new Error("Task not found");

  const [deliverable] = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.projectId, project.id)))
    .limit(1);
  if (!deliverable) throw new Error("Deliverable not found");

  await db
    .insert(taskDeliverables)
    .values({
      taskId,
      deliverableId,
    })
    .onConflictDoNothing();

  return { ok: true };
}

export async function unlinkTaskFromDeliverable(userId: string, taskId: string, deliverableId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  await db
    .delete(taskDeliverables)
    .where(
      and(
        eq(taskDeliverables.taskId, taskId),
        eq(taskDeliverables.deliverableId, deliverableId),
        sql`exists (
          select 1 from ${tasks}
          where ${tasks.id} = ${taskDeliverables.taskId}
            and ${tasks.projectId} = ${project.id}
        )`,
      ),
    );

  return { ok: true };
}

export async function createDeliverable(userId: string, input: CreateDeliverableInput) {
  const project = await getOwnedProjectOrThrow(userId);

  if (input.phaseId) {
    const [phase] = await db
      .select({ id: phases.id })
      .from(phases)
      .where(and(eq(phases.id, input.phaseId), eq(phases.projectId, project.id)))
      .limit(1);
    if (!phase) throw new Error("Phase not found");
  }

  const [created] = await db
    .insert(deliverables)
    .values({
      projectId: project.id,
      phaseId: input.phaseId ?? null,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      status: input.status,
      resourceLinks: input.resourceLinks,
    })
    .returning();

  return created;
}

export async function updateDeliverable(userId: string, deliverableId: string, input: UpdateDeliverableInput) {
  const project = await getOwnedProjectOrThrow(userId);

  const [existing] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.projectId, project.id)))
    .limit(1);

  if (!existing) {
    throw new Error("Deliverable not found");
  }

  if (input.phaseId) {
    const [phase] = await db
      .select({ id: phases.id })
      .from(phases)
      .where(and(eq(phases.id, input.phaseId), eq(phases.projectId, project.id)))
      .limit(1);
    if (!phase) {
      throw new Error("Phase not found");
    }
  }

  const [updated] = await db
    .update(deliverables)
    .set({
      title: input.title ?? existing.title,
      description: input.description !== undefined ? input.description : existing.description,
      phaseId: input.phaseId !== undefined ? input.phaseId : existing.phaseId,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      status: input.status ?? existing.status,
      resourceLinks: input.resourceLinks ?? (existing.resourceLinks as string[]),
    })
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.projectId, project.id)))
    .returning();

  return updated;
}

export async function deleteDeliverable(userId: string, deliverableId: string) {
  const project = await getOwnedProjectOrThrow(userId);

  const [deleted] = await db
    .delete(deliverables)
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.projectId, project.id)))
    .returning({ id: deliverables.id });

  if (!deleted) {
    throw new Error("Deliverable not found");
  }

  return { ok: true };
}
