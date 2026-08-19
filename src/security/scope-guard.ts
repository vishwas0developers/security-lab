// Enforces the scope/policy engine (PRD §21) before any tool executes.
// Defaults per the PRD:
//   production        = protected (not modeled as a literal string here --
//                        enforced by scope simply denying anything not
//                        explicitly listed; there is no implicit "allow all
//                        except production" mode)
//   external target    = denied (nothing is in scope unless explicitly listed)
//   scope expansion     = denied (this module never widens scope at runtime)
//   secret exposure     = denied (handled by src/security/redact.ts)
//
// The MCP layer (src/mcp) and orchestrator (src/orchestrator) MUST call
// assertInScope() before invoking any adapter in src/tools. This is the
// single choke point; do not duplicate scope logic elsewhere.

import type { Scope } from "../config/schema";

export class ScopeViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeViolationError";
  }
}

function extractHost(target: string): string {
  try {
    // Bare hosts (no scheme) fail URL parsing; retry with a dummy scheme.
    const url = new URL(target.includes("://") ? target : `https://${target}`);
    return url.hostname.toLowerCase();
  } catch {
    return target.toLowerCase();
  }
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  if (!range || !isIpv4(ip) || !isIpv4(range)) return false;
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
  if (Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

// Exact match, or "*.example.com" matching any subdomain (not the bare
// domain itself -- list that separately if the bare domain must be in scope
// too, so scope files stay explicit rather than surprising).
function domainMatches(host: string, pattern: string): boolean {
  const p = pattern.toLowerCase();
  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return host.endsWith(suffix);
  }
  return host === p;
}

export function assertInScope(target: string, scope: Scope): void {
  const host = extractHost(target);

  for (const excluded of scope.excludedHosts) {
    if (domainMatches(host, excluded) || (isIpv4(host) && isIpv4(excluded) && host === excluded)) {
      throw new ScopeViolationError(`'${target}' matches excluded host '${excluded}' -- refusing to proceed.`);
    }
  }

  if (scope.allowedUrls.some((u) => target === u || target.startsWith(u))) {
    return;
  }
  if (scope.allowedDomains.some((d) => domainMatches(host, d))) {
    return;
  }
  if (isIpv4(host) && scope.allowedIpRanges.some((range) => ipInCidr(host, range))) {
    return;
  }

  throw new ScopeViolationError(
    `'${target}' is not in the authorized scope. Add it to allowedDomains/allowedUrls/allowedIpRanges in .security/scope.yaml before scanning. ` +
      `Default policy denies anything not explicitly listed (PRD §21: "external target = denied").`
  );
}

export function assertNotExcludedPath(target: string, pathname: string, scope: Scope): void {
  for (const excluded of scope.excludedPaths) {
    if (pathname === excluded || pathname.startsWith(excluded)) {
      throw new ScopeViolationError(`Path '${pathname}' on '${target}' matches excluded path '${excluded}'.`);
    }
  }
}

export function assertDestructiveActionsAllowed(scope: Scope, actionDescription: string): void {
  if (!scope.destructiveActionsAllowed) {
    throw new ScopeViolationError(
      `Refusing to perform a destructive action (${actionDescription}): destructiveActionsAllowed is false in .security/scope.yaml. ` +
        `This is the default and matches the PRD principle of harmless validation over destructive proof.`
    );
  }
}
