You are the lead architect and senior implementation engineer for this project. Build and complete the Security Platform exactly according to the requirements below. Treat this specification as the primary source of truth. Do not simplify the architecture, remove required functionality, or implement a temporary proof-of-concept where a production-ready design is required.

IMPORTANT CONTEXT

This project is conceptually based on the architecture and user experience of our existing WorkspaceSync project:

- TypeScript/Node.js CLI
- NPM package distribution
- one-command project setup
- separate AI-agent integration commands
- agent-specific MCP configuration
- agent-specific Skills deployment
- idempotent setup/update behavior
- discovery and diagnostics
- safe configuration merging
- clear CLI output
- reusable across many workspaces

The existing WorkspaceSync README establishes the desired pattern of:
1. Install/setup the project.
2. Install the integration for the specific AI agent.
3. Let the AI agent use the installed MCP server and Skills.

Follow the same philosophy for this Security Platform, but extend it for security-tool orchestration, Docker-based security services, vulnerability investigation, evidence collection, validation, and reporting.

PRIMARY OBJECTIVE

Create a public GitHub project distributed primarily as an NPM package that provides a complete AI-driven authorized security assessment platform.

The user should NOT have to manually install Strix, OWASP ZAP, Nuclei, MobSF, MCP servers, or individual security dependencies.

The NPM package must be the single user-facing entry point.

The intended experience is:

FIRST COMPUTER SETUP:

npm install -g @<organization>/security-platform

security setup

After this single setup command, the computer should have the complete security runtime configured, including Docker integration, required Docker images/services, networks, volumes, orchestrator, MCP server, Skills, configuration, and diagnostics.

PROJECT SETUP:

cd <any-project>

security setup

This should configure the current workspace without installing another copy of the security tools.

AGENT SETUP:

security install codex
security install claude
security install antigravity
security install copilot

The command must configure the selected AI agent's MCP integration and deploy the appropriate Security Skills into that agent's native Skills location.

Then the AI agent should be able to execute:

"Run a complete security assessment of this workspace."

or an appropriate slash/agent command such as:

/security

The AI agent should then automatically inspect the workspace, understand its security profile, use the Security MCP, orchestrate the appropriate tools, investigate findings, validate important findings, collect sanitized evidence, correlate duplicates, and generate a developer-ready security report.

==================================================
1. CORE ARCHITECTURE
==================================================

Use this architecture:

NPM Package
    ↓
Security CLI
    ↓
Global Security Platform
    ↓
Docker/Compose Runtime
    ↓
Security Orchestrator
    ↓
MCP Server
    ↓
AI Agent
    ↓
Agent-specific Skills

The Docker runtime should use multiple specialized images/containers rather than one giant security image.

Recommended conceptual services:

- security-orchestrator
- security-mcp
- strix
- zap
- nuclei
- mobsf

Additional services may be introduced only when technically justified.

The user must experience this as ONE security platform, even though multiple containers/images are used internally.

DO NOT build a giant monolithic Docker image containing every security tool unless there is a compelling technical reason.

Use specialized containers so tools can be independently updated, isolated, versioned, and restarted.

Docker Compose should orchestrate the complete stack.

The NPM CLI should control the stack.

The user should never need to manually execute docker-compose commands for normal operation.

==================================================
2. NPM PACKAGE
==================================================

Create a proper NPM package with a CLI such as:

security

The package must support:

security --help
security --version

security setup
security install <agent>
security doctor
security status
security update
security repair

security scan
security scan --full
security scan --web
security scan --api
security scan --mobile
security scan --webview
security scan --windows

security findings
security report

The exact command names may be improved if necessary, but preserve the simple user experience.

The NPM package is the installation/control/orchestration layer.

Do NOT package huge third-party security binaries directly into the NPM package.

Use Docker images, official packages, or official distribution mechanisms for third-party security tools.

==================================================
3. FIRST-TIME COMPUTER INSTALLATION
==================================================

