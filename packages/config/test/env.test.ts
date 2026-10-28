import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/index.js";

describe("configuration", () => {
  it("parses the committed .env.example", () => {
    const example = parseEnv(
      readFileSync(new URL("../../../.env.example", import.meta.url), "utf8"),
    );
    const env = loadEnv(example);

    expect(env.MICRODOTS_ENV).toBe("development");
    expect(env.MICRODOTS_DEFAULT_MODE).toBe("balanced");
    expect(env.MICRODOTS_TELEMETRY).toBe("off");
  });

  it("fails fast with a readable message when required config is missing", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it("requires a session secret in production", () => {
    expect(() =>
      loadEnv({
        MICRODOTS_ENV: "production",
        DATABASE_URL: "postgres://user:pass@db:5432/microdots",
      }),
    ).toThrow(/MICRODOTS_SESSION_SECRET/);
  });

  it("rejects a non-postgres database URL", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "mysql://user:pass@db:3306/microdots",
      }),
    ).toThrow(/postgres/);
  });
});
