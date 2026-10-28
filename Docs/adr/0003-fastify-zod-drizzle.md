# ADR-0003: Fastify + Zod + Drizzle

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Backend

---

## Context

The backend must expose a versioned HTTP API, stream SSE, validate untrusted input, enforce authorization, and evolve a relational schema safely. It runs as a single Node process plus a worker.

Options for the API: Express, Fastify, NestJS, Hono, tRPC.
Options for validation: Zod, TypeBox, io-ts, JSON Schema.
Options for the ORM: Prisma, Drizzle, Kysely, raw SQL.

## Decision

- **Fastify 5** for HTTP, with schema-first routes and first-class SSE support.
- **Zod 4** for all input/output validation and shared contract types.
- **Drizzle ORM** with SQL migrations for persistence.

## Consequences

**Positive**

- Fastify is fast, stable, and has a small API surface; plugins cover auth, rate limits, CORS and SSE.
- Zod schemas are shared with the web client, eliminating DTO drift.
- Drizzle keeps SQL visible, supports CTEs/advisory locks/partial indexes, and generates typed queries without a heavy runtime.
- OpenAPI can be generated from the same schemas.

**Negative**

- Zod → JSON Schema conversion has edge cases; OpenAPI generation needs tests.
- Drizzle is less batteries-included than Prisma; migrations require review.
- Fastify's plugin encapsulation must be understood to avoid hidden coupling.

**Neutral**

- Kysely is a viable alternative if Drizzle's migration ergonomics disappoint; the repository layer isolates it.
- No GraphQL, no tRPC: the API is public and must serve a future native client.

## Guardrails

- No raw SQL in routes; repositories only.
- Every route declares request/response schemas.
- Zod schemas live in `packages/contracts`, not duplicated.
- Database access only through `packages/db`; domain stays I/O-free.

## Alternatives rejected

- **Express:** weaker typing, slower, SSE plumbing is manual.
- **NestJS:** decorator/DI overhead for a modular monolith of this size.
- **tRPC:** couples client and server; incompatible with a versioned public API for mobile and integrations.
- **Prisma:** generated client weight and less SQL control for partial indexes, advisory locks and event sequencing.

## References

- [`technical-architecture.md`](../technical-architecture.md) §3
- [`api-contracts.md`](../api-contracts.md) §1
