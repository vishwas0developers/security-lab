const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ensurePlatformDirectories, ensureRuntimeConfig, saveScope, loadScope } = require("../dist/src/config/loader");
const { registerProject, listProjects, recordAssessment } = require("../dist/src/config/registry");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "security-platform-test-"));
}

test("ensurePlatformDirectories creates all dirs and is idempotent", () => {
  const root = tmpDir();
  const first = ensurePlatformDirectories(root);
  assert.ok(first.every((r) => r.created));
  const second = ensurePlatformDirectories(root);
  assert.ok(second.every((r) => !r.created));
});

test("ensureRuntimeConfig never overwrites an existing file", () => {
  const root = tmpDir();
  const first = ensureRuntimeConfig(root);
  assert.ok(first.created);
  fs.appendFileSync(first.path, "\n# hand-edited\n");
  const second = ensureRuntimeConfig(root);
  assert.ok(!second.created);
  assert.ok(fs.readFileSync(first.path, "utf8").includes("hand-edited"));
});

test("registerProject is idempotent on path and updates in place", () => {
  const root = tmpDir();
  const projectPath = tmpDir();
  const first = registerProject(root, { name: "proj", path: projectPath, profiles: ["web"] });
  const second = registerProject(root, { name: "proj-renamed", path: projectPath, profiles: ["web", "api"] });
  const all = listProjects(root);
  assert.equal(all.length, 1);
  assert.equal(all[0].name, "proj-renamed");
  assert.deepEqual(all[0].profiles, ["web", "api"]);
  assert.equal(all[0].registeredAt, first.registeredAt);
});

test("recordAssessment sets lastAssessment on the matching project", () => {
  const root = tmpDir();
  const projectPath = tmpDir();
  registerProject(root, { name: "proj", path: projectPath, profiles: [] });
  recordAssessment(root, projectPath, "2026-01-01T00:00:00.000Z");
  const [entry] = listProjects(root);
  assert.equal(entry.lastAssessment, "2026-01-01T00:00:00.000Z");
});

test("saveScope/loadScope round-trip", () => {
  const projectPath = tmpDir();
  const scope = {
    schemaVersion: 1,
    environment: "staging",
    allowedDomains: ["example.com"],
    allowedIpRanges: [],
    allowedUrls: [],
    allowedRepositories: [],
    allowedApplications: [],
    allowedMobileArtifacts: [],
    excludedHosts: [],
    excludedPaths: [],
    authenticationProfiles: [],
    destructiveActionsAllowed: false,
  };
  saveScope(projectPath, scope);
  const loaded = loadScope(projectPath);
  assert.deepEqual(loaded.allowedDomains, ["example.com"]);
});
