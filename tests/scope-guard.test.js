const test = require("node:test");
const assert = require("node:assert/strict");
const { assertInScope, ScopeViolationError } = require("../dist/src/security/scope-guard");

function baseScope(overrides) {
  return Object.assign(
    {
      schemaVersion: 1,
      environment: "staging",
      allowedDomains: [],
      allowedIpRanges: [],
      allowedUrls: [],
      allowedRepositories: [],
      allowedApplications: [],
      allowedMobileArtifacts: [],
      excludedHosts: [],
      excludedPaths: [],
      authenticationProfiles: [],
      destructiveActionsAllowed: false,
    },
    overrides
  );
}

test("assertInScope denies a target not listed anywhere", () => {
  const scope = baseScope({});
  assert.throws(() => assertInScope("https://evil.example.com", scope), ScopeViolationError);
});

test("assertInScope allows an exact allowedDomains match", () => {
  const scope = baseScope({ allowedDomains: ["staging.example.com"] });
  assert.doesNotThrow(() => assertInScope("https://staging.example.com/path", scope));
});

test("assertInScope allows a wildcard subdomain match", () => {
  const scope = baseScope({ allowedDomains: ["*.example.com"] });
  assert.doesNotThrow(() => assertInScope("https://api.example.com", scope));
});

test("assertInScope does not let a wildcard match the bare domain", () => {
  const scope = baseScope({ allowedDomains: ["*.example.com"] });
  assert.throws(() => assertInScope("https://example.com", scope), ScopeViolationError);
});

test("assertInScope allows a CIDR-matched IP", () => {
  const scope = baseScope({ allowedIpRanges: ["10.0.0.0/24"] });
  assert.doesNotThrow(() => assertInScope("http://10.0.0.42", scope));
});

test("assertInScope rejects an IP outside the CIDR range", () => {
  const scope = baseScope({ allowedIpRanges: ["10.0.0.0/24"] });
  assert.throws(() => assertInScope("http://10.0.1.42", scope), ScopeViolationError);
});

test("assertInScope: excludedHosts wins even over an allowedDomains match", () => {
  const scope = baseScope({ allowedDomains: ["*.example.com"], excludedHosts: ["admin.example.com"] });
  assert.throws(() => assertInScope("https://admin.example.com", scope), ScopeViolationError);
});
