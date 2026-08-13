const path = require("node:path");

const baseUrl = (process.env.LHCI_BASE_URL || "").replace(/\/$/, "");
const jobId = process.env.E2E_EXISTING_JOB_ID || "";
if (!baseUrl || !jobId) {
  throw new Error("LHCI_BASE_URL and E2E_EXISTING_JOB_ID are required.");
}

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      puppeteerScript: path.resolve("ops/lighthouse/restore-auth-state.cjs"),
      settings: {
        budgets: require("./budget.json"),
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
        formFactor: "mobile",
        screenEmulation: {
          disabled: false,
          height: 823,
          mobile: true,
          width: 412,
          deviceScaleFactor: 2.625,
        },
        throttlingMethod: "simulate",
      },
      url: [`${baseUrl}/sl/app/research/${encodeURIComponent(jobId)}`],
    },
    assert: {
      aggregationMethod: "median",
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:performance": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 174080 }],
        "resource-summary:stylesheet:size": ["error", { maxNumericValue: 51200 }],
      },
    },
    upload: {
      outputDir: path.resolve("lighthouse-reports/authenticated-mobile"),
      reportFilenamePattern: "research-results-%%DATETIME%%.report.%%EXTENSION%%",
      target: "filesystem",
    },
  },
};
