import { mkdir } from "node:fs/promises";
import path from "node:path";

import { clerk } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.LHCI_BASE_URL || "").replace(/\/$/, "");
const emailAddress = process.env.E2E_USER_EMAIL || "";
if (!baseUrl || !emailAddress) {
  throw new Error("LHCI_BASE_URL and E2E_USER_EMAIL are required.");
}
if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error("CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY are required.");
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/sl/sign-in`, { waitUntil: "domcontentloaded" });
  await clerk.signIn({ page, emailAddress });
  await page.goto(`${baseUrl}/sl/app`, { waitUntil: "networkidle" });
  if (!page.url().includes("/sl/app")) {
    throw new Error(`Clerk session did not reach the application: ${page.url()}`);
  }

  const outputPath = path.resolve(".auth/lighthouse-storage-state.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await context.storageState({ path: outputPath });
  process.stdout.write(`Authenticated browser state written to ${outputPath}\n`);
} finally {
  await browser.close();
}
