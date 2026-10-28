import "./load-env.js";
import { loadEnv } from "@microdots/config";
import pino from "pino";

const env = loadEnv();
const logger = pino({ level: env.MICRODOTS_LOG_LEVEL });

// M0 ships an idle worker. Consumers arrive after the policy/gateway milestone.
const keepAlive = setInterval(() => undefined, 60_000);

const shutdown = (signal: string): void => {
  clearInterval(keepAlive);
  logger.info({ signal }, "worker stopping");
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

logger.info({ milestone: "M0", concurrency: env.MICRODOTS_WORKER_CONCURRENCY }, "worker ready");
