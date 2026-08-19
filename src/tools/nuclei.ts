// Nuclei adapter (PRD §11.3). Nuclei ships as a one-shot CLI, not a
// long-running daemon, so this shells out to `docker run --rm
// projectdiscovery/nuclei ...` per invocation rather than talking to a
// persistent compose service (see docker/docker-compose.yml's comment on
// the `nuclei` service).

import { spawnSync } from "child_process";
import type { ToolAdapter, ToolHealth } from "./adapter";
import type { Finding } from "../findings/schema";
import type { Scope } from "../config/schema";
import { assertInScope } from "../security/scope-guard";
import { redact } from "../security/redact";

const IMAGE = "projectdiscovery/nuclei:latest";

interface NucleiJsonLine {
  "template-id"?: string;
  info?: {
    name?: string;
    severity?: string;
    description?: string;
    reference?: string[] | string;
  };
  host?: string;
  "matched-at"?: string;
}

function severityFromNuclei(sev: string | undefined): Finding["severity"] {
  const s = (sev ?? "info").toLowerCase();
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
  return "info";
}

export const nucleiAdapter: ToolAdapter = {
  name: "nuclei",

  async checkHealth(): Promise<ToolHealth> {
    const result = spawnSync("docker", ["run", "--rm", IMAGE, "-version"], { encoding: "utf8", timeout: 30_000 });
    if (result.status === 0) {
      // Nuclei's -version prints several ANSI-colored banner lines; pull the
      // one that actually names the engine version rather than the last
      // line (which is unrelated banner text, e.g. "PDCP Directory: ...").
      const combined = `${result.stdout}${result.stderr}`;
      // eslint-disable-next-line no-control-regex
      const plain = combined.replace(/\x1b\[[0-9;]*m/g, "");
      const versionLine = plain.split("\n").find((l) => /Engine Version/i.test(l));
      const version = versionLine ? versionLine.split(":").slice(1).join(":").trim() : plain.trim().split("\n")[0] ?? "unknown";
      return { name: "nuclei", available: true, version };
    }
    return {
      name: "nuclei",
      available: false,
      detail: result.error ? result.error.message : (result.stderr || "docker run failed").trim(),
    };
  },

  async run(target: string, scope: Scope): Promise<Finding[]> {
    assertInScope(target, scope);

    const args = [
      "run",
      "--rm",
      IMAGE,
      "-u",
      target,
      "-jsonl",
      "-silent",
      "-timeout",
      "10",
      "-rate-limit",
      String(scope.rateLimits?.requestsPerSecond ?? 5),
    ];
    const result = spawnSync("docker", args, {
      encoding: "utf8",
      timeout: (scope.maxScanDurationMinutes ?? 5) * 60_000,
      maxBuffer: 64 * 1024 * 1024,
    });

    if (result.error) {
      throw new Error(`nuclei run failed to start: ${result.error.message}`);
    }
    if (result.status !== 0 && result.status !== null && !result.stdout) {
      throw new Error(`nuclei exited with code ${result.status}: ${redact(result.stderr || "")}`);
    }

    const lines = (result.stdout || "").split("\n").filter((l) => l.trim().length > 0);
    const findings: Finding[] = [];
    let index = 0;
    for (const line of lines) {
      let parsed: NucleiJsonLine;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      index += 1;
      const references = Array.isArray(parsed.info?.reference)
        ? parsed.info!.reference
        : parsed.info?.reference
          ? [parsed.info.reference]
          : [];
      findings.push({
        id: `nuclei-${parsed["template-id"] ?? "unknown"}-${index}`,
        title: parsed.info?.name ?? parsed["template-id"] ?? "Nuclei finding",
        severity: severityFromNuclei(parsed.info?.severity),
        confidence: "probable",
        component: target,
        technology: "web",
        endpoint: parsed["matched-at"] ?? parsed.host ?? target,
        description: redact(parsed.info?.description ?? parsed["template-id"] ?? ""),
        evidence: [redact(line)],
        reproduction: [`docker run --rm ${IMAGE} -u ${target} -id ${parsed["template-id"] ?? ""}`],
        references: references as string[],
        detected_by: ["nuclei"],
        validated_by: [],
        status: "suspected",
      });
    }
    return findings;
  },
};
