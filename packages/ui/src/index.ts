export const TONES = ["neutral", "info", "success", "warning", "danger"] as const;

export type Tone = (typeof TONES)[number];

/**
 * Components and token values arrive with the visual design in M2. Tone names
 * are fixed now so status copy and future components share one vocabulary.
 */
