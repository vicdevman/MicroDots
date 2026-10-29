#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const envPath = fileURLToPath(new URL("../.env", import.meta.url));

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const domain = argument("--domain");
const email = argument("--email");

if (!domain || !email) {
  console.error("Usage: node scripts/generate-env.mjs --domain <host> --email <address>");
  process.exit(1);
}

if (existsSync(envPath)) {
  console.log(".env already exists; leaving it unchanged so secrets are not rotated.");
  process.exit(0);
}

const values = [
  `MICRODOTS_DOMAIN=${domain}`,
  `ACME_EMAIL=${email}`,
  `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`,
  `MICRODOTS_SESSION_SECRET=${randomBytes(32).toString("hex")}`,
  "MICRODOTS_DEFAULT_MODE=balanced",
  "MICRODOTS_TELEMETRY=off",
  "MICRODOTS_LOG_LEVEL=info",
  "",
];

await writeFile(envPath, values.join("\n"), { mode: 0o600 });
await chmod(envPath, 0o600);
console.log(
  `Wrote .env (0600) in ${root}. The container generates the master key and setup token on first boot.`,
);
