import { test, expect } from "@playwright/test";

test.describe("Timeline + Deliverables flow", () => {
  test("user can open timeline and deliverables pages", async ({ page }) => {
    test.skip(!process.env.E2E_BYPASS_AUTH, "Set E2E_BYPASS_AUTH=1 in a seeded test environment.");

    await page.goto("/app/timeline");
    await expect(page.getByText("Phase + Task Schedule")).toBeVisible();

    await page.goto("/app/deliverables");
    await expect(page.getByText("Milestones and Linked Tasks")).toBeVisible();
  });
});
