# Troubleshooting

## `security` command not found after install

`npm link` (used by `install.bat`/`install.sh`, since no package is
published yet) failed or your shell's PATH doesn't include npm's global bin
directory. Run: `node "<platform-root>\dist\cli\index.js" --help` directly,
or open a new terminal, or re-run `install.bat`/`install.sh`.

## `npm: npm was not found on PATH` from `security doctor`, but npm clearly works

Fixed as of this codebase: `execFileSync("npm", ...)` fails on Windows
without `shell: true` because `npm` resolves to `npm.cmd`, which needs a
shell to spawn (`where npm` finding it doesn't mean it's directly
executable). `src/platform/detect.ts` sets `shell: process.platform ===
"win32"`. If you see this again, check that fix wasn't reverted.

## Windows installer hangs/crashes with no message

Fixed as of this codebase — `install.bat` is now a thin launcher that
delegates all logic to `scripts/install.ps1` (PowerShell has none of
cmd.exe's goto/label/parenthesized-block fragility that caused earlier
versions to silently re-execute or crash). If `install.bat` still exits
instantly, check: is PowerShell on PATH? Is `scripts/install.ps1` present
next to it (an incomplete checkout)?

## `security tools` shows zap/mobsf as unavailable

They're compose services, not installed by `security setup` automatically
(see [DOCKER.md](DOCKER.md) — bringing up multi-GB containers on every
setup call would be surprising). Bring them up manually:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml -p security-platform up -d zap mobsf
```

## `ZAP_API_KEY is not set`

Run `security setup` (generates `docker/.env` with a random key) and
restart the `zap` container so it picks up the new env var.

## `MOBSF_API_KEY is not set`

MobSF generates its own key on first boot; it isn't something `security
setup` can pre-generate. Retrieve it: `docker compose -f
docker/docker-compose.yml logs mobsf | grep -i api_key`, then add it to
`docker/.env` as `MOBSF_API_KEY`.

## Docker daemon never becomes ready during install

`scripts/install.ps1` polls for up to 90 seconds with a hard wall-clock
deadline, then prints full diagnostics (CLI version, Desktop installed/
running, context, endpoint, WSL2 status, `docker info`'s actual error
output) and continues as a non-fatal warning rather than hanging. Read the
diagnostic block; the most common cause is Docker Desktop still finishing
its own startup — wait, then run `security doctor`.

## `strix: 'strix' was not found on PATH`

Expected unless you've installed it yourself
(`curl -sSL https://strix.ai/install | bash`) and set `STRIX_LLM`/
`LLM_API_KEY`. This platform does not install Strix or provision an LLM key
for you — see [DOCKER.md](DOCKER.md).

## A scan reports "not in the authorized scope"

Working as intended — nothing is scanned unless explicitly listed in
`.security/scope.yaml`. Add the target: `security scope --add-url
https://staging.example.com`.
