# android-security

## Purpose

Android application and WebView security analysis via MobSF static
analysis, plus emulator-based dynamic investigation where available.

## When to Use

`security.project.inspect` reports `detected.android: true`, or the user
provides an APK/AAB file directly.

## Inputs

An APK/AAB file path listed in `.security/scope.yaml`'s
`allowedMobileArtifacts` (not a URL — mobile static analysis operates on the
binary artifact itself). If the artifact isn't listed there, add it before
scanning.

## Tool Selection Guidance

`security.assessment.run` invokes the `mobsf` adapter automatically when
`detected.android` is true and `allowedMobileArtifacts` is non-empty. If it
reports MobSF as skipped, the most common cause is the `mobsf` container not
running (`docker compose -f docker/docker-compose.yml up -d mobsf`) or
`MOBSF_API_KEY` not set in `docker/.env` (MobSF generates this itself on
first boot — retrieve it from `docker compose logs mobsf`).

## Safety Rules

Static analysis only unless a dedicated Android emulator/test environment is
explicitly configured — do not assume Docker alone provides full dynamic
Android runtime testing (PRD §16: "do not pretend Docker alone can provide
complete Android runtime testing").

## Workflow

After `security.assessment.run` returns MobSF findings, investigate further
in the manifest/code:

- **Manifest**: exported `Activity`/`Service`/`BroadcastReceiver`/
  `ContentProvider` without `android:permission` or explicit intent
  filtering; `android:debuggable="true"`; `android:allowBackup="true"` with
  sensitive data.
- **WebView**: `setJavaScriptEnabled(true)` combined with
  `addJavascriptInterface()` exposing a bridge to untrusted content;
  `setAllowFileAccess`/`setAllowUniversalAccessFromFileURLs` enabled;
  `onReceivedSslError` overridden to always proceed (TLS bypass).
  For hybrid apps, load the `webview-security` skill for the full
  WebView-specific checklist.
- **Network security config**: cleartext traffic permitted
  (`usesCleartextTraffic="true"` / missing `network_security_config.xml`
  pinning where warranted).
- **Secrets**: hardcoded API keys/credentials in resources or code
  (MobSF's static analysis already flags common patterns — verify each is a
  true positive, not a placeholder).

## Evidence Requirements

MobSF findings already include the offending file (`source_location`) —
quote it directly.

## Output Requirements

Distinguish `manifest`-sourced findings from `code_analysis`-sourced
findings in your summary (both come back from MobSF but represent different
kinds of risk).
