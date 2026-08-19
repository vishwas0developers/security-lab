# API Security

Detection: `detected.api`/`detected.openapi` (an `openapi.yaml`/`json` or
`swagger.*` file found, or a Laravel project, or route-file markers —
`src/discovery/index.ts`).

## Automated coverage today

Nuclei + ZAP run against `allowedUrls`/`allowedDomains` for generic API
checks (auth headers, known misconfigurations, exposed endpoints ZAP's
spider discovers).

## What requires manual/agent-driven review

BOLA/IDOR, mass assignment, and excessive data exposure require correlating
an OpenAPI spec (or route definitions) against the actual authorization code
per endpoint — this is what the `api-security` skill
(`skills/api-security/SKILL.md`) walks an AI agent through. Read that file
for the full checklist.

## Known gap

Multi-role authenticated testing (comparing what a `normal_user` vs.
`administrator` test account can access) is not automated — the orchestrator
does not yet consume `.security/credentials.yaml`.
