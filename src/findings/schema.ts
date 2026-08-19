import { z } from "zod";

// Normalized finding schema (PRD §23). Every adapter (Strix/ZAP/Nuclei/MobSF)
// must map its native output into this shape before it reaches
// correlation/dedup, validation, or reporting.

export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export const ConfidenceSchema = z.enum(["confirmed", "probable", "suspected", "false_positive", "unable_to_validate"]);
export const FindingStatusSchema = z.enum(["suspected", "probable", "confirmed", "false_positive", "unable_to_validate"]);

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  component: z.string(),
  technology: z.string(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  source_location: z.string().optional(),
  description: z.string(),
  technical_details: z.string().optional(),
  impact: z.string().optional(),
  evidence: z.array(z.string()).default([]),
  reproduction: z.array(z.string()).default([]),
  root_cause: z.string().optional(),
  recommendation: z.string().optional(),
  references: z.array(z.string()).default([]),
  detected_by: z.array(z.string()).default([]),
  validated_by: z.array(z.string()).default([]),
  status: FindingStatusSchema.default("suspected"),
});

export type Finding = z.infer<typeof FindingSchema>;
