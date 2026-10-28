export type ProviderKind = "openai-compatible" | "anthropic" | "google" | "openrouter" | "ollama";

export interface ProviderDescriptor {
  id: string;
  name: string;
  kind: ProviderKind;
}

/**
 * Provider execution is added with the AI SDK integration in M3. The registry
 * is deliberately transport-free at this stage.
 */
export interface ProviderRegistry {
  list(): readonly ProviderDescriptor[];
}