The primary setup command must be:

security setup

When executed for the first time on a computer, it must:

1. Detect OS.
2. Detect Windows/Linux/macOS where supported.
3. Detect Node.js.
4. Detect npm.
5. Detect Git.
6. Detect Docker.
7. Detect Docker Compose.
8. Detect Docker Desktop on Windows.
9. Detect WSL2 where required.
10. Verify Docker daemon availability.
11. Create the global security installation directory.
12. Create Docker networks.
13. Create Docker volumes.
14. Pull/build required security images.
15. Start required services.
16. Wait for service health checks.
17. Configure the Security Orchestrator.
18. Configure the MCP server.
19. Install/register global Security Skills.
20. Verify every service.
21. Generate a final installation summary.

On Windows the default global installation root should support:

D:\AI_Tools\security-lab

The path must be configurable and must NOT be hard-coded in a way that prevents other computers from using the project.

The installer must work regardless of the user's current working directory.

==================================================
4. CURRENT WINDOWS INSTALLER BUG — MUST BE FIXED
==================================================

The current Windows installer reaches:

[INFO] Waiting for the Docker daemon to become ready (up to 90 seconds)...

and then appears to hang.

This is unacceptable.

The installer must NEVER wait indefinitely.

Implement a robust Docker readiness state machine:

START
  ↓
Detect Docker CLI
  ↓
Detect Docker Desktop
  ↓
Start Docker Desktop if appropriate
  ↓
Poll Docker daemon
  ↓
Check docker info / equivalent health signal
  ↓
If READY → continue
  ↓
If TIMEOUT → stop and show diagnostics

The timeout must be enforced reliably.

Do not use a blocking loop without a hard deadline.

After timeout, display:

- Docker CLI version
- Docker Desktop detection result
- Docker daemon status
- Docker context
- current Docker endpoint
- relevant error output
- whether Docker Desktop appears to be running
- whether WSL2 appears available
- suggested remediation

Then exit with a non-zero status.

Never silently close the terminal.

Never silently swallow stderr.

Every subprocess must have:

- timeout
- exit-code handling
- stdout/stderr capture
- actionable error message

The installer must distinguish:

1. Docker CLI missing
2. Docker Desktop missing
3. Docker Desktop installed but not running
4. Docker daemon starting
5. Docker daemon unavailable
6. Docker daemon ready
7. WSL2 unavailable
8. permission/access issue
9. Docker context misconfigured

On Windows, do not assume that launching Docker Desktop automatically means the daemon is immediately ready.

Poll with a bounded timeout and exponential/backoff or reasonable interval.

==================================================
5. WINDOWS BATCH INSTALLER
==================================================

The repository must provide:

install.bat

It must be a real Windows batch script.

Do NOT use Bash syntax inside it.

It must:

- locate the repository root reliably
- work when launched from another directory
- correctly quote paths
- correctly handle spaces
- correctly expand environment variables
- correctly invoke PowerShell where necessary
- propagate exit codes
- stop on fatal errors
- display errors
- never silently close
- provide diagnostic output
- have safe retry behavior
- verify prerequisites
- verify Docker
- verify npm
- verify Node
- verify Git
- verify installation

Use robust batch patterns such as appropriate SETLOCAL behavior and explicit error handling.

Do not rely on fragile current-directory assumptions.

If a fatal error occurs, show the error and remediation before exiting.

==================================================
6. LINUX INSTALLER
==================================================

Provide:

install.sh

It must:

- use valid Bash syntax
- use strict error handling appropriately
- locate repository root
- work from any working directory
- detect Linux distribution where necessary
- verify Node/npm/Git/Docker
- detect Docker daemon state
- provide actionable errors
- install/configure the NPM package
- configure Docker services
- configure MCP
- configure Skills
- perform health checks
- never silently ignore errors

Do not force-install system packages without clearly understanding the environment.

Keep OS-specific behavior isolated.

