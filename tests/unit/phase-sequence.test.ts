import { describe, expect, it } from "vitest";
import { validatePhaseSequence } from "@/lib/validators/phase";

describe("validatePhaseSequence", () => {
  it("accepts a valid sequential phase list", () => {
    const result = validatePhaseSequence([
      { startDate: "2026-02-01", endDate: "2026-02-28" },
      { startDate: "2026-03-01", endDate: "2026-03-31" },
      { startDate: "2026-04-01", endDate: "2026-04-30" },
    ]);

    expect(result.ok).toBe(true);
  });

  it("rejects overlapping ranges", () => {
    const result = validatePhaseSequence([
      { startDate: "2026-02-01", endDate: "2026-02-28" },
      { startDate: "2026-02-20", endDate: "2026-03-10" },
    ]);

    expect(result.ok).toBe(false);
  });
});
