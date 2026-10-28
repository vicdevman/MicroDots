---
id: investigate-build-failure
name: Investigate Build Failure
description: Diagnose why a project fails to build and produce a verified root cause before changing code.
version: 1.0.0
skillVersion: 1
workers: [coding]
requires:
  tools: [project.fs.read, project.exec, project.git.read]
  capabilities: [project.fs.read]
  integrations: []
inputs:
  - name: project
    required: true
    description: Repository or workspace to inspect.
  - name: error
    required: false
    description: Reported error text or failing command, if known.
outputs: [root-cause, evidence, proposed-fix, affected-files]
tags: [debugging, build, ci]
author: microdots
license: AGPL-3.0-only
compatibility: ">=0.1 <0.3"
---

# Investigate Build Failure

## When to use

Use when a build, typecheck, bundle or packaging step fails and the cause is not already established.

Do **not** use when:

- the task explicitly asks for an implementation without diagnosis,
- the failure is already reproduced and the root cause is documented,
- the environment is missing a required external service the worker cannot access (report instead).

## Preconditions

- The workspace is on the intended branch and the working tree state is known.
- A build command exists or can be inferred from project files.
- Network access is available if dependency installation is required and permitted.

## Procedure

1. **Establish the baseline.**
   - Run `git status --short` and `git log -3 --oneline`.
   - Record the current branch and commit SHA.
   - If the tree is dirty, list the changed files before touching anything.

2. **Identify the real build command.**
   - Check `package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, CI config.
   - Prefer the command CI uses. Record it exactly.

3. **Reproduce.**
   - Run the build command once, cleanly.
   - Capture the full output to a log artifact.
   - Record the exit code.

4. **Locate the first causal error.**
   - Ignore downstream noise. Find the first error that explains the rest.
   - Note file, line, error code and the exact message.

5. **Classify the failure.**
   - Dependency resolution / lockfile drift
   - Missing or wrong runtime version
   - Type or syntax error
   - Missing environment variable or config file
   - Test/build tool configuration
   - Platform/architecture mismatch
   - Resource exhaustion (memory, disk, timeout)

6. **Verify the hypothesis.**
   - Inspect the referenced file and surrounding code.
   - If feasible, run the smallest command that demonstrates the cause (a single test, a typecheck on one file, a dependency tree check).
   - Do not change files unless the task asks for a fix.

7. **Report.**
   - Root cause in 1–3 sentences.
   - Evidence: command, exit code, key lines (not a wall of logs).
   - Affected files with line references.
   - Proposed fix with risk level and whether it is reversible.
   - What is still uncertain.

## Verification

Before reporting, confirm:

- The failure reproduced at least once with a recorded command.
- The cited error is the first causal error, not a consequence.
- Every claim is backed by a command result or file reference.
- If no fix was applied, the report says so explicitly.

## Failure handling

- **Cannot reproduce:** report the exact commands tried, the environment, and ask for the failing command or CI link. Do not guess.
- **Missing dependency or service:** report the missing requirement and stop. Do not install system packages or fetch credentials.
- **Command not found:** report the detected stack and the closest documented command; ask before inventing one.
- **Flaky failure:** run twice; if results differ, report it as flaky with both outputs.
- **Policy denial:** stop and report the missing capability. Never attempt a workaround.
- **Build exceeds the time limit:** report the last observed step and propose splitting the task.

## Anti-patterns

- Changing code before establishing a cause.
- "Fixing" by deleting tests, skipping checks or widening types.
- Reporting a downstream error as the root cause.
- Claiming a fix works without rerunning the build.
- Pasting the entire log instead of the causal lines.
- Installing global packages or editing host configuration.
