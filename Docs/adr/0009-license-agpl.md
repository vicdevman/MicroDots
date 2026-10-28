# ADR-0009: License — AGPL-3.0-only

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Owner
**Supersedes:** none

---

## Context

MicroDots is an open-source, self-hosted product. The license determines:

- whether a cloud provider can host a modified closed version,
- whether companies can adopt and contribute,
- how the community can share skills and extensions,
- and the project's long-term sustainability model.

The PRD left this open (`§28.4`, `§33.1`). The owner confirmed the license on 2026-10-28.

## Options

| License | Protects against closed SaaS forks | Corporate adoption | Ecosystem | OSI-approved |
|---|---|---|---|---|
| **AGPL-3.0** | Strong | Medium (some policies forbid it) | Good | Yes |
| Apache-2.0 | No | High | Excellent | Yes |
| MIT | No | Highest | Excellent | Yes |
| BSL / SSPL | Strong | Low | Poor | No |

## Decision

Adopt **AGPL-3.0-only** for the application, installer, engines and bundled skills. The full license text is in [`LICENSE`](../../LICENSE); package metadata uses the SPDX identifier `AGPL-3.0-only`.

Keep the door open to **Apache-2.0** for `packages/contracts` and a future plugin SDK, so third-party modules are not forced into copyleft. That split remains open as D17 in [`decisions.md`](../decisions.md); it is not part of this ADR.

## Rationale

- The product's value is the self-hosted system, not the model.
- AGPL prevents a provider from offering MicroDots-as-a-service without contributing changes, while preserving every freedom for self-hosting users.
- It matches the "own your infrastructure" positioning and discourages extractive forks.
- The main cost — corporate adoption — is acceptable for a technical, self-hosted product whose users are individuals and small studios.

## Consequences

**Positive**

- Hosted derivatives must publish modifications.
- Community contributions remain open.
- Aligns incentives with a sustainable open-source project.

**Negative**

- Some companies prohibit AGPL dependencies; they may not contribute or deploy internally without review.
- App-store distribution (future mobile) needs legal review of AGPL compatibility.
- Skills copied into other projects inherit copyleft, which may deter sharing.
- Changing the license later requires consent from all contributors (or a CLA).

**Neutral**

- Self-hosting, modification and internal use are unaffected.
- A commercial license can be offered later for exempt use, if desired.

## Implementation status

1. ✅ Owner confirmed AGPL-3.0-only.
2. ✅ Added [`LICENSE`](../../LICENSE) with the full text.
3. ⬜ Add SPDX headers or a `NOTICE` policy for source files (M0 scaffold sets package metadata; headers follow when source files land).
4. ✅ Stated the license in `README.md`, `package.json`, and the docs.
5. ⬜ Decide the SDK/contracts license (D17, Apache-2.0 recommended).
6. ✅ Documented the network-use obligation in plain language in [`README.md`](../../README.md#license).

## Alternatives rejected

- **MIT/Apache:** maximum adoption, but allows a closed hosted fork of the exact product.
- **BSL/SSPL:** not open source; contradicts the project's stated identity and community goals.

## References

- PRD §28.4, §33.1
- [`decisions.md`](../decisions.md) D1
