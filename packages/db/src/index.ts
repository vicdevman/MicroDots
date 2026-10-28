import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export function createDb(url: string) {
  const client = postgres(url, {
    max: 10,
    prepare: false,
    onnotice: () => undefined,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type DbHandle = ReturnType<typeof createDb>;

export async function ping(handle: DbHandle): Promise<void> {
  await handle.client`select 1`;
}

export async function closeDb(handle: DbHandle): Promise<void> {
  await handle.client.end({ timeout: 5 });
}
