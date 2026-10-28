# MicroDots — Master Product Requirements Document (PRD)

**Document type:** Master product specification and long-term product blueprint  
**Product:** MicroDots  
**Status:** Living specification — intended to guide planning, architecture, implementation, and future expansion  
**Product model:** Open-source, self-hosted personal AI operations assistant  
**Initial client:** Progressive Web App (PWA)  
**Future client:** Native mobile application using React Native  
**Core operating principle:** Human-directed AI orchestration with permissioned workers, persistent background execution, and controlled access to tools and infrastructure.

---

# 1. Executive Summary

## 1.1 Product vision

MicroDots is an open-source, self-hosted AI operations assistant that allows a person to operate a team of specialized AI workers from a single, unified interface.

Instead of interacting with a single AI chat that only responds to messages, the user communicates with a primary AI orchestrator that understands requests, creates tasks, delegates work to specialized workers, coordinates their progress, and returns useful results.

These workers act like employees in a small digital operations team. One may investigate a problem, another may work on code, another may operate a browser, and another may handle deployments or connected applications.

The user should be able to give MicroDots a task, leave the application, and return later to find the task completed, waiting for approval, blocked by an external requirement, or still running.

MicroDots should feel less like a chatbot and more like a personal AI operations center.

## 1.2 The problem

Current AI assistants are useful for answering questions and generating content, but complex work often requires users to coordinate multiple tools and manually manage every step.

For example, building and deploying a software project may require a person to:

- Explain the task to an AI assistant.
- Open a code editor and make changes.
- Run tests and investigate errors.
- Open a browser to inspect documentation or interact with a website.
- Connect to GitHub or another service.
- Run deployment commands.
- Check whether the deployment succeeded.
- Return to the assistant to explain the next problem.

The user becomes the connection between otherwise separate tools.

MicroDots aims to reduce that coordination burden by giving the user one interface and an orchestrator that can delegate, execute, monitor, and coordinate work across authorized tools.

## 1.3 The proposed solution

MicroDots will provide:

1. **One primary assistant** that understands the user and coordinates work.
2. **Specialized workers** that perform different categories of tasks.
3. **Persistent background tasks** that continue independently of the client being open.
4. **An execution gateway and policy engine** that control what each worker can do.
5. **An extensible integration system** using MCP, APIs, command-line tools, and browser automation.
6. **OpenCode integration** as a dedicated coding capability, rather than the entirety of MicroDots.
7. **Reusable skills** that teach workers how to perform repeatable workflows.
8. **Three operating modes** that control the level of automation and approval.
9. **A simple installation experience** that prepares a supported VPS and its required dependencies.
10. **A clean, structured interface** for conversations, workers, tasks, approvals, logs, results, and notifications.
11. **A human-in-the-loop operating model** that allows the user to intervene whenever judgment, authentication, or authorization is needed.
12. **A self-hosted architecture** that gives users control over their infrastructure, configuration, integrations, and data.

## 1.4 Product philosophy

MicroDots should follow these principles:

- **One interface, many capabilities.** The user should not have to manage every tool separately.
- **Human-directed, not blindly autonomous.** The user establishes goals and boundaries; the system handles authorized execution.
- **Persistent by design.** Closing the browser or mobile application must not cancel background work.
- **Permissioned by default.** Every worker has explicit capabilities and access boundaries.
- **Composable and extensible.** New tools, skills, integrations, workers, and models should be added without redesigning the entire application.
- **Visible execution.** The user should understand what is running, what has happened, what is blocked, and what requires attention.
- **Safe by architecture.** Security should be enforced by the system rather than relying only on instructions given to an AI model.
- **Incremental delivery.** The full vision is documented now, but implementation will be divided into manageable phases.
- **Open-source and self-hostable.** The product should remain understandable, installable, maintainable, and adaptable by its users.

---

# 2. Product Goals and Non-Goals

## 2.1 Primary goals

### G1 — Build a personal AI operations team

Allow the user to delegate work to a primary orchestrator that can create and coordinate specialized worker tasks.

### G2 — Enable persistent execution

Tasks must continue on the server when the user closes the client, loses connectivity, or switches devices.

### G3 — Give workers useful, controlled capabilities

Workers must be able to interact with approved integrations, codebases, command-line tools, and websites without receiving unrestricted access to the entire server.

### G4 — Support concurrent work

Independent tasks should be able to run concurrently when resources, permissions, and task dependencies allow it.

### G5 — Make execution understandable

The interface must show task state, worker activity, progress, approvals, failures, and results in a way that is more useful than a long, undifferentiated chat transcript.

### G6 — Make setup accessible

A user should be able to install MicroDots on a supported VPS through a guided installation process instead of manually assembling every dependency.

### G7 — Support extensibility

Developers and users should be able to add integrations, skills, and worker configurations without changing the core application for every new capability.

### G8 — Support multiple interaction surfaces

The same server-side system should eventually support the PWA and a native mobile client.

## 2.2 Secondary goals

- Reusable task templates and skills.
- Persistent worker identities and configuration.
- Usage, resource, and task-cost visibility.
- Recoverable execution after service restarts.
- Multiple model providers where supported.
- Project-specific configuration and context.
- Human takeover of browser sessions and approval workflows.
- A useful activity history and audit trail.
- A community ecosystem of optional extensions.

## 2.3 Non-goals for the initial implementation

These exclusions control implementation scope, not the long-term vision.

The initial implementation does not need to include:

- Every conceivable worker type.
- Every third-party integration.
- A native mobile application before the PWA is useful.
- Unlimited concurrent execution.
- Unrestricted server administration by AI.
- A fully autonomous system that makes every decision without user involvement.
- A complex visual workflow builder before the underlying task system works.
- A custom coding agent that replaces OpenCode.
- A custom foundation model.
- An elaborate avatar customization system.
- A large marketplace for skills and integrations.
- Support for every operating system or VPS configuration.

The architecture should leave room for these capabilities where appropriate, but the first release must remain small enough to build, test, and maintain.

---

# 3. Users and Primary Use Cases

## 3.1 Primary user

A technically capable individual who wants to delegate digital work to an AI team hosted on infrastructure they control.

The user may be a developer, founder, researcher, builder, or technical operator.

The product should not assume that the user wants to manage a complicated collection of scripts, services, terminals, and agent sessions.

## 3.2 Core use case: delegate a software task

The user says:

“Investigate why my application fails to build, fix the problem, run the tests, and prepare the changes for review.”

Expected behavior:

1. The orchestrator interprets the request.
2. It identifies the relevant project and checks whether it has authorization to access it.
3. It creates a task with a defined objective and success criteria.
4. It delegates the coding work to the coding worker.
5. The coding worker uses OpenCode through the controlled execution layer.
6. The worker investigates the failure, proposes or makes authorized changes, and runs approved tests.
7. Results, logs, and changed files are recorded.
8. The user receives updates as meaningful milestones occur.
9. The task finishes with a summary, evidence, and any remaining issues.

The exact workflow depends on the operating mode and the permissions configured for the project.

## 3.3 Core use case: research and report

The user asks MicroDots to investigate a technical topic and prepare a report.

The orchestrator delegates research, gathers evidence from authorized sources, reconciles conflicting information, and produces a structured result with source links.

A separate worker may format the report or save it to a connected application if authorized.

## 3.4 Core use case: operate a website

The user asks MicroDots to perform a task on a website.

The system should prefer an official API or MCP integration when it provides the necessary capability. If no suitable structured integration exists, an authorized browser worker can use browser automation.

When a workflow requires a login, multi-factor authentication, CAPTCHA resolution, or user judgment, the worker should pause and request human intervention rather than attempting to bypass the requirement.

## 3.5 Core use case: deploy an application

The user requests a deployment.

The system identifies the project, checks the applicable permissions, executes the configured deployment workflow, captures the deployment result, and reports the resulting status and relevant link.

For example, a Vercel deployment may use the Vercel CLI when that is the configured integration.

Production deployments and changes with significant consequences must follow the configured approval policy.

## 3.6 Core use case: delegate multiple errands

The user submits several tasks in one request.

The orchestrator determines which tasks are independent, creates separate work items, assigns suitable workers, and runs eligible tasks concurrently.

Dependent tasks must wait for their prerequisites. One task's failure should not automatically cancel unrelated work unless the dependency graph or user instructions require it.

## 3.7 Core use case: intervene in running work

The user opens MicroDots while a worker is running.

The user can inspect the worker's activity, read its findings, provide additional instructions, approve a pending action, pause the task, or take over an eligible browser session.

The worker must incorporate the new direction without losing its task history or silently bypassing existing permissions.

---

# 4. Product Structure and Main Components

MicroDots consists of the following major components.

## 4.1 Client application

The PWA provides the primary user experience.

It is responsible for presenting conversations, tasks, workers, notifications, approvals, results, settings, and structured interactive views.

It does not own the execution lifecycle. Closing the client must not terminate server-side tasks.

## 4.2 Primary orchestrator

The orchestrator is the main conversational interface and task coordinator.

It interprets requests, clarifies ambiguity, plans work, selects workers, manages dependencies, and communicates results.

It is an AI-driven coordinator, not the ultimate authority for permissions.

## 4.3 Worker runtime

The worker runtime manages the lifecycle of specialized workers.

It handles assignment, scheduling, concurrency, cancellation, retries, task context, execution sessions, progress events, and result collection.

## 4.4 Execution gateway

The execution gateway is the controlled boundary between AI workers and external capabilities.

It receives proposed tool operations, verifies authorization, enforces policies, requests approval when necessary, and forwards permitted operations to the appropriate adapter or executor.

The gateway must remain authoritative even when a worker is highly autonomous.

