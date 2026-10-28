import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  InvalidStateTransition,
  transition,
} from "../src/index.js";

describe("task state machine", () => {
  const allowed = [
    ["draft", "queued"],
    ["draft", "cancelled"],
    ["queued", "running"],
    ["running", "waiting_approval"],
    ["running", "waiting_input"],
    ["running", "blocked"],
    ["running", "retrying"],
    ["running", "completed"],
    ["waiting_approval", "running"],
    ["waiting_input", "running"],
    ["blocked", "queued"],
    ["retrying", "queued"],
  ] as const;

  const illegal = [
    ["draft", "running"],
    ["queued", "completed"],
    ["completed", "running"],
    ["failed", "queued"],
    ["cancelled", "queued"],
    ["waiting_approval", "completed"],
  ] as const;

  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(transition(from, to)).toBe(to);
  });

  it.each(illegal)("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidStateTransition);
  });

  it("treats terminal states as terminal", () => {
    for (const terminal of ["completed", "failed", "cancelled"] as const) {
      for (const target of ["queued", "running", "completed", "cancelled"] as const) {
        expect(canTransition(terminal, target)).toBe(false);
      }
    }
  });

  it("reports the attempted transition in the error", () => {
    try {
      assertTransition("draft", "running");
      throw new Error("expected a transition error");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidStateTransition);
      expect(error).toMatchObject({ from: "draft", to: "running" });
    }
  });
});
