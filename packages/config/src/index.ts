import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.url()]).transform((value) => value || undefined);

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_CONVEX_URL: optionalUrl.optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["sl", "en"]).default("sl"),
});

export const workerEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  WORKER_ID: z.string().min(1).default("worker-local"),
  WORKER_SHARED_SECRET: z.string().min(32).optional(),
  WORKER_CONVEX_HTTP_URL: optionalUrl.optional(),
  WORKER_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  WORKER_MAX_PAGES_PER_JOB: z.coerce.number().int().min(1).max(10_000).default(200),
  WORKER_MAX_RUNTIME_SECONDS: z.coerce.number().int().min(30).max(86_400).default(3_600),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_ROUTER: z
    .enum(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"])
    .default("gpt-5.6-luna"),
  OPENAI_MODEL_EXTRACTOR: z
    .enum(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"])
    .default("gpt-5.6-terra"),
  OPENAI_MODEL_SYNTHESIZER: z
    .enum(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"])
    .default("gpt-5.6-sol"),
  OPENAI_USD_TO_EUR_RATE: z.coerce.number().positive().optional(),
  WORKER_APPROVED_SOURCE_IDS: z.string().default(""),
  WORKER_ENABLE_PLAYWRIGHT_VERIFICATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export function parsePublicEnvironment(
  environment: Record<string, string | undefined>,
): PublicEnvironment {
  return publicEnvironmentSchema.parse(environment);
}

export function parseWorkerEnvironment(
  environment: Record<string, string | undefined>,
): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}
