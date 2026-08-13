import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clean expired worker protocol records",
  { minutes: 60 },
  internal.worker.cleanupExpiredProtocolRecords,
  {},
);

crons.interval(
  "queue due saved-search monitoring",
  { minutes: 60 },
  internal.monitoring.queueDueSavedSearches,
  {},
);

crons.interval(
  "dispatch pending saved-search email alerts",
  { minutes: 5 },
  internal.alerts.dispatchPendingEmailAlerts,
  {},
);

export default crons;
