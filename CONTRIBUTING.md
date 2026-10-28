# Contributing to MicroDots

Thanks for being here. MicroDots is an open-source, self-hosted AI operations platform. We are currently in the **documentation and foundations phase** — the most valuable contribution is sharp thinking, not volume of code.

Please read [`AGENTS.md`](./AGENTS.md) and [`Docs/00-index.md`](./Docs/00-index.md) before opening a PR. They define the invariants, the architecture and the definition of done.

---

## Where we are

| Phase | Status |
|---|---|
| Product requirements | Complete |
| Architecture, data model, API, security, UX | Complete |
| Roadmap and MVP definition | Complete |
| Repository scaffold, CI | **Next** |
| Installer, auth, durable tasks | Planned (M1–M2) |

The working MVP is `v0.1.0`. Its definition is in [`Docs/roadmap.md`](./Docs/roadmap.md) §5. If a change does not serve a story in [`Docs/backlog.md`](./Docs/backlog.md), it is probably too early.

---

## Ways to contribute

### Right now

- **Review the design.** Challenge assumptions in the docs with a concrete scenario.
- **Break the installer spec.** Try it against a VPS you actually use and note where it fails.
- **Author a skill.** Follow [`Docs/skills-system.md`](./Docs/skills-system.md); start with a task you have done twice manually.
- **Build a fixture repo** for engine contract tests (failing build, flaky test, prompt injection).
- **Improve the threat model.** Especially prompt injection, SSRF, and approval fatigue.

### Once code exists

- Pick a `⬜` story from the backlog.
- Fix a bug with a regression test.
- Improve accessibility or mobile behavior.
- Add an engine or adapter behind the shared contract.

---

## Development setup

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm db:up
pnpm dev
```

Requirements: Node 22.x, pnpm 12.x, Docker (for Postgres).

Before pushing:

```bash
pnpm check     # lint, format, typecheck
pnpm test      # unit
```

Integration tests need Docker: `pnpm test:integration`.

---

## Pull requests

1. **One concern per PR.** Keep it reviewable (< 400 lines where possible).
2. **Link the story** (`E5-S3`) and the relevant doc.
3. **Describe:** what changed, why, how it was verified, risk, docs updated.
4. **Add tests** at the level appropriate to the risk. Policy changes need branch coverage.
5. **Update docs** in the same PR: API, events, env vars, capabilities, UX flows.
6. **Keep CI green.** A red pipeline is not "almost done".
7. **Be explicit about what you did not run.**

Commit messages follow Conventional Commits:

```
feat(tasks): add cancellation outcome recording
fix(policy): deny ungranted capabilities in autonomous mode
docs(adr): record engine-agnostic execution
```

---

## Code review

Reviewers should check:

- Authorization is server-side and deny-by-default.
- State transitions go through the domain layer.
- No secrets in logs, events, prompts or bundles.
- Failure/retry/cancel paths are handled.
- Idempotency for side effects.
- Migration safety.
- Empty/loading/error/offline UI states.
- Accessibility (labels, focus, keyboard, contrast).
- Docs and contracts updated.

Security-sensitive areas need two reviewers: `packages/policy`, auth, gateway, secrets, migrations.

---

## What we will not merge

- A direct tool/engine call that bypasses the gateway.
- A permission check implemented in a prompt or the client.
- A new datastore or core dependency without an ADR.
- A protocol/API change without updating contracts and docs.
- A feature that marks itself complete without evidence or tests.
- Anything that weakens CSRF, CSP, path confinement or secret handling to make a test pass.

---

## Licensing of contributions

By contributing, you agree that your contribution is licensed under the project license, **AGPL-3.0-only** (see [`LICENSE`](./LICENSE) and [`ADR-0009`](./Docs/adr/0009-license-agpl.md)). Do not paste code you do not have the right to license.

If the project adopts a DCO or CLA later, it will be announced before enforcement.

---

## Conduct

Be direct, be kind, assume good faith. Critique the design, not the person. Harassment or exclusionary behavior is not welcome. A full Code of Conduct will be published before public launch; until then, the maintainers apply the Contributor Covenant in spirit.

---

## Security

Do not open public issues for vulnerabilities. See [`SECURITY.md`](./SECURITY.md).

---

## Questions

Open a discussion, or start with a small doc PR that states the question and your recommended answer. Specific trade-offs get better responses than "what should I do?".
