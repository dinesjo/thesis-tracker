import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  bootstrapWorkspace: vi.fn(),
}));

describe("POST /api/bootstrap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    vi.mocked(getUserOrNull).mockResolvedValue(null);

    const { POST } = await import("@/app/api/bootstrap/route");
    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("returns project payload for authenticated user", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    const { bootstrapWorkspace } = await import("@/lib/domain/service");

    vi.mocked(getUserOrNull).mockResolvedValue({
      id: "u1",
      username: "test-user",
    } as never);

    vi.mocked(bootstrapWorkspace).mockResolvedValue({
      id: "p1",
      ownerId: "u1",
    } as never);

    const { POST } = await import("@/app/api/bootstrap/route");
    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.id).toBe("p1");
  });
});
