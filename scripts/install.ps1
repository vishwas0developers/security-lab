#Requires -Version 5.1
<#
Security Platform - Windows installer logic.

Invoked by install.bat, which is a thin launcher (OS check + PowerShell
availability check + pause-on-exit) with no branching logic of its own.
Everything else -- prerequisite checks (Node.js, npm, git, Docker, Docker
Compose, WSL2), directory creation, npm install/build/link, and runtime
config generation -- lives here, because PowerShell's control flow doesn't
have cmd.exe's fragile goto/label/parenthesized-block interactions that a
prior version of install.bat ran into (see install.bat's header comment for
what that looked like: intermittent skipped sections, repeated re-execution
of trailing script content, and "system cannot find the batch label
specified" for labels that genuinely existed in the file).

Usage:
    install.ps1                interactive (script itself never pauses --
                                install.bat handles that after this returns)
    install.ps1 -NoPause       accepted for symmetry with install.bat; has
                                no effect here (kept so install.bat can pass
                                its own args through unchanged)

Exit codes:
    0  success (installation usable; see summary for any manual actions)
    1  a required prerequisite is missing or a required step failed
    2  this script was not run in a supported way (wrong location)
#>

param(
    [switch]$NoPause
)

$ErrorActionPreference = "Stop"

$script:WarningCount = 0
$state = [ordered]@{
    NodeOk     = $false
    NpmOk      = $false
    GitOk      = $false
    DockerOk   = $false
    DockerRun  = $false
    ComposeOk  = $false
    WslOk      = $false
    BuildOk    = $false
    LinkOk     = $false
}

function Write-Info    { param([string]$Message) Write-Host "[INFO] $Message" }
function Write-Ok      { param([string]$Message) Write-Host "[SUCCESS] $Message" }
function Write-Warn    { param([string]$Message) Write-Host "[WARNING] $Message"; $script:WarningCount++ }
function Write-ErrMsg  { param([string]$Message) Write-Host "[ERROR] $Message" }

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "============================================================"
Write-Host "  Security Platform Installer (Windows)"
Write-Host "============================================================"
Write-Host ""

$PlatformRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Write-Info "Installer directory: $PlatformRoot"
Write-Host ""

function Exit-Fail {
    param([int]$Code)
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "  INSTALLATION FAILED"
    Write-Host "============================================================"
    Write-ErrMsg "See the messages above for details. Fix the reported issue and re-run install.bat."
    exit $Code
}

# ------------------------------------------------ locate the repository root
$packageJsonPath = Join-Path $PlatformRoot "package.json"
if (-not (Test-Path -LiteralPath $packageJsonPath)) {
    Write-ErrMsg "package.json was not found in $PlatformRoot."
    Write-ErrMsg "install.bat must be run from inside the cloned security-platform repository."
    Exit-Fail 2
}
Write-Ok "Repository root located: $PlatformRoot"

# --------------------------------------------------------------- Node.js
Write-Info "Checking for Node.js..."
if (-not (Test-CommandExists "node")) {
    Write-ErrMsg "Node.js was not found on PATH."
    Write-ErrMsg "Install Node.js 18 LTS or later from https://nodejs.org/ and re-run install.bat."
    Exit-Fail 1
}
$nodeVersion = (& node --version 2>$null)
if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
    Write-ErrMsg "Found 'node' on PATH but 'node --version' produced no output. The Node.js install may be corrupt."
    Exit-Fail 1
}
$nodeMajor = 0
if ($nodeVersion -match '^v?(\d+)\.') { $nodeMajor = [int]$Matches[1] }
if ($nodeMajor -lt 18) {
    Write-ErrMsg "Node.js $nodeVersion was found, but version 18 or later is required."
    Write-ErrMsg "Upgrade Node.js from https://nodejs.org/ and re-run install.bat."
    Exit-Fail 1
}
Write-Ok "Node.js $nodeVersion found."
$state.NodeOk = $true

# ------------------------------------------------------------------- npm
Write-Info "Checking for npm..."
if (-not (Test-CommandExists "npm")) {
    Write-ErrMsg "npm was not found on PATH. It normally ships with Node.js."
    Write-ErrMsg "Reinstall Node.js from https://nodejs.org/ (this also installs npm) and re-run install.bat."
    Exit-Fail 1
}
$npmVersion = (& npm --version 2>$null)
if ([string]::IsNullOrWhiteSpace($npmVersion)) {
    Write-ErrMsg "Found 'npm' on PATH but 'npm --version' produced no output."
    Exit-Fail 1
}
Write-Ok "npm v$npmVersion found."
$state.NpmOk = $true

