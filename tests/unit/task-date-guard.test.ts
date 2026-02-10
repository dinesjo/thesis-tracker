import { describe, expect, it } from "vitest";
import { validateTaskDates } from "@/lib/validators/task";

describe("validateTaskDates", () => {
  const project = { startDate: "2026-02-01", endDate: "2026-05-31" };

  it("accepts task dates inside project range", () => {
    const result = validateTaskDates(project, "2026-03-01", "2026-03-10");
    expect(result.ok).toBe(true);
  });

  it("rejects task start after end", () => {
    const result = validateTaskDates(project, "2026-03-11", "2026-03-10");
    expect(result.ok).toBe(false);
  });

  it("rejects task date outside project range", () => {
    const result = validateTaskDates(project, "2026-01-20", "2026-02-10");
    expect(result.ok).toBe(false);
  });
});
