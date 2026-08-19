# laravel-security

## Purpose

Laravel/PHP source-code and business-logic security review: routes,
controllers, middleware, policies/gates, authentication (Sanctum/Passport),
CSRF, file handling, raw SQL, SSRF-sensitive code, Blade/Livewire/Inertia,
and configuration/debug settings.

## When to Use

`security.project.inspect` reports `detected.laravel: true`, or the user
explicitly asks about a Laravel application's security.

## Inputs

- Workspace path with `composer.json` + `artisan` present.
- The project's `.security/scope.yaml` (for the staging/test URL to
  correlate dynamic findings against).

## Tool Selection Guidance

- Run `security-assessment`'s workflow first to get ZAP/Nuclei findings
  against the live app (routes, headers, CORS, TLS) — this skill's job is
  the *source-level* investigation those tools cannot do.
- This skill is source-code reading, not a scanner invocation. Use file
  search/read tools directly on the workspace.

## Safety Rules

Read-only source inspection. Do not modify application code as part of an
assessment (PRD §26: the platform does not auto-remediate).

## Workflow

Inspect, where present, and note anything that deviates from Laravel's
secure defaults:

- **Routes** (`routes/*.php`): unauthenticated routes exposing sensitive
  actions; missing `->middleware('auth')`/`can:`.
- **Controllers**: mass-assignment via unguarded `$request->all()` into
  `Model::create()`/`::fill()`; missing authorization checks before
  read/write of another user's resource (BOLA/IDOR).
- **Middleware**: custom middleware that doesn't actually enforce what its
  name implies; missing rate limiting on auth endpoints.
- **Policies/Gates**: policy methods that always return `true`, or aren't
  actually registered/called from the controller.
- **Sanctum/Passport**: token abilities/scopes too broad; tokens not
  expired/revoked appropriately.
- **CSRF**: routes excluded from CSRF verification in
  `VerifyCsrfToken::$except` that shouldn't be.
- **File upload/download**: missing extension/MIME validation, path
  traversal in download routes, files stored in a publicly-served path
  without access control.
- **Raw SQL**: `DB::raw()`/string-concatenated queries instead of
  parameter binding.
- **SSRF-sensitive functionality**: any `Http::get($userSuppliedUrl)` or
  similar without an allowlist.
- **Blade**: `{!! !!}` (unescaped output) rendering user input.
- **CORS** (`config/cors.php`): `allowed_origins: ['*']` combined with
  `supports_credentials: true`.
- **Debug/environment**: `APP_DEBUG=true` or `.env` committed/reachable.
- **Composer dependencies**: run `composer audit` if available and report
  known-vulnerable packages.

## Evidence Requirements

Cite the specific file path and line/method name for every finding. Do not
just say "authorization looks weak" — name the controller method and the
missing check.

## Output Requirements

Each finding must map to the normalized finding schema (severity,
confidence, source_location, root_cause, recommendation) so it can be
correlated with any matching ZAP/Nuclei finding on the same endpoint.
