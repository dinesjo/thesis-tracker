"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, GripVertical, Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_COLUMNS, type StatusColumn } from "@/lib/domain/constants";
import { formatDateRange } from "@/lib/date-utils";
import { phaseBandStyle } from "@/lib/phase-colors";

type BoardPayload = {
  project: {
    id: string;
  };
  phases: {
    id: string;
    name: string;
    orderIndex: number;
  }[];
  tasks: {
    id: string;
    title: string;
    description: string | null;
    phaseId: string;
    statusColumn: StatusColumn;
    priority: "low" | "medium" | "high";
    startAt: string;
    endAt: string;
    columnOrder: number;
    linkedDeliverableIds: string[];
  }[];
  deliverables: {
    id: string;
    title: string;
    phaseId: string | null;
  }[];
};

type ColumnMap = Record<StatusColumn, BoardPayload["tasks"]>;

const columnLabel: Record<StatusColumn, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const priorityLabel: Record<"low" | "medium" | "high", string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const priorityClass: Record<"low" | "medium" | "high", string> = {
  low: "border-slate-400/40 bg-slate-400/10 text-foreground",
  medium: "border-amber-500/40 bg-amber-500/10 text-foreground",
  high: "border-red-500/40 bg-red-500/10 text-foreground",
};

function createColumnMap(tasks: BoardPayload["tasks"]): ColumnMap {
  const initial: ColumnMap = {
    backlog: [],
    todo: [],
    in_progress: [],
    blocked: [],
    done: [],
  };

  tasks.forEach((task) => {
    initial[task.statusColumn].push(task);
  });

  STATUS_COLUMNS.forEach((status) => {
    initial[status] = initial[status].sort((a, b) => a.columnOrder - b.columnOrder);
  });

  return initial;
}

function findContainerByTaskId(columns: ColumnMap, taskId: string): StatusColumn | undefined {
  return STATUS_COLUMNS.find((status) => columns[status].some((task) => task.id === taskId));
}

