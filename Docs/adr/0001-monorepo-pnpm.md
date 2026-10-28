# ADR-0001: Monorepo with pnpm workspaces

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Project lead, architecture

---

## Context

MicroDots ships a backend, a PWA, shared contracts, a policy engine, database schema, engine adapters, an installer and documentation. These pieces evolve together: an API change touches the server, the client, the contracts package and the docs in one PR.

Options considered:

1. **Polyrepo** — separate repositories per component.
2. **Monorepo with Turborepo/Nx** — caching and task orchestration.
3. **Monorepo with pnpm workspaces only** — native, minimal, no extra config.

## Decision

Use a single monorepo with **pnpm workspaces**. Do not add Turborepo, Nx or Lerna in v1.

- `apps/server`, `apps/web`
- `packages/contracts`, `domain`, `policy`, `db`, `engines`, `adapters`, `ai`, `ui`, `config`
- `deploy/`, `skills/`, `Docs/`, `tests/e2e/`

Packages are referenced with the `workspace:*` protocol and built via `pnpm -r`.

## Consequences

**Positive**

- Atomic changes across API, client, schema and docs.
- One lockfile, one Node version, one CI pipeline.
- Shared Zod schemas prevent client/server drift.
- Onboarding is one clone and one install.

**Negative**

- CI must be selective or it grows with the repo.
- Package boundaries require discipline (enforced by lint).
- A single version tag releases everything, even unchanged packages.

**Neutral**

- pnpm's strict node_modules surfaces undeclared dependencies early.
- If build times exceed ~2 minutes, introduce Turborepo with a measured ADR — not preemptively.

## Alternatives rejected

- **Polyrepo:** version skew and cross-repo PRs would slow the MVP; the product is one deployable, not a suite.
- **Nx/Turborepo now:** unnecessary complexity before there is a measured caching problem.
- **npm/yarn workspaces:** pnpm is faster and stricter; no functional gap.

## References

- [`technical-architecture.md`](../technical-architecture.md) §4
- [`engineering-guide.md`](../engineering-guide.md) §2
