const test = require("node:test");
const assert = require("node:assert/strict");
const { correlateFindings } = require("../dist/src/findings/correlate");

function finding(overrides) {
  return Object.assign(
    {
      id: "f1",
      title: "Missing X-Frame-Options header",
      severity: "low",
      confidence: "suspected",
      component: "example.com",
      technology: "web",
      endpoint: "https://example.com/",
      description: "desc",
      evidence: [],
      reproduction: [],
      references: [],
      detected_by: ["nuclei"],
      validated_by: [],
      status: "suspected",
    },
    overrides
  );
}

test("correlateFindings merges same title+endpoint from two tools", () => {
  const a = finding({ id: "a", detected_by: ["nuclei"], severity: "low" });
  const b = finding({ id: "b", detected_by: ["zap"], severity: "medium", confidence: "probable" });
  const result = correlateFindings([a, b]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].detected_by.sort(), ["nuclei", "zap"]);
  assert.equal(result[0].severity, "medium");
  assert.equal(result[0].confidence, "probable");
});

test("correlateFindings keeps distinct endpoints separate", () => {
  const a = finding({ id: "a", endpoint: "https://example.com/a" });
  const b = finding({ id: "b", endpoint: "https://example.com/b" });
  const result = correlateFindings([a, b]);
  assert.equal(result.length, 2);
});

test("correlateFindings is case-insensitive on title", () => {
  const a = finding({ id: "a", title: "Missing CSP header" });
  const b = finding({ id: "b", title: "MISSING CSP HEADER" });
  const result = correlateFindings([a, b]);
  assert.equal(result.length, 1);
});
