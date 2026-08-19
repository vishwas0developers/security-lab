// Strix adapter (PRD §11.1). Strix is NOT a Docker Compose service -- per
// its official docs (github.com/usestrix/strix, strix.ai), it is a
// standalone CLI installed with `curl -sSL https://strix.ai/install | bash`
// that manages its own Docker sandbox internally and requires a
// user-supplied LLM API key (STRIX_LLM + LLM_API_KEY env vars, e.g.
// OpenAI/Anthropic/Google). This adapter shells out to the `strix` binary
// rather than talking to a compose service.
//
// LIMITATION, stated plainly rather than faked: Strix writes its results to
// `strix_runs/<run-name>/` as a set of files whose exact JSON schema is not
// verified here (this project inspected Strix's installation/CLI docs, not
// its output format). Rather than invent a parser for an unverified schema
// and silently produce wrong/empty findings, run() surfaces the real run
// directory it produced and does not claim to have parsed structured
// findings from it. Correlating Strix's own output into the normalized
// Finding schema is follow-up work once that format is confirmed against a
// real run.

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { ToolAdapter, ToolHealth } from "./adapter";
import type { Finding } from "../findings/schema";
import type { Scope } from "../config/schema";
import { assertInScope } from "../security/scope-guard";

function commandExists(cmd: string): boolean {
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return probe.status === 0;
}

export const strixAdapter: ToolAdapter = {
  name: "strix",

  async checkHealth(): Promise<ToolHealth> {
    if (!commandExists("strix")) {
      return {
        name: "strix",
        available: false,
        detail: "'strix' was not found on PATH. Install with: curl -sSL https://strix.ai/install | bash",
      };
    }
    if (!process.env.STRIX_LLM || !process.env.LLM_API_KEY) {
      return {
        name: "strix",
        available: false,
        detail: "Strix CLI found, but STRIX_LLM and/or LLM_API_KEY are not set. Strix is an AI agent and requires an LLM API key to run.",
      };
    }
    const result = spawnSync("strix", ["--version"], { encoding: "utf8", timeout: 15_000, shell: process.platform === "win32" });
    if (result.status === 0) {
      return { name: "strix", available: true, version: (result.stdout || result.stderr || "").trim() };
    }
    return { name: "strix", available: false, detail: (result.stderr || "strix --version failed").trim() };
  },

  async run(target: string, scope: Scope): Promise<Finding[]> {
    assertInScope(target, scope);
    if (!process.env.STRIX_LLM || !process.env.LLM_API_KEY) {
      throw new Error("Strix requires STRIX_LLM and LLM_API_KEY to be set (see docs/DOCKER.md). Refusing to run without them.");
    }

    const runsDir = path.resolve("strix_runs");
    const before = new Set(fs.existsSync(runsDir) ? fs.readdirSync(runsDir) : []);

    const result = spawnSync("strix", ["--target", target], {
      encoding: "utf8",
      timeout: (scope.maxScanDurationMinutes ?? 60) * 60_000,
      shell: process.platform === "win32",
    });
    if (result.error) {
      throw new Error(`strix run failed to start: ${result.error.message}`);
    }

    const after = fs.existsSync(runsDir) ? fs.readdirSync(runsDir) : [];
    const newRun = after.find((name) => !before.has(name));
    const runPath = newRun ? path.join(runsDir, newRun) : runsDir;

    // Honest placeholder finding pointing at the real output rather than a
    // fabricated structured result -- see the module-level LIMITATION note.
    return [
      {
        id: `strix-run-${newRun ?? Date.now()}`,
        title: "Strix assessment completed -- review raw output",
        severity: "info",
        confidence: "unable_to_validate",
        component: target,
        technology: "unknown",
        description:
          `Strix completed a run against '${target}'. Its output format is not yet mapped into this platform's ` +
          `normalized finding schema (see src/tools/strix.ts). Review the raw results directly.`,
        evidence: [runPath],
        reproduction: [`strix --target ${target}`],
        references: ["https://github.com/usestrix/strix"],
        detected_by: ["strix"],
        validated_by: [],
        status: "unable_to_validate",
      },
    ];
  },
};
