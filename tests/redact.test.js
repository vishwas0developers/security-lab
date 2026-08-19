const test = require("node:test");
const assert = require("node:assert/strict");
const { redact, redactDeep } = require("../dist/src/security/redact");

test("redact strips an Authorization header value", () => {
  const out = redact("GET /api\nAuthorization: Bearer sk-abc123\nHost: example.com");
  assert.ok(!out.includes("sk-abc123"));
  assert.ok(out.includes("[REDACTED]"));
});

test("redact strips a password field in JSON-ish text", () => {
  const out = redact('{"username":"bob","password":"hunter2"}');
  assert.ok(!out.includes("hunter2"));
});

test("redact strips a PEM private key block", () => {
  const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34\n-----END RSA PRIVATE KEY-----";
  const out = redact(`before ${pem} after`);
  assert.ok(!out.includes("MIIBOgIBAAJBAKj34"));
  assert.ok(out.includes("[REDACTED PRIVATE KEY]"));
});

test("redact strips a JWT", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
  const out = redact(`token=${jwt}`);
  assert.ok(!out.includes(jwt));
});

test("redactDeep redacts nested object keys matching secret patterns", () => {
  const out = redactDeep({ user: "bob", auth: { api_key: "abc", nested: { token: "xyz" } } });
  assert.equal(out.auth.api_key, "[REDACTED]");
  assert.equal(out.auth.nested.token, "[REDACTED]");
  assert.equal(out.user, "bob");
});

test("redactDeep redacts strings inside arrays", () => {
  const out = redactDeep(["safe", "Authorization: Bearer topsecret"]);
  assert.ok(!out[1].includes("topsecret"));
});
