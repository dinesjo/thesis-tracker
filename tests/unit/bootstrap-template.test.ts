import { describe, expect, it } from "vitest";
import { buildSeedTemplate } from "@/lib/domain/bootstrap";

describe("buildSeedTemplate", () => {
  it("creates seeded phases and deliverables", () => {
    const template = buildSeedTemplate("00000000-0000-0000-0000-000000000001");

    expect(template.project.ownerId).toBe("00000000-0000-0000-0000-000000000001");
    expect(template.phases).toHaveLength(5);
    expect(template.deliverables).toHaveLength(10);
  });
});
