# Commands

Every command in `cli/index.ts`, and whether it's real or a stub, as of this
writing. Run `security --help` for the live list.

| Command | Status | What it does |
|---|---|---|
| `security install <agent>` | **Real** | Merges MCP config + deploys Skills for the named agent into the current project. See [AGENTS.md](AGENTS.md). |
| `security doctor` | **Real** | Runs `src/platform/detect.ts` checks (Node/npm/git/Docker/daemon/Compose/WSL2) plus platform-directory/config health. OK/WARNING/ERROR, exit 1 on error. |
| `security status` | **Real** | Platform root, configured state, registered projects with profiles/timestamps. |
| `security update` | **Real** (git checkouts only) | `git pull --ff-only` + `npm install` + `npm run build` in the platform root. No-ops with guidance if not a git checkout (no npm package is published yet). |
| `security repair` | **Real** | Recreates missing platform directories/runtime config; validates `docker/docker-compose.yml`. |
| `security setup` | **Real** | Global (platform dirs + `config/runtime.yaml` + `docker/.env` with a generated ZAP API key) always; project-level (stack detection + `.security/` + registry) when run outside the platform root. Idempotent. |
| `security config` | **Real** | Prints the current project's `.security/config.yaml`. |
| `security scope` | **Real** | Prints `.security/scope.yaml`; `--add-url`/`--add-domain`/`--add-artifact` append an authorized target. |
| `security scan [--full\|--web\|--api\|--mobile\|--windows\|--webview]` | **Real**, profile flags informational only | Runs `src/orchestrator` against the current project's configured scope. Per-profile filtering isn't implemented yet — every tool applicable to the detected stack + scope runs regardless of which flag is passed (a note is printed when a non-`--full` flag is used). |
| `security findings` | **Real** | Lists findings from the most recent report's `findings.json`. |
| `security report` | **Real** | Shows the most recent report directory and which files exist in it. |
| `security reset --yes` | **Real** | Deletes `projects/registry.json` and `config/runtime.yaml`. Requires `--yes`; never touches project source. |
| `security clean --days <n>` | **Real** | Deletes `reports/`/`evidence/` entries older than N days (default 30). |
| `security logs --lines <n>` | **Real** | Tails `logs/assessments.log` (written by `security scan`). |
| `security tools` | **Real** | Runs `checkHealth()` on nuclei/zap/mobsf/strix adapters and prints availability. |
| `security projects` | **Real** | One-line-per-project listing from the registry. |
| `security validate <findingId> [--status ...] [--note ...]` | **Real** | Shows a finding from the latest report; with `--status`, updates it in place (manual validation, per the vulnerability-validation skill). |
| `security mcp` | **Real** | Starts the stdio MCP server (`src/mcp/server.ts`). Invoked by AI agents via their MCP config, not typically run by hand. |

## Not yet implemented

Nothing on the original PRD §27 command list remains a stub. Known
functional gaps within otherwise-real commands:

- `security scan`'s profile flags (`--web`/`--api`/`--mobile`/...) don't
  filter which tools run yet — see the table above.
- `security update` only handles the git-checkout distribution path; there
  is no published npm package to `npm install -g` yet.
- Multi-role authenticated testing (PRD §18, "compare authorized and
  unauthorized access patterns") isn't automated — `.security/credentials.yaml`
  exists as a template but the orchestrator doesn't consume it yet.
