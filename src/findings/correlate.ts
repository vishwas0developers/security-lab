// Correlates and deduplicates findings across tools/runs (PRD §14 step 13,
// §15). Two findings are treated as the same underlying issue when they
// share a normalized title and endpoint -- deliberately conservative (a
// false "these are different" costs a duplicate in the report; a false
// "these are the same" silently drops a distinct finding, which is worse).

import type { Finding } from "./schema";

function normalizeKey(finding: Finding): string {
  const title = finding.title.trim().toLowerCase();
  const endpoint = (finding.endpoint ?? finding.component).trim().toLowerCase();
  return `${title}::${endpoint}`;
}

function higherConfidence(a: Finding["confidence"], b: Finding["confidence"]): Finding["confidence"] {
  const rank: Record<Finding["confidence"], number> = {
    confirmed: 4,
    probable: 3,
    suspected: 2,
    unable_to_validate: 1,
    false_positive: 0,
  };
  return rank[a] >= rank[b] ? a : b;
}

function higherSeverity(a: Finding["severity"], b: Finding["severity"]): Finding["severity"] {
  const rank: Record<Finding["severity"], number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return rank[a] >= rank[b] ? a : b;
}

export function correlateFindings(findings: Finding[]): Finding[] {
  const merged = new Map<string, Finding>();

  for (const finding of findings) {
    const key = normalizeKey(finding);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...finding });
      continue;
    }
    merged.set(key, {
      ...existing,
      severity: higherSeverity(existing.severity, finding.severity),
      confidence: higherConfidence(existing.confidence, finding.confidence),
      evidence: Array.from(new Set([...existing.evidence, ...finding.evidence])),
      reproduction: Array.from(new Set([...existing.reproduction, ...finding.reproduction])),
      references: Array.from(new Set([...existing.references, ...finding.references])),
      detected_by: Array.from(new Set([...existing.detected_by, ...finding.detected_by])),
      description: existing.description.length >= finding.description.length ? existing.description : finding.description,
    });
  }

  return Array.from(merged.values());
}
