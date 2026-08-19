# api-security

## Purpose

REST/OpenAPI API security testing: authentication, authorization,
BOLA/IDOR, mass assignment, rate limits, versioning.

## When to Use

`security.project.inspect` reports `detected.api: true` or
`detected.openapi: true`.

## Inputs

- An OpenAPI/Swagger file if present (use it as the endpoint inventory —
  read it directly rather than guessing endpoint names).
- A staging/test base URL in `.security/scope.yaml`.
- Test-role credentials, if the project configured any (currently a
  template field in `.security/credentials.yaml`; not yet wired into the
  orchestrator's automated multi-role testing — treat multi-role BOLA
  testing as a manual/source-review task until that lands).

## Tool Selection Guidance

`security.assessment.run` covers generic web/API dynamic scanning (Nuclei +
ZAP against `allowedUrls`). This skill's job is the API-specific analysis
those general scanners under-cover:

- Parse the OpenAPI file (if present) to enumerate every declared endpoint
  and method, and check each against source code for an authorization check.
- BOLA/IDOR: for endpoints taking an ID parameter
  (`/api/orders/{id}`), verify the handler checks that the authenticated
  user owns/may access that specific resource, not just that they're
  authenticated at all.
- Mass assignment: request bodies bound directly to a model/serializer
  without an explicit allowlist of fields.
- Excessive data exposure: response serializers/resources returning
  internal fields (password hashes, internal IDs, other users' data).

## Safety Rules

Do not perform destructive actions to "prove" IDOR (e.g. do not actually
delete another user's resource) — reading a resource you shouldn't be able
to read is sufficient evidence; harmless validation is preferred (PRD §18).

## Workflow

1. Enumerate endpoints (OpenAPI file, or route definitions if none exists).
2. For each, identify the authorization requirement and verify it's enforced
   in code.
3. Cross-reference with `security.findings.list` for anything ZAP/Nuclei
   already flagged on the same endpoints.
4. Note API versioning: are deprecated/unversioned endpoints still reachable
   without the same protections as the current version?

## Evidence Requirements

Cite the exact route definition and handler function for every
authorization finding.

## Output Requirements

Findings should include `method` and `endpoint` fields populated so they
correlate cleanly with dynamic-scan findings on the same route.
