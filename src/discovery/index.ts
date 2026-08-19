// Project/technology detection used by `security setup` (PRD §9). Walks a
// project directory (shallow -- top level plus one level deep for common
// subfolders) and reports which stacks/artifacts are present.
//
// Detection is intentionally best-effort and file-marker based (existence
// checks, not content parsing) for this pass; deeper inspection (e.g.
// actually parsing composer.json's require block) belongs to the Laravel/
// API/Android skills once the orchestrator exists, not here.

import * as fs from "fs";
import * as path from "path";
import { DetectedStackSchema } from "../config/schema";
import type { z } from "zod";

export type DetectedStack = z.infer<typeof DetectedStackSchema>;

function exists(projectPath: string, relative: string): boolean {
  return fs.existsSync(path.join(projectPath, relative));
}

function anyFileMatches(projectPath: string, pattern: RegExp, maxDepth = 2): boolean {
  const stack: Array<{ dir: string; depth: number }> = [{ dir: projectPath, depth: 0 }];
  const skipDirs = new Set(["node_modules", ".git", "vendor", "dist", "build", ".next", "target"]);
  while (stack.length > 0) {
    const { dir, depth } = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (depth < maxDepth && !skipDirs.has(entry.name)) {
          stack.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
        }
        continue;
      }
      if (pattern.test(entry.name)) {
        return true;
      }
    }
  }
  return false;
}

export function detectProjectStack(projectPath: string): DetectedStack {
  const php = exists(projectPath, "composer.json");
  const laravel = php && exists(projectPath, "artisan");
  const node = exists(projectPath, "package.json");
  const docker = exists(projectPath, "Dockerfile") || exists(projectPath, "docker-compose.yml") || exists(projectPath, "compose.yml");

  const openapi = anyFileMatches(projectPath, /^(openapi|swagger)\.(ya?ml|json)$/i);
  const api = openapi || laravel || anyFileMatches(projectPath, /routes.*\.(php|ts|js)$/i);

  const android =
    exists(projectPath, "AndroidManifest.xml") ||
    exists(projectPath, "build.gradle") ||
    exists(projectPath, "build.gradle.kts") ||
    anyFileMatches(projectPath, /\.(apk|aab)$/i);

  const windows =
    anyFileMatches(projectPath, /\.(csproj|sln|appx|msix)$/i);

  // Best-effort WebView heuristic: only meaningful when Android or Windows
  // was already detected -- this does not parse manifest/gradle contents,
  // it just checks whether an Android/Windows project also carries an
  // obvious WebView marker file/name. The android-security / windows-security
  // / webview-security skills do the real investigation.
  const webview = (android || windows) && anyFileMatches(projectPath, /webview/i);

  return {
    laravel,
    php,
    node,
    api,
    openapi,
    docker,
    android,
    windows,
    webview,
  };
}
