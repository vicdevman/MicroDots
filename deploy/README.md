# Deploy

Production artifacts are landing with M1. The current slice (M1A) includes:

- `compose.yaml` — Caddy, app, worker and Postgres (the runner joins in M5).
- `Dockerfile` — multi-stage build for the app and worker.
- `Caddyfile` — automatic TLS, compression, security headers and structured access logs.
- `entrypoint.sh` — prepares the `/data` and `/workspaces` volumes, generates the master
  key and setup token on first boot (mode 0600), then drops to the `node` user.
- `env.production.example` — the values the installer will generate in M1D.

Still to come: `install.sh`, `compose.override.yaml`, the runner image, and the backup,
restore, upgrade and doctor scripts.

## Try the production stack locally

```bash
node scripts/generate-env.mjs --domain localhost --email admin@example.com
docker compose up --build
```

The script refuses to overwrite an existing `.env`, so re-running it never rotates
secrets. For a real host, pass its DNS name instead of `localhost`.

Caddy serves `https://$MICRODOTS_DOMAIN`. For `localhost`, Caddy uses its internal CA;
browsers will warn until you trust it. For a real deployment, point DNS at the host and
open ports 80 and 443.

The container generates `/data/secrets/master.key` and `/data/secrets/setup-token` once.
Read the setup token from the host with `docker compose exec app cat /data/secrets/setup-token`
(the app never logs it). The session secret and Postgres password still come from `.env`.

Boot migrations run inside the app before it starts listening. A Postgres advisory lock
serializes concurrent app starts, so rolling a second instance cannot race the schema.

The dev stack lives at [`compose.dev.yaml`](../compose.dev.yaml). The production contract is
specified in [`Docs/installer-and-operations.md`](../Docs/installer-and-operations.md).
