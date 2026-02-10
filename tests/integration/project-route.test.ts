import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  getProjectForUser: vi.fn(),
  updateProject: vi.fn(),
}));

describe("/api/project", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("protects PATCH for unauthenticated requests", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    vi.mocked(getUserOrNull).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/project", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });

    const { PATCH } = await import("@/app/api/project/route");
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("updates project title and description for authenticated user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { updateProject } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(updateProject).mockResolvedValue({
      id: "p1",
      ownerId: "u1",
      title: "Updated",
      description: "Updated description",
    } as never);

    const request = new NextRequest("http://localhost/api/project", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated", description: "Updated description" }),
    });

    const { PATCH } = await import("@/app/api/project/route");
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.title).toBe("Updated");
  });
});
