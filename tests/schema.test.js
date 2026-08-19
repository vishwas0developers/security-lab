const test = require("node:test");
const assert = require("node:assert/strict");
const { FindingSchema } = require("../dist/src/findings/schema");
const { ScopeSchema, ProjectConfigSchema } = require("../dist/src/config/schema");

test("FindingSchema accepts a minimal valid finding and fills defaults", () => {
  const parsed = FindingSchema.parse({
    id: "f1",
    title: "Test finding",
    severity: "high",
    confidence: "probable",
    component: "example.com",
    technology: "web",
    description: "desc",
  });
  assert.equal(parsed.status, "suspected");
  assert.deepEqual(parsed.evidence, []);
  assert.deepEqual(parsed.detected_by, []);
});

test("FindingSchema rejects an invalid severity", () => {
  assert.throws(() =>
    FindingSchema.parse({
      id: "f1",
      title: "t",
      severity: "extreme",
      confidence: "probable",
      component: "c",
      technology: "t",
      description: "d",
    })
  );
});

test("ScopeSchema defaults destructiveActionsAllowed to false", () => {
  const parsed = ScopeSchema.parse({ schemaVersion: 1, environment: "staging" });
  assert.equal(parsed.destructiveActionsAllowed, false);
  assert.deepEqual(parsed.allowedUrls, []);
});

test("ProjectConfigSchema requires schemaVersion 1", () => {
  assert.throws(() => ProjectConfigSchema.parse({ schemaVersion: 2, name: "x" }));
});
