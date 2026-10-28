import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
const ENVIRONMENTS = ["development", "test", "production"] as const;
const MODES = ["restricted", "balanced", "autonomous"] as const;

const baseSchema = z.object({
  MICRODOTS_ENV: z.enum(ENVIRONMENTS).default("development"),
  MICRODOTS_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),
  MICRODOTS_MASTER_KEY_FILE: z.string().min(1).default("/data/secrets/master.key"),
  MICRODOTS_SETUP_TOKEN_FILE: z.string().min(1).default("/data/secrets/setup-token"),
  MICRODOTS_SESSION_SECRET: z.string().min(32).optional(),
  MICRODOTS_WORKSPACE_ROOT: z.string().min(1).default("/workspaces"),
  MICRODOTS_ARTIFACT_ROOT: z.string().min(1).default("/data/artifacts"),
  MICRODOTS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  MICRODOTS_TASK_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(1_800_000),
  MICRODOTS_DEFAULT_MODE: z.enum(MODES).default("balanced"),
  MICRODOTS_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  MICRODOTS_VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  MICRODOTS_LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  MICRODOTS_TELEMETRY: z.enum(["off", "anonymous"]).default("off"),
});

export const envSchema = baseSchema.superRefine((env, context) => {
  if (env.MICRODOTS_ENV === "production" && env.MICRODOTS_SESSION_SECRET === undefined) {
    context.addIssue({
      code: "custom",
      path: ["MICRODOTS_SESSION_SECRET"],
      message: "MICRODOTS_SESSION_SECRET is required in production",
    });
  }

  if (
    (env.MICRODOTS_VAPID_PUBLIC_KEY === undefined) !==
    (env.MICRODOTS_VAPID_PRIVATE_KEY === undefined)
  ) {
    context.addIssue({
      code: "custom",
      path: ["MICRODOTS_VAPID_PUBLIC_KEY"],
      message: "VAPID public and private keys must be set together",
    });
  }
});

export type Env = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");

    throw new ConfigError(`Invalid configuration:\n${details}`);
  }

  return parsed.data;
}
