# Docker Architecture

Specialized services, not one monolithic image (implementation_plan.md §7).
`docker/docker-compose.yml` is the runtime orchestrator; the NPM CLI
controls it (`security setup` generates `docker/.env`; `security doctor`/
`security tools` check service health; nothing requires the user to run
`docker compose` by hand for normal operation, though `docker compose up
-d` is currently how services actually get started — see "starting
services" below).

## Services

| Service | Image | Verified against | Role |
|---|---|---|---|
| `zap` | `zaproxy/zap-stable:${ZAP_VERSION:-latest}` | zaproxy.org/docs/docker (official) | Web/API dynamic scanning via REST API |
| `mobsf` | `opensecurity/mobile-security-framework-mobsf:${MOBSF_VERSION:-latest}` | hub.docker.com/r/opensecurity/mobile-security-framework-mobsf (official) | Android static/dynamic analysis via REST API |
| `nuclei` | `projectdiscovery/nuclei:${NUCLEI_VERSION:-latest}` | ProjectDiscovery (official) | Template-driven vuln/exposure scanning |

All three images were confirmed via live web search before being wired in,
per the "do not invent tool integrations" rule.

## Strix is NOT a compose service

Strix (PRD §11.1) is a standalone CLI:

```bash
curl -sSL https://strix.ai/install | bash
```

It manages its own Docker sandbox internally and requires a user-supplied
LLM API key (`STRIX_LLM` + `LLM_API_KEY` env vars — OpenAI/Anthropic/Google/
etc.). `src/tools/strix.ts` detects and invokes it as a subprocess when
present; it is deliberately absent from `docker-compose.yml`. This project
does not and should not provision an LLM API key for you.

**Further limitation, stated plainly:** Strix's own output format
(`strix_runs/<run-name>/`) is not yet mapped into this platform's normalized
finding schema — `src/tools/strix.ts` surfaces the raw run directory rather
than inventing a parser for an unverified schema.

## Networking

A dedicated bridge network (`security-platform`), not `internal: true` — ZAP
and Nuclei need outbound reachability to whatever target is authorized,
frequently the host itself via Docker Desktop's `host.docker.internal`. No
service publishes a port to `0.0.0.0`; ZAP's API (`ZAP_API_PORT`, default
8090) and MobSF's web/API (`MOBSF_PORT`, default 8000) are bound to
`127.0.0.1` only.

## Starting services

```bash
security setup                # generates docker/.env with a random ZAP_API_KEY
docker compose --env-file docker/.env -f docker/docker-compose.yml -p security-platform up -d zap mobsf
```

`security setup` does not currently run this `up -d` automatically (bringing
up multi-GB services on every `security setup` invocation, including
project-level ones, would be surprising and slow) — this is a known gap
against the PRD's "start required services" step; `security doctor`/
`security tools` tell you they're not running rather than silently starting
them.

## Retrieving MobSF's API key

MobSF generates its own REST API key on first boot and prints it to its
container logs — there is no reliable way to pre-set it across MobSF
versions:

```bash
docker compose -f docker/docker-compose.yml logs mobsf | grep -i api_key
```

Add it to `docker/.env` as `MOBSF_API_KEY` before running Android
assessments.

## Health checks

`zap` and `mobsf` have Docker healthchecks (`docker compose ps` shows
`healthy`/`starting`/`unhealthy`). `nuclei` is a one-shot CLI image (see
below), not a long-running daemon — it has no healthcheck by design.

## Why Nuclei isn't a persistent service

Nuclei ships as a CLI, not a daemon. `src/tools/nuclei.ts` invokes it via
`docker run --rm projectdiscovery/nuclei ...` per scan rather than talking
to a long-running container. The `nuclei` entry in `docker-compose.yml`
exists (under the `tools` profile) so `docker compose pull`/image-presence
checks can verify it, not to run it continuously.