## 4.5 Policy engine

The policy engine determines whether a particular operation is permitted, prohibited, or requires approval.

It evaluates the actor, task, operating mode, resource, operation type, configured permissions, and risk level.

## 4.6 Integration layer

The integration layer connects MicroDots to external systems through MCP, official APIs, command-line interfaces, and browser automation.

Each integration should have a defined interface, permissions, error handling, and health status.

## 4.7 OpenCode adapter

The OpenCode adapter connects MicroDots to OpenCode for coding tasks.

It manages availability checks, version compatibility, session creation, task execution, progress events, cancellation where supported, and result collection.

OpenCode is one capability inside MicroDots, not the application’s entire architecture.

## 4.8 Persistent data layer

The data layer stores tasks, messages, workers, permissions, configuration, execution events, approvals, skills, integrations, and results.

Persistent records must allow the system to recover after client disconnection or service restart.

## 4.9 Background execution and scheduling

The background runtime executes eligible tasks, handles retries, tracks dependencies, schedules work, and recovers interrupted operations.

## 4.10 Notification service

The notification service informs the user about meaningful events, including task completion, failure, approval requirements, blocked workflows, and requests for intervention.

## 4.11 Installation and maintenance system

The installer prepares the supported environment, verifies dependencies, configures the application, and checks that essential services are healthy.

The maintenance system supports upgrades, migrations, backups, health checks, and recovery.

---

# 5. High-Level Architecture

The following describes the intended logical architecture, not a requirement to implement every component as a separate service.

```text
PWA / Future React Native Client
              |
              v
       MicroDots Backend API
              |
       Authentication Layer
              |
              v
     Primary AI Orchestrator
              |
       Task / Planning Engine
              |
       Worker Runtime and Queue
              |
      +-------+--------+---------+
      |                |         |
      v                v         v
 Coding Worker    Browser Worker  Research /
 OpenCode         Playwright      Integration Workers
      |                |         |
      +----------------+---------+
                       |
                       v
           Execution Gateway
                       |
                 Policy Engine
                       |
             Approval / Audit Layer
                       |
                       v
                 Tool Adapters
          +------------+------------+
          |            |            |
          v            v            v
         MCP        Approved CLI   Browser
          |            |            |
          +------------+------------+
                       |
                External Systems

Persistent Database + Durable Queue + Event History
                       |
              Notifications / Live UI
```

## 5.1 Architecture requirements

- The backend owns authoritative task state.
- The orchestrator delegates work through the task system rather than directly bypassing it.
- Workers receive scoped task context and capabilities.
- All consequential tool execution passes through the appropriate authorization boundary.
- The UI receives task and worker events from the backend.
- Tasks remain recorded even if a worker crashes or the application restarts.
- Integrations are replaceable adapters, not hard-coded dependencies throughout the codebase.
- The architecture supports additional workers and client applications without rewriting the orchestration core.

## 5.2 Logical separation versus deployment separation

The architecture should define clear component boundaries without unnecessarily splitting the first release into many independent network services.

The initial backend may run as a modular application with separate worker processes where isolation or reliability requires them.

Components can be separated further when scale, security, deployment, or maintenance justifies the additional complexity.

---

# 6. The Primary Orchestrator

## 6.1 Purpose

The primary orchestrator is the user's main point of contact.

It must be able to understand a request, decide whether to answer directly or initiate work, and coordinate execution through specialized workers.

## 6.2 Responsibilities

The orchestrator must:

- Understand the user's objective and relevant context.
- Identify missing information that materially affects execution.
- Ask clarifying questions when necessary.
- Determine whether a request is a conversation, an immediate action, or a longer-running task.
- Break complex requests into manageable tasks.
- Define success criteria and dependencies.
- Choose appropriate workers and skills.
- Check whether the proposed workflow is allowed.
- Submit work to the worker runtime.
- Track task progress and failures.
- Re-plan when a task becomes blocked or new information changes the plan.
- Present important updates to the user.
- Consolidate results from multiple workers.
- Distinguish verified results from assumptions or incomplete work.
- Request approval when required.
- Avoid claiming that an action succeeded without evidence of success.

## 6.3 Planning behavior

For a substantial request, the orchestrator should create a structured execution plan.

A plan may contain:

- Task identifier.
- Objective.
- Relevant project or resource.
- Assigned worker.
- Required skill.
- Dependencies.
- Allowed tools.
- Operating mode.
- Success criteria.
- Expected outputs.
- Risk classification.
- Approval requirements.
- Retry and failure policy.

The system may hide unnecessary planning details for simple tasks, but the underlying execution record must remain available.

## 6.4 Clarification behavior

The orchestrator should not ask the user to approve every harmless internal step.

It should ask for clarification when a missing detail affects the intended result, target environment, access scope, cost, or safety of an operation.

It should also request authorization before an operation that is not already permitted.

## 6.5 Delegation behavior

The orchestrator should delegate when another worker has a better capability, environment, or workflow for the job.

It should not create multiple workers simply to make a task appear sophisticated.

The number of workers should reflect the actual work, dependencies, available resources, and expected benefit.

## 6.6 User communication

The orchestrator should provide a useful acknowledgment when it starts substantial work.

Example:

“I’ll inspect the project, identify the build failure, and ask the coding worker to investigate. I’ll report back when the cause is confirmed or if I need your input.”

It should then provide meaningful milestone updates rather than flooding the user with every internal model or tool event.

---

# 7. Worker and Employee System

## 7.1 Worker model

MicroDots should model specialized AI agents as persistent, configurable workers.

Workers may be presented in the UI as employees, team members, or “folks.” The underlying technical entity should be a worker with an explicit role, configuration, permissions, and execution history.

A worker is not necessarily a continuously running AI process. It may be instantiated for a task, use a persistent session when appropriate, and resume through the worker runtime.

## 7.2 Worker types

The following are intended worker roles. They do not all need to be implemented in the first release.

### Orchestrator

Coordinates requests, planning, delegation, and communication.

### Coding worker

Uses OpenCode to inspect, modify, test, and debug authorized codebases.

### Research worker

Investigates questions, gathers evidence, compares sources, and produces findings.

### Browser worker

Interacts with websites through approved browser automation and supported human takeover.

### Integration worker

Executes workflows through configured APIs, MCP servers, and connected services.

### DevOps worker

Inspects authorized environments, runs approved operational workflows, and supports deployments and diagnostics.

### Review worker

Reviews proposed changes, checks requirements, and reports issues. It may operate independently from the coding worker for better separation of responsibilities.

### Documentation worker

Creates or updates project documentation and structured records in authorized destinations.

### Custom workers

Users and developers should eventually be able to define additional workers with their own roles, skills, tool access, and execution constraints.

## 7.3 Worker configuration

A worker definition should support:

- Unique identifier.
- Display name.
- Description.
- Role and operating instructions.
- Avatar reference.
- Available skills.
- Allowed tools and integrations.
- Project or resource scope.
- Model/provider configuration where applicable.
- Execution limits.
- Concurrency limits.
- Approval policy.
- Persistent-session configuration where appropriate.
- Enabled/disabled status.
- Version and configuration history.
- Health and availability status.

## 7.4 Worker lifecycle

A worker task may move through states such as:

- Created.
- Queued.
- Assigned.
- Starting.
- Running.
- Waiting for approval.
- Waiting for user input.
- Blocked.
- Retrying.
- Completed.
- Failed.
- Cancelled.

The system should distinguish a worker's overall availability from the state of a particular task.

## 7.5 Worker independence

Workers should be able to execute independent tasks concurrently when the scheduler permits.

They should not be assumed to have identical permissions, memory, tool access, or project access.

A worker's role does not automatically authorize every action associated with that role.

## 7.6 Resource-aware scheduling

Concurrency must account for:

- Available CPU and memory.
- Current task load.
- Worker-specific limits.
- External service rate limits.
- Model-provider quotas.
- Browser session capacity.
- Task priority and dependencies.
- Configured execution and cost limits.

If the system cannot safely or efficiently run another task, it should queue it and communicate the status rather than overloading the server.

---

# 8. Worker Collaboration and Rooms

## 8.1 Purpose

MicroDots should support collaboration between workers on larger tasks.

A room is a shared collaboration context where authorized workers can exchange task-relevant information, findings, messages, and deliverables.

Rooms are a coordination mechanism, not a security boundary that grants access to everything shared inside them.

## 8.2 Example

For a software deployment task:

- The research worker identifies relevant deployment requirements.
- The coding worker prepares the required changes.
- The review worker checks the changes.
- The DevOps worker performs the authorized deployment.
- The orchestrator consolidates the result and reports to the user.

Workers may share results and messages through a common task or project room.

## 8.3 Collaboration requirements

- Each room must have a defined purpose and access scope.
- Room membership must be explicit or derived from an authorized assignment.
- Messages must identify the originating worker.
- Task and result references must be traceable.
- Workers should be able to communicate blockers and request information from other workers.
- The orchestrator should coordinate dependencies and resolve conflicting findings.
- The system should avoid duplicating expensive work when an existing result is sufficient.
- Important decisions and outcomes must be recorded.

## 8.4 Permission isolation

**Being in the same room must never grant one worker another worker's permissions.**

For example, a research worker may be allowed to read a repository but not modify it. A coding worker may have permission to edit files in a designated workspace but not deploy to production.

If the research worker shares information with the coding worker, that information does not transfer the research worker's access rights.

When a worker asks another worker to perform an action, the requested action must still be evaluated against the acting worker's own authorization and the applicable policy.

## 8.5 Delegation between workers

A worker may recommend that another worker perform a task, but delegation must pass through the task and authorization system.

