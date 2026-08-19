// Sanitizes evidence and report content before it is written to disk (PRD
// §22, §24). Strips passwords, API keys, tokens, cookies, session
// identifiers, and private keys. This is a defense-in-depth text-level
// redactor -- it complements, not replaces, callers being deliberate about
// what they capture as evidence in the first place.

interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const RULES: RedactionRule[] = [
  // Authorization headers (Bearer/Basic/etc.)
  { name: "authorization-header", pattern: /(authorization:\s*)(\S.*)/gi, replacement: "$1[REDACTED]" },
  { name: "cookie-header", pattern: /(cookie:\s*)(\S.*)/gi, replacement: "$1[REDACTED]" },
  { name: "set-cookie-header", pattern: /(set-cookie:\s*)(\S.*)/gi, replacement: "$1[REDACTED]" },
  // JSON/query-style key: value or key=value pairs for common secret field names
  {
    name: "secret-field",
    pattern:
      /("?(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|session[_-]?id|sessionid|csrf[_-]?token)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,&}]+)/gi,
    replacement: "$1[REDACTED]",
  },
  // PEM-encoded private keys
  { name: "pem-private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: "[REDACTED PRIVATE KEY]" },
  // Common cloud/API token shapes
  { name: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g, replacement: "[REDACTED AWS ACCESS KEY]" },
  { name: "generic-bearer-token", pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/g, replacement: "Bearer [REDACTED]" },
  { name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replacement: "[REDACTED JWT]" },
];

export function redact(text: string): string {
  let result = text;
  for (const rule of RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

// Deep-redacts string values in an arbitrary JSON-ish object/array, useful
// for sanitizing parsed request/response bodies before they're stored as
// evidence.
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") {
    return redact(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/password|secret|token|api[_-]?key|private[_-]?key/i.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactDeep(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}
