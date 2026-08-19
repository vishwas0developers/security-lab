# Architecture & Distribution Notes

Source of truth for *what* the platform does: [`SECURITY_PLATFORM_PRD.md`](../SECURITY_PLATFORM_PRD.md).
This document covers *how it's built and distributed* — the installation
model, package boundaries, and repository layout — and follows the
`workspace-sync` architectural philosophy (TypeScript CLI, `commander` +
`chalk`, `zod`-validated config, `install/` bootstrap module, adapters
isolating third-party tools).

## Distribution model

The NPM package is the primary CLI/distribution layer. It does **not**
bundle security-tool binaries — Strix, ZAP, Nuclei, and MobSF are managed as
Docker images/services, pulled and orchestrated by the CLI.

```text
Public GitHub Repository
        │
        ├── package.json        # publishes @<org>/security-cli, bin: `security`
        ├── cli/                # commander CLI entrypoint
        ├── install/             # first-time bootstrap logic (called by install.sh/.bat and `security install`)
        ├── src/                # library code (discovery, config, security guards, tools, orchestrator, mcp, findings, evidence, reporting)
        ├── docker/              # docker-compose + tool service definitions
        ├── skills/              # global AI-agent skills (PRD §12)
        ├── templates/           # .security/ project bootstrap templates
        ├── install.sh           # Linux/macOS first-time bootstrap
        └── install.bat          # Windows first-time bootstrap
```

## Installation model

**First-time computer setup** (before the CLI is on PATH):

```bash
curl -fsSL <repository>/raw/main/install.sh | bash    # Linux/macOS
```

```bat
install.bat
```

These scripts do the minimum needed to get Node.js and the `security` CLI
installed, then hand off to `security install` / `security doctor` for
everything else: Docker image pulls, network/volume creation, global runtime
config, MCP registration, and global skill installation.

**Per-project setup** (repeatable, idempotent):

```bash
cd <project>
security setup
```

Creates `<project>/.security/` (see `templates/dot-security/`) and registers
the project centrally — no security tools are copied into the project.

**Assessment:**

```bash
security scan --full
```

or, from an AI agent: *"Run a complete security assessment of this project."*

## Global vs. project split

```text
Global (D:\AI_Tools\security-lab or configurable equivalent):
  CLI, MCP server, Skills, Tool adapters + Docker services,
  Orchestrator, Policies, Reports, Evidence, Runtime state

Per project:
  .security/config.yaml
  .security/scope.yaml
  .security/profile.yaml
  .security/credentials.yaml   (gitignored)
```

Security tools are installed once per computer and reused across every
registered project.

## Repository layout (current)

```text
security-lab/
├── cli/                  CLI entrypoint (commander) — every command real, see docs/COMMANDS.md
├── install/               agent adapter architecture (MCP + Skills deployment per agent)
├── src/
│   ├── discovery/          project/stack detection (file-marker based)
│   ├── platform/            cross-platform prereq detection (Node/npm/git/Docker/Compose/WSL2)
│   ├── config/              zod schemas, loader (platform root resolution, .security/ files), registry
│   ├── security/            scope-guard.ts (single scope-enforcement choke point), redact.ts
│   ├── tools/                adapter.ts interface; nuclei.ts/zap.ts/mobsf.ts real; strix.ts real CLI
│   │                          invocation (requires user-supplied LLM key — see docs/DOCKER.md)
│   ├── orchestrator/         assessment lifecycle: discover -> scope check -> tools -> correlate ->
│   │                          evidence -> report
│   ├── mcp/                  real MCP server (@modelcontextprotocol/sdk), started via `security mcp`
│   ├── findings/              normalized finding schema + correlate.ts (dedup/merge)
│   ├── evidence/              sanitized evidence storage
│   └── reporting/             Markdown/HTML/JSON report generator
├── docker/                docker-compose.yml (zap, mobsf, nuclei services) + .env.example
├── skills/                12 skills (10 from the original PRD + security-discovery/security-doctor
│                            from implementation_plan.md), real content in every SKILL.md
├── templates/dot-security/   files copied into <project>/.security/ by `security setup`
├── config/ policies/ profiles/ schemas/ projects/ reports/ evidence/ findings/ logs/
│                          centralized runtime state directories (mostly gitignored)
├── install.sh              real: prereq checks, bootstrap-clone mode, idempotent setup
├── install.bat              thin launcher -> scripts/install.ps1 (see docs/INSTALLATION.md for why)
├── scripts/install.ps1       real installer logic for Windows
├── package.json / tsconfig.json
└── tests/                  unit tests for schema/loader/registry/scope-guard/redact/correlate
```

## Implementation status

See [COMMANDS.md](COMMANDS.md) for the command-by-command real/stub table
and the "Known limitations" sections of [DOCKER.md](DOCKER.md),
[ANDROID.md](ANDROID.md), and [WINDOWS_WEBVIEW.md](WINDOWS_WEBVIEW.md) for
what's architecturally complete but not runtime-verified or not yet
automated. In short: the CLI, orchestrator, MCP server, scope enforcement,
evidence sanitization, reporting, and Nuclei/ZAP/MobSF adapters are real and
build-tested; Nuclei has been run end-to-end against a live local target on
this machine (see the project's test-run report under `reports/`).
