import "./load-env.js";
import { loadEnv } from "@microdots/config";
import { runMigrations } from "@microdots/db";
import { buildApp } from "./app.js";

const env = loadEnv();
const app = await buildApp(env);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "api stopping");
  await app.close();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await runMigrations(env.DATABASE_URL);
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
} catch (error) {
  app.log.error({ err: error }, "api failed to start");
  process.exitCode = 1;
  await app.close();
}
