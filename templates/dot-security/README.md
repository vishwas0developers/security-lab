# .security/

This directory connects this project to the centralized Security Platform
installed at the platform root (default on Windows: `D:\AI_Tools\security-lab`).

It contains **configuration only** — no security tools, scanners, or their
data live here (PRD §8).

| File | Purpose |
|---|---|
| `config.yaml` | Detected stack, active profiles, MCP registration state |
| `scope.yaml` | Authorized assessment scope and policy limits (edit before scanning) |
| `profile.yaml` | Which security profiles are active for this project |
| `credentials.yaml` | Test-account credentials (copy from `credentials.example.yaml`, never commit) |

Run `security setup` from this project root to (re)generate these files, and
`security scan --full` (or ask your AI agent to "run a complete security
assessment of this project") to start an assessment.
