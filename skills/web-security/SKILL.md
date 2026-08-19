# web-security

## Purpose

General web application dynamic security testing via OWASP ZAP: crawling,
passive/active scanning, headers, CORS, session/cookie handling.

## When to Use

`security.project.inspect` reports `detected.node`, `detected.docker`, or
any web-serving stack, and the user wants dynamic (running-app) testing
rather than only source review.

## Inputs

A staging/test URL present in `.security/scope.yaml`'s `allowedUrls` or
`allowedDomains`. If none is configured, stop and ask the user to add one —
never invent or assume a target.

## Tool Selection Guidance

Call `security.assessment.run` (via the security-assessment skill's
workflow) rather than invoking ZAP directly — the orchestrator handles scope
enforcement, health-checking the `zap` container, and evidence collection.
If `security.assessment.run` reports ZAP as skipped, tell the user why
(container not running is the most common cause: `docker compose -f
docker/docker-compose.yml up -d zap`).

## Safety Rules

- Only `staging`/`test` environments should be scanned per the PRD's
  "prefer staging/test environments" principle; check `scope.environment`
  and flag it to the user if it says `production`.
- Active scanning sends real requests including ones that create/modify
  data on some endpoints — this is inherent to ZAP's active scan and is why
  scope enforcement and non-production environments matter.

## Workflow

1. Confirm target is in scope (`security.target.discover`).
2. Run the assessment (`security.assessment.run`).
3. Read findings (`security.findings.list`), and for each, check whether a
   corresponding source-level cause is visible (missing header set in
   framework config, CORS misconfiguration in a specific file, etc.) —
   ZAP tells you *what* is wrong at the HTTP level; correlate it to *where*
   in the code that comes from before calling it confirmed.

## Evidence Requirements

ZAP's evidence field is already captured and sanitized per finding; quote it
directly rather than re-describing the raw HTTP exchange from memory.

## Output Requirements

Group findings by severity; for each, state the affected URL/endpoint and
recommended fix from the finding's `recommendation` field.
