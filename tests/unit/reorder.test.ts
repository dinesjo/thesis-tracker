import { describe, expect, it } from "vitest";
import { applyTaskReorder } from "@/lib/domain/reorder";

describe("applyTaskReorder", () => {
  const tasks = [
    { id: "a", statusColumn: "todo" as const, columnOrder: 0 },
    { id: "b", statusColumn: "todo" as const, columnOrder: 1 },
    { id: "c", statusColumn: "in_progress" as const, columnOrder: 0 },
  ];

  it("moves a task within the same column", () => {
    const updates = applyTaskReorder(tasks, "b", "todo", 0);
    const b = updates.find((update) => update.id === "b");

    expect(b?.statusColumn).toBe("todo");
    expect(b?.columnOrder).toBe(0);
  });

  it("moves a task across columns", () => {
    const updates = applyTaskReorder(tasks, "a", "in_progress", 1);
    const a = updates.find((update) => update.id === "a");

    expect(a?.statusColumn).toBe("in_progress");
    expect(a?.columnOrder).toBe(1);
  });
});
