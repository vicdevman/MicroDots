const milestones = [
  {
    label: "Documentation",
    detail: "Product, architecture, security, UX and operations are written and cross-checked.",
    state: "done",
  },
  {
    label: "Repository",
    detail: "pnpm workspaces, strict TypeScript, Biome boundaries, Vitest, Playwright and CI.",
    state: "done",
  },
  {
    label: "Product slices",
    detail: "Installer, auth, durable tasks and the coding worker start in M1.",
    state: "next",
  },
] as const;

export function HomeRoute() {
  return (
    <section className="hero">
      <p className="eyebrow">Your own AI operations team</p>
      <h1>Close the tab. The work keeps going.</h1>
      <p className="lede">
        MicroDots is a self-hosted, permissioned operations platform. Durable tasks run on your
        server, behind a policy gateway, with evidence you can inspect.
      </p>

      <section className="status-grid" aria-label="Milestone status">
        {milestones.map((milestone) => (
          <article className="status-card" key={milestone.label}>
            <span className={`status-dot status-${milestone.state}`} aria-hidden="true" />
            <h2>{milestone.label}</h2>
            <p>{milestone.detail}</p>
          </article>
        ))}
      </section>

      <div className="callout">
        <strong>M0 scaffold is complete.</strong>
        <span>
          This shell is the first buildable surface. Installer and auth arrive in M1 — nothing here
          is installable yet.
        </span>
      </div>
    </section>
  );
}