function SortableTaskCard({
  task,
  phaseName,
  phaseIndex,
  deliverableCount,
  dragDisabled,
  onEdit,
  onDelete,
}: {
  task: BoardPayload["tasks"][number];
  phaseName: string | undefined;
  phaseIndex: number;
  deliverableCount: number;
  dragDisabled: boolean;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
          <div
            className={`mt-1 inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] leading-none ${priorityClass[task.priority]}`}
          >
            {priorityLabel[task.priority]}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            aria-label={`Drag task ${task.title}`}
            disabled={dragDisabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            aria-label={`Edit task ${task.title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task.id);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
            aria-label={`Delete task ${task.title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {task.description ? <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="phase-band" style={phaseBandStyle(phaseIndex)}>
          {phaseName ?? "No phase"}
        </span>
        <span className="phase-band inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {formatDateRange(task.startAt, task.endAt)}
        </span>
        <span className="phase-band inline-flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {deliverableCount}
        </span>
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  phases,
  dragDisabled,
  onEditTask,
  onDeleteTask,
}: {
  status: StatusColumn;
  tasks: BoardPayload["tasks"];
  phases: BoardPayload["phases"];
  dragDisabled: boolean;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <Card className="min-h-70 min-w-60 flex-1 bg-card/95">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{columnLabel[status]}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-2 p-3 pt-1">
        <SortableContext items={tasks.map((task) => task.id)} strategy={rectSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              phaseName={phases.find((phase) => phase.id === task.phaseId)?.name}
              phaseIndex={phases.find((phase) => phase.id === task.phaseId)?.orderIndex ?? 0}
              deliverableCount={task.linkedDeliverableIds.length}
              dragDisabled={dragDisabled}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No tasks</p> : null}
      </CardContent>
    </Card>
  );
}

export function BoardClient({ initialData }: { initialData: BoardPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [columns, setColumns] = useState<ColumnMap>(() => createColumnMap(initialData.tasks));
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusColumn | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const phaseMap = useMemo(
    () => new Map(initialData.phases.map((phase) => [phase.id, phase])),
    [initialData.phases],
  );

  const allTasks = STATUS_COLUMNS.flatMap((status) => columns[status]);

  const activeTask = activeTaskId === null ? null : allTasks.find((task) => task.id === activeTaskId) ?? null;
  const editingTask = editingTaskId === null ? null : allTasks.find((task) => task.id === editingTaskId) ?? null;
  const deletingTask = deleteTaskId === null ? null : allTasks.find((task) => task.id === deleteTaskId) ?? null;

  useEffect(() => {
    setColumns(createColumnMap(initialData.tasks));
  }, [initialData.tasks]);

  useEffect(() => {
    if (editingTaskId && !allTasks.some((task) => task.id === editingTaskId)) {
      setEditingTaskId(null);
    }
    if (activeTaskId && !allTasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(null);
    }
    if (deleteTaskId && !allTasks.some((task) => task.id === deleteTaskId)) {
      setDeleteTaskId(null);
    }
  }, [activeTaskId, allTasks, deleteTaskId, editingTaskId]);

  useEffect(() => {
    const requestedTaskId = searchParams.get("task");
    if (!requestedTaskId) return;
    if (!allTasks.some((task) => task.id === requestedTaskId)) return;
    setCreating(false);
    setEditingTaskId(requestedTaskId);
  }, [allTasks, searchParams]);

  const normalizedQuery = query.trim().toLowerCase();

  const hasActiveFilters =
    normalizedQuery.length > 0 || phaseFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all";

  const visibleColumns = useMemo(() => {
    const filtered = {} as ColumnMap;

    STATUS_COLUMNS.forEach((status) => {
      filtered[status] = columns[status].filter((task) => {
        if (statusFilter !== "all" && task.statusColumn !== statusFilter) return false;
        if (phaseFilter !== "all" && task.phaseId !== phaseFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (normalizedQuery.length > 0) {
          const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
          if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
      });
    });

    return filtered;
  }, [columns, normalizedQuery, phaseFilter, priorityFilter, statusFilter]);

  const visibleTaskCount = STATUS_COLUMNS.reduce((acc, status) => acc + visibleColumns[status].length, 0);

  function onDragStart(event: DragStartEvent) {
    if (hasActiveFilters) {
      toast.info("Clear filters to reorder tasks");
      return;
    }
    setActiveTaskId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    if (hasActiveFilters) return;

    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!overId) return;

    const sourceColumn = findContainerByTaskId(columns, activeId);
    const targetColumn = STATUS_COLUMNS.includes(overId as StatusColumn)
      ? (overId as StatusColumn)
      : findContainerByTaskId(columns, overId);

    if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) {
      return;
    }

    setColumns((prev) => {
      const sourceItems = [...prev[sourceColumn]];
      const sourceIndex = sourceItems.findIndex((task) => task.id === activeId);
      if (sourceIndex < 0) return prev;

      const [moved] = sourceItems.splice(sourceIndex, 1);

      const targetItems = [...prev[targetColumn]];
      const overIndex = targetItems.findIndex((task) => task.id === overId);
      const insertionIndex = overIndex >= 0 ? overIndex : targetItems.length;
      targetItems.splice(insertionIndex, 0, { ...moved, statusColumn: targetColumn });

      return {
        ...prev,
        [sourceColumn]: sourceItems,
        [targetColumn]: targetItems,
      };
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    if (hasActiveFilters) {
      setActiveTaskId(null);
      return;
    }

    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    setActiveTaskId(null);
    if (!overId) return;

    const sourceColumn = findContainerByTaskId(columns, activeId);
    const targetColumn = STATUS_COLUMNS.includes(overId as StatusColumn)
      ? (overId as StatusColumn)
      : findContainerByTaskId(columns, overId);

    if (!sourceColumn || !targetColumn) {
      return;
    }

    let nextColumns = columns;

    if (sourceColumn === targetColumn) {
      const oldIndex = columns[sourceColumn].findIndex((task) => task.id === activeId);
      const newIndex = columns[targetColumn].findIndex((task) => task.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        nextColumns = {
          ...columns,
          [sourceColumn]: arrayMove(columns[sourceColumn], oldIndex, newIndex),
        };
        setColumns(nextColumns);
      }
    } else {
      const sourceItems = [...columns[sourceColumn]];
      const sourceIndex = sourceItems.findIndex((task) => task.id === activeId);
      if (sourceIndex === -1) {
        return;
      }

      const [moved] = sourceItems.splice(sourceIndex, 1);
      const targetItems = [...columns[targetColumn]];
      const overIndex = targetItems.findIndex((task) => task.id === overId);
      const insertionIndex = overIndex >= 0 ? overIndex : targetItems.length;
      targetItems.splice(insertionIndex, 0, { ...moved, statusColumn: targetColumn });

      nextColumns = {
        ...columns,
        [sourceColumn]: sourceItems,
        [targetColumn]: targetItems,
      };
      setColumns(nextColumns);
    }

    const targetTasks = nextColumns[targetColumn];
    const targetIndex =
      STATUS_COLUMNS.includes(overId as StatusColumn)
        ? Math.max(0, targetTasks.length - 1)
        : Math.max(0, targetTasks.findIndex((task) => task.id === overId));

    try {
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeId,
          targetColumn,
          targetIndex,
          orderedTaskIds: targetTasks.map((task) => task.id),
        }),
      });
      router.refresh();
    } catch {
      toast.error("Could not persist task order");
    }
  }

  async function onCreateTask(formData: FormData) {
    setSaving(true);
    const linkedDeliverableIds = formData.getAll("linkedDeliverableIds").map(String);

    const payload = {
      phaseId: String(formData.get("phaseId") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      statusColumn: String(formData.get("statusColumn") ?? "todo"),
      priority: String(formData.get("priority") ?? "medium"),
      startAt: String(formData.get("startAt") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      linkedDeliverableIds,
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Task creation failed");
      }

      toast.success("Task created");
      setCreating(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task creation failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateTask(taskId: string, formData: FormData) {
    setSaving(true);

    const linkedDeliverableIds = formData.getAll("linkedDeliverableIds").map(String);

    const payload = {
      phaseId: String(formData.get("phaseId") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      statusColumn: String(formData.get("statusColumn") ?? "todo"),
      priority: String(formData.get("priority") ?? "medium"),
      startAt: String(formData.get("startAt") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      linkedDeliverableIds,
    };

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Task update failed");
      }

      toast.success("Task updated");
      setEditingTaskId(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task update failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteTask() {
    if (!deleteTaskId) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${deleteTaskId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Task deletion failed");
      }
      toast.success("Task deleted");
      setEditingTaskId((current) => (current === deleteTaskId ? null : current));
      setDeleteTaskId(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task deletion failed";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setPhaseFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Showing {visibleTaskCount} of {allTasks.length} task{allTasks.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={creating ? "outline" : "default"}
            onClick={() => {
              if (creating) {
                setCreating(false);
                return;
              }
              setEditingTaskId(null);
              setCreating(true);
            }}
          >
            {creating ? "Close new task" : "New task"}
          </Button>
        </div>
      </div>

      <Card className="bg-card/90">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div>
            <Label htmlFor="task-search">Search tasks</Label>
            <Input
              id="task-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or description"
            />
          </div>
          <div>
            <Label htmlFor="filter-phase">Phase</Label>
            <Select id="filter-phase" value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
              <option value="all">All phases</option>
              {initialData.phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-status">Status</Label>
            <Select
              id="filter-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusColumn | "all")}
            >
              <option value="all">All columns</option>
              {STATUS_COLUMNS.map((status) => (
                <option key={status} value={status}>
                  {columnLabel[status]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-priority">Priority</Label>
            <Select
              id="filter-priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | "low" | "medium" | "high")}
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasActiveFilters ? (
        <p className="text-xs text-muted-foreground">Drag-and-drop is disabled while filters are active.</p>
      ) : null}

      {creating ? (
        <Card className="border-dashed border-border bg-card/95">
          <CardHeader className="p-4">
            <CardTitle className="text-base">New Task</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void onCreateTask(new FormData(event.currentTarget));
              }}
            >
              <div className="md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div>
                <Label htmlFor="phaseId">Phase</Label>
                <Select id="phaseId" name="phaseId" required>
                  {initialData.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="statusColumn">Column</Label>
                <Select id="statusColumn" name="statusColumn" defaultValue="todo">
                  {STATUS_COLUMNS.map((status) => (
                    <option key={status} value={status}>
                      {columnLabel[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="startAt">Start date</Label>
                <Input id="startAt" name="startAt" type="date" required />
              </div>
              <div>
                <Label htmlFor="endAt">End date</Label>
                <Input id="endAt" name="endAt" type="date" required />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" name="priority" defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Linked deliverables</Label>
                <div className="mt-2 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                  {initialData.deliverables.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="linkedDeliverableIds"
                        value={item.id}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreating(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create task"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {editingTask ? (
        <Card className="border-dashed border-border bg-card/95">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Edit Task</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form
              key={editingTask.id}
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void onUpdateTask(editingTask.id, new FormData(event.currentTarget));
              }}
            >
              <div className="md:col-span-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" name="title" defaultValue={editingTask.title} required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={editingTask.description ?? ""} />
              </div>
              <div>
                <Label htmlFor="edit-phaseId">Phase</Label>
                <Select id="edit-phaseId" name="phaseId" defaultValue={editingTask.phaseId} required>
                  {initialData.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-statusColumn">Column</Label>
                <Select id="edit-statusColumn" name="statusColumn" defaultValue={editingTask.statusColumn}>
                  {STATUS_COLUMNS.map((status) => (
                    <option key={status} value={status}>
                      {columnLabel[status]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-startAt">Start date</Label>
                <Input id="edit-startAt" name="startAt" type="date" defaultValue={editingTask.startAt} required />
              </div>
              <div>
                <Label htmlFor="edit-endAt">End date</Label>
                <Input id="edit-endAt" name="endAt" type="date" defaultValue={editingTask.endAt} required />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select id="edit-priority" name="priority" defaultValue={editingTask.priority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Linked deliverables</Label>
                <div className="mt-2 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                  {initialData.deliverables.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="linkedDeliverableIds"
                        value={item.id}
                        defaultChecked={editingTask.linkedDeliverableIds.includes(item.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTaskId(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Update task"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={(event) => {
          void onDragEnd(event);
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUS_COLUMNS.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={visibleColumns[status]}
              phases={initialData.phases}
              dragDisabled={hasActiveFilters}
              onEditTask={(taskId) => {
                setCreating(false);
                setEditingTaskId(taskId);
              }}
              onDeleteTask={(taskId) => setDeleteTaskId(taskId)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-65 rounded-md border border-border bg-card p-3 shadow-editorial">
              <p className="text-sm font-semibold text-foreground">{activeTask.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{phaseMap.get(activeTask.phaseId)?.name ?? "No phase"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateRange(activeTask.startAt, activeTask.endAt)}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={Boolean(deleteTaskId)}
        title="Delete task"
        description={
          deletingTask
            ? `Delete "${deletingTask.title}"? This action cannot be undone.`
            : "Delete this task?"
        }
        confirmLabel="Delete task"
        destructive
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTaskId(null);
        }}
        onConfirm={() => {
          void confirmDeleteTask();
        }}
      />
    </div>
  );
}
