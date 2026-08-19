# Security Platform PRD

## 1. Product Overview

### Product Name
Security Workspace Platform

### Purpose
Build a centralized, reusable, AI-agent-driven security assessment platform for authorized projects. The platform is installed once on a Windows machine under:

`D:\AI_Tools\security-lab`

Projects receive only lightweight project-specific security configuration and AI integration. Security tooling, orchestration, reports, evidence, MCP services, and reusable skills remain centralized.

### Primary User Goal
From any supported project workspace, the user should be able to run one command or one AI-agent instruction and have the platform:

1. Detect the project and technology stack.
2. Load the applicable security skills.
3. Load project-specific scope and configuration.
4. Discover the attack surface.
5. Run applicable security analysis tools.
6. Investigate and correlate findings.
7. Safely validate important findings.
8. Collect sanitized evidence.
9. Generate a complete developer-ready security report.

The resulting report must be usable by another AI coding agent or developer to implement fixes.

---

# 2. Problem Statement

Current security tools are fragmented. A typical project may require several independent tools for source-code analysis, web/API testing, mobile analysis, WebView testing, reconnaissance, validation, and reporting.

The desired system must hide that complexity behind a single reusable security capability.

The platform must not install a complete security stack inside every project. Instead:

```text
Central Security Control Plane
D:\AI_Tools\security-lab
        |
        +-- MCP
        +-- Skills
        +-- Orchestrator
        +-- Strix
        +-- OWASP ZAP
        +-- Nuclei
        +-- MobSF
        +-- Reporting
        +-- Evidence
        +-- Policies
        |
        +--------------------------+
                                   |
                    Lightweight Project Bootstrap
                                   |
                         Project/.security/
```

---

# 3. Scope

## In Scope

### Application Types
- Laravel/PHP web applications
- REST APIs
- OpenAPI/Swagger APIs
- Android applications using WebView
- Windows applications using WebView
- Hybrid projects containing multiple application types

### Security Activities
- Source-code security analysis
- Web application security testing
- API security testing
- Authentication testing
- Authorization testing
- IDOR/BOLA investigation
- Business-logic security investigation
- Dependency and configuration analysis
- Reconnaissance within authorized scope
- Vulnerability scanning
- AI-assisted investigation
- Safe vulnerability validation
- Evidence collection
- Finding correlation and deduplication
- Severity and confidence classification
- Developer remediation recommendations
- Security report generation
- Optional CI/CD integration

### Platforms
- Windows host
- Docker Desktop
- WSL2
- Android emulator/test environment where required
- Isolated Windows VM where Windows runtime testing requires it

## Out of Scope
- Unauthorized third-party target testing
- Automatic scope expansion
- Destructive testing against production
- Credential harvesting
- Malware development
- Persistent compromise
- Uncontrolled exploitation of unrelated systems

---

# 4. Product Principles

1. **Centralized** — all security infrastructure is managed from `D:\AI_Tools\security-lab`.
2. **Portable** — the platform can be installed on another Windows machine from a repository/package.
3. **Project-lightweight** — projects contain only configuration and integration metadata.
4. **AI-native** — security workflows are exposed to compatible AI coding agents through skills and MCP.
5. **Tool-agnostic at the orchestration layer** — tools can be replaced or upgraded without changing project UX.
6. **Secure by default** — explicit scope and permissions are required.
7. **Evidence-driven** — findings require evidence and confidence status.
8. **Developer-focused** — every confirmed finding must contain actionable remediation guidance.
9. **Idempotent** — setup commands can safely be rerun.
10. **Observable** — every assessment produces logs, status, findings, and artifacts.

---

# 5. Target User Experience

## First Computer Setup

```powershell
security install
security doctor
```

## Project Setup

From any authorized project:

```powershell
cd D:\Projects\my-project
security setup
```

The command must automatically:

- detect the project
- detect supported technologies
- create `.security/`
- generate project configuration
- connect the project to the centralized security platform
- configure the supported AI-agent/MCP integration
- enable relevant security skills
- validate prerequisites

## Security Assessment

CLI:

```powershell
security scan --full
```

AI agent:

```text
Run a complete security assessment of this project.
```

The AI agent must be able to discover the security platform and execute the applicable workflow without the user manually orchestrating individual scanners.

---

# 6. High-Level Architecture

