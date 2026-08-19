# Laravel Security

Detection: `security setup` sets `detected.laravel: true` when a project has
both `composer.json` and `artisan` (`src/discovery/index.ts`).

## Automated coverage today

`security scan` runs Nuclei + ZAP against any URL in `allowedUrls`/
`allowedDomains` — generic web/API dynamic checks (headers, known CVEs,
misconfigurations), not Laravel-specific source analysis.

## Source-level coverage

There is no dedicated Laravel static-analysis adapter yet. The
`laravel-security` skill (`skills/laravel-security/SKILL.md`) is the
authoritative checklist an AI agent follows for source review: routes,
controllers, middleware, policies/gates, Sanctum/Passport, CSRF, file
handling, raw SQL, SSRF-sensitive code, Blade/CORS/debug config, and
Composer dependency audit. Read that file for the full checklist rather than
duplicating it here.

## Known gap

Composer dependency vulnerability scanning (`composer audit`) is mentioned
in the skill as something to run, but is not automated by the orchestrator.