==================================================
7. DOCKER ARCHITECTURE
==================================================

Use Docker Compose as the runtime orchestrator.

Recommended:

docker/
    compose.yml
    compose.dev.yml
    compose.test.yml
    configs/
    healthchecks/

Use multiple specialized services.

At minimum evaluate:

- Strix
- OWASP ZAP
- Nuclei
- MobSF
- Security Orchestrator
- Security MCP

Use official/current distributions wherever possible.

Before implementation, inspect current official documentation/repositories for each tool.

Do not invent CLI flags, image names, MCP interfaces, or unsupported integration behavior.

Pin versions where practical for reproducibility.

Support controlled updates.

Use:

- private Docker networks
- persistent volumes where needed
- health checks
- resource controls where appropriate
- restart policies
- explicit environment configuration
- no unnecessary public ports

Do not expose administration interfaces publicly by default.

==================================================
8. WHY DOCKER EXISTS IN THIS PROJECT
==================================================

Docker is the runtime isolation layer.

NPM is the control/installation layer.

NPM should control Docker.

Docker should run the heavy security services.

This gives:

- reproducibility
- dependency isolation
- easier upgrades
- cleaner host machine
- consistent versions
- easier cross-computer setup
- easier service lifecycle management

The user should only need to understand:

npm install -g @<organization>/security-platform

security setup

The internal Docker complexity should be hidden behind the CLI.

==================================================
9. GLOBAL VS PROJECT INSTALLATION
==================================================

There are two distinct setup levels.

LEVEL 1 — COMPUTER/GLOBAL SETUP

security setup

This prepares the entire security runtime.

LEVEL 2 — WORKSPACE/PROJECT SETUP

Inside any project:

security setup

The CLI must determine whether the global platform already exists.

If it exists:

- reuse it
- verify it
- repair missing components
- do not duplicate Docker images unnecessarily

Project setup should create only lightweight configuration.

Recommended:

.security/
    config.yaml
    scope.yaml
    profile.yaml
    README.md

Do NOT copy Strix/ZAP/Nuclei/MobSF into every project.

Do NOT create duplicate Docker runtimes for every project unless explicitly required for isolation.

The project must reference the centralized security platform.

==================================================
10. IDE/AI AGENT INTEGRATION
==================================================

Follow the existing WorkspaceSync model:

FIRST:

security setup

SECOND:

security install <agent>

Supported agents should be designed through an adapter architecture.

Examples:

security install claude
security install codex
security install antigravity
security install copilot
security install cursor
security install gemini
security install opencode
security install agents

The actual supported list must be based on verified current agent configuration conventions.

Each agent adapter must know:

- MCP configuration location
- MCP configuration format
- Skills directory
- required command/registration format
- whether global or workspace-local configuration is appropriate

Do not assume every AI agent uses the same configuration format.

Codex, Claude Code, Antigravity, Copilot, etc. may have different configuration models.

Implement separate adapters.

==================================================
11. MCP INTEGRATION
==================================================

Create a dedicated Security MCP server.

The MCP layer should expose high-level security operations rather than exposing every low-level scanner flag.

Conceptual tools:

security.discover
security.scope
security.recon
security.scan
security.web.scan
security.api.scan
security.mobile.scan
security.webview.scan
security.windows.scan
security.investigate
security.validate
security.findings
security.evidence
security.report
security.assessment

The exact MCP schema must follow the current MCP specification and the actual capabilities of the implementation.

Do not invent unsupported functionality.

The MCP server must run safely and only operate within configured scope.

==================================================
12. SECURITY SKILLS
==================================================

Create reusable Skills:

security-assessment
security-discovery
laravel-security
api-security
android-security
webview-security
windows-security
vulnerability-validation
security-reporting
security-doctor

The master skill should instruct the AI agent how to:

