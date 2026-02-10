import { test, expect } from "@playwright/test";

test.describe("Kanban flow", () => {
  test("seeded user can open board", async ({ page }) => {
    test.skip(!process.env.E2E_BYPASS_AUTH, "Set E2E_BYPASS_AUTH=1 in a seeded test environment.");

    await page.goto("/app/board");
    await expect(page.getByText("Task Flow")).toBeVisible();
    await expect(page.getByText("Backlog")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
  });
});