The receiving worker should obtain a defined task scope rather than unrestricted access to the entire conversation or server.

---

# 9. Operating Modes

MicroDots must support three user-facing operating modes.

These modes describe the amount of automation and routine interruption. They do not remove the security boundaries that apply to all workers.

## 9.1 Restricted mode

**Purpose:** Maximum human oversight.

Expected behavior:

- Prefer inspection and read-only actions.
- Ask before making changes not explicitly covered by an existing authorization.
- Require approval for consequential operations.
- Make proposed actions and their effects visible.
- Keep the user closely involved in execution.

This mode is suitable for initial experimentation, unfamiliar projects, and sensitive environments.

## 9.2 Balanced mode

**Purpose:** Everyday productivity with meaningful safeguards.

Expected behavior:

- Automatically perform authorized, low-risk steps.
- Run approved coding, research, testing, and routine workflows.
- Continue background tasks without requiring the user to monitor every step.
- Pause for destructive actions, sensitive access, production changes, or actions outside the approved scope.
- Notify the user when intervention is necessary.

This is the recommended default mode.

## 9.3 Autonomous mode

**Purpose:** Complete authorized workflows with fewer routine interruptions.

Expected behavior:

- Execute multi-step workflows within configured boundaries.
- Delegate and coordinate workers with less routine confirmation.
- Use pre-approved skills and integrations.
- Recover from eligible transient failures.
- Respect time, resource, scope, and cost limits.
- Pause when an operation exceeds the authorization granted for the task.

Autonomous mode does not mean unrestricted server access, unrestricted shell access, or permission to perform every conceivable action.

## 9.4 Global safety rules

The following rules apply in all modes:

- A prohibited operation remains prohibited.
- An operation requiring mandatory approval cannot bypass that requirement.
- A worker cannot grant itself new permissions.
- A model instruction cannot override the policy engine.
- Resource limits remain active.
- Secrets must not be exposed to unauthorized workers or the client.
- An approval applies only to the operation and scope described in that approval.
- Changes in operating mode must not silently expand previously granted access.
- The user must be able to stop or revoke eligible running work.

## 9.5 Policy evaluation

For every relevant operation, the policy engine should consider:

1. Who or what is requesting the operation?
2. Which task is it associated with?
3. What resource is being accessed?
4. What action is being requested?
5. Is the action within the worker's scope?
6. What operating mode is active?
7. Is there an applicable explicit permission?
8. Does the operation require approval?
9. Are there resource, environment, or risk restrictions?
10. Is the request valid under the current policy?

The result should be one of:

- Allow.
- Deny.
- Require approval.
- Require clarification or additional authorization.

---

# 10. Execution Gateway and Policy Engine

## 10.1 Purpose

The execution gateway is one of the most important architectural components in MicroDots.

It separates the AI's ability to propose an action from the system's authority to execute that action.

The gateway and policy engine can initially be implemented as ordinary backend code. They do not require another AI model.

## 10.2 Required responsibilities

The execution layer must:

- Authenticate the requesting user or service.
- Identify the acting worker.
- Validate the task context.
- Validate tool inputs against a schema.
- Check worker and project permissions.
- Apply operating-mode rules.
- Classify operations according to their potential impact.
- Request approval when required.
- Execute only authorized operations.
- Record the result and relevant audit events.
- Return structured success, failure, or denial information.
- Prevent workers from directly bypassing the authorization layer.

## 10.3 Controlled execution

AI workers must not receive unrestricted access to a root shell or arbitrary host administration.

Instead, they should access approved capabilities through controlled adapters and execution environments.

Where shell execution is necessary, the implementation should use scoped workspaces, restricted execution identities, validated command policies where feasible, timeouts, resource limits, and appropriate isolation.

The policy engine must not rely exclusively on an AI-generated description of what a command will do.

## 10.4 Approval requests

An approval request should include:

- The worker requesting the action.
- The associated task.
- The exact intended operation.
- The target resource or environment.
- Why the action is needed.
- Relevant expected consequences.
- The scope of the permission being requested.
- Whether the request expires.
- The available actions: approve, reject, or request changes.

Approvals should be specific and auditable.

A request to modify a staging deployment should not automatically authorize a production deployment.

## 10.5 Failure behavior

If the gateway cannot establish whether an action is authorized, it should fail closed for consequential operations.

It should explain the denial or missing authorization to the worker and, when necessary, the user.

The worker may propose an alternative that is within scope, but it must not silently circumvent the restriction.

---

# 11. Permissions and Access Control

## 11.1 Permission model

MicroDots must support permissions at multiple levels:

- User.
- Worker.
- Project or workspace.
- Integration.
- Resource.
- Operation.
- Environment.
- Task.
- Operating mode.

These levels should work together rather than being treated as interchangeable.

## 11.2 Example permissions

A worker might be allowed to:

- Read files within one project.
- Modify files in a designated working directory.
- Run an approved test command.
- Read deployment status.
- Create a draft pull request.
- Read a connected Notion workspace.
- Operate a specific browser session.

It might not be allowed to:

- Read unrelated private directories.
- Access arbitrary environment secrets.
- Change global server configuration.
- Delete important resources.
- Deploy to production without authorization.
- Use another worker's credentials.
- Install arbitrary system software.

## 11.3 Project isolation

Projects should have explicit roots, configuration, integrations, and execution scopes.

A worker assigned to one project should not automatically be able to inspect or modify another project.

## 11.4 Secrets

API keys, access tokens, passwords, and private credentials must be handled through a protected backend mechanism.

Requirements:

- Do not expose secrets in frontend responses.
- Do not include secrets in ordinary task logs.
- Do not place secrets in model prompts unless explicitly necessary and safely scoped.
- Redact sensitive values from logs and error reports.
- Provide controlled credential access to authorized integrations.
- Support credential replacement and revocation.
- Avoid storing credentials in source-controlled configuration.
- Limit credential access to the smallest practical scope.

## 11.5 Permission management

Users should be able to inspect and modify worker permissions, integration access, project scope, and approval requirements.

Permission changes should take effect predictably and be recorded.

Revoking a permission should prevent subsequent operations that depend on it. For already-running external operations, MicroDots should cancel them where possible and report any limitations.

---

# 12. OpenCode Integration

## 12.1 Purpose

OpenCode is the coding execution engine integrated into MicroDots.

MicroDots remains responsible for the user experience, task orchestration, worker lifecycle, access control, persistence, notifications, and integration management.

OpenCode handles coding-oriented work through its supported interfaces.

Official references:

- OpenCode documentation: https://docs.opencode.ai/docs/
- OpenCode server: https://docs.opencode.ai/docs/server/
- OpenCode CLI: https://docs.opencode.ai/docs/cli/

## 12.2 Installer requirement: detect before installing

**The MicroDots installer must check for an existing OpenCode installation before attempting to install OpenCode.**

The installer should implement the following decision process.

### Case A — OpenCode is not installed

1. Detect that the executable or supported installation is absent.
2. Verify that the operating system and architecture are supported.
3. Check required installation prerequisites and network availability.
4. Install the MicroDots-supported OpenCode version using a supported installation method.
5. Verify that the executable is available.
6. Verify the installed version.
7. Run a capability or health check appropriate to the selected integration method.
8. Record the detected version and installation result.

### Case B — A compatible OpenCode installation already exists

1. Detect the existing executable.
2. Determine the executable path and version.
3. Check compatibility with the MicroDots adapter.
4. Verify that the required CLI or server functionality is available.
5. Reuse the compatible installation.
6. Do not install a duplicate unnecessarily.
7. Do not overwrite existing user configuration.
8. Report that the existing installation was detected and reused.

### Case C — OpenCode exists but is incompatible

1. Detect and report the existing version.
2. Explain which requirement is not satisfied.
3. Determine whether the installer can safely use a supported upgrade path.
4. Offer or perform an explicitly authorized repair or upgrade.
5. Preserve existing configuration and user data where possible.
6. Verify compatibility after the operation.

The installer must not silently overwrite an existing installation merely because it differs from the version preferred by MicroDots.

### Case D — OpenCode is installed but unhealthy

1. Confirm that the executable exists.
2. Check whether it can start and respond to the required interface.
3. Capture useful diagnostic information.
4. Distinguish an installation problem from a configuration, model-provider, network, or authentication problem.
5. Offer the appropriate recovery path.
6. Avoid repeatedly reinstalling OpenCode when the actual problem is missing credentials or a provider configuration.

### Case E — Installation cannot proceed

If prerequisites are missing or installation fails, MicroDots must explain what failed and what is required next.

The installer must not mark OpenCode as ready until the relevant verification checks pass.

## 12.3 Version and compatibility management

OpenCode has multiple documentation and release tracks. The MicroDots project must choose and test a supported version or release channel rather than assuming every version is interchangeable.

Requirements:

- Maintain an explicit compatibility policy.
- Pin or otherwise control the version used by the automated installer.
- Check compatibility during installation and startup.
- Record the detected version.
- Test upgrades before making them the default.
- Avoid unintended conflicts between installation channels.
- Preserve existing user configuration.
- Support a documented repair procedure.
- Make version incompatibilities visible.

The exact supported version should be established during implementation and kept in project configuration, not hard-coded into an unchangeable installer script.

## 12.4 OpenCode server integration

Where appropriate, MicroDots should use OpenCode's supported headless server/API functionality to manage coding sessions and receive results.

The adapter should encapsulate OpenCode-specific behavior so that the rest of MicroDots does not depend on undocumented implementation details.

Server access must be restricted and authenticated according to the deployment architecture. It should not be exposed publicly without appropriate protection.

## 12.5 Coding worker responsibilities

The coding worker may:

