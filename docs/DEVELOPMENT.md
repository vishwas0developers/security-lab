# Development

## Build

```bash
npm install
npm run build       # tsc, outputs to dist/
npm run watch        # tsc -w
```

## Test

```bash
npm test             # runs build then node --test tests/*.test.js
```

See `tests/` for unit coverage of `src/config/schema.ts`, `loader.ts`,
`registry.ts`, `src/security/{scope-guard,redact}.ts`, and
`src/findings/correlate.ts`.

## Running the CLI locally

```bash
npm run build
node dist/cli/index.js --help
# or, to get the 'security' name on PATH:
npm link
security --help
```

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full repository layout and
component responsibilities.

## Distribution model

Today: `git clone` + `install.bat`/`install.sh` + `npm link` (no published
package). The target end-state per the plan is `npm install -g
@<organization>/security-platform`; `package.json`'s `files` array already
includes everything a real publish would need (`scripts/`, `install.bat`,
`install.sh`, `skills/`, `templates/`, `docker/`, `dist/*`) — publishing
itself (choosing an org scope, `npm publish`) hasn't happened.

## Adding a new tool adapter

1. Implement `ToolAdapter` (`src/tools/adapter.ts`): `checkHealth()` and
   `run(target, scope)`.
2. Call `assertInScope()` (or a scope-specific equivalent) before touching
   any target — never skip this.
3. Map the tool's native output into `Finding[]` (`src/findings/schema.ts`).
4. Wire it into `src/orchestrator/index.ts`'s tool selection.
5. Before writing the adapter, confirm the tool's current official
   image/CLI/API against its actual docs — do not invent flags or
   endpoints (see `docs/DOCKER.md`'s note on how ZAP/Nuclei/MobSF/Strix were
   each verified).

## Adding a new agent adapter

Add an entry to `PLATFORMS` in `install/index.ts`, and — only if you've
confirmed it against a real installation or that agent's current docs — an
entry in `VERIFIED_MCP_TARGETS`/`VERIFIED_SKILLS_TARGETS`. Otherwise it
falls back to the generic `.{slug}/mcp.json` + `.agents/skills/` convention
automatically; document it as unverified in [AGENTS.md](AGENTS.md).
