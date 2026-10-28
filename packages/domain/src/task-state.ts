import type { TaskStatus } from "@microdots/contracts";

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ["queued", "cancelled"],
  queued: ["running", "cancelled", "failed"],
  running: [
    "waiting_approval",
    "waiting_input",
    "blocked",
    "retrying",
    "completed",
    "failed",
    "cancelled",
  ],
  waiting_approval: ["running", "blocked", "cancelled", "failed"],
  waiting_input: ["running", "blocked", "cancelled", "failed"],
  blocked: ["queued", "failed", "cancelled"],
  retrying: ["queued", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export class InvalidStateTransition extends Error {
  readonly from: TaskStatus;
  readonly to: TaskStatus;

  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Illegal task transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransition";
    this.from = from;
    this.to = to;
  }
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransition(from, to);
  }
}

export function transition(from: TaskStatus, to: TaskStatus): TaskStatus {
  assertTransition(from, to);
  return to;
}