- Inspect an authorized repository.
- Understand project structure.
- Investigate bugs.
- Modify authorized files.
- Write or update tests.
- Run approved development commands.
- Diagnose build failures.
- Review its own changes.
- Produce a change summary.
- Report test results.
- Prepare changes for human review.
- Support authorized Git workflows.

Its ability to perform each operation depends on its assigned permissions and task policy.

## 12.6 Coding worker restrictions

The coding worker must not automatically receive:

- Unrestricted access to the host filesystem.
- Unrestricted root access.
- All stored credentials.
- Permission to modify unrelated projects.
- Permission to deploy to every environment.
- Permission to perform destructive Git operations without authorization.
- Permission to override MicroDots policies.

## 12.7 Session and result management

MicroDots should maintain its own task records and references to relevant OpenCode sessions.

It should track:

- Associated task.
- Project and workspace.
- Session identifier.
- Start and completion times.
- Relevant execution events.
- Changed files where available.
- Test and command results.
- Errors.
- Final summary.
- Links or references to detailed output.

The MicroDots task record remains authoritative for the broader workflow even when OpenCode maintains its own session history.

---

# 13. Tool and Integration Architecture

## 13.1 General principle

MicroDots should be integration-first and extensible.

The orchestrator should not need a bespoke implementation for every application it operates.

Tools should be exposed through adapters with consistent metadata, input validation, permissions, result formats, and error handling.

## 13.2 Integration priority

The preferred integration order is:

1. MCP when a suitable, trusted integration is available.
2. An official API or a dedicated integration adapter when it provides a better fit.
3. A supported CLI for applications and workflows that are best operated through commands.
4. Browser automation when a suitable structured integration is unavailable or insufficient.

This is a preference order, not a rule that prohibits using a better-supported alternative.

## 13.3 MCP integration

MicroDots should support MCP-compatible servers where appropriate.

Requirements:

- Register and configure approved MCP servers.
- Discover supported tools.
- Validate tool schemas and inputs.
- Associate tools with permissions.
- Manage credentials securely.
- Track integration health.
- Surface useful errors.
- Allow integrations to be enabled, disabled, or removed.
- Ensure tool outputs are treated as external data, not trusted instructions.

The system should not automatically trust every MCP server simply because it implements the protocol.

## 13.4 CLI integration

MicroDots should support approved command-line tools, including tools used for development and deployment.

Examples may include:

- Git.
- Vercel CLI.
- Project-specific build and test tools.
- Supported database or infrastructure utilities.
- OpenCode CLI.

CLI tools should be registered or configured with an explicit purpose and execution policy.

Requirements:

- Identify the executable and supported version.
- Validate arguments.
- Set a defined working directory.
- Apply timeouts and resource limits.
- Capture structured exit status and output.
- Redact sensitive output.
- Enforce approval requirements.
- Avoid passing arbitrary model-generated commands directly to an unrestricted shell.

## 13.5 Official API adapters

A dedicated API adapter may be preferable when an application has a stable, well-documented API.

It should handle authentication, pagination, rate limits, retries, response validation, and permission boundaries as appropriate.

## 13.6 Integration configuration

Each integration should expose, as appropriate:

- Name and description.
- Type.
- Version.
- Connection state.
- Required credentials.
- Available capabilities.
- Granted permissions.
- Health status.
- Supported operations.
- Error details.
- Configuration and revocation controls.

## 13.7 Example: Vercel

The Vercel integration may allow the authorized deployment worker to:

- Inspect project configuration.
- Check deployment status.
- Start an authorized deployment.
- Collect the resulting deployment URL.
- Report build failures.
- Inspect relevant deployment logs where supported.

Production deployment permissions must remain distinct from permission to inspect a deployment.

## 13.8 Integration extensibility

Adding a new integration should ideally require an adapter, configuration, permission definitions, and tests rather than changes to the core orchestrator.

---

# 14. Browser Automation and Human Takeover

## 14.1 Purpose

Browser automation provides a fallback capability for websites and workflows that do not have an adequate structured integration.

A browser worker should be able to operate a designated browser session on behalf of the user within its authorized scope.

## 14.2 Browser capabilities

Subject to the relevant website's rules and the user's authorization, the browser worker may:

- Navigate to pages.
- Read visible content.
- Fill forms.
- Click controls.
- Follow multi-step workflows.
- Capture relevant page state.
- Report errors.
- Return structured results.
- Pause for human intervention.

## 14.3 Persistent browser sessions

Where necessary, MicroDots should support isolated, persistent browser sessions.

Session state must be managed securely. Authentication data should not be copied into ordinary logs or exposed to unrelated workers.

The system should distinguish browser-session persistence from task persistence: the task can survive a restart even when a browser session must be restored or reauthenticated.

## 14.4 Human takeover

The user should be able to take control when the worker cannot safely complete a step.

Examples include:

- Signing in.
- Completing multi-factor authentication.
- Resolving a CAPTCHA through the intended user flow.
- Confirming an important transaction.
- Making a judgment that requires user input.

The worker should pause, preserve its task state, notify the user, and resume when the required intervention is completed.

MicroDots must not treat human takeover as permission to bypass website security controls.

## 14.5 Browser execution safety

- Use isolated browser contexts where appropriate.
- Limit the websites and sessions a worker may access.
- Separate user-controlled instructions from untrusted page content.
- Treat webpage text and downloaded content as untrusted data.
- Do not allow a webpage to override MicroDots' system policies.
- Apply the same authorization and approval rules to browser actions as to other tools.
- Record relevant browser actions and outcomes without unnecessarily capturing sensitive content.

## 14.6 Streaming browser state

Where technically feasible, the user should be able to see the current browser activity or an authorized live view.

The interface should indicate when the browser is running, paused, waiting for the user, or complete.

---

# 15. Skills System

## 15.1 Purpose

Skills are reusable workflow instructions that teach workers how to complete repeatable tasks.

A skill is different from a tool.

A tool provides a capability. A skill describes how to use available capabilities to achieve a particular outcome. The policy engine decides whether the requested actions are permitted.

## 15.2 Example skills

- `debug-nodejs-application`
- `review-pull-request`
- `deploy-to-vercel`
- `investigate-vps-resources`
- `setup-project-workspace`
- `document-project-in-notion`
- `research-technical-topic`
- `prepare-release-summary`

These are examples of intended capabilities, not a requirement to ship all of them initially.

## 15.3 Skill definition

A skill should support:

- Unique identifier.
- Name and description.
- Version.
- Instructions.
- Required inputs.
- Optional inputs.
- Preconditions.
- Expected outputs.
- Recommended worker types.
- Required tools or integrations.
- Permission requirements.
- Approval points.
- Error handling.
- Retry guidance.
- Success criteria.
- Author or source.
- Enabled/disabled status.

## 15.4 Skill execution

When a task matches a skill, the orchestrator may select it and provide the required inputs.

The skill guides the worker through the workflow but cannot grant itself additional permissions.

If the skill requires a capability the worker does not possess, the task should pause, request authorization, or use an allowed alternative.

## 15.5 Skill management

Users should eventually be able to:

- Browse installed skills.
- Enable and disable skills.
- Install approved skills.
- Create custom skills.
- Edit skill instructions.
- View versions and change history.
- Assign skills to workers.
- Limit skills to specific projects.
- Inspect required tools and permissions.

## 15.6 Skill security

Skills may contain instructions from external sources. Those instructions must not be treated as authoritative system policies.

Installing a skill must not automatically grant it access to secrets, arbitrary shell execution, or sensitive resources.

Where possible, installation should show the skill's capabilities and permission requirements before activation.

## 15.7 Skill portability

The format should be documented and versioned so that skills can be shared between installations where compatible.

The project should avoid unnecessary coupling between skills and a single model provider or worker implementation.

---

# 16. Task System and Persistent Background Execution

## 16.1 Purpose

The task system is the durable record of work requested from MicroDots.

It must exist independently of any particular browser tab, mobile client, AI conversation session, or transient worker process.

## 16.2 Task creation

A task should include:

- Unique identifier.
- User request.
- Normalized objective.
- Creation time.
- Current state.
- Priority.
- Operating mode.
- Associated project or workspace.
- Assigned worker or workers.
- Dependencies.
- Permissions and approval requirements.
- Success criteria.
- Execution history.
- Results and artifacts.
- Error details where applicable.

## 16.3 Task states

A task may move through:

- Draft.
- Queued.
- Running.
- Waiting for approval.
- Waiting for user input.
- Blocked.
- Retrying.
- Completed.
- Failed.
- Cancelled.

State transitions must be validated by the backend.

## 16.4 Persistence requirements

- Tasks survive browser closure.
- Tasks survive temporary network disconnection.
- Tasks survive backend restarts where recovery is possible.
- Task history remains available after completion.
- A failed worker can be replaced or retried without losing the task record.
- Duplicate event delivery should not cause duplicate execution of non-idempotent operations.
- The system must record enough state to identify incomplete or interrupted work after recovery.

## 16.5 Durable queue and scheduling

The implementation should use a durable queue or equivalent persistent scheduling mechanism.

It should support:

- Worker assignment.
- Concurrency control.
- Priority.
- Task dependencies.
- Retries.
- Timeouts.
- Cancellation.
- Recovery after process failure.
- Resource-aware scheduling.
- Failure reporting.

The queue technology should be selected during implementation based on reliability, operational complexity, and deployment requirements.

## 16.6 Retry behavior

Not every failure should trigger an automatic retry.

The scheduler should distinguish transient errors from permanent errors, invalid inputs, permission denials, and actions that may already have taken effect.

Retries of consequential operations must account for idempotency and possible duplicate effects.

## 16.7 Cancellation

The user should be able to cancel eligible tasks.