- understand scope
- inspect project
- identify applicable testing profiles
- call Security MCP tools
- interpret scanner results
- inspect source code
- investigate findings
- validate findings safely
- collect evidence
- avoid secrets
- correlate duplicates
- generate reports

The Skills must NOT assume that every project contains every technology.

The AI should dynamically select relevant workflows.

==================================================
13. PROJECT AUTO-DETECTION
==================================================

When:

security setup

is executed inside a workspace, automatically inspect:

composer.json
artisan
package.json
Dockerfile
docker-compose files
OpenAPI/Swagger files
APK/AAB files
Android project markers
Gradle files
*.csproj
*.sln
*.appx
Windows WebView indicators
other relevant project markers

Detect:

- Laravel
- PHP
- Node
- REST API
- OpenAPI
- Android
- WebView
- Windows application
- Docker
- other relevant technologies

Generate:

.security/profile.yaml

Example:

detected:
  laravel: true
  api: true
  android: true
  windows: false
  webview: true

enabled_profiles:
  - laravel
  - web
  - api
  - android
  - webview

==================================================
14. LARAVEL SECURITY
==================================================

The platform must support deep Laravel analysis.

Inspect, where applicable:

- routes
- controllers
- middleware
- policies
- gates
- models
- migrations
- validation
- authentication
- authorization
- Sanctum
- Passport
- sessions
- CSRF
- file uploads
- storage
- queues
- jobs
- events
- broadcasting
- serialization
- API resources
- raw SQL
- database queries
- command execution
- SSRF-sensitive functionality
- redirects
- Blade
- Livewire
- Inertia
- CORS
- security headers
- error handling
- debug configuration
- exception handling
- Composer dependencies
- environment/configuration

Do not rely exclusively on scanners.

The AI must investigate application logic and authorization.

==================================================
15. API SECURITY
==================================================

Automatically discover OpenAPI/Swagger definitions.

Support:

- endpoint discovery
- authentication testing
- authorization testing
- BOLA/IDOR
- privilege escalation
- excessive data exposure
- mass assignment
- parameter tampering
- rate limiting
- file upload/download
- error handling
- API versioning
- insecure defaults

Support authorized test roles.

Do not perform destructive actions merely to prove a vulnerability.

==================================================
16. ANDROID SECURITY
==================================================

Use MobSF where appropriate.

Support:

- APK
- AAB where supported
- manifest
- permissions
- exported components
- WebView configuration
- JavaScript interfaces
- insecure TLS behavior
- certificate validation
- deep links
- intents
- local storage
- cookies
- secrets
- network configuration
- dependencies

For dynamic testing, support an Android emulator/test environment.

Do not pretend Docker alone can provide complete Android runtime testing.

==================================================
17. WINDOWS WEBVIEW SECURITY
==================================================

Treat Windows WebView applications as:

1. Native application/package surface
2. WebView/web/API surface

Use application analysis where supported.

Use ZAP or appropriate proxying for WebView traffic.

If a dedicated Windows VM is required for safe runtime testing, document and support that architecture rather than modifying the primary host unnecessarily.

==================================================
18. FINDING VALIDATION
==================================================

Never treat scanner output as automatically confirmed.

Finding lifecycle:

suspected
    ↓
investigating
    ↓
probable
    ↓
validated
    ↓
confirmed

or:

false-positive
unable-to-validate

The AI should correlate:

- scanner results
- source code
- routes
- middleware
- configuration
- runtime evidence
- API behavior

Only mark high-confidence findings as confirmed when sufficient evidence exists.

==================================================
19. EVIDENCE
==================================================

Collect safe evidence:

- URL
- endpoint
- method
- sanitized request/response
- source location
- screenshots where appropriate
- scanner evidence
- validation evidence

Automatically redact:

- passwords
- API keys
- tokens
- private keys
- cookies
- secrets
- personal/customer data

Never commit secrets.

==================================================
20. FINDING SCHEMA
==================================================

Create a normalized machine-readable finding schema containing:

