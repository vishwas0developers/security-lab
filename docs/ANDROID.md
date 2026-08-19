# Android Security

Detection: `detected.android` (`AndroidManifest.xml`, `build.gradle[.kts]`,
or a `.apk`/`.aab` file found — `src/discovery/index.ts`).

## Automated coverage today

`src/tools/mobsf.ts` is a real adapter against the `mobsf` compose service's
REST API (upload → scan → `report_json`), verified against MobSF's official
API docs. It requires:

1. The `mobsf` service running (`docker compose ... up -d mobsf`).
2. `MOBSF_API_KEY` set in `docker/.env` (see [DOCKER.md](DOCKER.md) for
   retrieving it).
3. An APK/AAB path listed in `.security/scope.yaml`'s
   `allowedMobileArtifacts` (this is a filesystem path, not a URL — unlike
   the web/API adapters).

`security scan` invokes it automatically when both conditions above are met
and `detected.android` is true.

## Dynamic testing

Not automated. Per PRD §16, Docker alone does not provide complete Android
runtime testing — a dedicated emulator/test environment is required and is
out of scope for this platform's current implementation. Static analysis via
MobSF is what actually runs today.

## Manual/agent-driven review

Manifest and WebView-bridge review beyond what MobSF flags: see the
`android-security` skill (`skills/android-security/SKILL.md`), and
`webview-security` for hybrid apps.