Cancellation should stop future work and request termination of active operations where supported.

MicroDots must communicate when an external operation cannot be reversed or when a cancellation request cannot immediately stop an already-running process.

## 16.8 Task outputs

A task may produce:

- Text.
- Structured data.
- Code changes.
- Test results.
- Files.
- Research reports.
- Links.
- Deployment information.
- Logs.
- Approval requests.
- Follow-up tasks.

Outputs should be associated with the task and accessible from the client.

---

# 17. Event History and Live Progress

## 17.1 Purpose

The system should maintain a meaningful history of task execution, rather than relying only on the final response.

## 17.2 Event types

Examples include:

- Task created.
- Worker assigned.
- Worker started.
- Plan updated.
- Tool operation requested.
- Approval requested.
- Approval granted or denied.
- Worker progress reported.
- Tool operation completed.
- Task blocked.
- Retry scheduled.
- Task completed.
- Task failed.
- Task cancelled.
- Human intervention requested.
- Result produced.

## 17.3 Event requirements

- Events must be associated with the relevant task and actor.
- Events must have timestamps.
- Event delivery should tolerate temporary client disconnection.
- The client should be able to recover missed updates.
- Important events should be persisted.
- Sensitive values should be redacted.
- Event history should distinguish model-generated statements from verified execution results.

## 17.4 Live updates

The client should receive progress events through an appropriate real-time mechanism, such as Server-Sent Events or WebSockets.

The implementation should select the simplest reliable option that meets the UI requirements.

Live streaming is an enhancement to durable state, not a substitute for storing the task and its events.

---

# 18. Notifications

## 18.1 Purpose

Notifications keep the user informed without requiring constant monitoring of the application.

## 18.2 Notification events

MicroDots should support notifications for:

- Task started.
- Task completed.
- Task failed.
- Task blocked.
- Approval required.
- User input required.
- Browser takeover required.
- Deployment completed.
- Deployment failed.
- Worker needs intervention.
- Important recovery or service-health events.

The system should avoid notifying the user about every minor internal action by default.

## 18.3 Notification channels

The PWA should support in-app notifications and, where supported and configured, web push notifications.

A future React Native application should be able to add native push notifications through the same notification service.

The backend must retain pending approval and intervention state even if notification delivery fails.

## 18.4 Notification actions

Where practical, notifications should take the user directly to the relevant task.

Approval notifications should identify the task and the action requiring approval, while ensuring the approval itself occurs through an authenticated, authorized interface.

---

# 19. Client Application and User Experience

## 19.1 Initial client

The first client is a responsive PWA accessible through a browser on a laptop or phone.

The same core backend should serve future clients without tying task execution to a specific frontend.

## 19.2 Design goals

The interface should be:

- Clean.
- Modern.
- Responsive.
- Structured.
- Easy to scan.
- Useful for both short interactions and long-running work.
- Transparent about task state.
- Capable of showing rich results without overwhelming the user.
- Designed for quick intervention as well as passive monitoring.

## 19.3 Primary interface areas

### A. Main conversation

The primary place where the user communicates with the orchestrator.

It should support normal messages, task creation, progress updates, results, and contextual actions.

### B. Tasks

A dedicated view for current and historical tasks.

It should support filtering by state, worker, project, and time where useful.

### C. Workers

A view showing available workers, their roles, current activity, health, and configuration.

### D. Task detail

A focused view for a specific task, showing its plan, progress, worker assignments, logs, approvals, artifacts, and final result.

### E. Approvals and intervention

A queue of actions awaiting the user's decision.

### F. Integrations

A place to connect, configure, inspect, enable, disable, and revoke integrations.

### G. Skills

A place to inspect, manage, install, and eventually create reusable skills.

### H. Settings

A place to configure operating mode, model providers, projects, notifications, permissions, resource limits, and system preferences.

### I. System health

A view showing the status of essential services, the queue, the database, integrations, and worker execution capacity.

## 19.4 Chat-first, task-aware interaction

The primary interaction can remain chat-based, but the interface should not force every result into a text bubble.

When a user requests a deployment, the UI should be able to show deployment status and a result link.

When a task is running, it should show a task card with status and progress.

When approval is needed, it should show a structured approval request.

When a worker produces a file, the interface should display the artifact and provide access to it.

## 19.5 Generative UI

MicroDots should support structured, data-driven UI components that adapt to the task.

Examples include:

- Task cards.
- Progress indicators.
- Approval panels.
- Deployment summaries.
- Test-result summaries.
- File lists.
- Research citations.
- Browser-session status.
- Logs.
- Tables.
- Configuration forms.

The system should use a validated component schema or registry.

The model may select a supported component and supply validated data, but arbitrary model-generated executable code must not be executed in the user's browser.

The UI renderer should validate component types, required fields, URLs, and actions before rendering or invoking them.

## 19.6 Conversation and task relationship

A conversation may contain multiple tasks, and a task may involve multiple workers.

The data model should not assume that one conversation equals one task or that every message starts a new task.

The user should be able to return to an existing task and provide additional instructions without losing its history.

## 19.7 Avatar package

An existing avatar package is available and should be integrated rather than redesigned as part of the initial implementation.

Workers may use the existing avatar assets to create recognizable identities in the UI.

Avatar selection, customization, and additional visual polish can be refined later without affecting the worker architecture.

## 19.8 Responsive behavior

The initial PWA should work on laptop and mobile browser sizes.

The layout should prioritize readable task status, accessible controls, clear approval flows, and usable task details on smaller screens.

## 19.9 Accessibility

The client should use semantic controls, visible focus states, readable contrast, appropriate labels, and accessible status announcements.

Important task state should not be conveyed through color alone.

---

# 20. Mobile Application Strategy

## 20.1 Future native client

A React Native application is planned as a later client.

It should connect to the same backend and use the same core task, worker, notification, and authorization APIs.

## 20.2 Mobile capabilities

The mobile client should eventually support:

- Conversation with the orchestrator.
- Task status and progress.
- Approval requests.
- Notifications.
- Worker status.
- Task results.
- Basic integration and system settings.
- Human intervention for eligible workflows.

## 20.3 Shared backend requirement

Native mobile support must not require the backend to be rewritten.

Client-specific features such as native push notifications should be implemented through adapters or dedicated client capabilities.

## 20.4 Installation experience

The long-term goal is a simple experience for installing and accessing MicroDots.

The exact distribution method for the native client can be decided later. It should not delay the PWA or change the server-side task architecture.

---

# 21. Installation and Setup Experience

## 21.1 Goal

A user should be able to install MicroDots on a supported VPS without manually wiring together the entire application.

The installer is part of the product, not an afterthought.

## 21.2 Installation responsibilities

The installation process should:

1. Check the operating system and architecture.
2. Verify supported prerequisites.
3. Check the available system resources.
4. Check required ports and relevant network conditions.
5. Inspect existing MicroDots installations.
6. Detect installed dependencies before installing them.
7. Check OpenCode before attempting to install it.
8. Reuse compatible existing dependencies where possible.
9. Install missing required dependencies.
10. Configure application services.
11. Initialize the database.
12. Apply database migrations.
13. Create protected application configuration.
14. Configure secure service startup.
15. Establish the required authentication and access controls.
16. Provide a safe setup process for model-provider credentials.
17. Configure essential services and health checks.
18. Start the application.
19. Verify the installation.
20. Present the user with the initial setup or access page.
21. Report any incomplete steps with actionable explanations.

## 21.3 Dependency detection

The installer should inspect dependencies before installing them, not blindly reinstall everything.

For each dependency, it should determine whether the existing installation is present and usable, whether its version is supported, and whether additional configuration is required.

Where an existing installation is compatible, MicroDots should reuse it where feasible.

Where it is incompatible, the installer should explain the issue and follow a defined upgrade or repair path.

## 21.4 OpenCode installation requirement

OpenCode must be treated as a first-class dependency of the coding-worker subsystem.

The installer must:

- Check for an existing executable and determine its version.
- Validate compatibility with the MicroDots adapter.
- Reuse a compatible installation.
- Install OpenCode only when it is missing.
- Use a tested, supported installation method.
- Avoid unintentionally installing conflicting release tracks.
- Preserve existing configuration.
- Repair or upgrade only through a defined, safe process.
- Verify that the coding worker can use the installed OpenCode interface.
- Clearly report when coding capability is unavailable.

The installer should distinguish a missing OpenCode binary from an unavailable model provider or invalid API credentials. These are different failure conditions and require different remedies.

## 21.5 Installation idempotency

Running the installer again should not create a second application installation, duplicate configuration, destroy existing data, or unnecessarily reinstall working dependencies.

It should detect the current state and apply only the changes needed to reach a supported state.

## 21.6 Configuration

The setup process should support configuration of:

- Application access.
- Model provider and credentials.
- Database.
- Project workspace locations.
- Integrations.
- Worker defaults.
- Operating mode.
- Resource limits.
- Notification preferences.
- Network and deployment settings appropriate to the installation.

Not every setting needs to be required during the first installation. Optional configuration should be available later in the application.

## 21.7 Service startup

MicroDots should run as a managed background service on supported VPS environments.

The service should start according to the installation's configured startup policy and recover from eligible process failures.

The client must not be responsible for keeping the orchestrator alive.

## 21.8 Health checks

The installer should verify essential services, including:

- Backend API.
- Database connectivity.
- Durable task execution.
- Worker runtime.
- OpenCode availability where the coding subsystem is enabled.
- Required integration adapters.
- Notification configuration where applicable.

A service should not be reported as healthy merely because its process exists.

## 21.9 Upgrades

The product should support safe upgrades.

Upgrade requirements include:

