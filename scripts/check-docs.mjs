import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  ".env.example",
  "Docs/00-index.md",
  "Docs/product-thesis.md",
  "Docs/roadmap.md",
  "Docs/backlog.md",
  "Docs/native-execution-and-resources.md",
  "Docs/product-roadmap.md",
  "Docs/product-backlog.md",
  "Docs/technical-architecture.md",
  "Docs/extensibility-and-modules.md",
  "Docs/data-model.md",
  "Docs/api-contracts.md",
  "Docs/security-and-auth.md",
  "Docs/ux-spec.md",
  "Docs/installer-and-operations.md",
  "Docs/engineering-guide.md",
  "Docs/skills-system.md",
  "Docs/decisions.md",
  "Docs/glossary.md",
  "Docs/master-prd.md",
  "skills/README.md",
  ...Array.from({ length: 13 }, (_, index) => {
    const id = String(index + 1).padStart(4, "0");
    const name = {
      "0001": "monorepo-pnpm",
      "0002": "postgres-only-pg-boss",
      "0003": "fastify-zod-drizzle",
      "0004": "react-vite-pwa-sse",
      "0005": "auth-passkey-first",
      "0006": "ai-sdk-provider-abstraction",
      "0007": "docker-compose-caddy-deploy",
      "0008": "engine-agnostic-execution",
      "0009": "license-agpl",
      "0010": "local-content-addressed-artifacts",
      "0011": "native-systemd-execution",
      "0012": "operator-owned-resource-budgets",
      "0013": "personal-operator-first",
    }[id];
    return `Docs/adr/${id}-${name}.md`;
  }),
];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (extname(entry.name) === ".md") {
      files.push(path);
    }
  }

  return files;
}

function stripCode(text) {
  return text.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
}

function slugify(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/[—–]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function anchorsFor(file) {
  const text = stripCode(readFileSync(file, "utf8"));
  const anchors = new Set();
  const seen = new Map();

  for (const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slugify(match[1] ?? "");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  for (const match of text.matchAll(/\bid=["']([^"']+)["']/g)) {
    anchors.add(match[1]);
  }

  return anchors;
}

function checkAnchor(file, anchor, errors) {
  const anchors = anchorsFor(file);
  if (!anchors.has(anchor)) {
    errors.push(`${relative(root, file)}: missing anchor #${anchor}`);
  }
}

const errors = [];
const files = walk(resolve(root, "Docs"))
  .concat(walk(resolve(root, "skills")))
  .concat(
    ["README.md", "AGENTS.md", "CONTRIBUTING.md", "SECURITY.md"].map((file) => resolve(root, file)),
  );

for (const file of required) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

let linkCount = 0;

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }

  const text = stripCode(readFileSync(file, "utf8"));
  const linkPattern = /(!?)\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

  for (const match of text.matchAll(linkPattern)) {
    if (match[1] === "!") {
      continue;
    }

    linkCount += 1;
    const rawTarget = (match[3] ?? "").replace(/^<|>$/g, "");
    const target = decodeURIComponent(rawTarget);

    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:")
    ) {
      continue;
    }

    if (target.startsWith("#")) {
      checkAnchor(file, target.slice(1), errors);
      continue;
    }

    const [pathPart, anchor] = target.split("#", 2);
    const cleanPath = (pathPart ?? "").split("?")[0];
    if (cleanPath === "") {
      continue;
    }

    const resolved = resolve(dirname(file), cleanPath);
    if (!existsSync(resolved)) {
      errors.push(`${relative(root, file)}: missing link target ${cleanPath}`);
      continue;
    }

    if (anchor && statSync(resolved).isFile() && extname(resolved) === ".md") {
      checkAnchor(resolved, anchor, errors);
    }
  }
}

if (errors.length > 0) {
  console.error(`Docs check failed with ${errors.length} problem(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Docs check passed: ${files.length} files, ${linkCount} links, ${required.length} required files.`,
);
