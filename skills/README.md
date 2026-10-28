# MicroDots Skill Bank

Skills are reusable procedures that teach workers how to do repeatable work well. They are **guidance, not permission**: every boundary-crossing tool call still passes through the policy gateway, and workspace-local steps are confined by the sandbox.

- Format and rules: [`Docs/skills-system.md`](../Docs/skills-system.md)
- Security model: [`Docs/security-and-auth.md`](../Docs/security-and-auth.md)
- Module/extension model: [`Docs/extensibility-and-modules.md`](../Docs/extensibility-and-modules.md)

## Layout

```text
skills/
└─ <skill-id>/
   ├─ SKILL.md      # frontmatter + instructions (required)
   ├─ assets/       # templates/checklists (optional)
   └─ tests/        # fixture tasks for evaluation (optional)
```

## Bundled skills

| Skill | Worker | Status |
|---|---|---|
| `investigate-build-failure` | coding | ready |
| `fix-failing-tests` | coding | ready |
| `prepare-change-summary` | coding | ready |
| `setup-project-workspace` | coding | draft — not yet evaluated |

Planned and draft skills are listed in the skill system doc.

## Adding a skill

1. Copy the structure of an existing skill.
2. Fill the frontmatter; keep `skillVersion: 1`.
3. Write the six required sections: when to use, preconditions, procedure, verification, failure handling, anti-patterns.
4. Declare only the tools and capabilities the procedure actually needs.
5. Add 2–5 fixture tasks under `tests/` if the skill is bundled.
6. Run the validator: `pnpm skills:validate`.
7. Open a PR; bundled skills require maintainer review.

## Non-negotiables

- Never claim a permission or tell a worker to bypass policy.
- Never include secrets, tokens or absolute host paths.
- Always define how success is verified.
- Always define what to do when a capability is missing.
- Keep procedures observable and short enough to follow.

A skill that cannot be evaluated is not ready to ship.
