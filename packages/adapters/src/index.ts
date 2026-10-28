export type IntegrationKind = "mcp" | "cli" | "api" | "browser_profile";

export type AdapterHealthStatus = "ok" | "degraded" | "unavailable";

export interface AdapterHealth {
  status: AdapterHealthStatus;
  message?: string;
  checkedAt: string;
}

export interface AdapterDescriptor {
  id: string;
  name: string;
  version: string;
  kind: IntegrationKind;
}

/**
 * The full integration contract (capability declarations, execution and
 * result mapping) lands with the adapter seam in M6/M7.
 */
export interface IntegrationAdapter {
  readonly descriptor: AdapterDescriptor;
  health(): Promise<AdapterHealth>;
}
