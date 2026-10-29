import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { expect, it } from "vitest";
import { closeDb, createDb, ping, runMigrations } from "../src/index.js";

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

it("applies migrations idempotently behind the advisory lock", async () => {
  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("microdots")
    .start();

  try {
    await runMigrations(container.getConnectionUri());
    await runMigrations(container.getConnectionUri());

    const handle = createDb(container.getConnectionUri());

    try {
      const result = await handle.client<{ table: string | null }[]>`
        select to_regclass('public.system_state')::text as table
      `;

      expect(result[0]?.table).toBe("system_state");
    } finally {
      await closeDb(handle);
    }
  } finally {
    await container.stop();
  }
}, 120_000);