```text
                         AI Coding Agent
                (Codex / Claude Code / other)
                              |
                         Security Skill
                              |
                              v
                        Security MCP
                              |
                              v
                    Security Orchestrator
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
      Strix                  ZAP                   Nuclei
        |                     |                      |
        +---------------------+----------------------+
                              |
                            MobSF
                              |
                              v
                    Finding / Evidence Engine
                              |
                              v
                       Validation Engine
                              |
                              v
                      Report Generator
                              |
                              v
                  Central Security Workspace
```

---

# 7. Central Workspace Architecture

Root:

`D:\AI_Tools\security-lab`

Recommended structure:

```text
D:\AI_Tools\security-lab\
│
├── cli\
├── core\
├── orchestrator\
├── mcp\
├── skills\
├── adapters\
├── tools\
│   ├── strix\
│   ├── zap\
│   ├── nuclei\
│   └── mobsf\
├── docker\
├── config\
├── policies\
├── profiles\
├── schemas\
├── projects\
├── reports\
├── evidence\
├── findings\
├── logs\
├── scripts\
├── docs\
└── tests\
```

The exact directory names may be adjusted during implementation, but the separation of responsibilities must be preserved.

---

# 8. Per-Project Integration

Each integrated project should contain only:

```text
project-root/
└── .security/
    ├── config.yaml
    ├── scope.yaml
    ├── profile.yaml
    ├── credentials.example.yaml
    └── README.md
```

Actual secrets must not be stored in Git.

Reports, raw scanner output, and evidence should remain centralized unless a project-specific export is explicitly requested.

---

# 9. Project Detection

`security setup` must detect, where applicable:

- Laravel
- PHP/Composer
- Node.js
- REST APIs
- OpenAPI/Swagger
- Docker/Docker Compose
- Android projects
- APK/AAB artifacts
- Windows projects
- EXE/APPX/MSIX artifacts
- WebView indicators
- existing security configuration

Example detection result:

```yaml
detected:
  laravel: true
  api: true
  openapi: true
  android: true
  windows: false
  webview: true

profiles:
  - laravel
  - web
  - api
  - android
  - webview
```

---

# 10. Security Profiles

The platform must support:

- `quick`
- `web`
- `api`
- `mobile`
- `windows`
- `webview`
- `full`

Default profile for `security scan --full` is `full` with project-specific applicability detection.

---

# 11. Tooling Requirements

## 11.1 Strix

Role: primary AI-assisted penetration-testing/investigation engine.

Responsibilities:
- autonomous security investigation where appropriate
- attack-surface exploration
- source/runtime correlation where supported
- vulnerability investigation
- finding generation
- evidence collection where supported

Implementation requirements:
- use the current official installation approach
- verify current stable capabilities before integration
- clearly separate stable features from experimental integrations
- do not invent unsupported CLI or MCP functionality

## 11.2 OWASP ZAP

Role: web and API dynamic application security testing.

Use for:
- crawling
- passive analysis
- active scanning
- authenticated contexts
- REST API testing
- OpenAPI/Swagger testing
- WebView traffic inspection

Requirements:
- Docker-compatible deployment
- private/local administration interface
- scoped targets
- authentication contexts
- scan policies
- rate limits
- report export

## 11.3 Nuclei

Role: template-driven vulnerability and exposure detection.

Use for:
- known vulnerabilities
- misconfigurations
- exposure checks
- technology-specific checks
- custom organization templates

Requirements:
- maintained templates
- custom template support
- controlled execution
- no public unrestricted service exposure

## 11.4 MobSF

Role: mobile and supported application-package security analysis.

Android:
- APK/AAB analysis where supported
- manifest
- permissions
- exported components
- insecure configuration
- secrets
- WebView settings
- TLS/network configuration
- dependencies
- static analysis
- dynamic analysis where environment supports it

Windows:
- package/application analysis where supported
- static/package inspection
- configuration/security metadata

MobSF is a specialist application-analysis component, not the only Windows/WebView testing mechanism.

---

# 12. AI Security Skills

Global skills directory:

`D:\AI_Tools\security-lab\skills`

Required skills:

```text
security-assessment
laravel-security
web-security
api-security
android-security
windows-security
webview-security
vulnerability-validation
security-reporting
security-scope
```

Each skill must contain:

- purpose
- when to use
- inputs
- tool selection guidance
- safety rules
- workflow
- evidence requirements
- output requirements

Projects must reference or activate global skills rather than copying their contents into each workspace.

---

