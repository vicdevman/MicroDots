export type EngineKind = "coding" | "research" | "browser" | "generic";

export type EngineHealthStatus = "ok" | "degraded" | "unavailable";

export interface EngineHealth {
  status: EngineHealthStatus;
  message?: string;
  checkedAt: string;
}

export interface EngineDescriptor {
  id: string;
  name: string;
  version: string;
  kind: EngineKind;
}

/**
 * The full execution surface (start, stream, cancel, timeout, error mapping)
 * lands with the engine contract harness in M5. Health is enough to prove the
 * module seam in M0 without committing to a transport early.
 */
export interface ExecutionEngine {
  readonly descriptor: EngineDescriptor;
  health(): Promise<EngineHealth>;
}
