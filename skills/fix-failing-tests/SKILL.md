---
id: fix-failing-tests
name: Fix Failing Tests
description: Reproduce failing tests, fix the underlying cause, and verify the suite without weakening coverage.
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
    description: Repository or workspace containing the failing suite.
  - name: failure
    required: false
    description: Test name, file or CI link, if known.
outputs: [fix, test-evidence, changed-files, residual-risk]
tags: [testing, debugging, quality]
author: microdots
license: AGPL-3.0-only
compatibility: ">=0.1 <0.3"
---

# Fix Failing Tests

## When to use

Use when one or more tests fail and the task is to make them pass by fixing the cause — not by changing the expectations to match broken behavior.

Do **not** use when:

- the test itself is wrong and the task is to update it (say so explicitly and confirm),
- the failure requires an unavailable external service,
- the suite cannot run in the current environment (report the blocker).

## Preconditions

- The test command is known or can be read from project configuration.
- Dependencies are installed (or can be, within policy).
- The failing test is reproducible in this workspace.

## Procedure

1. **Baseline.**
   - Record branch, commit, and `git status --short`.
   - Run the full suite once and capture the summary (passed/failed/skipped, duration).

2. **Reproduce narrowly.**
   - Run only the failing file or test with the project's runner.
   - Capture the first failure and the assertion diff, not the whole log.

3. **Read the failure properly.**
   - Identify expected vs actual.
   - Determine whether the cause is production code, test setup, fixture/data, environment, or ordering/state leakage.

4. **Inspect before editing.**
   - Read the test and the code under test.
   - Check recent changes (`git log -5 -- <file>`).
   - Look for shared state, time, randomness, and network assumptions.

5. **Make the smallest correct change.**
   - Fix production code when behavior is wrong.
   - Fix test setup when the harness is wrong.
   - Add a regression test when the bug was in production code and no test covers it.

6. **Verify in layers.**
   - Run the failing test.
   - Run the containing file/suite.
   - Run the full suite.
   - Run the typecheck/build if the project treats it as part of CI.

7. **Report.**
   - What was wrong (cause, not symptom).
   - What changed, by file.
   - Test counts before and after.
   - Anything still skipped, flaky, or unverified.

## Verification

- The previously failing test now passes.
- The full suite passes, or every remaining failure is explained.
- No test was deleted, skipped, `.only`-ed, or weakened without explicit justification.
- No assertion was changed merely to match incorrect output.
- Evidence includes exact commands and pass/fail counts.

## Failure handling

- **Cannot reproduce:** report environment differences (runtime version, env vars, services) and stop.
- **Test is genuinely wrong:** explain why, propose the corrected expectation, and ask before changing it.
- **Flaky:** run 3 times; report the pattern. Do not paper over with retries.
- **Requires secret/service:** stop; report the exact requirement. Never hard-code credentials or hit production.
- **Fix would exceed scope:** implement the minimal fix and list follow-up work instead of refactoring broadly.
- **Policy denial:** stop and report; do not attempt an alternative path outside scope.

## Anti-patterns

- Deleting or skipping failing tests to get green.
- Updating snapshots without inspecting the diff.
- Adding arbitrary sleeps to fix timing.
- Changing production behavior only to satisfy a bad test.
- Refactoring unrelated code in the same change.
- Claiming "all tests pass" without the command output.
