# Windows & WebView Security

Detection: `detected.windows` (`.csproj`/`.sln`/`.appx`/`.msix` markers);
`detected.webview` (only set when an Android or Windows project also has an
obvious WebView marker file/name — a heuristic, not manifest parsing).

## Automated coverage today

**None.** There is no Windows-package static-analysis adapter and no
WebView-traffic adapter implemented yet. `security.project.inspect`/
`security scan` will report `detected.windows`/`detected.webview` correctly,
but no tool actually runs against a Windows artifact. This is stated
plainly rather than left implicit, per this project's "do not fake tool
execution" rule.

If the app has a web-facing component reachable by URL, `security scan`'s
Nuclei/ZAP run against that URL still applies — it's the native/package
layer and the WebView bridge specifically that have no automated coverage.

## Manual/agent-driven review

`windows-security` (`skills/windows-security/SKILL.md`) covers app manifest
and configuration review. `webview-security`
(`skills/webview-security/SKILL.md`) covers JS bridges, mixed content, TLS
handling, navigation restrictions, and deep links — shared with the Android
WebView case.

## Runtime testing

If runtime testing requires elevated/system-level behavior, PRD §17/§20
require a dedicated isolated Windows VM rather than the primary host. This
platform does not provision or manage such a VM.
