import { Link, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="MicroDots home">
          <span className="brand-mark" aria-hidden="true" />
          <span>MicroDots</span>
        </Link>
        <span className="pill">M0 · Bedrock</span>
      </header>
      <main className="main" id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>Self-hosted · permissioned · durable</span>
        <span>Pre-alpha</span>
      </footer>
    </div>
  );
}
