// Generates the developer-ready report set (PRD §25, §26) in the layout:
//   reports/assessment-YYYY-MM-DD/
//     executive-summary.md
//     security-report.html
//     findings.json
//     findings/{SEVERITY}-{n}.md

import * as fs from "fs";
import * as path from "path";
import type { Finding } from "../findings/schema";

export interface ReportMeta {
  assessmentId: string;
  project: string;
  target: string;
  scope: { environment: string };
  toolsUsed: string[];
  startedAt: string;
  finishedAt: string;
}

const SEVERITY_ORDER: Finding["severity"][] = ["critical", "high", "medium", "low", "info"];

function severityCounts(findings: Finding[]): Record<Finding["severity"], number> {
  const counts: Record<Finding["severity"], number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function findingToMarkdown(f: Finding): string {
  const lines = [
    `# ${f.title}`,
    "",
    `- **Severity:** ${f.severity}`,
    `- **Confidence:** ${f.confidence}`,
    `- **Status:** ${f.status}`,
    `- **Component:** ${f.component}`,
    `- **Technology:** ${f.technology}`,
    f.endpoint ? `- **Endpoint:** ${f.endpoint}` : "",
    f.method ? `- **Method:** ${f.method}` : "",
    f.source_location ? `- **Source location:** ${f.source_location}` : "",
    `- **Detected by:** ${f.detected_by.join(", ") || "(unknown)"}`,
    `- **Validated by:** ${f.validated_by.join(", ") || "(not yet validated)"}`,
    "",
    "## Description",
    f.description || "(none provided)",
    "",
    f.technical_details ? `## Technical details\n\n${f.technical_details}\n` : "",
    f.impact ? `## Impact\n\n${f.impact}\n` : "",
    f.root_cause ? `## Root cause\n\n${f.root_cause}\n` : "",
    f.recommendation ? `## Recommended fix\n\n${f.recommendation}\n` : "",
    f.evidence.length > 0 ? `## Evidence\n\n${f.evidence.map((e) => `- \`${e}\``).join("\n")}\n` : "",
    f.reproduction.length > 0 ? `## Reproduction\n\n${f.reproduction.map((r) => `1. \`${r}\``).join("\n")}\n` : "",
    f.references.length > 0 ? `## References\n\n${f.references.map((r) => `- ${r}`).join("\n")}\n` : "",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function generateExecutiveSummary(meta: ReportMeta, findings: Finding[]): string {
  const counts = severityCounts(findings);
  return [
    `# Executive Summary`,
    "",
    `- **Project:** ${meta.project}`,
    `- **Target:** ${meta.target}`,
    `- **Environment:** ${meta.scope.environment}`,
    `- **Tools used:** ${meta.toolsUsed.join(", ") || "(none)"}`,
    `- **Started:** ${meta.startedAt}`,
    `- **Finished:** ${meta.finishedAt}`,
    "",
    "## Risk summary",
    "",
    "| Severity | Count |",
    "|---|---|",
    ...SEVERITY_ORDER.map((s) => `| ${s} | ${counts[s]} |`),
    "",
    `Total findings: ${findings.length}`,
  ].join("\n");
}

function generateHtml(meta: ReportMeta, findings: Finding[]): string {
  const counts = severityCounts(findings);
  const rows = findings
    .slice()
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.severity)}</td><td>${escapeHtml(f.confidence)}</td><td>${escapeHtml(f.title)}</td><td>${escapeHtml(
          f.endpoint ?? f.component
        )}</td></tr>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Security Report - ${escapeHtml(meta.project)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
  th { background: #f0f0f0; }
  .critical { color: #7a0000; } .high { color: #b30000; } .medium { color: #b36b00; }
</style>
</head>
<body>
<h1>Security Report</h1>
<p><strong>Project:</strong> ${escapeHtml(meta.project)} &mdash; <strong>Target:</strong> ${escapeHtml(meta.target)}</p>
<p><strong>Tools used:</strong> ${escapeHtml(meta.toolsUsed.join(", ") || "(none)")}</p>
<p><strong>Started:</strong> ${escapeHtml(meta.startedAt)} &mdash; <strong>Finished:</strong> ${escapeHtml(meta.finishedAt)}</p>
<h2>Risk summary</h2>
<table>
<tr><th>Severity</th><th>Count</th></tr>
${SEVERITY_ORDER.map((s) => `<tr><td>${s}</td><td>${counts[s]}</td></tr>`).join("\n")}
</table>
<h2>Findings (${findings.length})</h2>
<table>
<tr><th>Severity</th><th>Confidence</th><th>Title</th><th>Endpoint/Component</th></tr>
${rows}
</table>
</body>
</html>`;
}

export function generateReport(platformRoot: string, meta: ReportMeta, findings: Finding[]): string {
  const dateStr = meta.startedAt.slice(0, 10);
  const outDir = path.join(platformRoot, "reports", `assessment-${dateStr}-${meta.assessmentId}`);
  const findingsDir = path.join(outDir, "findings");
  fs.mkdirSync(findingsDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "executive-summary.md"), generateExecutiveSummary(meta, findings), "utf8");
  fs.writeFileSync(path.join(outDir, "security-report.html"), generateHtml(meta, findings), "utf8");
  fs.writeFileSync(path.join(outDir, "findings.json"), JSON.stringify({ meta, findings }, null, 2), "utf8");

  const sorted = findings.slice().sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const seenPerSeverity: Record<string, number> = {};
  for (const f of sorted) {
    seenPerSeverity[f.severity] = (seenPerSeverity[f.severity] ?? 0) + 1;
    const fileName = `${f.severity.toUpperCase()}-${String(seenPerSeverity[f.severity]).padStart(3, "0")}.md`;
    fs.writeFileSync(path.join(findingsDir, fileName), findingToMarkdown(f), "utf8");
  }

  return outDir;
}