id
title
severity
confidence
status
component
technology
endpoint
method
source_location
description
impact
evidence
reproduction
root_cause
recommendation
references
detected_by
validated_by

Use JSON Schema where appropriate.

==================================================
21. REPORTING
==================================================

Generate:

- Markdown
- HTML
- JSON

PDF may be optional.

Reports must include:

- scope
- methodology
- tools
- executive summary
- risk summary
- critical findings
- high findings
- medium findings
- low findings
- informational findings
- affected components
- evidence
- reproduction
- impact
- root cause
- recommended remediation

Every confirmed finding must include developer-oriented remediation guidance.

The report must be useful to both humans and AI coding agents.

==================================================
22. CENTRALIZED DATA STORAGE
==================================================

The global installation directory may contain:

projects/
reports/
findings/
evidence/
logs/
tools/
runtime/
config/

Projects should only contain lightweight:

.security/

The CLI should maintain a project registry so multiple workspaces can use the same security runtime.

Example:

D:\AI_Tools\security-lab\
    projects\
        project-a\
        project-b\
        project-c\

Do not duplicate large security tool installations.

==================================================
23. IDEMPOTENCY
==================================================

Every setup command must be safe to run repeatedly.

Example:

security setup
security setup
security setup

must not:

- duplicate configuration
- duplicate MCP entries
- duplicate Skills
- corrupt Docker Compose
- create unnecessary containers
- overwrite user configuration
- lose credentials
- lose scope

Instead:

- detect existing state
- compare desired state
- repair drift
- update only what is necessary

Agent installation must merge with existing MCP configuration rather than overwrite unrelated configuration.

==================================================
24. UPDATE/REPAIR
==================================================

Provide:

security update
security repair
security doctor

`doctor` should inspect:

- Node
- npm
- Git
- Docker
- Docker daemon
- Docker Compose
- images
- containers
- volumes
- networks
- MCP
- Skills
- project configuration
- agent configuration

It must clearly identify:

OK
WARNING
ERROR

`repair` should safely repair recoverable problems.

==================================================
25. SECURITY AND SCOPE
==================================================

This platform is strictly for authorized systems.

Implement explicit scope controls.

Scope must support:

- domains
- IP ranges
- repositories
- local projects
- staging environments
- test environments
- APK/AAB files
- Windows application targets
- exclusions

Never automatically expand beyond configured scope.

Never silently scan arbitrary public targets.

Prefer staging/test environments.

Do not perform destructive actions by default.

==================================================
26. README AND DOCUMENTATION
==================================================

Update README.md so that a new user can understand the system without reading the source code.

README must clearly document:

1. What the project does.
2. Architecture.
3. Supported operating systems.
4. Requirements.
5. First-time computer installation.
6. NPM installation.
7. `security setup`.
8. Docker architecture.
9. Project/workspace setup.
10. AI-agent integration.
11. Supported agents.
12. MCP integration.
13. Skills.
14. Security assessment commands.
15. Reports.
16. Troubleshooting.
17. Update/repair.
18. Security/scope model.
19. Development setup.
20. Contribution instructions.

The Quick Start must be extremely simple:

INSTALL:

npm install -g @<organization>/security-platform

SETUP:

security setup

PROJECT:

cd <project>
security setup

AGENT:

security install codex

ASSESS:

Run a complete security assessment of this workspace.

Also document equivalent Linux/Windows installation methods.

==================================================
27. DOCUMENTATION FILES
==================================================

Create/update:

README.md

docs/ARCHITECTURE.md
docs/INSTALLATION.md
docs/COMMANDS.md
docs/AGENTS.md
docs/MCP.md
docs/DOCKER.md
docs/SECURITY.md
docs/TROUBLESHOOTING.md
docs/LARAVEL.md
docs/API.md
docs/ANDROID.md
docs/WINDOWS_WEBVIEW.md
docs/REPORTING.md
docs/DEVELOPMENT.md
docs/CONTRIBUTING.md

