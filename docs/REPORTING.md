# Reporting

`src/reporting/generator.ts`, invoked by `src/orchestrator/index.ts` at the
end of every `security scan` / `security.assessment.run`.

## Output layout

```text
reports/assessment-YYYY-MM-DD-<assessmentId>/
    executive-summary.md
    security-report.html
    findings.json
    findings/
        CRITICAL-001.md
        HIGH-001.md
        ...
```

- **executive-summary.md** — project/target/environment/tools-used header,
  risk table (counts by severity).
- **security-report.html** — self-contained HTML with the same summary plus
  a full findings table.
- **findings.json** — `{ meta, findings }`, machine-readable; this is what
  `security findings`/`security.findings.list` read.
- **findings/{SEVERITY}-{n}.md** — one file per finding, full detail
  (description, technical details, impact, root cause, recommendation,
  evidence, reproduction, references).

## Finding schema

`src/findings/schema.ts` (zod-validated):

```text
id, title, severity (critical|high|medium|low|info),
confidence (confirmed|probable|suspected|false_positive|unable_to_validate),
component, technology, endpoint?, method?, source_location?,
description, technical_details?, impact?,
evidence[], reproduction[], root_cause?, recommendation?, references[],
detected_by[], validated_by[], status
```

## Correlation

`src/findings/correlate.ts` merges findings across tools sharing a
normalized `title + endpoint` key — deliberately conservative (a missed
merge produces a harmless duplicate; a wrong merge silently drops a distinct
finding, which is worse). Merging keeps the higher severity/confidence, and
unions evidence/reproduction/references/detected_by.

## Evidence

`src/evidence/store.ts` writes one sanitized JSON file per finding under
`evidence/<assessmentId>/<findingId>.json`, after `redactDeep()`
(`src/security/redact.ts`) strips anything matching a secret-field pattern.