# 13. MCP Requirements

The platform must provide an MCP-compatible security interface for compatible AI agents.

The MCP layer should expose high-level capabilities rather than every low-level command.

Required logical operations:

```text
security.scope.get
security.project.inspect
security.target.discover
security.recon
security.web.scan
security.api.scan
security.nuclei.scan
security.android.analyze
security.android.dynamic_test
security.windows.analyze
security.webview.inspect
security.findings.list
security.finding.get
security.finding.validate
security.evidence.collect
security.report.generate
security.assessment.run
```

Exact MCP names may change during implementation; the semantic capabilities are mandatory.

The MCP layer must enforce scope and policy before executing underlying tools.

---

# 14. Orchestrator

The orchestrator is the core service that decides which tools and skills apply to a project.

Primary operation:

```text
security.assessment.run
```

Input should support:

```json
{
  "project": ".",
  "environment": "staging",
  "mode": "full"
}
```

The orchestrator must:

1. Validate scope.
2. Load policies.
3. Inspect project.
4. Detect technologies.
5. Discover targets.
6. Select applicable skills.
7. Select applicable tools.
8. Run safe reconnaissance.
9. Run static analysis.
10. Run web/API testing.
11. Run mobile analysis.
12. Run WebView analysis where applicable.
13. Correlate findings.
14. Remove duplicates.
15. Investigate important findings.
16. Validate selected findings safely.
17. Collect evidence.
18. Classify severity/confidence.
19. Generate remediation guidance.
20. Generate reports.

---

# 15. Assessment Lifecycle

```text
SCOPE
  -> DISCOVER
  -> MAP ATTACK SURFACE
  -> STATIC ANALYSIS
  -> DYNAMIC TESTING
  -> FINDINGS
  -> INVESTIGATE
  -> VALIDATE
  -> EVIDENCE
  -> CORRELATE
  -> CLASSIFY
  -> REPORT
```

The system must not treat every scanner result as a confirmed vulnerability.

Finding statuses:

- suspected
- probable
- confirmed
- false_positive
- unable_to_validate

---

# 16. Laravel Security Requirements

The AI security workflow must inspect, where applicable:

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
- file upload
- file download
- storage
- queues/jobs
- events
- broadcasting
- serialization
- API resources
- SQL/database access
- raw queries
- command execution
- server-side requests/SSRF-sensitive functionality
- redirects
- Blade
- Livewire
- Inertia
- caching
- CORS
- headers
- logging
- error handling
- debug configuration
- Composer dependencies
- environment configuration

The workflow must investigate business logic and authorization, not only pattern-matching scanner results.

---

# 17. API Security Requirements

Where OpenAPI/Swagger/GraphQL or equivalent API metadata exists, use it as attack-surface inventory.

Test, where authorized:

- authentication
- authorization
- object-level authorization
- function-level authorization
- excessive data exposure
- parameter tampering
- input validation
- file upload/download
- rate limits
- pagination
- mass assignment
- error handling
- sensitive fields
- API versioning
- deprecated endpoints

Support multi-role testing.

---

# 18. Authentication and Authorization

Support configured test accounts such as:

- unauthenticated
- normal user
- manager
- administrator
- read-only user

Credentials must be loaded securely.

The platform should compare authorized and unauthorized access patterns where appropriate.

Harmless validation is preferred over destructive proof.

---

# 19. Android WebView Workflow

```text
APK/AAB
  -> MobSF static analysis
  -> Android test emulator
  -> application/WebView runtime
  -> ZAP proxy
  -> Laravel/API backend
```

Investigate where relevant:

- WebView configuration
- JavaScript settings
- JavaScript interfaces/bridges
- file access
- mixed content
- TLS/certificate behavior
- navigation restrictions
- deep links
- intents
- exported components
- local storage
- cookies
- authentication/session handling
- API authorization
- sensitive data exposure
- native/web boundary issues

Android emulation should remain separate from Linux Docker containers unless technically justified.

---

# 20. Windows WebView Workflow

Treat Windows application security as two surfaces:

1. Native/package layer
2. WebView/web/API layer

Use supported application-analysis tooling for the native/package layer and ZAP for WebView traffic.

If runtime testing requires isolation, use a dedicated Windows VM rather than risking the host operating system.

---

# 21. Scope and Policy Engine

Every assessment must have an explicit scope.

Scope configuration must support:

