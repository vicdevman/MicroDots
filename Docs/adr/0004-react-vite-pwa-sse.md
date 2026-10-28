# ADR-0004: React + Vite PWA, SSE for realtime

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Frontend, architecture

---

## Context

The first client is a responsive PWA that must work on laptop and phone, show live task progress, support approvals and survive disconnects. A React Native client follows later on the same API.

Realtime options: polling, WebSockets, SSE, long-polling.
Framework options: Next.js, Remix, Vite SPA, Astro.

## Decision

- **React 19 + Vite 7** as a single-page app, served as static assets by the API/Caddy.
- **React Router 7** for routing, **TanStack Query 5** for server state.
- **Tailwind CSS 4 + shadcn/ui (Radix)** for the design system.
- **vite-plugin-pwa + Workbox** for installability, precache and push.
- **Server-Sent Events** for server→client updates, with `Last-Event-ID` replay.

## Consequences

**Positive**

- No SSR/server runtime complexity; the app is a static bundle behind the same origin.
- SSE is one-way, which matches the requirement; it reconnects automatically and works through proxies.
- Event replay from a durable per-task sequence gives reliable catch-up after disconnects.
- The same JSON API serves the future mobile client.

**Negative**

- SSE has a per-domain connection limit in HTTP/1.1 (mitigated by HTTP/2 through Caddy and a 5-connection cap).
- Token-level model streaming uses a separate ephemeral endpoint; it is not replayable.
- No SSR means slower first paint on cold loads; mitigated by a small bundle and precache.
- Binary/live browser view (v0.3) may need a scoped WebSocket channel.

**Neutral**

- Polling remains a fallback for restricted networks.
- The service worker caches the shell only, never authenticated API data.

## Guardrails

- Task status changes only from events, never optimistic UI.
- SSE reconnect is a first-class tested path, including `stream.reset`.
- Initial JS ≤ 250 KB gzip; route-level code splitting.
- `EventSource` same-origin with credentials; no cross-origin CORS by default.

## Alternatives rejected

- **Next.js:** SSR is unnecessary for an authenticated dashboard; adds server rendering and deployment coupling.
- **WebSockets:** bidirectional complexity for a one-way stream; reconnection and replay are harder to make correct.
- **Polling only:** poor latency and wasteful for long tasks; kept as fallback.
- **Astro:** optimized for content sites, not an app shell with heavy client state.

## References

- [`api-contracts.md`](../api-contracts.md) §5.5
- [`technical-architecture.md`](../technical-architecture.md) §6.4
- [`ux-spec.md`](../ux-spec.md) §11