- Version checks.
- Configuration preservation.
- Database migration.
- Backup or recovery strategy for important persistent data.
- Health checks after upgrade.
- Clear reporting of incomplete migrations.
- Documented recovery steps.
- Compatibility checks for important dependencies.

## 21.10 Uninstallation

The project should define a safe uninstallation procedure.

It should distinguish application files and services from user data, credentials, task history, project files, and externally created resources.

Destructive removal of persistent user data should require explicit confirmation.

---

# 22. Hosting, Runtime, and Infrastructure

## 22.1 Self-hosted model

Each installation should be able to operate on the user's own supported VPS.

MicroDots should not require a centralized MicroDots-operated execution service to perform its core tasks.

External model providers and connected applications may still require their own accounts, APIs, or services.

## 22.2 Proposed technology stack

The following is the proposed starting stack, subject to implementation validation.

### Frontend

- React.
- TypeScript.
- Vite.
- PWA capabilities.

### Backend

- Node.js.
- TypeScript.
- Fastify or an equivalent well-supported API framework.

### Database

- PostgreSQL for durable application data.

### Task execution

- A durable queue and worker runtime appropriate for the deployment.

### Coding capability

- OpenCode through its supported CLI and/or headless server interfaces.

### Browser automation

- Playwright or an equivalent supported automation framework.

### Integrations

- MCP clients.
- Official API adapters.
- Controlled CLI executors.

### Deployment

- Docker Compose or an equivalent maintainable deployment arrangement.
- HTTPS termination through a suitable reverse proxy or deployment configuration.
- Managed background services.

The stack should remain modular, but unnecessary technology choices should not be added before there is a clear requirement.

## 22.3 Resource awareness

MicroDots should support smaller VPS configurations for early deployments while recognizing that AI orchestration, browsers, coding tools, databases, and concurrent jobs consume resources.

The system should expose practical health information and apply configurable concurrency limits.

## 22.4 Model provider abstraction

The orchestrator and other AI workers should use a provider abstraction where feasible.

The architecture should avoid coupling all task orchestration logic to one model provider.

Model selection, credentials, context limits, and provider-specific capabilities should be managed through configuration.

Different workers may use different models when supported and justified by their requirements.

## 22.5 Resource and cost controls

Where the provider and execution environment expose the necessary information, MicroDots should track:

- Task duration.
- Model usage.
- Estimated or reported token usage.
- External service usage.
- Execution resource consumption.
- Configured spending or usage limits.

The system must distinguish actual measured usage from estimates.

## 22.6 Network security

The application should expose only the network services necessary for normal operation.

Administrative services, databases, internal worker endpoints, and coding-worker interfaces should not be exposed publicly by default.

Secure remote access should be documented as part of deployment.

---

# 23. Data Model

The initial database schema should support the full product architecture without requiring every feature to be exposed immediately.

The following are logical entities. They may be represented by multiple physical tables as the implementation evolves.

## 23.1 User and authentication records

Represent the authorized user or users, authentication state, and access configuration.

The first deployment may focus on a single owner, but ownership and authorization should be modeled explicitly.

## 23.2 Projects and workspaces

Represent projects, repository locations, working directories, environments, and relevant project settings.

## 23.3 Conversations and messages

Store conversation metadata, user messages, orchestrator messages, and references to associated tasks.

## 23.4 Tasks

Store the task objective, state, priority, dependencies, scope, timestamps, and result references.

## 23.5 Worker definitions

Store worker identity, role, configuration, skills, permissions, enabled state, and other durable settings.

## 23.6 Worker runs

Store individual executions, including assigned tasks, runtime state, session references, timing, and outcomes.

## 23.7 Tool registry

Store or reference registered tools, supported operations, configuration metadata, and permission definitions.

## 23.8 Integrations

Store integration metadata, connection status, configuration references, and health information.

Credentials should be stored or referenced through a protected mechanism.

## 23.9 Skills

Store skill definitions, versions, activation state, requirements, and project or worker associations.

## 23.10 Rooms and worker messages

Store collaboration rooms, membership, messages, references to shared results, and associated tasks.

## 23.11 Task events

Store durable execution events and state-transition history.

## 23.12 Approval requests

Store the requested operation, scope, requester, decision, decision-maker, timestamps, and expiration where applicable.

## 23.13 Artifacts

Store metadata and references for task outputs such as files, reports, test results, and deployment information.

## 23.14 Audit records

Store security-relevant operations, permission changes, execution decisions, approvals, and administrative changes.

## 23.15 Notifications

Store notification events, delivery state where applicable, and references to the associated tasks.

## 23.16 Configuration and migrations

Maintain versioned application configuration where appropriate and use database migrations to evolve the schema safely.

---

# 24. API and Internal Contracts

## 24.1 API principles

The backend API should be designed around stable resources and operations rather than frontend-specific assumptions.

The API should support authentication, authorization, input validation, pagination where needed, consistent error formats, and versioning where appropriate.

## 24.2 Core resource groups

The eventual API should cover:

- Conversations.
- Messages.
- Tasks.
- Task events.
- Workers.
- Worker runs.
- Projects.
- Skills.
- Integrations.
- Tools.
- Approvals.
- Artifacts.
- Notifications.
- Configuration.
- System health.

## 24.3 Task execution contract

A task request should carry the user's objective and the relevant execution context.

The backend should return a task reference and current state, rather than holding the initial request open until a long-running operation finishes.

## 24.4 Event contract

Events should have a consistent structure containing, where applicable:

- Event identifier.
- Event type.
- Task identifier.
- Worker identifier.
- Timestamp.
- State or progress data.
- Structured payload.
- Relevant error information.

## 24.5 Internal adapter contracts

Integrations and worker executors should expose consistent contracts for capability discovery, input validation, execution, cancellation where supported, result reporting, and health checks.

This makes integrations easier to replace and test.

---

# 25. Error Handling and Recovery

## 25.1 Error categories

The system should distinguish:

- Invalid user request.
- Missing configuration.
- Authentication failure.
- Authorization denial.
- Model-provider failure.
- Integration failure.
- OpenCode failure.
- Browser failure.
- CLI execution failure.
- Resource exhaustion.
- Network interruption.
- Task timeout.
- Database failure.
- Unexpected worker termination.
- External operation with uncertain outcome.

## 25.2 Error reporting

Errors should be recorded with sufficient context to diagnose the problem without exposing secrets.

The user should receive a clear explanation of what failed and what can happen next.

## 25.3 Recovery behavior

Where possible, MicroDots should:

- Retry transient failures.
- Resume interrupted tasks.
- Recreate eligible worker processes.
- Reconnect to supported sessions.
- Reconcile the current state of external operations.
- Preserve partial results.
- Ask the user for intervention when automatic recovery is not appropriate.

## 25.4 Avoid false success

A worker's claim that it completed an action is not sufficient evidence by itself.

Where possible, MicroDots should verify the result through the relevant API, tool response, test result, deployment status, or other authoritative signal.

If verification is incomplete, the final task status should reflect that uncertainty.

---

# 26. Security, Privacy, and Trust

## 26.1 Security objective

MicroDots is an application that can access code, credentials, websites, and infrastructure. Its security model must assume that mistakes, compromised integrations, malicious webpage content, and misleading model outputs are possible.

## 26.2 Core security requirements

- Authenticate access to the application.
- Enforce authorization on the backend.
- Apply least-privilege access.
- Isolate projects and execution contexts where appropriate.
- Protect credentials.
- Use secure transport for remote access.
- Validate tool inputs.
- Apply execution timeouts and resource limits.
- Maintain audit records.
- Restrict administrative endpoints.
- Prevent workers from bypassing policy enforcement.
- Support credential revocation.
- Provide safe backup and recovery procedures.

## 26.3 Untrusted content

External content may contain instructions intended to manipulate an AI worker.

This includes webpages, repository files, issue descriptions, documents, MCP outputs, and tool results.

Such content must be treated as data rather than as authority to override MicroDots policies, reveal secrets, or expand permissions.

## 26.4 Auditability

The system should make it possible to determine:

- Which task requested an operation.
- Which worker initiated it.
- Which tool or integration executed it.
- Which authorization decision was applied.
- Whether approval was required.
- What the outcome was.
- Which relevant configuration or permission applied at the time.

## 26.5 Data ownership

The self-hosted model should allow users to control their stored conversations, task history, projects, and configuration.

Data retention and deletion behavior should be documented.

## 26.6 Backup and recovery

The project should document which data must be backed up, how backups are protected, how restoration works, and which external states cannot be restored solely from a database backup.

---

# 27. Observability and System Health

## 27.1 Purpose

Users need to know whether MicroDots is functioning, not just whether the web page loads.

## 27.2 Health indicators

The system should expose meaningful status for:

- Backend API.
- Database.
- Durable queue.
- Worker runtime.
- OpenCode integration.
- Model providers.
- Browser execution.
- Configured integrations.
- Notification service.
- Storage capacity.
- Resource pressure.

## 27.3 Operational logs

Logs should help diagnose problems across task creation, orchestration, worker execution, tool calls, and recovery.

They should use task and worker identifiers to connect related events.

Sensitive data must be redacted.

## 27.4 Metrics

Where practical, collect:

- Task counts by state.
- Task completion and failure rates.
- Task duration.
- Queue depth.
- Worker utilization.
- Retry counts.
- Integration errors.
- Resource utilization.
- Provider usage and costs where available.

These metrics should help the user understand bottlenecks without requiring them to operate a separate observability platform.

---

# 28. Open-Source and Extensibility Strategy

## 28.1 Open-source objective

MicroDots should be designed for public inspection, contributions, self-hosting, and extension by its community.

## 28.2 Extension points

