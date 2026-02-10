import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  updatePhases: vi.fn(),
}));

describe("PATCH /api/phases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    vi.mocked(getUserOrNull).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/phases", {
      method: "PATCH",
      body: JSON.stringify({ phases: [] }),
    });

    const { PATCH } = await import("@/app/api/phases/route");
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("updates phases for authenticated user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { updatePhases } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(updatePhases).mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Pre-study",
      },
    ] as never);

    const request = new NextRequest("http://localhost/api/phases", {
      method: "PATCH",
      body: JSON.stringify({
        phases: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "Pre-study",
            startDate: "2026-02-01",
            endDate: "2026-02-28",
          },
        ],
      }),
    });

    const { PATCH } = await import("@/app/api/phases/route");
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.phases).toHaveLength(1);
  });
});
