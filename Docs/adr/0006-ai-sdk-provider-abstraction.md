# ADR-0006: AI SDK provider abstraction

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** AI, backend

---

## Context

The orchestrator and workers need model access. Providers differ in APIs, tool-calling formats, streaming, structured output and pricing. The PRD requires provider abstraction and per-worker model configuration (`§22.4`). Self-hosted users may use OpenAI-compatible endpoints, Anthropic, Google, OpenRouter or a local Ollama.

Options:

1. **One provider SDK** (e.g. OpenAI) with compatibility shims.
2. **A custom provider interface** per vendor.
3. **Vercel AI SDK** as the common interface.
4. **LangChain / LlamaIndex.**

## Decision

Use the **Vercel AI SDK (`ai`)** as the provider abstraction, with:

- A registry of providers configured by the owner (no default key, no hidden vendor).
- Per-worker model binding (`model_provider_id` + `model`).
- Structured output via Zod schemas; streaming via the AI SDK's data stream.
- Token and cost accounting normalized in `usage_record`.
- Provider-specific quirks isolated in `packages/ai/providers/*`.

Supported at v0.1: any OpenAI-compatible endpoint, Anthropic, Google, OpenRouter, Ollama.

## Consequences

**Positive**

- One loop, many providers; switching is configuration, not code.
- Tool calling and structured output are already normalized.
- Local models via Ollama are possible without a rewrite.
- The orchestrator and workers share the same primitives.

**Negative**

- Abstraction lags provider-specific features (e.g. novel caching or reasoning controls).
- AI SDK major versions can break APIs; pinned and tested.
- Cost accounting relies on provider-reported usage; not all providers report it (mark `measured: false`).
- Prompt behavior varies by model; requires a regression suite, not just unit tests.

**Neutral**

- No fine-tuning, no self-hosted inference in v1.
- Provider failover is a config option, not an automatic guarantee.

## Guardrails

- No provider key in the client bundle or logs.
- No prompt contains secrets.
- Model output is never authority; tools still pass through the gateway.
- Budget check before each call and after usage reporting.
- Prompt changes require a regression run against the plan schema.

## Alternatives rejected

- **Single provider SDK:** locks the product to one vendor and undermines self-hosting.
- **Custom per-vendor adapters:** duplicates streaming/tool/structured-output logic; high maintenance.
- **LangChain/LlamaIndex:** opaque control flow and heavy abstractions for a small, explicit orchestration loop.

## References

- [`technical-architecture.md`](../technical-architecture.md) §3, §8
- [`extensibility-and-modules.md`](../extensibility-and-modules.md) §3.4
- [`data-model.md`](../data-model.md) §4.5
