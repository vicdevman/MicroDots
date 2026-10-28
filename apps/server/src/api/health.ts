import { HealthResponseSchema, ReadinessResponseSchema } from "@microdots/contracts";
import type { DbHandle } from "@microdots/db";
import { ping } from "@microdots/db";
import type { FastifyPluginAsync } from "fastify";
import { VERSION } from "../version.js";

interface HealthRouteOptions {
  db: DbHandle;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (app, options) => {
  app.get("/healthz", async () =>
    HealthResponseSchema.parse({
      status: "ok",
      version: VERSION,
    }),
  );

  app.get("/readyz", async (_request, reply) => {
    try {
      await ping(options.db);
      return ReadinessResponseSchema.parse({
        status: "ok",
        checks: { database: "ok" },
      });
    } catch {
      reply.code(503);
      return ReadinessResponseSchema.parse({
        status: "degraded",
        checks: { database: "failed" },
      });
    }
  });
};
