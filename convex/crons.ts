import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clean expired worker protocol records",
  { minutes: 60 },
  internal.worker.cleanupExpiredProtocolRecords,
  {},
);

export default crons;
