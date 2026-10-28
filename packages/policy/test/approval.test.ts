import { describe, expect, it } from "vitest";
import { approvalFor } from "../src/index.js";

describe("approval matrix", () => {
  it("allows R0 in every mode", () => {
    expect(approvalFor("R0", "restricted")).toBe("allow");
    expect(approvalFor("R0", "balanced")).toBe("allow");
    expect(approvalFor("R0", "autonomous")).toBe("allow");
  });

  it("requires approval for R1 in restricted mode only", () => {
    expect(approvalFor("R1", "restricted")).toBe("approve");
    expect(approvalFor("R1", "balanced")).toBe("allow");
    expect(approvalFor("R1", "autonomous")).toBe("allow");
  });

  it("requires approval for R2 outside autonomous mode", () => {
    expect(approvalFor("R2", "restricted")).toBe("approve");
    expect(approvalFor("R2", "balanced")).toBe("approve");
    expect(approvalFor("R2", "autonomous")).toBe("allow");
  });

  it("requires approval for R3 in every mode", () => {
    expect(approvalFor("R3", "restricted")).toBe("approve");
    expect(approvalFor("R3", "balanced")).toBe("approve");
    expect(approvalFor("R3", "autonomous")).toBe("approve");
  });

  it("denies R4 in every mode", () => {
    expect(approvalFor("R4", "restricted")).toBe("deny");
    expect(approvalFor("R4", "balanced")).toBe("deny");
    expect(approvalFor("R4", "autonomous")).toBe("deny");
  });
});
