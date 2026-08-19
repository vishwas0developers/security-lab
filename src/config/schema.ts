import { z } from "zod";

// Schemas for the per-project `.security/` files (PRD §8, §21).
// These define the on-disk contract; loader.ts (not yet written) will parse
// YAML into these shapes once project setup (`security setup`) is implemented.

export const ProfileSchema = z.enum(["quick", "web", "api", "mobile", "windows", "webview", "full"]);

export const DetectedStackSchema = z.object({
  laravel: z.boolean().default(false),
  php: z.boolean().default(false),
  node: z.boolean().default(false),
  api: z.boolean().default(false),
  openapi: z.boolean().default(false),
  docker: z.boolean().default(false),
  android: z.boolean().default(false),
  windows: z.boolean().default(false),
  webview: z.boolean().default(false),
});

// project-root/.security/config.yaml
export const ProjectConfigSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  detected: DetectedStackSchema.partial().optional(),
  profiles: z.array(ProfileSchema).default([]),
  mcp: z
    .object({
      registered: z.boolean().default(false),
    })
    .optional(),
});

// project-root/.security/scope.yaml (PRD §21)
export const ScopeSchema = z.object({
  schemaVersion: z.literal(1),
  environment: z.string(), // e.g. "staging" — production is protected by default
  allowedDomains: z.array(z.string()).default([]),
  allowedIpRanges: z.array(z.string()).default([]),
  allowedUrls: z.array(z.string()).default([]),
  allowedRepositories: z.array(z.string()).default([]),
  allowedApplications: z.array(z.string()).default([]),
  allowedMobileArtifacts: z.array(z.string()).default([]),
  excludedHosts: z.array(z.string()).default([]),
  excludedPaths: z.array(z.string()).default([]),
  authenticationProfiles: z.array(z.string()).default([]),
  rateLimits: z
    .object({
      requestsPerSecond: z.number().positive().optional(),
    })
    .optional(),
  maxScanDurationMinutes: z.number().positive().optional(),
  destructiveActionsAllowed: z.boolean().default(false),
});

// project-root/.security/profile.yaml
export const ProjectProfileSchema = z.object({
  schemaVersion: z.literal(1),
  activeProfiles: z.array(ProfileSchema).default([]),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;
