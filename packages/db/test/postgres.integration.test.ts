import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { expect, it } from "vitest";
import { closeDb, createDb, ping } from "../src/index.js";

it("connects to a real Postgres instance", async () => {
  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("microdots")
    .start();

  const handle = createDb(container.getConnectionUri());

  try {
    await expect(ping(handle)).resolves.toBeUndefined();
  } finally {
    await closeDb(handle);
    await container.stop();
  }
}, 120_000);
