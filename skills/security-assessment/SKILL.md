# security-assessment

## Purpose

Entry-point skill: orchestrates a full authorized security assessment of the
current workspace by loading scope, detecting the stack, calling the
Security MCP, and reporting results. This is what "Run a complete security
assessment of this workspace" should resolve to.

## When to Use

- The user asks for a complete/full security assessment of the current project.
- The user invokes `/security` or an equivalent agent command.
- No more specific skill (laravel-security, api-security, android-security,
  webview-security, windows-security) has already been selected for a
  narrower request.

## Inputs

- The current workspace's absolute path.
- That workspace must already have run `security setup` (there must be a
  `.security/` directory). If not, tell the user to run `security setup`
  first — do not attempt to fabricate scope.

## Tool Selection Guidance

Call these MCP tools, in this order, rather than shelling out to scanners
directly:

1. `security.project.inspect` — see what stack was detected and whether the
   project is configured.
2. `security.scope.get` — read the authorized scope. If `allowedUrls` /
   `allowedDomains` / `allowedMobileArtifacts` are all empty, stop and tell
   the user to edit `.security/scope.yaml` before scanning — do not guess a
   target.
3. `security.assessment.run` — runs the full lifecycle (discovery already
   done, so this drives scope-checked tool execution, correlation, evidence,
   and report generation) and returns which tools actually ran vs. were
   skipped and why.
4. `security.findings.list` — read back the normalized findings for
   investigation/summary.

If the detected stack narrows the request (`laravel: true`, `android: true`,
etc.), load the matching narrower skill (laravel-security, android-security,
...) for domain-specific investigation guidance after the tool run.

## Safety Rules

- Never scan a target that `security.target.discover` or `security.scope.get`
  doesn't confirm is in scope. The MCP layer enforces this server-side too,
  but do not attempt to work around it by inventing a target.
- `security.assessment.run` may report tools as "skipped" (not installed,
  container not running, no LLM key configured for Strix, etc.) — report
  that honestly to the user; never claim a tool ran when it was skipped.
- Do not perform destructive actions. The platform's scope defaults to
  `destructiveActionsAllowed: false`.

## Workflow

1. `security.project.inspect` to confirm configuration and detected stack.
2. `security.scope.get`; if empty, stop and instruct the user to configure it.
3. `security.assessment.run`.
4. `security.findings.list`; summarize by severity, and for each
   `confirmed`/`probable` finding, note its recommended fix.
5. Point the user at the report directory returned by `security.assessment.run`.

## Evidence Requirements

Evidence is collected and sanitized automatically by the orchestrator
(src/evidence/store.ts) — do not paste raw scanner output containing
credentials/tokens/cookies into your summary; quote from the sanitized
`evidence` array already attached to each finding.

## Output Requirements

Summarize: findings by severity, which tools ran vs. were skipped (and why),
and the report location. Do not claim "no vulnerabilities found" if tools
were skipped rather than actually run — say what was and wasn't checked.
