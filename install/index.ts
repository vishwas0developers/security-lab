// Agent adapter architecture for `security install <agent>` (PRD §12, §30,
// implementation_plan.md §10). Configures the selected AI agent's MCP
// integration and deploys the Security Skills into that agent's native
// Skills location.
//
// Agent list, verified MCP config paths, and verified skills directories are
// ported from the sibling `workspace-sync` project's install/index.ts (same
// author, already exercised against real installations of these agents) --
// not reinvented here. Only the two agent-specific paths this project
// actually needs to add unverified guesses for follow the same "generic
// fallback, clearly marked unverified" pattern that file already uses.

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const PLATFORMS: { slug: string; label: string }[] = [
  { slug: "claude", label: "Claude Code" },
  { slug: "codex", label: "Codex" },
  { slug: "antigravity", label: "Google Antigravity" },
  { slug: "copilot", label: "GitHub Copilot CLI" },
  { slug: "cursor", label: "Cursor" },
  { slug: "gemini", label: "Gemini CLI" },
  { slug: "vscode", label: "VS Code Copilot Chat" },
  { slug: "opencode", label: "OpenCode" },
  { slug: "kilo", label: "Kilo Code" },
  { slug: "aider", label: "Aider" },
  { slug: "agents", label: "Agent Skills (cross-framework)" },
];

export const SUPPORTED_AGENTS = [...PLATFORMS.map((p) => p.slug), "skills"] as const;
export type AgentId = (typeof SUPPORTED_AGENTS)[number];

// Agents confirmed to have no MCP integration convention worth guessing at --
// skills-only install.
const SKILLS_ONLY_AGENTS = new Set<AgentId>(["agents", "skills", "aider"]);

// Verified MCP config paths (confirmed via real files on a dev machine or
// well-documented public convention, per workspace-sync/install/index.ts).
// Everything else falls back to `.{slug}/mcp.json`, marked unverified.
const VERIFIED_MCP_TARGETS: Partial<Record<AgentId, (targetDir: string) => string>> = {
  vscode: (targetDir) => path.join(targetDir, ".vscode", "mcp.json"),
  claude: (targetDir) => path.join(targetDir, ".mcp.json"),
  cursor: (targetDir) => path.join(targetDir, ".cursor", "mcp.json"),
  gemini: () => path.join(os.homedir(), ".gemini", "config", "mcp_config.json"),
  antigravity: () => path.join(os.homedir(), ".gemini", "antigravity-ide", "mcp_config.json"),
};

// Verified native skill directories, one per agent (per workspace-sync).
const VERIFIED_SKILLS_TARGETS: Partial<Record<AgentId, (targetDir: string) => string>> = {
  claude: (targetDir) => path.join(targetDir, ".claude", "skills"),
  codex: (targetDir) => path.join(targetDir, ".codex", "skills"),
  opencode: (targetDir) => path.join(targetDir, ".opencode", "skills"),
  kilo: (targetDir) => path.join(targetDir, ".config", "kilo", "skills"),
  copilot: (targetDir) => path.join(targetDir, ".copilot", "skills"),
  aider: (targetDir) => path.join(targetDir, ".aider"),
  gemini: (targetDir) => path.join(targetDir, ".gemini", "skills"),
  antigravity: (targetDir) => path.join(targetDir, ".agents", "skills"),
  agents: (targetDir) => path.join(targetDir, ".agents", "skills"),
  skills: (targetDir) => path.join(targetDir, ".agents", "skills"),
};

export function isSkillsOnlyAgent(agentId: AgentId): boolean {
  return SKILLS_ONLY_AGENTS.has(agentId);
}

function displayPath(absolutePath: string): string {
  const home = os.homedir();
  const normalized = absolutePath.startsWith(home) ? "~" + absolutePath.slice(home.length) : absolutePath;
  return normalized.split(path.sep).join("/");
}

export function resolveSkillsDir(agentId: AgentId, targetDir: string): string {
  const verified = VERIFIED_SKILLS_TARGETS[agentId];
  if (verified) return verified(targetDir);
  return path.join(targetDir, ".agents", "skills");
}

export function resolveMcpConfigPath(agentId: AgentId, targetDir: string): string | null {
  if (SKILLS_ONLY_AGENTS.has(agentId)) return null;
  if (agentId === "codex") return path.join(os.homedir(), ".codex", "config.toml");
  const verified = VERIFIED_MCP_TARGETS[agentId];
  if (verified) return verified(targetDir);
  return path.join(targetDir, `.${agentId}`, "mcp.json");
}

export interface AgentInfo {
  slug: AgentId;
  label: string;
  skillsDir: string;
  skillsVerified: boolean;
  mcpConfig: string | null;
  mcpFormat: "json" | "toml" | "none";
  mcpVerified: boolean;
}

