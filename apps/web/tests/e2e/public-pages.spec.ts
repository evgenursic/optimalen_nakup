import { expect, test } from "@playwright/test";

test("localized public pages have working primary navigation", async ({ page }) => {
  await page.goto("/sl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Manj ugibanja");
  await page.getByRole("link", { name: "Cenik" }).click();
  await expect(page).toHaveURL(/\/sl\/pricing$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("mobile content remains accessible and exposes a skip link", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Less guessing");
});
