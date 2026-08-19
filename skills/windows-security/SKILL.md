# windows-security

## Purpose

Windows application (native/package layer) security analysis, treating
Windows apps as two surfaces: the native/package layer, and (if present) a
WebView/web/API layer covered by the `webview-security` skill.

## When to Use

`security.project.inspect` reports `detected.windows: true` (a `.csproj`,
`.sln`, `.appx`, or `.msix` marker was found).

## Inputs

The project source, and if packaged, the `.appx`/`.msix` artifact.

## Tool Selection Guidance

There is currently no dedicated Windows-package scanning adapter in this
platform (PRD §17/§20's "use application analysis where supported" is not
yet backed by a specific tool integration here) -- this skill is source/
package-manifest review, not an automated scan. Do not claim an automated
Windows static-analysis tool ran; it did not.

## Safety Rules

If runtime testing requires elevated behavior or system-level changes, that
requires a dedicated isolated Windows VM, not the primary host (PRD §17/§20).
Do not perform runtime testing against the host machine.

## Workflow

- **App manifest** (`Package.appxmanifest` or equivalent): overly broad
  capabilities declared (e.g. `broadFileSystemAccess`,
  `runFullTrust` when not required).
- **Configuration/security metadata**: hardcoded credentials/connection
  strings in config files; debug builds shipped instead of release.
- If the app hosts a WebView (WebView2, CEF, etc.), hand off to
  `webview-security` for that surface.

## Evidence Requirements

Cite the manifest/config file and the specific declared capability or
setting.

## Output Requirements

Mark findings from this skill with `detected_by: ["manual-review"]` (not a
tool name) since no automated Windows-package scanner backs this yet.
