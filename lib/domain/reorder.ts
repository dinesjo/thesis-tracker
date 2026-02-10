import type { StatusColumn } from "@/lib/domain/constants";

type ReorderTask = {
  id: string;
  statusColumn: StatusColumn;
  columnOrder: number;
};

export function applyTaskReorder(
  tasks: ReorderTask[],
  taskId: string,
  targetColumn: StatusColumn,
  targetIndex: number,
) {
  const movingTask = tasks.find((task) => task.id === taskId);
  if (!movingTask) {
    throw new Error("Task not found");
  }

  const sourceColumn = movingTask.statusColumn;

  const sourceTasks = tasks
    .filter((task) => task.statusColumn === sourceColumn && task.id !== taskId)
    .sort((a, b) => a.columnOrder - b.columnOrder);

  const targetTasks =
    sourceColumn === targetColumn
      ? sourceTasks
      : tasks
          .filter((task) => task.statusColumn === targetColumn)
          .sort((a, b) => a.columnOrder - b.columnOrder);

  const insertionIndex = Math.max(0, Math.min(targetIndex, targetTasks.length));

  targetTasks.splice(insertionIndex, 0, {
    ...movingTask,
    statusColumn: targetColumn,
  });

  const updates: { id: string; statusColumn: StatusColumn; columnOrder: number }[] = [];

  sourceTasks.forEach((task, index) => {
    updates.push({ id: task.id, statusColumn: sourceColumn, columnOrder: index });
  });

  targetTasks.forEach((task, index) => {
    updates.push({ id: task.id, statusColumn: targetColumn, columnOrder: index });
  });

  const uniqueUpdates = new Map<string, { id: string; statusColumn: StatusColumn; columnOrder: number }>();
  for (const update of updates) {
    uniqueUpdates.set(update.id, update);
  }

  return Array.from(uniqueUpdates.values());
}
