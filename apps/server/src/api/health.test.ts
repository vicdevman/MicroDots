import { loadEnv } from "@microdots/config";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

const env = loadEnv({
  MICRODOTS_ENV: "test",
  DATABASE_URL: "postgres://microdots:microdots@127.0.0.1:5432/microdots_test",
  MICRODOTS_LOG_LEVEL: "fatal",
});

const app = await buildApp(env);

afterAll(async () => {
  await app.close();
});

describe("health routes", () => {
  it("returns liveness without touching the database", async () => {
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", version: "0.0.0" });
  });
});
