import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "@microdots/config";
import { closeDb, createDb } from "@microdots/db";
import { expect, it } from "vitest";
import { buildApp } from "./app.js";

it("serves the web shell for client routes and JSON 404 for API routes", async () => {
  const webDist = await mkdtemp(join(tmpdir(), "microdots-web-"));
  const db = createDb("postgres://microdots:microdots@127.0.0.1:5432/microdots");

  await writeFile(join(webDist, "index.html"), "<!doctype html><title>MicroDots test</title>");

  const app = await buildApp(
    loadEnv({
      DATABASE_URL: "postgres://microdots:microdots@127.0.0.1:5432/microdots",
      MICRODOTS_ENV: "test",
      MICRODOTS_LOG_LEVEL: "error",
    }),
    { db, webDist },
  );

  try {
    const root = await app.inject({
      method: "GET",
      url: "/",
      headers: { accept: "text/html" },
    });
    expect(root.statusCode).toBe(200);
    expect(root.headers["content-type"]).toContain("text/html");
    expect(root.body).toContain("MicroDots test");

    const clientRoute = await app.inject({
      method: "GET",
      url: "/tasks/abc",
      headers: { accept: "text/html" },
    });
    expect(clientRoute.statusCode).toBe(200);
    expect(clientRoute.body).toContain("MicroDots test");

    const missingApi = await app.inject({
      method: "GET",
      url: "/api/does-not-exist",
      headers: { accept: "application/json" },
    });
    expect(missingApi.statusCode).toBe(404);
    expect(missingApi.json()).toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  } finally {
    await app.close();
    await closeDb(db);
    await rm(webDist, { recursive: true, force: true });
  }
});
