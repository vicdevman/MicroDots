import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Small, typed key/value store for instance state: ownership, versions,
 * last backup, and other singleton records. Domain tables arrive in M1/M2.
 */
export const systemState = pgTable("system_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
