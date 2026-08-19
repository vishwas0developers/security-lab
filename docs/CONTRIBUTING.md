# Contributing

## Ground rules

- **Do not invent tool integrations.** Before adding or changing any
  Strix/ZAP/Nuclei/MobSF/MCP/agent integration, confirm the current
  official docs/repo for that specific behavior (image name, API endpoint,
  CLI flag, config file path). If you can't verify it, say so explicitly in
  a comment rather than guessing silently.
- **Do not fake success.** If a tool genuinely can't run in your
  environment (no Docker, no LLM key for Strix, etc.), the code should
  report that clearly (`ToolHealth.available: false` with a `detail`
  message) — never return an empty/fabricated result and call it a clean
  scan.
- **Scope enforcement is not optional.** Every adapter's `run()` must call
  through `src/security/scope-guard.ts` before touching a target.
- **Idempotency.** Any `security setup`/`security install` change must be
  safe to run repeatedly without duplicating config, MCP entries, or
  registry rows.

## Before opening a PR

```bash
npm install
npm run build
npm test
```

Also manually exercise the command(s) you changed — `npm test` covers unit
logic, not the CLI end-to-end.

## Reporting a security issue in this platform itself

This is a security tool; treat a vulnerability in the platform itself as
sensitive. Do not open a public issue with exploit details — see the
repository's security policy (or contact the maintainers directly) instead.