Do not create unnecessary documentation.

Each document must have a clear purpose and stay synchronized with the actual implementation.

==================================================
28. INSTALLATION FLOW
==================================================

The desired first-computer experience is:

npm install -g @<organization>/security-platform

security setup

Expected result:

[INFO] Detecting operating system...
[INFO] Checking Node.js...
[SUCCESS] Node.js detected.
[INFO] Checking npm...
[SUCCESS] npm detected.
[INFO] Checking Git...
[SUCCESS] Git detected.
[INFO] Checking Docker...
[SUCCESS] Docker detected.
[INFO] Checking Docker daemon...
[SUCCESS] Docker daemon ready.
[INFO] Preparing security runtime...
[INFO] Pulling required images...
[INFO] Starting security services...
[SUCCESS] Security services healthy.
[INFO] Configuring MCP...
[SUCCESS] MCP configured.
[INFO] Installing Security Skills...
[SUCCESS] Skills installed.
[SUCCESS] Security Platform installation complete.

If something fails, the command must stop safely and explain exactly what needs to be fixed.

==================================================
29. DOCKER STARTUP FIX
==================================================

Specifically fix the current failure where installation reaches:

[INFO] Waiting for the Docker daemon to become ready (up to 90 seconds)...

and never proceeds.

Implement:

- hard timeout
- polling
- correct Docker context handling
- Docker Desktop detection
- daemon health check
- WSL2 diagnostics
- stdout/stderr capture
- actionable failure output
- clean exit code
- no infinite loops
- no silent process termination

Add automated tests for:

- Docker available
- Docker unavailable
- Docker CLI missing
- Docker daemon starting
- Docker daemon timeout
- Docker Desktop missing
- invalid Docker context
- permission failure

==================================================
30. CROSS-PLATFORM DESIGN
==================================================

Keep platform-specific logic isolated:

src/platform/windows/
src/platform/linux/
src/platform/macos/

or an equivalent architecture.

Do not duplicate the entire installer.

Use shared core logic with platform adapters.

Windows-specific:

- Docker Desktop
- WSL2
- .bat/.ps1 behavior
- Windows paths
- PowerShell

Linux-specific:

- systemd/Docker daemon where relevant
- Bash
- Linux paths

==================================================
31. TESTING
==================================================

Before declaring completion, test:

CLI build
NPM package
security --help
security --version
security setup
security doctor
security status
security repair
security update
project setup
agent setup
MCP startup
Skills deployment
Docker Compose
health checks
report generation

Test Windows and Linux installation behavior.

Test idempotent repeated setup.

Test missing prerequisites.

Test Docker not running.

Test Docker startup timeout.

Test invalid paths.

Test interrupted installation.

Test malformed configuration.

Test existing MCP configuration.

Test existing Skills.

Test multiple projects using the same global platform.

==================================================
32. SECURITY PLATFORM SELF-TEST
==================================================

Create an intentionally vulnerable local test target for integration testing where appropriate.

The platform must demonstrate that:

- discovery works
- scanners work
- MCP works
- AI workflow works
- findings are normalized
- evidence is captured
- false positives can be marked
- reports are generated

Do not use arbitrary external targets for automated testing.

==================================================
33. RELEASE/DISTRIBUTION
==================================================

The public GitHub repository should be structured for external users.

NPM package must include:

- correct package metadata
- CLI bin entry
- versioning
- build scripts
- release process
- platform-aware installer logic
- documentation
- license
- tests

Support reproducible releases.

Do not publish secrets.

Do not publish internal credentials or test data.

==================================================
34. IMPLEMENTATION ORDER
==================================================

Do not implement everything blindly in one pass.

Follow this order:

PHASE 1
Inspect existing repository and current implementation.

PHASE 2
Fix current Windows installer/Docker daemon hang.

PHASE 3
Build robust shared platform detection and prerequisite system.

PHASE 4
Build NPM CLI.

