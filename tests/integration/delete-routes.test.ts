import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  deleteDeliverable: vi.fn(),
  deleteTask: vi.fn(),
}));

describe("delete routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deletes deliverable for authenticated user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { deleteDeliverable } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(deleteDeliverable).mockResolvedValue({ ok: true } as never);

    const { DELETE } = await import("@/app/api/deliverables/[id]/route");
    const response = await DELETE(new NextRequest("http://localhost/api/deliverables/d1"), {
      params: Promise.resolve({ id: "d1" }),
    });

    expect(response.status).toBe(200);
  });

  it("deletes task for authenticated user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { deleteTask } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(deleteTask).mockResolvedValue({ ok: true } as never);

    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    const response = await DELETE(new NextRequest("http://localhost/api/tasks/t1"), {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(response.status).toBe(200);
  });
});
