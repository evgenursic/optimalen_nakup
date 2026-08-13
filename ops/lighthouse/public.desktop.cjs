const path = require("node:path");

const baseUrl = (process.env.LHCI_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        budgets: require("./budget.json"),
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
        preset: "desktop",
        throttlingMethod: "simulate",
      },
      url: [
        `${baseUrl}/sl`,
        `${baseUrl}/sl/pricing`,
        `${baseUrl}/sl/how-it-works`,
        `${baseUrl}/sl/sign-in`,
      ],
    },
    assert: {
      aggregationMethod: "median",
      assertions: {
        // LHCI applies category minScore to every sample even when the assertion aggregation is
        // configured as median. The workflow's explicit median assertion checks the agreed gate.
        "categories:accessibility": ["error", { minScore: 0 }],
        "categories:best-practices": ["error", { minScore: 0 }],
        "categories:performance": ["error", { minScore: 0 }],
        "categories:seo": ["error", { minScore: 0 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 174080 }],
        "resource-summary:stylesheet:size": ["error", { maxNumericValue: 51200 }],
      },
    },
    upload: {
      outputDir: path.resolve("lighthouse-reports/public-desktop"),
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%",
      target: "filesystem",
    },
  },
};
