import { createServer } from "node:http";

import { OpenAiEvidenceProvider } from "@optimalen-nakup/ai";
import { parseWorkerEnvironment } from "@optimalen-nakup/config";
import pino from "pino";

import { WorkerProtocolClient } from "./protocol.js";
import { ResearchRunner } from "./research-runner.js";

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
const serviceController = new AbortController();
const workerBaseUrl = environment.WORKER_CONVEX_HTTP_URL;
const workerSharedSecret = environment.WORKER_SHARED_SECRET;
const workerConfigured = Boolean(workerBaseUrl && workerSharedSecret);
let runnerPromise: Promise<void> | null = null;

const server = createServer((request, response) => {
  const path = request.url
    ? new URL(request.url, `http://${request.headers.host ?? "localhost"}`)
    : null;

  if (path?.pathname === "/health") {
    const healthy = !shuttingDown && (environment.NODE_ENV !== "production" || workerConfigured);
    response.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: shuttingDown ? "stopping" : healthy ? "ok" : "not_configured",
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

if (workerBaseUrl && workerSharedSecret) {
  const protocol = new WorkerProtocolClient({
    baseUrl: workerBaseUrl,
    workerId: environment.WORKER_ID,
    sharedSecret: workerSharedSecret,
  });
  const ai =
    environment.OPENAI_API_KEY && environment.OPENAI_USD_TO_EUR_RATE
      ? new OpenAiEvidenceProvider({
          apiKey: environment.OPENAI_API_KEY,
          routerModel: environment.OPENAI_MODEL_ROUTER,
          extractorModel: environment.OPENAI_MODEL_EXTRACTOR,
          synthesizerModel: environment.OPENAI_MODEL_SYNTHESIZER,
        })
      : null;
  if (environment.OPENAI_API_KEY && !environment.OPENAI_USD_TO_EUR_RATE) {
    logger.error(
      "OPENAI_USD_TO_EUR_RATE is required for cost-bounded AI calls; AI routing is disabled",
    );
  }
  const runner = new ResearchRunner({ environment, protocol, logger, ai });
  runnerPromise = runner.run(serviceController.signal);
  void runnerPromise.catch((error: unknown) => {
    logger.fatal({ error }, "research runner stopped unexpectedly");
    process.exitCode = 1;
  });
} else {
  logger.warn("worker protocol is not configured; only the health endpoint is active");
}

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  serviceController.abort(new Error(signal));
  logger.info({ signal }, "worker is shutting down gracefully");
  server.close((error) => {
    if (error) {
      logger.error({ error }, "worker shutdown failed");
      process.exitCode = 1;
    }
  });
  if (runnerPromise) {
    void runnerPromise.finally(() => {
      logger.info("research runner stopped");
    });
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
