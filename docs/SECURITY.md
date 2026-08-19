# Security & Scope Model

This platform is strictly for **authorized** systems. Nothing is in scope
unless explicitly listed.

## Defaults (PRD §21)

```text
production      = protected   (nothing is implicitly production-safe;
                   everything is denied unless listed, regardless of
                   environment label)
external target = denied      (default scope lists are empty)
scope expansion = denied      (src/security/scope-guard.ts never widens
                   scope at runtime; there is no "auto-discover more
                   targets" behavior)
secret exposure = denied      (src/security/redact.ts sanitizes evidence)
destructive actions = denied  (scope.destructiveActionsAllowed: false)
```

## Scope enforcement

`.security/scope.yaml` supports:

- `allowedDomains` (supports `*.example.com` wildcard subdomain matching)
- `allowedUrls` (exact or prefix match)
- `allowedIpRanges` (CIDR)
- `allowedMobileArtifacts` (APK/AAB filenames/paths, for MobSF)
- `excludedHosts` / `excludedPaths` (always win over an allow-list match)
- `environment`, `rateLimits.requestsPerSecond`, `maxScanDurationMinutes`,
  `destructiveActionsAllowed`

Every tool adapter (`src/tools/*.ts`) calls `assertInScope()` (or
`assertMobileArtifactInScope()` for MobSF) before touching a target —
`src/security/scope-guard.ts` is the single choke point; no adapter
duplicates this logic. A violation raises `ScopeViolationError`, which the
orchestrator/MCP layer surfaces as a clear message, not a crash.

## Evidence sanitization

`src/security/redact.ts` strips, from any evidence text before it's written
to disk: `Authorization`/`Cookie`/`Set-Cookie` headers, common secret-field
names (`password`, `api_key`, `access_token`, ...) in JSON/query-string
shape, PEM private keys, AWS access keys, bearer tokens, and JWTs.
`redactDeep()` additionally redacts any object key matching
`password|secret|token|api[_-]?key|private[_-]?key` recursively. This is
defense-in-depth, not a substitute for adapters being deliberate about what
they capture as evidence in the first place.

## Credentials

`.security/credentials.yaml` (copied from `credentials.example.yaml`) is
gitignored. It is not yet consumed by the orchestrator for automated
multi-role testing (PRD §18) — that's a known gap, documented in
[COMMANDS.md](COMMANDS.md).

## Destructive actions

`assertDestructiveActionsAllowed()` exists in `scope-guard.ts` for future
use by any workflow that would need it; nothing in this platform currently
performs a destructive action to prove a vulnerability (PRD §15/§25: "harmless
validation is preferred over destructive proof").