# ------------------------------------------------------------------- git
Write-Info "Checking for git..."
if (Test-CommandExists "git") {
    Write-Ok "git found."
    $state.GitOk = $true
} else {
    Write-Warn "git was not found on PATH. Updating the platform later (git pull) will not work until git is installed: https://git-scm.com/download/win"
}

# --------------------------------------------------------------- Docker
# Bounded readiness state machine (never blocks indefinitely):
#   detect CLI -> detect Desktop -> start Desktop if applicable -> poll daemon
#   with a hard deadline -> on READY continue, on TIMEOUT dump full
#   diagnostics and continue as a non-fatal warning (Docker is optional for
#   the CLI itself; 'security doctor' / 'security scan' need it later).
function Get-DockerDiagnostics {
    # Distinguishes: CLI missing / Desktop missing / Desktop not running /
    # daemon starting / daemon unavailable / daemon ready / WSL2 unavailable /
    # permission issue / context misconfigured -- and captures stderr instead
    # of swallowing it, per the "never silently swallow stderr" requirement.
    $diag = [ordered]@{
        CliVersion       = $null
        DesktopExeFound  = $false
        DesktopExePath   = (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe")
        DesktopProcess   = $false
        Context          = $null
        Endpoint         = $null
        InfoErrorOutput  = $null
        LooksLikePerm    = $false
        WslAvailable     = $false
    }
    # Native commands (docker.exe, wsl.exe) routinely write harmless notices
    # to stderr (e.g. Docker's own "WARNING: No blkio throttle..." line).
    # Under $ErrorActionPreference = "Stop" those get promoted to terminating
    # errors and would abort this whole diagnostics routine -- and the
    # script that called it -- over a warning. Scope EAP to "Continue" for
    # the duration of these calls only, and always restore it.
    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        try { $diag.CliVersion = (& docker version --format '{{.Client.Version}}' 2>$null) } catch {}
        $diag.DesktopExeFound = Test-Path -LiteralPath $diag.DesktopExePath
        $diag.DesktopProcess = [bool](Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)
        try { $diag.Context = (& docker context show 2>$null) } catch {}
        try {
            $inspectJson = ((& docker context inspect $diag.Context 2>$null) -join "`n")
            if ($inspectJson -match '"Host"\s*:\s*"([^"]+)"') { $diag.Endpoint = $Matches[1] }
        } catch {}
        try {
            $infoOutput = ((& docker info 2>&1) | ForEach-Object { $_.ToString() })
            $errLines = $infoOutput | Where-Object { $_ -match '(?i)error|permission denied|access is denied|access denied|cannot connect' }
            $diag.InfoErrorOutput = ($errLines -join " | ")
        } catch {}
        if ($diag.InfoErrorOutput -match '(?i)permission denied|access is denied|access denied') { $diag.LooksLikePerm = $true }
        if (Test-CommandExists "wsl") {
            try { & wsl --status *>$null; $diag.WslAvailable = ($LASTEXITCODE -eq 0) } catch {}
        }
    } finally {
        $ErrorActionPreference = $previousEap
    }
    return $diag
}

function Write-DockerDiagnostics {
    param([hashtable]$Diag)
    Write-Host "  Docker CLI version:        $(if ($Diag.CliVersion) { $Diag.CliVersion } else { '(unknown)' })"
    Write-Host "  Docker Desktop installed:  $($Diag.DesktopExeFound)"
    Write-Host "  Docker Desktop running:    $($Diag.DesktopProcess)"
    Write-Host "  Docker context:            $(if ($Diag.Context) { $Diag.Context } else { '(unknown)' })"
    Write-Host "  Docker endpoint:           $(if ($Diag.Endpoint) { $Diag.Endpoint } else { '(unknown)' })"
    Write-Host "  WSL2 available:            $($Diag.WslAvailable)"
    if ($Diag.InfoErrorOutput) {
        Write-Host "  'docker info' error output:"
        Write-Host "    $($Diag.InfoErrorOutput)"
    }
}

