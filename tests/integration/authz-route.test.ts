import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getUserOrNull: vi.fn(),
}));

vi.mock("@/lib/domain/service", () => ({
  getBoardData: vi.fn(),
  listDeliverablesForUser: vi.fn(),
}));

describe("route authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("protects GET /api/board", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    vi.mocked(getUserOrNull).mockResolvedValue(null);

    const { GET } = await import("@/app/api/board/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("protects GET /api/deliverables", async () => {
    const { getUserOrNull } = await import("@/lib/auth/session");
    vi.mocked(getUserOrNull).mockResolvedValue(null);

    const { GET } = await import("@/app/api/deliverables/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });
});
