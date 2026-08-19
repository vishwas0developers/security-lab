// Loads/saves the global platform config (under the platform root) and
// per-project `.security/*.yaml` files, validated against schema.ts.
//
// See PRD §7 (workspace layout) and §8 (per-project integration) for the
// files this reads/writes:
//   <platform-root>/config/runtime.yaml   — global runtime config
//   <project>/.security/config.yaml
//   <project>/.security/scope.yaml
//   <project>/.security/profile.yaml

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import {
  ProjectConfigSchema,
  ScopeSchema,
  ProjectProfileSchema,
  type ProjectConfig,
  type Scope,
  type ProjectProfile,
} from "./schema";

export const RUNTIME_DIRS = [
  "config",
  "policies",
  "profiles",
  "schemas",
  "projects",
  "reports",
  "evidence",
  "findings",
  "logs",
] as const;

// The platform root is the directory this package's package.json lives in.
// That is true whether the CLI was reached via a `git clone` + `npm link`
// (PRD §28's primary flow, e.g. D:\AI_Tools\security-lab) or via a real
// `npm install -g @<org>/security-platform` once published -- in both cases
// the installed package directory *is* the platform root. SECURITY_PLATFORM_ROOT
// overrides this for advanced/CI use; an OS-appropriate default is used only
// if neither resolves (should not normally happen for an installed CLI).
export function getPlatformRoot(): string {
  const envRoot = process.env.SECURITY_PLATFORM_ROOT;
  if (envRoot && envRoot.trim().length > 0) {
    return path.resolve(envRoot);
  }

  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "security-platform") {
          return dir;
        }
      } catch {
        // malformed/unrelated package.json on the way up -- keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.platform === "win32" ? "D:\\AI_Tools\\security-lab" : path.join(os.homedir(), ".security-lab");
}

export interface EnsureDirResult {
  dirPath: string;
  created: boolean;
}

// Idempotent by construction: fs.existsSync + mkdirSync(recursive) never
// duplicates or errors on a directory that's already there.
export function ensurePlatformDirectories(root: string): EnsureDirResult[] {
  return RUNTIME_DIRS.map((name) => {
    const dirPath = path.join(root, name);
    const existed = fs.existsSync(dirPath);
    if (!existed) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { dirPath, created: !existed };
  });
}

export interface RuntimeConfig {
  schemaVersion: 1;
  platformRoot: string;
  installedAt: string;
  platform: string;
}

export function getRuntimeConfigPath(root: string): string {
  return path.join(root, "config", "runtime.yaml");
}

// Idempotent: never overwrites an existing runtime.yaml (a user may have
// hand-edited it), matching install.bat/install.sh/generate-runtime-config.ps1.
export function ensureRuntimeConfig(root: string): { path: string; created: boolean } {
  const configPath = getRuntimeConfigPath(root);
  if (fs.existsSync(configPath)) {
    return { path: configPath, created: false };
  }
  const config: RuntimeConfig = {
    schemaVersion: 1,
    platformRoot: root,
    installedAt: new Date().toISOString(),
    platform: process.platform,
  };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml.dump(config), "utf8");
  return { path: configPath, created: true };
}

// Loads docker/.env (KEY=VALUE lines, '#' comments) into process.env so
// CLI-invoked tool adapters (zap.ts/mobsf.ts, which read process.env.ZAP_API_KEY
// / MOBSF_API_KEY directly) see the same values `docker compose` uses --
// without this, `security scan` and `security tools` would never see the
// API key `security setup` generated. Never overwrites a variable already
// set in the real environment (explicit `export`/shell env wins).
export function loadDockerEnv(platformRoot: string): void {
  const envPath = path.join(platformRoot, "docker", ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function dotSecurityDir(projectPath: string): string {
  return path.join(projectPath, ".security");
}

export function hasProjectConfig(projectPath: string): boolean {
  return fs.existsSync(path.join(dotSecurityDir(projectPath), "config.yaml"));
}

export function loadProjectConfig(projectPath: string): ProjectConfig | null {
  const filePath = path.join(dotSecurityDir(projectPath), "config.yaml");
  if (!fs.existsSync(filePath)) return null;
  const raw = yaml.load(fs.readFileSync(filePath, "utf8"));
  return ProjectConfigSchema.parse(raw);
}

export function saveProjectConfig(projectPath: string, config: ProjectConfig): void {
  const dir = dotSecurityDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.yaml"), yaml.dump(ProjectConfigSchema.parse(config)), "utf8");
}

export function loadScope(projectPath: string): Scope | null {
  const filePath = path.join(dotSecurityDir(projectPath), "scope.yaml");
  if (!fs.existsSync(filePath)) return null;
  const raw = yaml.load(fs.readFileSync(filePath, "utf8"));
  return ScopeSchema.parse(raw);
}

export function saveScope(projectPath: string, scope: Scope): void {
  const dir = dotSecurityDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "scope.yaml"), yaml.dump(ScopeSchema.parse(scope)), "utf8");
}

export function loadProjectProfile(projectPath: string): ProjectProfile | null {
  const filePath = path.join(dotSecurityDir(projectPath), "profile.yaml");
  if (!fs.existsSync(filePath)) return null;
  const raw = yaml.load(fs.readFileSync(filePath, "utf8"));
  return ProjectProfileSchema.parse(raw);
}

export function saveProjectProfile(projectPath: string, profile: ProjectProfile): void {
  const dir = dotSecurityDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "profile.yaml"), yaml.dump(ProjectProfileSchema.parse(profile)), "utf8");
}