- allowed domains
- allowed IP ranges
- allowed URLs
- allowed repositories
- allowed applications
- allowed mobile artifacts
- excluded hosts
- excluded paths
- testing environment
- authentication profiles
- rate limits
- maximum scan duration
- destructive-action policy

Default:

```text
production = protected
external target = denied
scope expansion = denied
secret exposure = denied
```

The system must reject out-of-scope targets before tool execution.

---

# 22. Credential and Secret Management

Never store real secrets in source control.

Support:

- environment variables
- local secret files excluded from Git
- OS credential storage where practical
- per-project credentials
- test-only identities

All reports and evidence must sanitize:

- passwords
- API keys
- tokens
- cookies
- session identifiers
- private keys
- personal/customer data

---

# 23. Findings Model

Use a normalized finding schema containing at least:

```json
{
  "id": "",
  "title": "",
  "severity": "critical|high|medium|low|info",
  "confidence": "confirmed|probable|suspected|false_positive|unable_to_validate",
  "component": "",
  "technology": "",
  "endpoint": "",
  "method": "",
  "source_location": "",
  "description": "",
  "technical_details": "",
  "impact": "",
  "evidence": [],
  "reproduction": [],
  "root_cause": "",
  "recommendation": "",
  "references": [],
  "detected_by": [],
  "validated_by": [],
  "status": "open"
}
```

The schema may be extended but must remain machine-readable and stable.

---

# 24. Evidence Requirements

Evidence should include, when useful:

- affected URL
- endpoint
- HTTP method
- sanitized request/response
- source-code location
- relevant class/function
- screenshots
- scanner evidence
- validation evidence

Evidence must be sanitized automatically.

---

# 25. Reporting Requirements

Required output formats:

- Markdown
- HTML
- JSON

Optional:

- PDF
- SARIF where applicable

Recommended structure:

```text
reports/
└── assessment-YYYY-MM-DD/
    ├── executive-summary.md
    ├── security-report.html
    ├── findings.json
    ├── findings/
    │   ├── CRITICAL-001.md
    │   ├── HIGH-001.md
    │   └── ...
    ├── evidence/
    └── raw/
```

Each confirmed vulnerability must include:

- title
- severity
- confidence
- affected component
- description
- technical details
- evidence
- reproduction
- impact
- root cause
- recommended fix
- references
- developer action

---

# 26. Developer-Ready Remediation

Every confirmed finding must provide enough information for another AI coding agent or developer to implement a fix.

Include:

- likely affected file(s)
- relevant class/function
- root cause
- recommended code-level remediation
- security regression test recommendation
- validation criteria after the fix

The security platform should not automatically modify application code as part of the assessment unless a separate explicitly enabled remediation workflow is added later.

---

# 27. CLI Requirements

Required commands:

```text
security install
security doctor
security status
security setup
security config
security scope
security scan
security scan --full
security scan --web
security scan --api
security scan --mobile
security scan --windows
security scan --webview
security findings
security report
```

Optional commands:

```text
security update
security reset
security clean
security logs
security tools
security projects
security validate
```

All setup operations must be idempotent.

---

# 28. Cross-Computer Portability

A new Windows computer must be able to install the platform without manually rebuilding the environment.

Expected workflow:

```powershell
git clone <security-platform-repository> D:\AI_Tools\security-lab
cd D:\AI_Tools\security-lab
security install
security doctor
```

Then any project can be integrated with:

```powershell
cd D:\Projects\my-project
security setup
```

The platform must detect missing prerequisites and provide actionable errors.

Secrets and machine-specific credentials must not be stored in the repository.

---

# 29. Docker Requirements

Docker Desktop is the primary container runtime on Windows.

Prefer Docker containers for:

- Strix
- ZAP
- Nuclei
- MobSF
- Security MCP/Orchestrator services where practical

Requirements:

- persistent volumes
- health checks
- private networks
- controlled port exposure
- environment files
- structured logging
- resource limits where practical
- clean start/stop lifecycle

Do not expose management interfaces publicly by default.

---

# 30. AI Agent Integration

The platform must support compatible AI coding/security agents through:

1. reusable security skills
2. MCP integration
3. project-local configuration

`security setup` should detect supported agent environments where feasible and configure only the required integration metadata.

The user should not need to manually install the entire security stack into each project.

---

# 31. Single-Command AI Workflow

Primary desired experience:

```text
Open any authorized project in a supported AI coding agent.

Run:

/security

or say:

Run a complete security assessment of this project.
```

