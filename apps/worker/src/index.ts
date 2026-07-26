import { createServer } from "node:http";

import { parseWorkerEnvironment } from "@optimalen-nakup/config";
import pino from "pino";

const environment = parseWorkerEnvironment(process.env);
const logger = pino({
  level: environment.LOG_LEVEL,
  base: {
    service: "research-worker",
    workerId: environment.WORKER_ID,
    version: process.env.APP_VERSION ?? "development",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.apiKey",
      "*.secret",
      "*.token",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
});

const port = Number(process.env.PORT ?? 3_001);
let shuttingDown = false;

const server = createServer((request, response) => {
  const path = request.url
    ? new URL(request.url, `http://${request.headers.host ?? "localhost"}`)
    : null;

  if (path?.pathname === "/health") {
    response.writeHead(shuttingDown ? 503 : 200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: shuttingDown ? "stopping" : "ok",
        service: "research-worker",
        workerId: environment.WORKER_ID,
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "worker health server started");
});

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "worker is shutting down gracefully");
  server.close((error) => {
    if (error) {
      logger.error({ error }, "worker shutdown failed");
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
