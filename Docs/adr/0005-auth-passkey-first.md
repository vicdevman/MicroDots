# ADR-0005: Passkey-first authentication, single owner, CLI recovery

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Security, product

---

## Context

MicroDots runs on a user's own VPS, possibly with no mail server. Auth must be clean on first use, secure by default, and recoverable without a vendor. The PRD leaves the auth model open (`§33.5`) but requires backend-enforced authorization and a single-owner first deployment.

Options:

1. **Hosted identity provider** (Auth0, Clerk, Supabase Auth).
2. **Self-hosted auth library** (better-auth, Lucia, NextAuth).
3. **Custom sessions + WebAuthn.**

## Decision

Use **better-auth** with:

- **Passkey (WebAuthn) as the primary factor**, offered immediately after account creation.
- **Password as fallback** (scrypt via better-auth, minimum 12 characters).
- **TOTP optional** for password-only users.
- **Single owner per instance**; registration closed after claim.
- **No email dependency.** Recovery via a second passkey, recovery codes, or `microdots auth reset` from the host shell.
- **Server-side sessions** with an HttpOnly, Secure, SameSite=Lax cookie, rotation on login, per-device revocation.
- **Scoped API tokens** (hashed) for CLI and automation.

First-run claim requires a one-time token printed by the installer and stored at `/data/secrets/setup-token`.

## Consequences

**Positive**

- One tap to sign in on return; no password manager required.
- No email/SMTP dependency, which matters for self-hosting.
- Phishing-resistant primary factor.
- Sessions are revocable server-side; no JWT replay window.
- Recovery is possible without vendor support.
- Multi-user (v0.5) is additive: invitations and roles, same primitives.

**Negative**

- Passkeys require a secure context (HTTPS or localhost); LAN/IP mode is limited.
- Changing the domain invalidates passkeys (RP ID); documented and warned.
- Users who lose all devices need shell access to recover.
- better-auth is a relatively young dependency; mitigated by an adapter boundary and tests.

**Neutral**

- Web push and passkeys share the HTTPS requirement; the installer recommends a domain.
- OAuth and magic links can be added later without changing the session model.

## Security requirements

- Origin/Referer check on all mutating requests; SameSite=Lax; JSON content type.
- Rate limits and lockout on auth endpoints.
- Constant-time token comparison for setup.
- Session rotation on login and privilege change.
- Recovery codes stored hashed and single-use.
- Auth events audited with IP and user agent.
- No user enumeration in error messages.

## Alternatives rejected

- **Hosted IdP:** contradicts self-hosting and adds a required paid dependency.
- **NextAuth:** framework-coupled and session semantics are less explicit for a Fastify API.
- **Custom auth:** too easy to get WebAuthn, rotation and CSRF wrong; not a differentiator.
- **Email magic links as primary:** requires SMTP, which many self-hosted instances lack.

## References

- [`security-and-auth.md`](../security-and-auth.md) §4
- [`api-contracts.md`](../api-contracts.md) §2
- [`installer-and-operations.md`](../installer-and-operations.md) §3
