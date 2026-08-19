// Common interface every tool adapter (strix.ts, zap.ts, nuclei.ts, mobsf.ts)
// must implement, so the orchestrator can treat tools uniformly (PRD §11,
// §14 step 7, §35 "adapters not project-specific code").
//
// Not implemented yet — Phase 1 scaffold. Adapter files are added in Phase 2.

import type { Finding } from "../findings/schema";
import type { Scope } from "../config/schema";

export interface ToolHealth {
  name: string;
  available: boolean;
  version?: string;
  detail?: string;
}

export interface ToolAdapter {
  name: string;
  checkHealth(): Promise<ToolHealth>;
  run(target: string, scope: Scope): Promise<Finding[]>;
}
