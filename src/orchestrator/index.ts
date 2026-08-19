// Core service that decides which tools apply to a project and drives the
// assessment lifecycle (PRD §14, §15):
//   SCOPE -> DISCOVER -> STATIC/DYNAMIC TESTING -> FINDINGS -> EVIDENCE ->
//   CORRELATE -> REPORT
//
// Honesty over fake success: a tool that isn't available (not installed, or
// its compose service isn't running/healthy) is skipped with a clear
// message in the summary, never silently treated as "no findings".

import { randomUUID } from "crypto";
import { loadProjectConfig, loadScope } from "../config/loader";
import { registerProject, recordAssessment } from "../config/registry";
import type { Finding } from "../findings/schema";
import { correlateFindings } from "../findings/correlate";
import { collectEvidence } from "../evidence/store";
import { generateReport, type ReportMeta } from "../reporting/generator";
import type { ToolAdapter } from "../tools/adapter";
import { nucleiAdapter } from "../tools/nuclei";
import { zapAdapter } from "../tools/zap";
import { mobsfAdapter } from "../tools/mobsf";
import { strixAdapter } from "../tools/strix";
import { ScopeViolationError } from "../security/scope-guard";

export interface AssessmentInput {
  platformRoot: string;
  projectPath: string;
}

export interface AssessmentResult {
  assessmentId: string;
  reportDir: string;
  findings: Finding[];
  toolsRun: string[];
  toolsSkipped: { name: string; reason: string }[];
  errors: { tool: string; target: string; message: string }[];
}

const WEB_API_TOOLS: ToolAdapter[] = [nucleiAdapter, zapAdapter];
const MOBILE_TOOLS: ToolAdapter[] = [mobsfAdapter];

export async function runAssessment(input: AssessmentInput): Promise<AssessmentResult> {
  const config = loadProjectConfig(input.projectPath);
  const scope = loadScope(input.projectPath);
  if (!config || !scope) {
    throw new Error(`No .security/ configuration found in ${input.projectPath}. Run 'security setup' first.`);
  }

  const assessmentId = randomUUID().slice(0, 8);
  const startedAt = new Date().toISOString();

  const allFindings: Finding[] = [];
  const toolsRun: string[] = [];
  const toolsSkipped: { name: string; reason: string }[] = [];
  const errors: { tool: string; target: string; message: string }[] = [];

  const webTargets = [...scope.allowedUrls, ...scope.allowedDomains];
  if (webTargets.length === 0 && (config.detected?.api || config.detected?.laravel || config.detected?.node)) {
    toolsSkipped.push({
      name: "web/api tools",
      reason: "scope.allowedUrls/allowedDomains is empty -- add a staging/test URL to .security/scope.yaml before scanning.",
    });
  }

  for (const target of webTargets) {
    for (const adapter of WEB_API_TOOLS) {
      const health = await adapter.checkHealth();
      if (!health.available) {
        toolsSkipped.push({ name: adapter.name, reason: health.detail ?? "not available" });
        continue;
      }
      try {
        const findings = await adapter.run(target, scope);
        allFindings.push(...findings);
        toolsRun.push(adapter.name);
      } catch (err) {
        const message = err instanceof ScopeViolationError ? err.message : String((err as Error).message ?? err);
        errors.push({ tool: adapter.name, target, message });
      }
    }
  }

  if (config.detected?.android) {
    for (const artifact of scope.allowedMobileArtifacts) {
      for (const adapter of MOBILE_TOOLS) {
        const health = await adapter.checkHealth();
        if (!health.available) {
          toolsSkipped.push({ name: adapter.name, reason: health.detail ?? "not available" });
          continue;
        }
        try {
          const findings = await adapter.run(artifact, scope);
          allFindings.push(...findings);
          toolsRun.push(adapter.name);
        } catch (err) {
          errors.push({ tool: adapter.name, target: artifact, message: String((err as Error).message ?? err) });
        }
      }
    }
    if (scope.allowedMobileArtifacts.length === 0) {
      toolsSkipped.push({ name: "mobsf", reason: "scope.allowedMobileArtifacts is empty -- add an APK/AAB path before scanning." });
    }
  }

  const strixHealth = await strixAdapter.checkHealth();
  if (!strixHealth.available) {
    toolsSkipped.push({ name: "strix", reason: strixHealth.detail ?? "not available" });
  } else if (webTargets.length > 0) {
    try {
      const findings = await strixAdapter.run(webTargets[0], scope);
      allFindings.push(...findings);
      toolsRun.push("strix");
    } catch (err) {
      errors.push({ tool: "strix", target: webTargets[0], message: String((err as Error).message ?? err) });
    }
  }

  const correlated = correlateFindings(allFindings);
  collectEvidence(input.platformRoot, assessmentId, correlated);

  const finishedAt = new Date().toISOString();
  const meta: ReportMeta = {
    assessmentId,
    project: config.name,
    target: webTargets[0] ?? scope.allowedMobileArtifacts[0] ?? "(no target configured)",
    scope: { environment: scope.environment },
    toolsUsed: Array.from(new Set(toolsRun)),
    startedAt,
    finishedAt,
  };
  const reportDir = generateReport(input.platformRoot, meta, correlated);

  registerProject(input.platformRoot, { name: config.name, path: input.projectPath, profiles: config.profiles });
  recordAssessment(input.platformRoot, input.projectPath, finishedAt);

  return { assessmentId, reportDir, findings: correlated, toolsRun: Array.from(new Set(toolsRun)), toolsSkipped, errors };
}
