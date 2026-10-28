# Deploy

Production deployment artifacts arrive with M1:

- `compose.yaml` (Caddy, app, worker, Postgres, runner)
- `compose.override.yaml` (site-local values only)
- `Dockerfile` for app/worker
- `runner.Dockerfile`
- `install.sh` and idempotent install-state handling
- backup, restore, upgrade and doctor scripts

The dev stack lives at [`compose.dev.yaml`](../compose.dev.yaml). The production contract is specified in [`Docs/installer-and-operations.md`](../Docs/installer-and-operations.md).
