# AI Agent Integration

`security install <agent>` configures MCP + deploys Skills for a named
agent into the **current project** (run it after `security setup` in that
project). The adapter architecture (`install/index.ts`) is ported from the
sibling `workspace-sync` project's already-exercised agent conventions, not
reinvented — see that project's `install/index.ts` for the shared source of
truth on verified paths.

## Supported agents

| Agent | Skills directory | Verified? | MCP config | Verified? |
|---|---|---|---|---|
| `claude` (Claude Code) | `.claude/skills/` | Yes | `.mcp.json` | Yes |
| `codex` | `.codex/skills/` | Yes | `~/.codex/config.toml` (TOML, `[mcp_servers.security-platform]`) | Yes |
| `antigravity` (Google Antigravity) | `.agents/skills/` | Yes | `~/.gemini/antigravity-ide/mcp_config.json` | Yes |
| `copilot` (GitHub Copilot CLI) | `.copilot/skills/` | Yes | `.copilot/mcp.json` (generic fallback) | **Unverified** |
| `cursor` | *(not in VERIFIED_SKILLS_TARGETS — generic fallback)* `.agents/skills/` | No | `.cursor/mcp.json` | Yes |
| `gemini` (Gemini CLI) | `.gemini/skills/` | Yes | `~/.gemini/config/mcp_config.json` | Yes |
| `vscode` (VS Code Copilot Chat) | `.agents/skills/` (generic fallback) | No | `.vscode/mcp.json` | Yes |
| `opencode` | `.opencode/skills/` | Yes | `.opencode/mcp.json` (generic fallback) | **Unverified** |
| `kilo` (Kilo Code) | `.config/kilo/skills/` | Yes | `.kilo/mcp.json` (generic fallback) | **Unverified** |
| `aider` | `.aider/` | Yes | *(none — skills-only)* | n/a |
| `agents` (cross-framework Agent Skills spec) | `.agents/skills/` | Yes (canonical location) | *(none — skills-only)* | n/a |

"Verified" means confirmed against a real installed instance or well-documented
public convention (see workspace-sync's `install/index.ts` comments for
specifics). Unverified entries use the generic `.{slug}/mcp.json` fallback —
confirm against that agent's current docs if the integration doesn't take
effect, and open an issue/PR with the corrected path.

## What gets installed

1. **MCP server entry** merged into the agent's config (JSON: adds/updates
   only the `"security-platform"` key under `mcpServers`, leaving every
   other entry untouched; TOML for Codex: appends a
   `[mcp_servers.security-platform]` table if not already present). The
   entry always points at `security mcp` (the CLI must be on PATH in that
   agent's execution environment).
2. **Skills**: every `skills/<name>/SKILL.md` in the platform root is
   copied into the agent's skills directory. Re-running `security install
   <agent>` re-copies (acts as an update).
3. `.security/installed-agents.json` records which agents have been
   installed for this project.

## Verifying an install

```bash
security install claude
cat .mcp.json                    # should show a "security-platform" entry
ls .claude/skills/                # should list all skill directories
```

Then, in that agent, ask it to run a security assessment — it should reach
for the `security.*` MCP tools (see [MCP.md](MCP.md)) and the
`security-assessment` skill.
