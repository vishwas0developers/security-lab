// MCP server exposing high-level security capabilities (PRD §13) to AI
// coding agents over stdio. Built on the actual installed SDK API
// (@modelcontextprotocol/sdk@1.30 McpServer.registerTool + StdioServerTransport
// -- verified against node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts
// before writing this, per "do not invent unsupported MCP interfaces").
//
// Tool surface is intentionally smaller than the PRD's full conceptual list
// (security.recon, security.web.scan, security.api.scan, etc. are exposed
// indirectly through security.assessment.run, which is what the orchestrator
// actually implements) rather than stubbing tools that would just return
// "not implemented" over MCP.

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs";
import * as path from "path";
import { getPlatformRoot, loadScope, loadProjectConfig } from "../config/loader";
import { listProjects } from "../config/registry";
import { detectProjectStack } from "../discovery";
import { runAssessment } from "../orchestrator";
import { assertInScope, ScopeViolationError } from "../security/scope-guard";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export async function startMcpServer(): Promise<void> {
  const platformRoot = getPlatformRoot();
  const server = new McpServer({ name: "security-platform", version: "0.1.0" });

  server.registerTool(
    "security.scope.get",
    {
      title: "Get project scope",
      description: "Read the authorized assessment scope (.security/scope.yaml) for a project directory. Nothing outside this scope may be scanned.",
      inputSchema: { projectPath: z.string().describe("Absolute path to the project") },
    },
    async ({ projectPath }) => {
      const scope = loadScope(projectPath);
      if (!scope) {
        return textResult(`No .security/scope.yaml found in ${projectPath}. Run 'security setup' in that directory first.`);
      }
      return textResult(JSON.stringify(scope, null, 2));
    }
  );

  server.registerTool(
    "security.project.inspect",
    {
      title: "Inspect a project's detected stack and configuration",
      description: "Detects the technology stack of a project directory and reports its .security/ configuration status.",
      inputSchema: { projectPath: z.string().describe("Absolute path to the project") },
    },
    async ({ projectPath }) => {
      const detected = detectProjectStack(projectPath);
      const config = loadProjectConfig(projectPath);
      return textResult(
        JSON.stringify(
          {
            detected,
            configured: config !== null,
            profiles: config?.profiles ?? [],
          },
          null,
          2
        )
      );
    }
  );

  server.registerTool(
    "security.target.discover",
    {
      title: "Validate whether a target is in scope",
      description: "Checks whether a given URL/domain is authorized by the project's scope, without running any tool against it.",
      inputSchema: { projectPath: z.string(), target: z.string() },
    },
    async ({ projectPath, target }) => {
      const scope = loadScope(projectPath);
      if (!scope) return textResult(`No .security/scope.yaml found in ${projectPath}.`);
      try {
        assertInScope(target, scope);
        return textResult(`IN SCOPE: '${target}' is authorized for assessment.`);
      } catch (err) {
        if (err instanceof ScopeViolationError) return textResult(`OUT OF SCOPE: ${err.message}`);
        throw err;
      }
    }
  );

  server.registerTool(
    "security.assessment.run",
    {
      title: "Run a complete authorized security assessment",
      description:
        "Runs the full assessment lifecycle (discover -> scope check -> applicable tools -> correlate -> evidence -> report) against a project that has already run 'security setup'. Only scans targets listed in that project's .security/scope.yaml.",
      inputSchema: { projectPath: z.string() },
    },
    async ({ projectPath }) => {
      const result = await runAssessment({ platformRoot, projectPath });
      return textResult(
        JSON.stringify(
          {
            assessmentId: result.assessmentId,
            reportDir: result.reportDir,
            findingCount: result.findings.length,
            toolsRun: result.toolsRun,
            toolsSkipped: result.toolsSkipped,
            errors: result.errors,
          },
          null,
          2
        )
      );
    }
  );

  server.registerTool(
    "security.findings.list",
    {
      title: "List findings from the most recent assessment report",
      description: "Reads findings.json from the most recently generated report directory for this platform.",
      inputSchema: {},
    },
    async () => {
      const reportsDir = path.join(platformRoot, "reports");
      if (!fs.existsSync(reportsDir)) return textResult("No reports have been generated yet.");
      // Sort by mtime, not name -- see cli/index.ts's latestReportDir() for
      // why name-sorting a "assessment-YYYY-MM-DD-<random-id>" directory
      // list doesn't reliably find the most recent one.
      const dirs = fs
        .readdirSync(reportsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({ name: d.name, mtimeMs: fs.statSync(path.join(reportsDir, d.name)).mtimeMs }))
        .sort((a, b) => a.mtimeMs - b.mtimeMs);
      if (dirs.length === 0) return textResult("No reports have been generated yet.");
      const latest = dirs[dirs.length - 1].name;
      const findingsPath = path.join(reportsDir, latest, "findings.json");
      if (!fs.existsSync(findingsPath)) return textResult(`Latest report (${latest}) has no findings.json.`);
      return textResult(fs.readFileSync(findingsPath, "utf8"));
    }
  );

  server.registerTool(
    "security.report.generate",
    {
      title: "List registered projects and their report status",
      description: "Lists all projects registered with this platform and when each was last assessed.",
      inputSchema: {},
    },
    async () => textResult(JSON.stringify(listProjects(platformRoot), null, 2))
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
