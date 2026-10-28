# ADR-0010: Local content-addressed artifact storage with an adapter

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Backend, infrastructure

---

## Context

Tasks produce diffs, logs, test reports, screenshots, research reports and files. The PRD requires artifacts to be associated with tasks and accessible from the client (`TSK-007`, `§23.13`), with safe storage and retention.

Options:

1. Store blobs in Postgres (`bytea`).
2. Local filesystem with content-addressed paths.
3. S3-compatible object storage from day one.
4. Git branches as the only artifact store.

## Decision

Use a **local filesystem, content-addressed by SHA-256**, behind an `ArtifactStore` interface.

- Path: `/data/artifacts/<sha256[0:2]>/<sha256[2:4]>/<sha256>`.
- Database stores metadata only (`artifact` row).
- Deduplicate by hash: identical content is stored once, even across tasks.
- Downloads are authenticated and path-validated; no public URLs.
- `ArtifactStore` has a single local implementation in v1; S3-compatible is a drop-in adapter later.

## Consequences

**Positive**

- No extra service or credential for a single-VPS install.
- Cheap deduplication; a diff repeated across retries costs nothing.
- Backup is a directory copy plus `pg_dump`.
- Adapter boundary keeps an S3 migration straightforward.
- Streaming reads keep memory bounded.

**Negative**

- Disk is the limit; artifacts can fill a small VPS (mitigated by quotas and warnings).
- Content addressing does not encrypt at rest by default; full-disk encryption is the operator's responsibility.
- Multi-host scaling requires shared storage (adapter resolves this).
- Deletion must be reference-counted by hash, not per-row.

## Guardrails

- Max artifact size (default 100 MB); larger outputs are truncated with a recorded note.
- MIME allowlist for inline preview; everything else downloads.
- No execution of stored artifacts.
- Path traversal and symlink checks on every read.
- Retention configurable; deleting a task removes its rows and unreferenced blobs.
- `microdots doctor` warns when artifacts exceed 20 GB or disk free < 20%.

## Alternatives rejected

- **Postgres `bytea`:** bloats backups and memory, poor streaming, no benefit at this scale.
- **S3 from day one:** a required external dependency and credentials for a self-hosted MVP.
- **Git-only:** loses logs, screenshots and non-code outputs; couples artifacts to branch lifecycle.

## References

- [`data-model.md`](../data-model.md) §4.12
- [`technical-architecture.md`](../technical-architecture.md) §9
- [`extensibility-and-modules.md`](../extensibility-and-modules.md) §3.5
