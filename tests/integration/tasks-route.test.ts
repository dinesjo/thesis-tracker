import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  createTask: vi.fn(),
}));

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates task for authorized user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { createTask } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(createTask).mockResolvedValue({ id: "t1" } as never);

    const request = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        phaseId: "550e8400-e29b-41d4-a716-446655440000",
        title: "My Task",
        startAt: "2026-03-01",
        endAt: "2026-03-03",
        priority: "medium",
        statusColumn: "todo",
      }),
    });

    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.task.id).toBe("t1");
  });
});