The architecture should make it practical to extend:

- Worker types.
- Tool adapters.
- MCP integrations.
- CLI integrations.
- Browser workflows.
- Skills.
- Model providers.
- UI components from a controlled registry.
- Notification channels.
- Deployment and installation support.

## 28.3 Contribution quality

The project should document its architecture, setup process, extension interfaces, testing expectations, security boundaries, and compatibility requirements.

## 28.4 License

**Resolved 2026-10-28:** the project uses **AGPL-3.0-only** ([ADR-0009](./adr/0009-license-agpl.md), [`LICENSE`](../LICENSE)). The SDK/contracts license remains open as D17. Any dependency must be compatible with AGPL-3.0-only.

## 28.5 Compatibility

Where feasible, extensions should declare compatibility with the MicroDots version and the capabilities they require.

The system should make incompatible extensions visible rather than silently attempting to execute them.

---

# 29. Functional Requirements Catalogue

This section gives the project a stable reference system for future planning. Requirement IDs can later be mapped to implementation tasks, tests, and releases.

## 29.1 Orchestration

- **ORC-001:** The system must provide one primary conversational orchestrator.
- **ORC-002:** The orchestrator must classify requests as conversation, immediate action, or task-based work.
- **ORC-003:** The orchestrator must break complex requests into tasks where appropriate.
- **ORC-004:** The orchestrator must assign work to suitable workers.
- **ORC-005:** The orchestrator must track dependencies between tasks.
- **ORC-006:** The orchestrator must consolidate results from multiple workers.
- **ORC-007:** The orchestrator must communicate meaningful progress and blockers.
- **ORC-008:** The orchestrator must not treat its own decision as sufficient authorization for a restricted action.

## 29.2 Workers

- **WRK-001:** Workers must have distinct identities and configurations.
- **WRK-002:** Workers must have explicitly defined capabilities.
- **WRK-003:** Worker runs must be associated with tasks.
- **WRK-004:** Independent tasks must be eligible for concurrent execution.
- **WRK-005:** Worker execution must respect resource limits.
- **WRK-006:** Worker failures must be recorded and recoverable where possible.
- **WRK-007:** Workers must be configurable and extensible.
- **WRK-008:** Room membership must not grant additional permissions.

## 29.3 Permissions and execution

- **SEC-001:** All consequential tool operations must pass through the authorization boundary.
- **SEC-002:** Workers must not receive unrestricted host-level execution by default.
- **SEC-003:** Permission checks must consider worker, task, resource, operation, and policy.
- **SEC-004:** Restricted operations must be denied or sent through approval.
- **SEC-005:** Secrets must be protected from unauthorized access and log exposure.
- **SEC-006:** Authorization decisions must be auditable.
- **SEC-007:** Untrusted external content must not override system policy.
- **SEC-008:** Operating modes must not disable global safety rules.

## 29.4 Tasks and persistence

- **TSK-001:** Tasks must be stored persistently.
- **TSK-002:** Tasks must survive client disconnection.
- **TSK-003:** Eligible tasks must recover after backend restart.
- **TSK-004:** Task states must be validated.
- **TSK-005:** Tasks must support dependencies and retries.
- **TSK-006:** Tasks must support cancellation where possible.
- **TSK-007:** Results and artifacts must be associated with their tasks.
- **TSK-008:** Duplicate events must not cause unintended duplicate execution.

## 29.5 OpenCode

- **OPC-001:** The installer must detect OpenCode before attempting installation.
- **OPC-002:** A compatible existing OpenCode installation must be reused.
- **OPC-003:** OpenCode must be installed if it is missing and the coding subsystem is being provisioned.
- **OPC-004:** Existing incompatible installations must follow a safe repair or upgrade path.
- **OPC-005:** Existing configuration must not be overwritten without authorization.
- **OPC-006:** The installed version must be checked against the supported compatibility policy.
- **OPC-007:** OpenCode availability and health must be verified.
- **OPC-008:** Coding tasks must be associated with MicroDots task records.
- **OPC-009:** Coding execution must respect project and worker permissions.
- **OPC-010:** OpenCode failure must not be confused with provider authentication or configuration failure.

## 29.6 Integrations

- **INT-001:** The system must support a common integration interface.
- **INT-002:** MCP must be supported where appropriate.
- **INT-003:** Approved CLI integrations must be supported.
- **INT-004:** Official API adapters must be possible.
- **INT-005:** Browser automation must be available as an extensible capability.
- **INT-006:** Integrations must expose meaningful health and error states.
- **INT-007:** Tool inputs and outputs must be validated.
- **INT-008:** Integrations must not automatically receive unrestricted permissions.

## 29.7 Skills

- **SKL-001:** Skills must be represented independently from tools.
- **SKL-002:** Skills must define required inputs and expected outputs.
- **SKL-003:** Skills must identify their required capabilities.
- **SKL-004:** Skills must not grant permissions.
- **SKL-005:** Skills must support versioning.
- **SKL-006:** Users must eventually be able to enable, disable, install, and create skills.
- **SKL-007:** Skill execution must respect worker and project scope.

## 29.8 Browser automation

- **BRW-001:** Browser sessions must be associated with authorized tasks.
- **BRW-002:** Browser access must respect the configured scope.
- **BRW-003:** Browser workflows must support pause and human intervention.
- **BRW-004:** Browser state and task state must be managed separately.
- **BRW-005:** Browser content must be treated as untrusted input.
- **BRW-006:** Browser execution must be observable.
- **BRW-007:** Human takeover must not bypass security controls.

## 29.9 Client and UI

- **UI-001:** The initial client must be a responsive PWA.
- **UI-002:** The client must provide conversation and task views.
- **UI-003:** The client must show worker status.
- **UI-004:** The client must support approvals and intervention.
- **UI-005:** The UI must support structured task results.
- **UI-006:** Model-selected UI components must be validated against a controlled schema.
- **UI-007:** Client disconnection must not terminate backend tasks.
- **UI-008:** The existing avatar package should be integrated.
- **UI-009:** The backend must support a future React Native client.

## 29.10 Notifications

- **NTF-001:** The system must record important notification events.
- **NTF-002:** The user must be notified about important completion and failure events.
- **NTF-003:** Approval and intervention requirements must remain visible if push delivery fails.
- **NTF-004:** Notifications must link to relevant task context where practical.
- **NTF-005:** Notification channels must be extensible.

## 29.11 Installation and maintenance

- **INS-001:** The installer must check supported environment prerequisites.
- **INS-002:** The installer must detect existing dependencies before installing them.
- **INS-003:** The installer must check OpenCode before installing it.
- **INS-004:** The installer must reuse compatible dependencies where feasible.
- **INS-005:** The installer must initialize and validate persistent storage.
- **INS-006:** The installer must configure protected application settings.
- **INS-007:** The installer must verify service health.
- **INS-008:** Re-running the installer must not cause unnecessary duplication or destructive changes.
- **INS-009:** Upgrades must preserve important configuration and data.
- **INS-010:** Uninstallation must distinguish application files from persistent user data.

---

# 30. Non-Functional Requirements

## 30.1 Reliability

- Persistent task state must be stored independently of client state.
- Important state transitions must be recoverable.
- Task failures must be visible and diagnosable.
- Recovery mechanisms must avoid duplicate consequential actions where possible.

## 30.2 Security

- The backend must enforce access control.
- Worker permissions must follow least privilege.
- Secrets must be protected.
- Internal services must not be publicly exposed by default.
- Approval and audit behavior must be consistent across operating modes.

## 30.3 Performance

- Normal UI interactions should not wait for long-running tasks to finish.
- Task submission should return promptly with a durable task reference.
- Progress updates should arrive without requiring manual page refreshes.
- Background concurrency must remain within configured resource limits.

## 30.4 Maintainability

- Core orchestration logic should be separated from provider- and tool-specific implementations.
- Integrations should use stable internal contracts.
- Database changes should use migrations.
- Critical components should have automated tests.
- Installation and recovery procedures should be documented.

## 30.5 Extensibility

- New workers should not require rewriting the orchestration core.
- New tools should be registered through controlled interfaces.
- New skills should not require modifications to the backend for each workflow.
- New client applications should reuse the backend task and permission model.

## 30.6 Usability

- The user should be able to tell what the system is doing.
- The user should be able to locate blocked tasks and pending approvals.
- Important failures should have actionable explanations.
- The application should remain usable on laptop and mobile browser sizes.

## 30.7 Portability

The deployment and installer should support a documented set of environments and architectures. Support for additional platforms should be added deliberately rather than assumed.

---

# 31. Acceptance Criteria for the Overall Product

The complete product should eventually satisfy the following scenarios.

## AC-001 — Persistent task

The user starts a task, closes the PWA, and later returns to find the correct current task state and its recorded results.

## AC-002 — Multi-worker task

The orchestrator divides a request into multiple tasks, assigns workers, respects dependencies, and consolidates their results.

## AC-003 — Permission boundary

A worker attempts an operation outside its assigned permissions. The gateway denies it or requests the required approval, and the attempt is recorded.

## AC-004 — Room isolation

Two workers collaborate in the same room, but one cannot use the other's permissions or credentials merely because they share the room.

## AC-005 — Operating modes

The same workflow behaves according to Restricted, Balanced, or Autonomous mode while preserving mandatory security boundaries.

## AC-006 — OpenCode already installed

The installer detects a compatible OpenCode installation, verifies it, and reuses it without unnecessary reinstallation.

## AC-007 — OpenCode missing

The installer detects that OpenCode is absent, installs the supported version, verifies it, and makes the coding worker available.

## AC-008 — OpenCode incompatible

The installer identifies an incompatible installation and follows the defined safe repair or upgrade process without silently overwriting user configuration.

