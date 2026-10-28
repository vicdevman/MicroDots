import { z } from "zod";

export const TASK_STATUSES = [
  "draft",
  "queued",
  "running",
  "waiting_approval",
  "waiting_input",
  "blocked",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TaskStatusSchema = z.enum(TASK_STATUSES);

export const RISK_CLASSES = ["R0", "R1", "R2", "R3", "R4"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];
export const RiskClassSchema = z.enum(RISK_CLASSES);

export const OPERATING_MODES = ["restricted", "balanced", "autonomous"] as const;
export type OperatingMode = (typeof OPERATING_MODES)[number];
export const OperatingModeSchema = z.enum(OPERATING_MODES);

export const CORE_CAPABILITIES = [
  "project.fs.read",
  "project.fs.write",
  "project.exec",
  "project.exec.network",
  "project.git.read",
  "project.git.branch",
  "git.push",
  "net.fetch",
  "browser.use",
  "deploy.staging",
  "deploy.production",
  "secret.inject",
  "integration.use",
  "task.create",
  "task.cancel",
] as const;

export type CapabilityId = (typeof CORE_CAPABILITIES)[number];
export const CapabilityIdSchema = z.enum(CORE_CAPABILITIES);

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string().min(1),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ReadinessResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.record(z.string(), z.enum(["ok", "failed"])),
});

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
