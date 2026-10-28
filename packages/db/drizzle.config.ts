import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