## AC-009 — OpenCode unavailable

The system distinguishes an unavailable coding runtime from a model-provider authentication failure and reports the correct recovery action.

## AC-010 — Browser intervention

A browser worker reaches a step requiring user intervention, pauses, notifies the user, and resumes through the authorized workflow.

## AC-011 — Skill execution

A worker uses a registered skill to complete a workflow while respecting the permissions of the worker and the task.

## AC-012 — Integration extensibility

A new supported integration can be added without redesigning the core task and orchestration system.

## AC-013 — Structured UI

A task produces structured results that the client renders through validated UI components rather than executing arbitrary model-generated code.

## AC-014 — Recovery

The backend restarts during eligible background work. The system recovers the task's stored state and either resumes safely or reports why recovery is not possible.

## AC-015 — Installer repeatability

The installer can be run against an existing supported installation without creating duplicates or unexpectedly deleting user data.

## AC-016 — Notification failure

A push notification fails to deliver, but the task and any pending approval remain recorded and visible in MicroDots.

---

# 32. Risks and Design Decisions

## 32.1 Overbuilding the first release

**Risk:** Attempting to implement every worker, integration, UI feature, and automation mode at once creates a large, fragile system.

**Response:** Keep the master requirements comprehensive but implement a small end-to-end slice first. Add capabilities incrementally without compromising the core architecture.

## 32.2 Building a chatbot instead of an operations system

**Risk:** Task state, worker execution, permissions, and recovery are implemented as secondary features attached to a conversation.

**Response:** Make tasks, worker runs, permissions, and durable events first-class backend concepts from the beginning.

## 32.3 Excessive agent complexity

**Risk:** Too many agents create unnecessary cost, coordination overhead, and debugging difficulty.

**Response:** Use specialized workers when their separate capability or execution environment provides a real benefit.

## 32.4 Uncontrolled execution

**Risk:** AI workers receive broad shell, filesystem, or credential access.

**Response:** Build the execution gateway and policy model before allowing meaningful external actions.

## 32.5 OpenCode coupling

**Risk:** MicroDots becomes a thin wrapper around OpenCode and cannot coordinate other capabilities independently.

**Response:** Isolate OpenCode behind an adapter and keep the orchestrator, task system, permissions, UI, and integrations independent.

## 32.6 Installer fragility

**Risk:** The installer overwrites an existing dependency, installs conflicting versions, or misdiagnoses configuration errors.

**Response:** Make installation state-aware, idempotent, version-aware, and health-checked. Check OpenCode first and reuse compatible installations.

## 32.7 Browser fragility

**Risk:** Websites change, sessions expire, or browser automation fails halfway through a workflow.

**Response:** Prefer APIs and MCP where suitable, persist task state, expose errors, and support human takeover.

## 32.8 Resource exhaustion

**Risk:** Concurrent coding and browser tasks exhaust a small VPS.

**Response:** Implement resource-aware scheduling, worker limits, timeouts, queue visibility, and configurable concurrency.

## 32.9 Poor visibility

**Risk:** Workers run in the background but users cannot understand their status or failures.

**Response:** Make task status, event history, approvals, results, and system health visible.

## 32.10 Unsafe integrations or skills

**Risk:** A third-party skill or integration attempts to access unrelated resources or override system policy.

**Response:** Treat external content as untrusted, validate tool capabilities, require explicit permissions, and enforce policy outside the model.

---

# 33. Product Decisions to Confirm During Implementation

These items are deliberately left open where premature decisions could constrain the product.

1. **Project license:** Resolved — AGPL-3.0-only. See [ADR-0009](./adr/0009-license-agpl.md); SDK/contracts licensing remains D17.
2. **Supported installation environments:** Define the initial supported operating systems, architectures, and minimum resources.
3. **OpenCode compatibility policy:** Select and test the supported release track and version-management strategy.
4. **Queue technology:** Select a durable queue based on the deployment model and recovery requirements.
5. **Authentication model:** Decide how the initial single-owner installation is secured and how additional users may be supported later.
6. **Model providers:** Decide which providers to support initially and how credentials are configured.
7. **Approval defaults:** Define which operation classes require approval in each mode.
8. **Browser isolation:** Select the supported browser runtime and session-persistence strategy.
9. **Artifact storage:** Decide how generated files and other outputs are stored and served.
10. **Native mobile distribution:** Determine the later React Native release and distribution strategy.
11. **Extension packaging:** Define the supported packaging and trust model for third-party skills and integrations.
12. **Data retention:** Define default retention and deletion policies for tasks, events, logs, and artifacts.

These decisions should be recorded as the project progresses rather than silently assumed.

---

# 34. Delivery Strategy

This document describes the complete product scope. It is not an instruction to implement the entire specification in one release.

The implementation plan should be created separately from this master PRD.

## 34.1 Architectural requirements that must be considered early

Some capabilities may be implemented later but still need to influence the initial design.

These include:

- Persistent task records.
- Explicit worker identity and permissions.
- A controlled execution boundary.
- Durable task events.
- Separation between the client and background execution.
- An OpenCode adapter rather than direct coupling.
- An extensible tool interface.
- Versioned configuration and database migrations.
- An installer that detects existing dependencies.

These foundations reduce the likelihood of a major rewrite when advanced features are introduced.

## 34.2 Features that can mature incrementally

The following can begin with limited implementations:

- Worker types.
- Skills management.
- Integration catalog.
- Browser visualization.
- Generative UI component library.
- Usage analytics.
- Advanced scheduling.
- Native mobile experience.
- Advanced customization.
- Community extension distribution.

The first release does not need every capability to be complete, but the boundaries should be sufficiently clear to support later expansion.

## 34.3 End-to-end implementation principle

Each meaningful implementation increment should produce a working, testable slice of the product.

For example, a small initial implementation could accept a task, store it, run one authorized worker, stream its status, preserve its history, and display the result.

Additional workers, permissions, integrations, skills, and interface features can then be added progressively.

The goal is to avoid spending months building disconnected components that cannot yet complete a real user workflow.

## 34.4 Definition of completion

A feature is not complete merely because its UI exists or its AI can describe the intended behavior.

A feature should have:

- An implemented backend capability.
- Validated authorization.
- Persistent state where required.
- Error handling.
- Useful status reporting.
- Tests appropriate to its risk.
- Documentation.
- A verifiable end-to-end outcome.

---

# 35. Long-Term Product Direction

MicroDots should evolve toward a personal AI operations environment where the user can delegate a goal, monitor progress, intervene when necessary, and trust that the system respects the boundaries they have configured.

Over time, the platform may support richer worker collaboration, reusable workflows, additional integrations, more capable browser operations, improved scheduling, multiple client applications, and a community ecosystem.

The product should remain centered on the same fundamental model:

**One human-directed orchestrator. Multiple specialized workers. Persistent tasks. Extensible tools and skills. Controlled execution. Clear visibility. Human intervention when needed.**

The success of MicroDots will depend not on how many agents or integrations it advertises, but on whether it can reliably complete real work while remaining understandable, controllable, and maintainable.

---

# Appendix A — Core Terminology

| Term | Definition |
|---|---|
| MicroDots | The complete self-hosted AI operations platform. |
| Orchestrator | The primary AI that communicates with the user and coordinates work. |
| Worker | A specialized AI agent configured to perform particular types of tasks. |
| Worker run | A particular execution of a worker on a task. |
| Task | A persistent record of requested work and its execution state. |
| Room | A collaboration context for authorized workers. |
| Tool | A callable capability exposed through an approved interface. |
| Integration | A configured connection to an external application or system. |
| MCP | Model Context Protocol, used to connect compatible tools and services. |
| Skill | Reusable instructions and workflow guidance for completing a type of task. |
| Execution gateway | The controlled interface through which tool operations are authorized and executed. |
| Policy engine | The component that determines whether an operation is allowed, denied, or requires approval. |
| Approval | An explicit authorization for a defined operation and scope. |
| Artifact | A file, report, link, or other output produced by a task. |
| Operating mode | A user-selected level of automation and routine oversight. |
| Durable queue | Persistent scheduling infrastructure for background work. |
| PWA | Progressive Web App, the initial MicroDots client. |

# Appendix B — Core Product Rules

1. MicroDots is the product; OpenCode is a coding capability inside it.
2. The orchestrator coordinates work but does not independently override security policies.
3. Workers are distinct, configurable, permissioned entities.
4. Workers may collaborate, but collaboration does not transfer permissions.
5. Tasks and important events are persistent backend records.
6. Closing the client does not cancel background work.
7. MCP and suitable structured integrations are preferred; browser automation fills gaps.
8. Skills guide workflows but do not grant capabilities.
9. The three operating modes change the level of routine automation, not the fundamental security boundaries.
10. The installer checks dependencies before installing them.
11. The installer checks OpenCode before attempting to install it.
12. A compatible existing OpenCode installation should be reused.
13. Existing incompatible installations must be handled deliberately rather than blindly overwritten.
14. The PWA comes first; the native mobile client follows later.
15. The existing avatar package should be integrated rather than rebuilt in the initial implementation.
16. Generative UI must use validated components rather than executing arbitrary model-generated frontend code.
17. Every important action must have an observable outcome.
18. The complete product vision belongs in this master PRD; implementation phases and deliverables should be planned separately.
19. The system should ask the user when judgment or authorization is required, rather than pretending every task can be safely automated.
20. The first release should prove the core architecture with a small working workflow before expanding into the full platform.

---

**End of Master PRD**

This document is the source specification for the MicroDots product vision. Future implementation plans should reference its requirement IDs, identify the requirements being delivered, and record any deliberate changes to the product direction.