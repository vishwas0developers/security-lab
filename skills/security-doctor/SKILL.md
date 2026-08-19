# security-doctor

## Purpose

Diagnoses a broken/incomplete Security Platform installation: prerequisites,
Docker services, and project/platform configuration state.

## When to Use

The user reports something isn't working ("scan didn't find a tool",
"MCP isn't connecting"), or before a first assessment to confirm the
platform is actually ready.

## Inputs

None beyond the current machine's state.

## Tool Selection Guidance

There is no MCP tool for this yet -- `security doctor` is a CLI-only
diagnostic command (matches PRD §24: "doctor should inspect Node/npm/Git/
Docker/daemon/Compose/images/containers/... and clearly identify OK/
WARNING/ERROR"). Tell the user to run it directly in a terminal:

```
security doctor
```

Do not attempt to reimplement its checks by hand (e.g. don't try to
independently guess whether Docker is running) -- run the actual command and
relay its OK/WARNING/ERROR output.

## Safety Rules

Read-only diagnostics; `security doctor` never modifies anything. If it
reports fixable drift (missing directories, missing runtime config),
`security setup` is what repairs it, not doctor itself.

## Workflow

1. Run `security doctor` and relay its full output.
2. For each WARNING/ERROR, relay the remediation text doctor already
   printed -- it's the authoritative fix (e.g. exact Docker Desktop start
   instructions, exact Node.js version required).
3. If everything is OK but a specific tool container isn't healthy, point
   the user at `docker compose -f docker/docker-compose.yml ps` for
   container-level detail doctor doesn't yet surface.

## Evidence Requirements

Not applicable.

## Output Requirements

Relay doctor's actual OK/WARNING/ERROR results verbatim rather than
paraphrasing away specifics (exact version numbers, exact missing paths).
