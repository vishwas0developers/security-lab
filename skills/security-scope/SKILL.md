# security-scope

## Purpose

Loads, validates, and enforces the project's authorized assessment scope
and policy defaults before any tool executes.

## When to Use

Before any scanning/investigation activity, and whenever the user asks
"what's in scope for this project" or wants to add/remove an authorized
target.

## Inputs

`.security/scope.yaml` in the project (via `security.scope.get`).

## Tool Selection Guidance

- `security.scope.get` — read current scope.
- `security.target.discover` — check a single candidate target against
  scope without running any scanner.

There is no MCP tool to *modify* scope yet -- scope changes are a deliberate
manual edit to `.security/scope.yaml` (a human decision about what's
authorized), not something an AI agent should silently expand. If scope is
insufficient for a requested assessment, tell the user exactly what line to
add rather than proceeding without it or editing the file yourself.

## Safety Rules

- Default policy: `production = protected`, `external target = denied`,
  `scope expansion = denied`, `secret exposure = denied` (PRD §21). Nothing
  is authorized unless explicitly listed in `allowedDomains`/`allowedUrls`/
  `allowedIpRanges`/`allowedMobileArtifacts`.
- `excludedHosts`/`excludedPaths` always win over an allow-list match --
  never argue past an explicit exclusion.
- Never suggest disabling scope enforcement, even temporarily, to get a scan
  to run.

## Workflow

1. `security.scope.get` to see current authorization.
2. If a requested target isn't covered, tell the user the exact scope.yaml
   edit needed (e.g. which `allowedUrls` entry to add) instead of proceeding.
3. For a specific target, `security.target.discover` gives a direct
   in-scope/out-of-scope answer with the reason.

## Evidence Requirements

Not applicable -- this skill doesn't produce findings.

## Output Requirements

When reporting scope status, list environment, all allow-lists, and all
exclusions plainly so the user can see the complete authorization picture at
a glance.
