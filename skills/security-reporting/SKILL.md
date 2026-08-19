# security-reporting

## Purpose

Generates the developer-ready report set (Markdown/HTML/JSON) from
correlated, classified findings with remediation guidance.

## When to Use

After `security.assessment.run` completes, or when the user asks to see/
regenerate the report for the most recent assessment.

## Inputs

The report directory returned by `security.assessment.run`, or read via
`security.findings.list` (which reads the latest report's `findings.json`).

## Tool Selection Guidance

Report generation itself is automatic (src/reporting/generator.ts, invoked
by the orchestrator) -- this skill is about *presenting* an already-generated
report to the user clearly, not generating one yourself by hand.

## Safety Rules

Reports must never contain raw secrets -- they're built from findings whose
`evidence` was already sanitized by src/security/redact.ts. If you notice
anything that looks like a live credential in a finding you're summarizing,
flag it as a redaction bug rather than repeating it.

## Workflow

1. Point the user to `executive-summary.md`, `security-report.html`, and
   `findings.json` in the report directory.
2. Summarize the risk table (counts by severity).
3. For each `confirmed` finding, restate: title, severity, affected
   component/endpoint, root cause, and recommended fix -- this is the part
   most useful to a developer or another AI coding agent picking up the fix.
4. Explicitly list which tools were skipped and why (from the assessment
   result), so the report's absence of findings from a skipped tool isn't
   mistaken for "that tool found nothing."

## Evidence Requirements

Findings already carry sanitized evidence; the report's `findings/` folder
has one Markdown file per finding with full detail.

## Output Requirements

Markdown, HTML, and JSON are all generated together by
`src/reporting/generator.ts`; do not describe only one format as "the
report" -- mention all three and what each is for (JSON for tooling/CI,
Markdown for a developer/AI agent, HTML for a human reading it directly).
