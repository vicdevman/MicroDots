---
id: setup-project-workspace
name: Setup Project Workspace
description: Prepare a repository for work by detecting its stack, installing dependencies safely, and recording a verified baseline.
version: 1.0.0
skillVersion: 1
workers: [coding]
requires:
  tools: [project.fs.read, project.fs.write, project.exec, project.git.read]
  capabilities: [project.fs.read, project.fs.write]
  integrations: []
inputs:
  - name: project
    required: true
    description: Repository to prepare.
  - name: branch
    required: false
    description: Branch to check out; defaults to the project default.
outputs: [stack, commands, baseline, blockers]
tags: [setup, environment, baseline]
author: microdots
license: AGPL-3.0-only
compatibility: ">=0.1 <0.3"
---

# Setup Project Workspace

## When to use

Use at the start of work on a repository whose environment is not yet prepared, or after a workspace reset.

## Preconditions

- The workspace exists and is inside the project root.
- Git remote access is available if the repo is not already cloned.
- The task permits dependency installation.

## Procedure

1. **Confirm location and state.**
   - Run `pwd`, `git status --short`, `git log -1 --oneline`.
   - Confirm the workspace root matches the assigned project.

2. **Detect the stack.**
   - Look for `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Makefile`, `justfile`, `docker-compose.yml`, CI config.
   - Record runtime versions from `.nvmrc`, `.tool-versions`, `engines`, or CI.

3. **Read the intended commands.**
   - Prefer documented scripts over guesses.
   - Record install, build, test, lint and typecheck commands separately.

4. **Install dependencies safely.**
   - Use the lockfile's package manager and the frozen/ci mode.
   - Disable lifecycle scripts by default (`--ignore-scripts` for npm/pnpm) unless the task explicitly approves them.
   - Do not install global packages or modify the host.

5. **Establish a baseline.**
   - Run build/typecheck (if cheap).
   - Run the test suite and record counts.
   - If the baseline is already broken, record it before changing anything.

6. **Record the environment.**
   - Commands, versions, install duration, baseline results, and any missing services.
   - Save logs as artifacts where useful.

## Verification

- Dependencies installed with the locked versions.
- The documented commands run (or their blockers are recorded).
- Baseline results are captured before any code change.
- No host-level changes, global installs or credential files were created.

## Failure handling

- **No lockfile:** report the manager and ask before generating one.
- **Install script required:** explain what it does and request approval; do not run it silently.
- **Missing system dependency:** report the exact package and stop; do not install system software.
- **Private registry/auth required:** stop and report; never embed credentials.
- **Baseline already failing:** record and continue only if the task is to fix it; otherwise report and ask.

## Anti-patterns

- Running install scripts without approval.
- Guessing commands instead of reading project config.
- Modifying the lockfile to force an install through.
- Installing global tools or changing host configuration.
- Starting work without a baseline, then blaming the change for pre-existing failures.
