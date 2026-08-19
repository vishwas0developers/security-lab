// Cross-platform prerequisite detection shared by `security doctor` and
// `security setup`. Runs as plain Node child_process calls (no shelling out
// to install.sh/install.bat/install.ps1) so it works identically whether the
// CLI was reached via the bootstrap installers or via a plain `npm install
// -g` on a machine that already has Node.
//
// Platform-specific bits (Docker Desktop path, WSL2) are isolated behind
// `process.platform` checks in this one file rather than spread across the
// caller, per the "keep platform-specific logic isolated" requirement.

import { execFileSync } from "child_process";

export type CheckStatus = "ok" | "warning" | "error" | "skipped";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  remediation?: string;
}

function tryRun(cmd: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  try {
    // On Windows, commands like npm/git/wsl often resolve to a .cmd/.bat
    // shim rather than a real .exe; execFileSync cannot spawn those directly
    // without going through a shell (it fails with ENOENT even though
    // `where <cmd>` finds them fine, since `where` doesn't execute anything).
    // `shell: true` on Windows only, with args passed as a static array
    // (never user-supplied free text), gets this right without introducing
    // shell-injection risk.
    const stdout = execFileSync(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 10_000,
      shell: process.platform === "win32",
    });
    return { ok: true, stdout: stdout.trim(), stderr: "" };
  } catch (err: any) {
    return { ok: false, stdout: "", stderr: String(err?.stderr ?? err?.message ?? err) };
  }
}

function commandExists(cmd: string): boolean {
  const probe = process.platform === "win32" ? tryRun("where", [cmd]) : tryRun("which", [cmd]);
  return probe.ok && probe.stdout.length > 0;
}

export function checkNode(): CheckResult {
  const major = parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (major < 18) {
    return {
      name: "Node.js",
      status: "error",
      message: `Node.js v${process.versions.node} is too old (18+ required).`,
      remediation: "Upgrade Node.js from https://nodejs.org/.",
    };
  }
  return { name: "Node.js", status: "ok", message: `v${process.versions.node}` };
}

export function checkNpm(): CheckResult {
  const res = tryRun("npm", ["--version"]);
  if (!res.ok) {
    return {
      name: "npm",
      status: "error",
      message: "npm was not found on PATH.",
      remediation: "Reinstall Node.js (npm ships with it) from https://nodejs.org/.",
    };
  }
  return { name: "npm", status: "ok", message: `v${res.stdout}` };
}

export function checkGit(): CheckResult {
  if (!commandExists("git")) {
    return {
      name: "git",
      status: "warning",
      message: "git was not found on PATH.",
      remediation: "Install git if you want 'security update' to work: https://git-scm.com/downloads",
    };
  }
  const res = tryRun("git", ["--version"]);
  return { name: "git", status: "ok", message: res.ok ? res.stdout : "found" };
}

export function checkDockerCli(): CheckResult {
  if (!commandExists("docker")) {
    return {
      name: "Docker CLI",
      status: "warning",
      message: "Docker was not found on PATH.",
      remediation: "Install Docker Desktop (Windows/macOS) or Docker Engine (Linux): https://docs.docker.com/get-docker/",
    };
  }
  const res = tryRun("docker", ["--version"]);
  return { name: "Docker CLI", status: "ok", message: res.ok ? res.stdout : "found" };
}

export function checkDockerDaemon(): CheckResult {
  const res = tryRun("docker", ["info", "--format", "{{.ServerVersion}}"]);
  if (!res.ok) {
    return {
      name: "Docker daemon",
      status: "warning",
      message: "Docker daemon is not responding (docker info failed).",
      remediation:
        process.platform === "win32"
          ? "Start Docker Desktop, wait for it to finish starting, then re-run 'security doctor'."
          : "Start the Docker service, e.g.: sudo systemctl start docker",
    };
  }
  return { name: "Docker daemon", status: "ok", message: `running (server v${res.stdout})` };
}

export function checkDockerCompose(): CheckResult {
  const v2 = tryRun("docker", ["compose", "version"]);
  if (v2.ok) {
    return { name: "Docker Compose", status: "ok", message: v2.stdout };
  }
  if (commandExists("docker-compose")) {
    const standalone = tryRun("docker-compose", ["version"]);
    if (standalone.ok) {
      return { name: "Docker Compose", status: "ok", message: standalone.stdout };
    }
  }
  return {
    name: "Docker Compose",
    status: "warning",
    message: "Docker Compose was not found.",
    remediation: "Update Docker Desktop / Docker Engine to a version that includes Compose v2.",
  };
}

export function checkWsl(): CheckResult {
  if (process.platform !== "win32") {
    return { name: "WSL2", status: "skipped", message: "not applicable on this OS" };
  }
  if (!commandExists("wsl")) {
    return {
      name: "WSL2",
      status: "warning",
      message: "WSL was not found (only needed for Android emulator / isolated Windows runtime workflows).",
      remediation: "Run 'wsl --install' as Administrator if you need Android/Windows-runtime workflows.",
    };
  }
  const res = tryRun("wsl", ["--status"]);
  if (!res.ok) {
    return {
      name: "WSL2",
      status: "warning",
      message: "'wsl --status' failed; WSL may not be fully set up.",
      remediation: "Run 'wsl --install' as Administrator.",
    };
  }
  return { name: "WSL2", status: "ok", message: "available" };
}

export function runAllChecks(): CheckResult[] {
  const checks = [checkNode(), checkNpm(), checkGit(), checkDockerCli()];
  const dockerCli = checks[checks.length - 1];
  if (dockerCli.status === "ok") {
    const daemon = checkDockerDaemon();
    checks.push(daemon);
    if (daemon.status === "ok") {
      checks.push(checkDockerCompose());
    }
  }
  if (process.platform === "win32") {
    checks.push(checkWsl());
  }
  return checks;
}
