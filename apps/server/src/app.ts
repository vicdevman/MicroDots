import type { Env } from "@microdots/config";
import { closeDb, createDb, type DbHandle } from "@microdots/db";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./api/health.js";

export interface AppDependencies {
  db?: DbHandle;
}

export async function buildApp(
  env: Env,
  dependencies: AppDependencies = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.MICRODOTS_LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']",
          "*.token",
          "*.secret",
        ],
        censor: "[redacted]",
      },
    },
  });

  const db = dependencies.db ?? createDb(env.DATABASE_URL);

  if (dependencies.db === undefined) {
    app.addHook("onClose", async () => {
      await closeDb(db);
    });
  }

  await app.register(healthRoutes, { db });

  return app;
}
