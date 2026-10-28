import { expect, test } from "@playwright/test";

test("the M0 shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Close the tab");
  await expect(page.getByText("M0 scaffold is complete.")).toBeVisible();
  await expect(page.getByRole("link", { name: "MicroDots home" })).toBeVisible();
});
