import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const routes = ["/sl", "/sl/pricing", "/sl/how-it-works", "/sl/sign-in"];
const categories = ["performance", "accessibility", "best-practices", "seo"];
const [mobileDirectory, desktopDirectory] = process.argv.slice(2);

if (!mobileDirectory || !desktopDirectory) {
  throw new Error(
    "Usage: node scripts/assert-lighthouse-public-median.mjs <mobile-report-dir> <desktop-report-dir>",
  );
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function readReports(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const reports = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".report.json")) continue;
    const filename = path.join(directory, entry.name);
    const parsed = JSON.parse(await readFile(filename, "utf8"));
    const report = parsed.lighthouseResult ?? parsed;
    const pathname = new URL(report.finalUrl).pathname;
    reports.push({ filename, pathname, report });
  }
  return reports;
}

function assertProfile(name, reports) {
  for (const route of routes) {
    const routeReports = reports.filter((candidate) => candidate.pathname === route);
    if (routeReports.length !== 3) {
      throw new Error(`${name} ${route}: expected 3 JSON reports, found ${routeReports.length}`);
    }

    const summary = categories.map((category) => {
      const scores = routeReports.map(
        (candidate) => candidate.report.categories?.[category]?.score,
      );
      if (scores.some((score) => typeof score !== "number")) {
        throw new Error(`${name} ${route}: missing ${category} score`);
      }
      const result = median(scores);
      if (result < 1) {
        throw new Error(
          `${name} ${route}: ${category} median ${result}; samples ${scores.join(", ")}`,
        );
      }
      return `${category}=1`;
    });
    console.log(`${name} ${route}: ${summary.join(" ")}`);
  }
}

const [mobileReports, desktopReports] = await Promise.all([
  readReports(mobileDirectory),
  readReports(desktopDirectory),
]);

assertProfile("mobile", mobileReports);
assertProfile("desktop", desktopReports);
console.log("Public Lighthouse category medians are 100 for every required route and profile.");
