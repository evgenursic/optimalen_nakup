import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test("health API bypasses locale redirects and disables caching", async ({ request }) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response.headers()["content-security-policy"]).not.toContain("'unsafe-eval'");
  await expect(response.json()).resolves.toMatchObject({
    service: "optimalen-nakup-web",
    status: "ok",
  });
});

test("nonce CSP permits the closed-beta form to hydrate", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Content Security Policy")) {
      cspErrors.push(message.text());
    }
  });
  await page.goto("/sl/pricing");
  await page.getByRole("textbox", { name: "E-poštni naslov" }).fill("fixture@example.invalid");
  await page.getByRole("button", { name: "Prijavi me" }).click();
  await expect(page.getByRole("status")).toContainText("trenutno ni bilo mogoče");
  expect(cspErrors).toEqual([]);
});

test("PWA worker registers and caches only public static assets", async ({ page, request }) => {
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.status()).toBe(200);
  const workerSource = await workerResponse.text();
  expect(workerSource).toContain('url.pathname.startsWith("/_next/static/")');
  expect(workerSource).not.toContain("navigate");

  await page.goto("/sl");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe("/");

  const cachedPaths = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      for (const response of await (await caches.open(name)).keys()) {
        paths.push(new URL(response.url).pathname);
      }
    }
    return paths;
  });
  expect(cachedPaths.length).toBeGreaterThan(0);
  expect(
    cachedPaths.every(
      (path) =>
        path.startsWith("/_next/static/") ||
        path === "/icon.svg" ||
        path === "/manifest.webmanifest",
    ),
  ).toBe(true);
});

for (const route of ["/sl", "/sl/pricing", "/sl/how-it-works", "/sl/sign-in"]) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
  });
}