Write-Info "Checking for Docker..."
if (Test-CommandExists "docker") {
    $state.DockerOk = $true
    Write-Ok "Docker CLI found."

    $dockerInfoOk = $false
    try { & docker info *>$null; $dockerInfoOk = ($LASTEXITCODE -eq 0) } catch { $dockerInfoOk = $false }

    if ($dockerInfoOk) {
        Write-Ok "Docker is running."
        $state.DockerRun = $true
    } else {
        Write-Warn "Docker CLI is installed but the Docker daemon is not responding."
        $dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
        if (Test-Path -LiteralPath $dockerDesktopExe) {
            Write-Info "Attempting to start Docker Desktop..."
            Start-Process -FilePath $dockerDesktopExe | Out-Null

            # Hard deadline, never a blocking loop without one: 18 x 5s = 90s
            # wall-clock max, checked against Get-Date rather than trusting
            # the loop counter alone, so a slow/suspended machine can't turn
            # this into an unbounded wait.
            $deadline = (Get-Date).AddSeconds(90)
            Write-Info "Waiting for the Docker daemon to become ready (up to 90 seconds, deadline $($deadline.ToString('HH:mm:ss')))..."
            while ((Get-Date) -lt $deadline -and -not $state.DockerRun) {
                Start-Sleep -Seconds 5
                try { & docker info *>$null; if ($LASTEXITCODE -eq 0) { $state.DockerRun = $true } } catch {}
            }

            if ($state.DockerRun) {
                Write-Ok "Docker is now running."
            } else {
                Write-Warn "Docker Desktop did not become ready within 90 seconds. Diagnostics:"
                $diag = Get-DockerDiagnostics
                Write-DockerDiagnostics -Diag $diag
                if ($diag.LooksLikePerm) {
                    Write-Warn "This looks like a permission/access issue -- ensure your user is in the 'docker-users' group and re-log in, or run this installer as Administrator."
                }
                Write-Warn "Start Docker Desktop manually and re-run install.bat, or run 'security doctor' later to re-check. This is non-fatal; the CLI itself does not require Docker."
            }
        } else {
            Write-Warn "Could not find Docker Desktop.exe at the default location ($dockerDesktopExe)."
            Write-DockerDiagnostics -Diag (Get-DockerDiagnostics)
            Write-Warn "Install Docker Desktop (https://www.docker.com/products/docker-desktop/) or start it manually if installed elsewhere, then re-run install.bat."
        }
    }

    if ($state.DockerRun) {
        Write-Info "Checking Docker Compose..."
        $composeV2Ok = $false
        try { & docker compose version *>$null; $composeV2Ok = ($LASTEXITCODE -eq 0) } catch { $composeV2Ok = $false }
        if ($composeV2Ok) {
            Write-Ok "Docker Compose (v2 plugin) found."
            $state.ComposeOk = $true
        } elseif (Test-CommandExists "docker-compose") {
            $composeStandaloneOk = $false
            try { & docker-compose version *>$null; $composeStandaloneOk = ($LASTEXITCODE -eq 0) } catch { $composeStandaloneOk = $false }
            if ($composeStandaloneOk) {
                Write-Ok "Docker Compose (standalone) found."
                $state.ComposeOk = $true
            }
        }
        if (-not $state.ComposeOk) {
            Write-Warn "Docker is running but Docker Compose is not available. Update Docker Desktop to a version that includes Compose v2."
        }
    }
} else {
    Write-Warn "Docker was not found on PATH. Strix, ZAP, Nuclei, and MobSF run as Docker containers and will be unavailable until Docker Desktop is installed: https://www.docker.com/products/docker-desktop/"
}

# -------------------------------------------------------------------- WSL2
if (Test-CommandExists "wsl") {
    $wslOk = $false
    try { & wsl --status *>$null; $wslOk = ($LASTEXITCODE -eq 0) } catch { $wslOk = $false }
    if ($wslOk) {
        Write-Ok "WSL is available."
        $state.WslOk = $true
    } else {
        Write-Warn "WSL is present but 'wsl --status' failed. WSL2-dependent workflows (Android emulator, isolated Windows runtime testing) may not work until WSL is fully set up: run 'wsl --install' as Administrator."
    }
} else {
    Write-Info "WSL was not found (only needed for Android emulator / isolated Windows runtime workflows). Skipping."
}

Write-Host ""
Write-Info "Prerequisite checks complete. Continuing with installation..."
Write-Host ""

# --------------------------------------------------- create runtime folders
# Idempotent: skips anything that already exists, never recreates/duplicates.
foreach ($dir in @("config", "policies", "profiles", "schemas", "projects", "reports", "evidence", "findings", "logs")) {
    $dirPath = Join-Path $PlatformRoot $dir
    if (Test-Path -LiteralPath $dirPath) {
        Write-Info "$dirPath already exists, skipping."
    } else {
        try {
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
            Write-Ok "Created $dirPath"
        } catch {
            Write-ErrMsg "Failed to create directory: $dirPath ($($_.Exception.Message))"
            Exit-Fail 1
        }
    }
}