export function describeAgent(agentId: AgentId): AgentInfo {
  const platform = PLATFORMS.find((p) => p.slug === agentId);
  const label = platform ? platform.label : agentId;
  const skillsVerified = agentId in VERIFIED_SKILLS_TARGETS;
  const skillsDir = displayPath(resolveSkillsDir(agentId, "<project>"));

  const skillsOnly = isSkillsOnlyAgent(agentId);
  let mcpConfig: string | null = null;
  let mcpFormat: "json" | "toml" | "none" = "none";
  let mcpVerified = false;
  if (!skillsOnly) {
    const raw = resolveMcpConfigPath(agentId, "<project>");
    mcpConfig = raw ? displayPath(raw) : null;
    mcpFormat = agentId === "codex" ? "toml" : "json";
    mcpVerified = agentId === "codex" || agentId in VERIFIED_MCP_TARGETS;
  }

  return { slug: agentId, label, skillsDir, skillsVerified, mcpConfig, mcpFormat, mcpVerified };
}

// Merges (never overwrites unrelated entries in) the security MCP server
// into a JSON `mcpServers` config -- idempotent, preserves any other
// servers already registered there (PRD §23: "merge with existing MCP
// configuration rather than overwrite unrelated configuration").
function writeJsonMcpConfig(mcpConfigPath: string): void {
  const dir = path.dirname(mcpConfigPath);
  fs.mkdirSync(dir, { recursive: true });

  let config: any = { mcpServers: {} };
  if (fs.existsSync(mcpConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
    } catch {
      // Invalid existing file -- start fresh rather than crash the install.
    }
  }
  if (!config.mcpServers) config.mcpServers = {};

  config.mcpServers["security-platform"] = { type: "stdio", command: "security", args: ["mcp"] };
  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(`[SUCCESS] Configured MCP server: ${mcpConfigPath}`);
}

// Codex reads TOML. Text-append a `[mcp_servers.security-platform]` table if
// one isn't already present -- a targeted merge, not a full TOML rewrite, so
// the rest of the user's config.toml is left untouched.
function writeCodexMcpConfig(configPath: string): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf-8") : "";

  if (existing.includes("[mcp_servers.security-platform]")) {
    console.log(`[INFO] MCP server already configured: ${configPath}`);
    return;
  }
  const entry = `\n[mcp_servers.security-platform]\ncommand = "security"\nargs = ["mcp"]\n`;
  fs.writeFileSync(configPath, existing.trimEnd() + "\n" + entry, "utf-8");
  console.log(`[SUCCESS] Configured MCP server: ${configPath}`);
}

function getInstalledAgentsManifestPath(targetDir: string): string {
  return path.join(targetDir, ".security", "installed-agents.json");
}

export function getInstalledAgents(targetDir: string): AgentId[] {
  const manifestPath = getInstalledAgentsManifestPath(targetDir);
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return Array.isArray(data.agents) ? data.agents : [];
  } catch {
    return [];
  }
}

function recordInstalledAgent(agentId: AgentId, targetDir: string): void {
  const manifestPath = getInstalledAgentsManifestPath(targetDir);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const agents = new Set(getInstalledAgents(targetDir));
  agents.add(agentId);
  fs.writeFileSync(manifestPath, JSON.stringify({ agents: [...agents] }, null, 2), "utf-8");
}

// Deploys every skill found under <platformRoot>/skills/*/SKILL.md into the
// agent's native skills directory, and (unless skills-only) merges the MCP
// server entry. Idempotent: skill files are overwritten with the current
// content (so 'security install <agent>' also acts as an update), and the
// MCP config merge never touches unrelated entries.
export function installAgent(agentId: string, platformRoot: string, targetDir: string): void {
  if (!(SUPPORTED_AGENTS as readonly string[]).includes(agentId)) {
    throw new Error(`Unknown agent "${agentId}". Supported agents: ${SUPPORTED_AGENTS.join(", ")}.`);
  }
  const id = agentId as AgentId;

  const mcpConfigPath = resolveMcpConfigPath(id, targetDir);
  if (mcpConfigPath) {
    if (id === "codex") {
      writeCodexMcpConfig(mcpConfigPath);
    } else {
      writeJsonMcpConfig(mcpConfigPath);
    }
  } else {
    console.log(`[INFO] ${describeAgent(id).label} has no MCP integration convention -- skills-only install.`);
  }

  const skillsSourceDir = path.join(platformRoot, "skills");
  if (!fs.existsSync(skillsSourceDir)) {
    console.log(`[WARNING] No skills found at ${skillsSourceDir} -- skipping skill deployment.`);
    recordInstalledAgent(id, targetDir);
    return;
  }

  const skillsTargetDir = resolveSkillsDir(id, targetDir);
  const skillNames = fs.readdirSync(skillsSourceDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const skill of skillNames) {
    const sourceFile = path.join(skillsSourceDir, skill.name, "SKILL.md");
    if (!fs.existsSync(sourceFile)) continue;
    const destDir = path.join(skillsTargetDir, skill.name);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourceFile, path.join(destDir, "SKILL.md"));
  }
  console.log(`[SUCCESS] Deployed ${skillNames.length} skill(s) to: ${skillsTargetDir}`);

  recordInstalledAgent(id, targetDir);
}
