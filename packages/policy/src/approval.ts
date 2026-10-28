import type { OperatingMode, RiskClass } from "@microdots/contracts";

export type ApprovalDecision = "allow" | "approve" | "deny";

const APPROVAL_MATRIX: Record<RiskClass, Record<OperatingMode, ApprovalDecision>> = {
  R0: { restricted: "allow", balanced: "allow", autonomous: "allow" },
  R1: { restricted: "approve", balanced: "allow", autonomous: "allow" },
  R2: { restricted: "approve", balanced: "approve", autonomous: "allow" },
  R3: { restricted: "approve", balanced: "approve", autonomous: "approve" },
  R4: { restricted: "deny", balanced: "deny", autonomous: "deny" },
};

/**
 * The routine interruption level for a risk class in an operating mode.
 * This is only one input to the policy evaluator: grants are checked first,
 * and R4 stays denied in every mode.
 */
export function approvalFor(risk: RiskClass, mode: OperatingMode): ApprovalDecision {
  return APPROVAL_MATRIX[risk][mode];
}
