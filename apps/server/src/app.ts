import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import type { Env } from "@microdots/config";
import { closeDb, createDb, type DbHandle } from "@microdots/db";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./api/health.js";

export interface AppDependencies {
  db?: DbHandle;
  webDist?: string;
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

  const webDist = dependencies.webDist ?? fileURLToPath(new URL("../../web/dist", import.meta.url));
  const hasWebBuild = existsSync(webDist);

  if (hasWebBuild) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: "/",
    });
  }

  app.setNotFoundHandler((request, reply) => {
    const acceptsHtml = request.headers.accept?.includes("text/html") ?? false;
    const isApiPath =
      request.url.startsWith("/api") ||
      request.url.startsWith("/healthz") ||
      request.url.startsWith("/readyz");

    if (hasWebBuild && request.method === "GET" && acceptsHtml && !isApiPath) {
      return reply.type("text/html; charset=utf-8").sendFile("index.html");
    }

    return reply.code(404).send({
      error: {
        code: "not_found",
        message: "Not found",
      },
    });
  });

  return app;
}
