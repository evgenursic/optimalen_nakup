import { defineConfig, devices } from "@playwright/test";

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: remoteBaseUrl ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: "pnpm start",
          url: "http://127.0.0.1:3000/sl",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