PHASE 5
Build global `security setup`.

PHASE 6
Build Docker Compose runtime.

PHASE 7
Integrate security tools.

PHASE 8
Build Security Orchestrator.

PHASE 9
Build Security MCP.

PHASE 10
Build reusable Security Skills.

PHASE 11
Build project-level `security setup`.

PHASE 12
Build agent adapters:
- Claude
- Codex
- Antigravity
- Copilot
- other verified supported agents

PHASE 13
Build scanning/investigation workflow.

PHASE 14
Build finding validation/evidence.

PHASE 15
Build reporting.

PHASE 16
Update documentation.

PHASE 17
Run complete end-to-end tests.

After each phase:

- build
- test
- inspect output
- fix failures
- update documentation
- continue

==================================================
35. IMPORTANT IMPLEMENTATION RULES
==================================================

Do not claim something works without testing it.

Do not invent third-party tool capabilities.

Before integrating Strix, ZAP, Nuclei, MobSF, MCP, or AI-agent configuration, inspect their current official documentation/repositories.

Use current stable/recommended versions where practical.

Do not blindly copy third-party repositories into this project.

Do not bundle every third-party tool into one massive NPM package.

Do not bundle every tool into one massive Docker image.

Use NPM as the control plane.

Use Docker as the runtime.

Use specialized security services.

Use MCP as the AI-agent interface.

Use Skills as the AI-agent workflow/instruction layer.

Use `.security/` as lightweight project configuration.

Use centralized global storage for the security runtime.

==================================================
36. FINAL USER EXPERIENCE
==================================================

A completely new computer should require approximately:

npm install -g @<organization>/security-platform

security setup

Then a new project:

cd <project>
security setup

Then an AI agent:

security install codex

Then:

"Run a complete security assessment of this workspace."

The system must automatically:

- understand the workspace
- detect applicable technologies
- load the appropriate Skills
- connect to Security MCP
- select applicable security tools
- run authorized security assessment
- investigate findings
- validate important findings
- collect sanitized evidence
- correlate findings
- generate a complete report

The user must NOT have to manually configure Docker containers, security scanners, MCP server registration, or individual Skills.

==================================================
37. FINAL ACCEPTANCE CRITERIA
==================================================

The project is complete only when all of the following are true:

1. The NPM package installs successfully.
2. `security setup` works on a clean supported machine.
3. Docker setup is automated and verified.
4. Docker daemon startup failures are bounded and diagnosed.
5. No installer can hang indefinitely.
6. Security services start successfully.
7. Multiple security images/services are orchestrated through one platform.
8. A single global installation can serve multiple projects.
9. `security setup` works inside any supported workspace.
10. Project configuration is lightweight.
11. `security install <agent>` configures the correct AI agent.
12. Existing agent configuration is preserved.
13. MCP works.
14. Skills work.
15. AI agents can use the security workflow.
16. Laravel projects are detected and assessed.
17. API projects are detected and assessed.
18. Android projects/artifacts are supported.
19. WebView workflows are supported.
20. Windows/WebView workflows are supported where technically possible.
21. Findings are validated instead of blindly trusted.
22. Evidence is sanitized.
23. Reports are generated in Markdown, HTML, and JSON.
24. Re-running setup is safe.
25. `security doctor` diagnoses broken installations.
26. `security repair` can recover supported failures.
27. Windows and Linux installers work correctly.
28. Documentation accurately reflects the implementation.
29. The complete workflow can be reproduced on another computer.
30. No undocumented manual steps are required for the normal installation workflow.

Start by inspecting the existing repository and implementation. Do not immediately rewrite the project. First identify the current architecture, current installer behavior, current Docker integration, current CLI structure, current documentation, and the exact root cause of the Docker daemon waiting problem. Then produce a concise implementation plan and begin Phase 1/Phase 2.

The final system must behave like a mature, reusable security platform—not a collection of manually configured scripts.