# --------------------------------------------------------- npm install/build
Push-Location $PlatformRoot
try {
    Write-Info "Installing npm dependencies (npm install)..."
    & npm install
    $rc = $LASTEXITCODE
    if ($rc -ne 0) {
        Write-ErrMsg "'npm install' failed (exit code $rc). See the npm output above for details."
        Exit-Fail 1
    }
    Write-Ok "Dependencies installed."

    Write-Info "Building the CLI (npm run build)..."
    & npm run build
    $rc = $LASTEXITCODE
    if ($rc -ne 0) {
        Write-ErrMsg "'npm run build' failed (exit code $rc). See the TypeScript output above for details."
        Exit-Fail 1
    }
    Write-Ok "Build succeeded."
    $state.BuildOk = $true

    # -------------------------------------------------------------- npm link
    # Non-fatal: if this fails (commonly a permissions issue on the global
    # npm directory), the CLI still works via 'node dist\cli\index.js'.
    Write-Info "Linking the 'security' command globally (npm link)..."
    & npm link
    $linkRc = $LASTEXITCODE
    $securityOnPath = Test-CommandExists "security"

    if ($linkRc -ne 0) {
        Write-Warn "'npm link' failed, so the 'security' command is not on PATH yet."
        Write-Warn "  Try running this installer from an Administrator command prompt, or run the CLI directly:"
        Write-Warn "  node `"$PlatformRoot\dist\cli\index.js`" --help"
    } elseif (-not $securityOnPath) {
        Write-Warn "'npm link' reported success but 'security' is still not on PATH. You may need to open a new terminal window."
    } else {
        Write-Ok "'security' command linked and on PATH."
        $state.LinkOk = $true
    }
} finally {
    Pop-Location
}

# ------------------------------------------------------- global runtime config
$generateConfigScript = Join-Path $PlatformRoot "scripts\generate-runtime-config.ps1"
if (Test-Path -LiteralPath $generateConfigScript) {
    Write-Info "Writing global runtime configuration..."
    $env:PLATFORM_ROOT = $PlatformRoot
    & $generateConfigScript
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Failed to write config\runtime.yaml. You can create it manually later; this does not block CLI usage."
    }
} else {
    Write-Warn "scripts\generate-runtime-config.ps1 not found -- skipping runtime config generation."
}

# ==================================================================== summary
Write-Host ""
Write-Host "============================================================"
Write-Host "  INSTALLATION SUMMARY"
Write-Host "============================================================"
Write-Host $(if ($state.NodeOk)  { "  [OK]      Node.js" }               else { "  [FAILED]  Node.js" })
Write-Host $(if ($state.NpmOk)   { "  [OK]      npm" }                   else { "  [FAILED]  npm" })
Write-Host $(if ($state.GitOk)   { "  [OK]      git" }                   else { "  [SKIPPED] git (optional)" })

$dockerLine = "  [SKIPPED] Docker Desktop (not installed)"
if ($state.DockerOk -and -not $state.DockerRun) { $dockerLine = "  [SKIPPED] Docker Desktop (installed, not running)" }
if ($state.DockerOk -and $state.DockerRun)      { $dockerLine = "  [OK]      Docker Desktop (running)" }
Write-Host $dockerLine

Write-Host $(if ($state.ComposeOk) { "  [OK]      Docker Compose" }      else { "  [SKIPPED] Docker Compose" })
Write-Host $(if ($state.WslOk)     { "  [OK]      WSL2" }                else { "  [SKIPPED] WSL2 (optional)" })
Write-Host $(if ($state.BuildOk)   { "  [OK]      CLI build" }           else { "  [FAILED]  CLI build" })
Write-Host $(if ($state.LinkOk)    { "  [OK]      'security' command on PATH" } else { "  [SKIPPED] 'security' command on PATH" })
Write-Host ""

$manualActions = @()
if (-not $state.DockerOk) { $manualActions += "    - Install Docker Desktop: https://www.docker.com/products/docker-desktop/" }
if ($state.DockerOk -and -not $state.DockerRun) { $manualActions += "    - Start Docker Desktop, then run: security doctor" }
if (-not $state.GitOk) { $manualActions += "    - Install git if you want 'security update' to work: https://git-scm.com/download/win" }
if (-not $state.LinkOk) { $manualActions += "    - 'security' is not linked globally; use: node `"$PlatformRoot\dist\cli\index.js`"" }

Write-Host "  Remaining manual actions:"
if ($manualActions.Count -eq 0) {
    Write-Host "    (none)"
} else {
    $manualActions | ForEach-Object { Write-Host $_ }
}
Write-Host ""

if ($state.BuildOk) {
    Write-Host "============================================================"
    Write-Host "  INSTALLATION COMPLETE"
    Write-Host "============================================================"
    Write-Host "  Next steps:"
    Write-Host "    cd D:\Projects\your-project"
    Write-Host "    security setup"
    Write-Host "    security scan --full"
    $exitCode = 0
} else {
    Write-ErrMsg "The CLI build did not complete successfully."
    $exitCode = 1
}

Write-Host ""
if ($script:WarningCount -gt 0) {
    Write-Host "[WARNING] Completed with $($script:WarningCount) warning(s). See above."
}

exit $exitCode