The agent must:

1. load the project security configuration
2. load global security skills
3. connect to the security MCP
4. discover the project
5. choose applicable profiles
6. execute the security assessment
7. summarize findings
8. point to the report location

The exact `/security` command mechanism depends on the AI client, but the underlying skill/MCP capability must remain client-agnostic.

---

# 32. Example End-to-End Flow

```text
Developer opens Project A
        |
        v
security setup
        |
        +-- detect Laravel
        +-- detect API
        +-- detect Android
        +-- detect WebView
        +-- create .security/
        +-- register project
        +-- configure MCP/skill integration
        |
        v
AI Agent
        |
        v
"Run a complete security assessment"
        |
        v
Security MCP
        |
        v
Orchestrator
        |
        +-- Source analysis
        +-- Strix
        +-- ZAP
        +-- Nuclei
        +-- MobSF
        +-- WebView workflow
        |
        v
Findings
        |
        v
Validation
        |
        v
Evidence
        |
        v
Correlation
        |
        v
Developer-ready report
```

---

# 33. CI/CD

Provide optional GitHub Actions integration.

Pull request checks should prefer lightweight checks such as:

- dependency/security checks
- baseline web/API checks
- selected Nuclei checks

Full autonomous assessments should be available through:

- manual dispatch
- scheduled/nightly runs
- dedicated staging environments

Do not run aggressive full testing automatically against production.

---

# 34. Logging and Observability

Track:

- assessment ID
- project
- environment
- scope
- selected profile
- tools invoked
- start/end time
- tool status
- finding counts
- validation status
- report path
- errors

Logs must not contain secrets.

---

# 35. Compatibility and Upgrade Strategy

The platform must avoid hard-coding undocumented behavior from third-party tools.

Before installation or upgrade:

- inspect current official documentation
- determine supported versions
- determine compatibility
- verify health
- run integration tests

The platform must support independent version upgrades of:

- Strix
- ZAP
- Nuclei
- MobSF
- MCP adapters

---

# 36. Testing Strategy

Create tests for:

### Unit Tests
- config parsing
- scope validation
- project detection
- redaction
- finding schema
- command generation

### Integration Tests
- tool adapters
- Docker services
- MCP connection
- report generation
- evidence storage

### Security Tests
- out-of-scope target rejection
- secret redaction
- path restrictions
- command restrictions
- authentication handling

### End-to-End Test
Use an intentionally vulnerable test application and verify that the complete pipeline detects, validates, correlates, and reports expected findings.

---

# 37. Idempotency Requirements

Running:

```powershell
security install
```

multiple times must not create duplicate installations.

Running:

```powershell
security setup
```

multiple times must not:

- duplicate MCP entries
- duplicate skill registration
- overwrite existing project configuration without consent
- create duplicate containers
- duplicate project records

Instead it should:

- detect existing configuration
- repair missing components
- migrate old configuration where required
- report changes

---

# 38. Error Handling

Errors must be actionable.

Examples:

```text
Docker Desktop is not running.
Start Docker Desktop and rerun: security doctor
```

```text
No authorized target configured.
Run: security scope
```

```text
Android dynamic testing environment unavailable.
Static Android analysis is still available.
```

Do not silently skip important security stages.

Every skipped stage must be reported.

---

# 39. Security Platform State

Maintain a local registry of configured projects.

Example:

```json
{
  "projects": [
    {
      "name": "project-a",
      "path": "D:\\Projects\\project-a",
      "profiles": ["laravel", "api", "webview"],
      "last_assessment": "...",
      "status": "configured"
    }
  ]
}
```

Do not store secrets in this registry.

---

# 40. Future Extensibility

Architecture must allow future adapters for:

- SAST engines
- dependency scanners
- secret scanners
- cloud security tools
- container scanners
- browser automation
- additional mobile tools
- additional AI agents
- additional MCP servers

New tools should be integrated through adapters rather than modifying project-specific code.

---

# 41. Acceptance Criteria

The implementation is accepted only when all of the following are true:

## Installation
- [ ] Works on Windows with Docker Desktop
- [ ] Uses `D:\AI_Tools\security-lab` as the centralized root
- [ ] Supports clean installation on a second Windows machine
- [ ] `security doctor` validates prerequisites

