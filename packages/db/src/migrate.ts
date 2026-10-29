import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema.js";

const MIGRATION_LOCK_ID = 841273;
const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Apply forward-only migrations while holding a Postgres advisory lock.
 *
 * A single-connection pool keeps the lock and the migration statements on the
 * same session. A second app instance blocks here instead of racing the schema.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    onnotice: () => undefined,
  });

  try {
    await client`select pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    await migrate(drizzle(client, { schema }), { migrationsFolder });
  } finally {
    await client`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`.catch(() => undefined);
    await client.end({ timeout: 5 });
  }
}
