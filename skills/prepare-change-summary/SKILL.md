---
id: prepare-change-summary
name: Prepare Change Summary
description: Summarize a change set with evidence suitable for human review, without overstating what was verified.
version: 1.0.0
skillVersion: 1
workers: [coding]
requires:
  tools: [project.git.read, project.fs.read]
  capabilities: [project.fs.read]
  integrations: []
inputs:
  - name: task
    required: true
    description: The task whose changes should be summarized.
  - name: base
    required: false
    description: Base branch or commit; defaults to the project default branch.
outputs: [summary, files, evidence, residual-risk]
tags: [review, git, communication]
author: microdots
license: AGPL-3.0-only
compatibility: ">=0.1 <0.3"
---

# Prepare Change Summary

## When to use

Use after implementation and verification, before review, push or handoff.

Do **not** use as a substitute for verification. If tests did not run, the summary must say so.

## Preconditions

- The workspace contains changes relative to the base.
- The base branch or commit is known.
- Any verification commands have been run (or their absence is known).

## Procedure

1. **Scope the diff.**
   - Run `git status --short`.
   - Run `git diff --stat <base>...HEAD`.
   - List untracked files separately.

2. **Read the changes.**
   - For each file: what changed and why.
   - Group by intent (behavior, tests, docs, config), not by directory.

3. **Summarize behavior.**
   - 2–4 sentences: what now works differently.
   - Name user-visible effects and any breaking change.

4. **Record evidence.**
   - Each command, exit code, and pass/fail counts.
   - Build or typecheck results.
   - Artifacts or links, if available.

5. **State limits.**
   - What was not run and why.
   - What remains uncertain or untested.
   - Any follow-up needed.

## Verification

- Every changed file appears in the summary.
- Every behavioral claim maps to a diff hunk or command result.
- The evidence section contains actual outcomes, not intentions.
- No claim of "all tests pass" without the command and counts.

## Failure handling

- **Empty diff:** report "no changes" and stop.
- **Base unknown:** ask, or use the project default and state the assumption.
- **Verification missing:** say exactly which command did not run and why; do not imply success.
- **Very large diff:** summarize by intent and list files; offer per-area detail instead of a wall of text.

## Anti-patterns

- Describing the plan instead of the change.
- Omitting failures or skipped tests.
- Listing files without explaining purpose.
- Using "minor" or "trivial" to avoid explaining risk.
- Claiming review readiness when verification is incomplete.