## Project Setup
- [ ] `security setup` is available from any supported project
- [ ] project stack is auto-detected
- [ ] `.security/` is generated
- [ ] project is registered centrally
- [ ] AI integration is configured
- [ ] setup is idempotent

## Security Engine
- [ ] Strix is installed and verified
- [ ] ZAP is installed and verified
- [ ] Nuclei is installed and verified
- [ ] MobSF is installed and verified

## MCP
- [ ] MCP server is available
- [ ] scope is enforced before tool execution
- [ ] high-level assessment tool exists
- [ ] AI agent can invoke the security workflow

## Skills
- [ ] security-assessment skill exists
- [ ] Laravel skill exists
- [ ] API skill exists
- [ ] Android skill exists
- [ ] WebView skill exists
- [ ] reporting skill exists
- [ ] skills are globally reusable

## Assessment
- [ ] Laravel source analysis works
- [ ] web scanning works
- [ ] API scanning works
- [ ] authentication workflows are supported
- [ ] authorization investigations are supported
- [ ] Android static analysis works
- [ ] WebView workflow is documented/tested where environment supports it
- [ ] Windows analysis workflow is supported where environment permits
- [ ] findings are correlated
- [ ] findings can be validated

## Reporting
- [ ] Markdown report generated
- [ ] HTML report generated
- [ ] JSON report generated
- [ ] evidence is stored
- [ ] secrets are sanitized
- [ ] findings contain remediation guidance

## Safety
- [ ] out-of-scope targets are rejected
- [ ] production is protected by default
- [ ] destructive actions are disabled by default
- [ ] secrets are not committed
- [ ] management ports are not publicly exposed

---

# 42. Implementation Phases

## Phase 1 — Foundation

- CLI skeleton
- directory structure
- config system
- project registry
- scope/policy engine
- Docker integration
- `security doctor`

## Phase 2 — Tool Layer

- Strix adapter
- ZAP adapter
- Nuclei adapter
- MobSF adapter
- health checks
- lifecycle management

## Phase 3 — Orchestration

- project detection
- profile selection
- assessment state machine
- finding normalization
- evidence management

## Phase 4 — MCP

- MCP server
- high-level security tools
- policy enforcement
- project context loading

## Phase 5 — Skills

- global skill library
- project bootstrap
- AI-agent integration
- `/security` capability where supported

## Phase 6 — Reporting

- consolidated report
- developer remediation output
- HTML/Markdown/JSON
- evidence references

## Phase 7 — Mobile/Windows

- Android emulator workflow
- MobSF dynamic workflow
- WebView proxy workflow
- isolated Windows runtime workflow

## Phase 8 — CI/CD

- GitHub Actions
- manual full assessment
- scheduled assessment
- artifact publishing

## Phase 9 — Hardening

- security tests
- scope bypass tests
- credential-redaction tests
- idempotency tests
- end-to-end vulnerable lab test

---

# 43. Non-Functional Requirements

### Reliability
- services must have health checks
- failed tools must be reported clearly
- partial results must be preserved

### Performance
- lightweight profile should complete substantially faster than full profile
- tools should run in parallel where safe
- resource-heavy stages should be scheduled intelligently

### Maintainability
- TypeScript-first control/orchestration layer is preferred
- tools isolated behind adapters
- configuration schema versioned
- MCP contracts versioned

### Security
- least privilege
- explicit scope
- secret redaction
- private tool interfaces
- isolated execution for risky runtime analysis

### Portability
- Windows + Docker Desktop first
- reproducible installation
- no machine-specific hard-coded paths beyond configurable default root

---

# 44. Final Product Definition

The final product is not a collection of security scanners.

It is a reusable **AI Security Workspace Platform** with this model:

```text
ONE CENTRAL INSTALLATION
        |
        v
D:\AI_Tools\security-lab
        |
        +-- Tools
        +-- MCP
        +-- Skills
        +-- Policies
        +-- Orchestrator
        +-- Reports
        +-- Evidence
        |
        v
ANY AUTHORIZED PROJECT
        |
        +-- security setup
        |
        +-- .security/
        |
        v
ANY SUPPORTED AI AGENT
        |
        +-- /security
        or
        +-- "Run a complete security assessment."
        |
        v
AUTOMATED SECURITY INVESTIGATION
        |
        v
CONSOLIDATED DEVELOPER-READY REPORT
```

The platform must make the security stack reusable across projects and machines while keeping the project integration minimal, the execution scope controlled, and the final output directly actionable for developers and AI coding agents.
