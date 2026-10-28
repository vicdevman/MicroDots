import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageAliases = {
  "@microdots/contracts": "./packages/contracts/src/index.ts",
  "@microdots/domain": "./packages/domain/src/index.ts",
  "@microdots/policy": "./packages/policy/src/index.ts",
  "@microdots/config": "./packages/config/src/index.ts",
  "@microdots/db": "./packages/db/src/index.ts",
  "@microdots/engines": "./packages/engines/src/index.ts",
  "@microdots/adapters": "./packages/adapters/src/index.ts",
  "@microdots/ai": "./packages/ai/src/index.ts",
  "@microdots/ui": "./packages/ui/src/index.ts",
} as const;

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      Object.entries(packageAliases).map(([name, path]) => [
        name,
        fileURLToPath(new URL(path, import.meta.url)),
      ]),
    ),
  },
  test: {
    environment: "node",
    include: ["packages/**/test/**/*.integration.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
