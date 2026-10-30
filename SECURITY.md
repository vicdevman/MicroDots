# Security Policy

MicroDots can access source code, credentials, websites and infrastructure. We take reports seriously and prefer private disclosure.

---

## Reporting a vulnerability

**Do not open a public issue, PR or discussion for a security vulnerability.**

Send a private report to **security@microdots.dev** (placeholder until launch; replace with the monitored address before public release).

Include:

- affected version or commit,
- a description of the issue and its impact,
- reproduction steps or a proof of concept,
- whether the issue is already public,
- your preferred credit (name/handle or anonymous).

If you cannot use email, open a minimal GitHub security advisory draft without details and ask for a private channel.

---

## What to expect

| Stage | Target |
|---|---|
| Acknowledgement | within 72 hours |
| Initial assessment and severity | within 7 days |
| Fix or mitigation for critical issues | within 14 days |
| Coordinated disclosure | by agreement, usually after a fix ships |

We will keep you informed, credit you unless you prefer otherwise, and not take legal action against good-faith research.

---

## Scope

In scope:

- Authentication, sessions, passkeys, setup flow, API tokens.
- Authorization, policy bypass, approval replay or scope confusion.
- Secret exposure in API responses, logs, events, prompts or the client bundle.
- Path traversal, symlink escape, workspace escape.
- SSRF, DNS rebinding, metadata endpoint access.
- Sandbox escape or privilege escalation from a native execution unit or an optional container.
- Abuse of the privileged `microdots-exec` helper (path/argv validation, profile limits, peer credentials).
- Prompt injection that causes an unauthorized tool execution.
- Supply chain issues in bundled skills, engines or dependencies.
- Cross-project or cross-user data access.

Out of scope:

- Vulnerabilities in third-party model providers or Git hosts.
- Social engineering of the instance owner.
- Denial of service from an authenticated owner exhausting their own resources (report as a bug, not a CVE).
- Issues requiring root/shell access to the host (that is already game over).
- Self-XSS or missing headers without a demonstrated impact.
- Reports generated solely by automated scanners without a plausible exploit path.

---

## Safe harbor

We support good-faith security research that:

- uses a test instance you own or are authorized to test,
- does not access, modify or exfiltrate other people's data,
- does not degrade service for others,
- does not use social engineering against maintainers or users,
- gives us reasonable time to fix before disclosure.

If in doubt, ask first.

---

## Hardening expectations for operators

- Use HTTPS with a valid certificate; passkeys and web push require it.
- Keep the host patched; enable unattended upgrades.
- Restrict SSH to keys and a non-root user.
- Expose only the proxy ports (or use a tunnel); never expose the helper socket, Postgres or execution ports.
- Keep a host reserve and an operator-owned MicroDots budget; do not run two heavy executions on a 4 GB / 1 vCPU host.
- Back up regularly and store the backup passphrase separately from the backup.
- Treat the master key as the most sensitive file on the instance.
- Review approvals; do not grant capabilities you do not understand.
- Run `microdots doctor` after upgrades and check for orphan execution units.

See [`Docs/security-and-auth.md`](./Docs/security-and-auth.md) for the full model.

---

## Supported versions

| Version | Supported |
|---|---|
| `main` (pre-release) | Best effort |
| Latest `0.x` release | Yes |
| Previous `0.x` minor | Security fixes only |
| Older | No |

Before `v1.0`, only the latest release receives security fixes. Upgrade guidance is in [`Docs/installer-and-operations.md`](./Docs/installer-and-operations.md) §8.
