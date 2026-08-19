# Installation

## Windows (verified on this machine)

```powershell
git clone <repository> D:\AI_Tools\security-lab
cd D:\AI_Tools\security-lab
install.bat
```

`install.bat` is a thin launcher (OS check, PowerShell-availability check,
pause-on-exit) that delegates all real logic to `scripts/install.ps1`:
Node/npm/git/Docker/Compose/WSL2 checks, directory creation, `npm install`
+ `npm run build` + `npm link`, and `config/runtime.yaml` generation.
PowerShell was chosen over pure batch after a prior batch-only
implementation repeatedly hit cmd.exe parser fragility (goto/label/
parenthesized-block interactions causing silent re-execution or "label not
found" errors even in syntactically valid scripts) — see the header comment
in `install.bat` for the specifics.

Verified end-to-end on this machine: prerequisite detection, Docker
readiness polling with a bounded 90s deadline and full diagnostics on
timeout, directory/config generation, `npm install`/`build`/`link`, and a
final summary with accurate exit codes (0 success, 1 required-step failure,
2 wrong invocation).

## Linux / macOS (architecture complete, not run on a real Linux/macOS box in this session)

```bash
git clone <repository>
cd security-platform
./install.sh
```

`install.sh` mirrors `install.bat`'s checks and messages, plus a bootstrap-
clone mode for `curl -fsSL <repo>/raw/main/install.sh | bash` (set
`SECURITY_PLATFORM_REPO` to the git URL). It correctly detects and refuses
to run under Git Bash/MSYS on Windows, redirecting to `install.bat` instead
— this was verified on this machine (Windows + Git Bash), since that's the
one Linux-shell environment actually available here. Syntax-checked with
`bash -n install.sh`. The Linux/macOS-specific paths (systemd Docker
service detection, `open -a Docker` on macOS) have not been exercised on a
real Linux/macOS machine as part of this implementation pass — flagging
that honestly rather than claiming a verification that didn't happen.

## After installation

```powershell
security doctor          # verify prerequisites
security setup           # from the platform root: global setup
cd D:\Projects\my-project
security setup           # from a project: stack detection + .security/
security install claude  # configure your AI agent
```

## Bringing up the Docker services

`security setup` generates `docker/.env` (with a random `ZAP_API_KEY`) but
does not start the ZAP/MobSF containers automatically — see
[DOCKER.md](DOCKER.md) for why, and the exact `docker compose up -d`
command to run them.
