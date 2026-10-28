import { describe, expect, it } from "vitest";
import { CORE_CAPABILITIES, TaskStatusSchema } from "../src/index.js";

describe("contracts", () => {
  it("accepts every documented task status", () => {
    for (const status of TaskStatusSchema.options) {
      expect(TaskStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects an unknown task status", () => {
    expect(TaskStatusSchema.safeParse("not-a-status").success).toBe(false);
  });

  it("keeps capability ids unique", () => {
    expect(new Set(CORE_CAPABILITIES).size).toBe(CORE_CAPABILITIES.length);
  });
});
