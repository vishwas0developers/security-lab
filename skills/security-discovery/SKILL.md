# security-discovery

## Purpose

Understands a workspace's attack surface before any scanning starts:
detected technologies, configuration status, and what profiles apply.

## When to Use

First step of any assessment, before `security-assessment`'s scan step --
also useful standalone when the user just wants to know "what would a
security assessment even check here."

## Inputs

The workspace's absolute path.

## Tool Selection Guidance

- `security.project.inspect` — returns detected stack (Laravel/PHP/Node/
  API/OpenAPI/Docker/Android/Windows/WebView) and whether `.security/` is
  configured yet.
- If not configured, tell the user to run `security setup` (which performs
  this same detection and persists it to `.security/config.yaml` plus
  registers the project with the platform) rather than proceeding on
  ephemeral detection alone.

## Safety Rules

Read-only. Detection is file-marker based (existence checks), not content
parsing -- it will not catch every edge case; state findings as "detected"
rather than "confirmed" where the check is a heuristic (this applies
especially to the `webview` flag, which only fires when an Android/Windows
project also has an obvious WebView marker file/name).

## Workflow

1. `security.project.inspect`.
2. Map detected flags to which narrower skills apply: `laravel` ->
   laravel-security; `api`/`openapi` -> api-security; `android` ->
   android-security; `windows` -> windows-security; `webview` ->
   webview-security (in addition to the Android/Windows skill); anything
   web-serving -> web-security.
3. Report the mapping to the user/agent before proceeding to
   `security-assessment`.

## Evidence Requirements

Not applicable -- this skill doesn't produce findings, only scope of work.

## Output Requirements

A short list: detected technologies, and which skills/profiles will be used
as a result.
