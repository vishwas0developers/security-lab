# Security Platform

Centralized, reusable, AI-agent-driven security assessment platform. Install
once per computer, connect any project with `security setup`, connect your
AI agent with `security install <agent>`, and say *"Run a complete security
assessment of this workspace"*.

```text
NPM Package (Security CLI)
        v
Global Security Platform  (D:\AI_Tools\security-lab or equivalent)
        v
Docker Compose Runtime  (ZAP, MobSF, Nuclei; Strix is a separate CLI)
        v
Security Orchestrator  (src/orchestrator)
        v
Security MCP  (src/mcp — stdio, `security mcp`)
        v
AI Agent  (Claude Code, Codex, ...)
        v
Security Skills  (skills/*/SKILL.md)
```

## What this does

Runs authorized security assessments (source review + dynamic scanning) of
a project, normalizes findings from every tool into one schema, correlates
duplicates, collects sanitized evidence, and generates Markdown/HTML/JSON
reports — driven either from the CLI or by an AI coding agent through MCP +
Skills.

## Supported operating systems

Windows 10/11 (primary, tested) and Linux/macOS (`install.sh`; see
[docs/INSTALLATION.md](docs/INSTALLATION.md) for what's verified vs.
architecturally-complete-but-untested on those platforms).

## Requirements

- Node.js 18+ and npm
- Docker Desktop (Windows/macOS) or Docker Engine + Compose v2 (Linux) —
  optional for the CLI itself, required for ZAP/MobSF/Nuclei scanning
- git (optional, only needed for `security update`)

## Quick start

```powershell
git clone <repository> D:\AI_Tools\security-lab
cd D:\AI_Tools\security-lab
install.bat          REM or ./install.sh on Linux/macOS
```

```powershell
security setup                REM run once, from the platform root: global setup
cd D:\Projects\my-project
security setup                REM run again, from inside a project: project setup
security install claude       REM configure your AI agent's MCP + Skills
```

Then, in your AI agent: *"Run a complete security assessment of this
workspace."* — or from the CLI: `security scan`.

**No published npm package yet.** `npm install -g @<organization>/security-platform`
is the target end-state (see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md));
today, `install.bat`/`install.sh` build the CLI locally and `npm link` it.

## Documentation

| File | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Distribution model, repository layout, component responsibilities |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | First-computer setup, both OSes, what's verified |
| [docs/COMMANDS.md](docs/COMMANDS.md) | Every `security` command, real vs. stub |
| [docs/AGENTS.md](docs/AGENTS.md) | Supported AI agents, verified vs. unverified config paths |
| [docs/MCP.md](docs/MCP.md) | MCP tool reference |
| [docs/DOCKER.md](docs/DOCKER.md) | Service architecture, image sources, Strix's special case |
| [docs/SECURITY.md](docs/SECURITY.md) | Scope model, safety defaults, evidence sanitization |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common failures and fixes |
| [docs/LARAVEL.md](docs/LARAVEL.md) / [API.md](docs/API.md) / [ANDROID.md](docs/ANDROID.md) / [WINDOWS_WEBVIEW.md](docs/WINDOWS_WEBVIEW.md) | Per-stack investigation checklists |
| [docs/REPORTING.md](docs/REPORTING.md) | Report structure and finding schema |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) / [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Building, testing, contributing |

## Status

See [docs/COMMANDS.md](docs/COMMANDS.md) for the authoritative real-vs-stub
list. In short: setup/doctor/status/scan/findings/report/config/scope/
install/reset/clean/logs/tools/validate/update/repair are real; the MCP
server and Nuclei/ZAP/MobSF adapters are real and tested on this machine;
Strix integration is a real CLI invocation but requires a user-supplied LLM
API key this project does not (and should not) provide.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT — see [LICENSE](LICENSE).
