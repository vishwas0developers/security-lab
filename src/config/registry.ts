// Tracks which projects have run `security setup`, so the platform can list
// them (`security status`, `security projects`) and so re-running setup can
// detect "already registered" instead of creating a duplicate entry.
//
// Stored at <platform-root>/projects/registry.json. Never stores secrets --
// just path/name/profile/timestamp metadata (PRD §39).

import * as fs from "fs";
import * as path from "path";

export interface RegisteredProject {
  name: string;
  path: string;
  profiles: string[];
  registeredAt: string;
  lastAssessment: string | null;
}

interface RegistryFile {
  schemaVersion: 1;
  projects: RegisteredProject[];
}

function registryPath(platformRoot: string): string {
  return path.join(platformRoot, "projects", "registry.json");
}

function readRegistry(platformRoot: string): RegistryFile {
  const filePath = registryPath(platformRoot);
  if (!fs.existsSync(filePath)) {
    return { schemaVersion: 1, projects: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && Array.isArray(parsed.projects)) {
      return parsed as RegistryFile;
    }
  } catch {
    // fall through to a fresh registry rather than crashing setup over a
    // corrupted registry file
  }
  return { schemaVersion: 1, projects: [] };
}

function writeRegistry(platformRoot: string, registry: RegistryFile): void {
  const filePath = registryPath(platformRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), "utf8");
}

export function listProjects(platformRoot: string): RegisteredProject[] {
  return readRegistry(platformRoot).projects;
}

// Idempotent: re-registering an already-known project path updates its
// name/profiles in place rather than appending a duplicate entry.
export function registerProject(platformRoot: string, project: { name: string; path: string; profiles: string[] }): RegisteredProject {
  const registry = readRegistry(platformRoot);
  const normalizedPath = path.resolve(project.path);
  const existing = registry.projects.find((p) => path.resolve(p.path) === normalizedPath);
  if (existing) {
    existing.name = project.name;
    existing.profiles = project.profiles;
    writeRegistry(platformRoot, registry);
    return existing;
  }
  const entry: RegisteredProject = {
    name: project.name,
    path: normalizedPath,
    profiles: project.profiles,
    registeredAt: new Date().toISOString(),
    lastAssessment: null,
  };
  registry.projects.push(entry);
  writeRegistry(platformRoot, registry);
  return entry;
}

export function recordAssessment(platformRoot: string, projectPath: string, timestamp: string): void {
  const registry = readRegistry(platformRoot);
  const normalizedPath = path.resolve(projectPath);
  const existing = registry.projects.find((p) => path.resolve(p.path) === normalizedPath);
  if (existing) {
    existing.lastAssessment = timestamp;
    writeRegistry(platformRoot, registry);
  }
}
