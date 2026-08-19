# webview-security

## Purpose

WebView-specific security investigation shared across Android and Windows
workflows: JS bridges, mixed content, TLS handling, exported components,
storage/cookies, deep links.

## When to Use

`security.project.inspect` reports `detected.webview: true` (only set when
an Android or Windows project also carries an obvious WebView marker), or
either the `android-security` or `windows-security` skill hands off here.

## Inputs

Same as the parent platform skill (Android: APK/AAB + source; Windows:
source/package).

## Tool Selection Guidance

For the network-traffic side, use `security.assessment.run`'s ZAP results if
the WebView loads content from a URL in scope -- ZAP can proxy and inspect
that traffic like any other web target. For the native/bridge side, this is
source/manifest review, same as the parent skill.

## Safety Rules

Same as the parent platform skill (android-security / windows-security):
static/source review by default; no destructive runtime manipulation.

## Workflow

- **JavaScript interfaces/bridges**: any object exposed to the WebView's JS
  context (`addJavascriptInterface` on Android, `AddHostObjectToScript` on
  WebView2) -- does it expose more than the WebView content needs (file
  access, arbitrary command execution, credential access)?
- **File access**: `setAllowFileAccess`/`setAllowFileAccessFromFileURLs`
  enabled unnecessarily.
- **Mixed content**: `setMixedContentMode` permissive, or the loaded page
  itself mixes HTTP resources into an HTTPS page.
- **TLS/certificate validation**: any custom `TrustManager`/certificate
  callback that accepts all certificates.
- **Navigation restrictions**: does the WebView allow navigation to
  arbitrary/attacker-controlled URLs (missing `shouldOverrideUrlLoading`
  allowlist), enabling phishing via the app's own WebView?
- **Deep links/intents**: does a deep link handler pass attacker-controlled
  data directly into the WebView's `loadUrl()`?
- **Local storage/cookies**: is sensitive data placed in WebView local
  storage/cookies without appropriate access restriction?

## Evidence Requirements

Cite the exact source file and method implementing the WebView
configuration.

## Output Requirements

Tag findings with `technology: "webview"` so they're distinguishable from
general Android/Windows findings in the report.
