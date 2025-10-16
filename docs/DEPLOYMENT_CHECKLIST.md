# Deployment Checklist

## Pre-build
- [ ] StakeKit API key stored in target secret manager and injected as `STAKEKIT_API_KEY`.
- [ ] Confirm outbound egress to `https://api.stakek.it` and `https://api.yield.xyz` is permitted.
- [ ] Decide on log aggregation target for stdout MCP logs.

## Build pipeline
- [ ] Run `npm ci` using the locked dependency graph.
- [ ] Execute `npm run lint` (type checking) and `npm test` (Vitest suite).
- [ ] Capture test output artifacts for release notes.

## Image packaging
- [ ] Build Docker image via `docker build -t mcp-yield .`.
- [ ] Scan image for vulnerabilities (Grype, Trivy, or vendor equivalent).
- [ ] Tag image with semantic version (e.g., `mcp-yield:v1.0.0`).

## Runtime configuration
- [ ] Provide `STAKEKIT_BASE_URL`/`STAKEKIT_FALLBACK_URL` overrides if using proxies.
- [ ] Set `LOG_LEVEL` appropriate for environment (`info` for prod, `debug` for staging).
- [ ] Configure resource limits (CPU ≥ 0.25 cores, memory ≥ 256 MB).

## Validation
- [ ] Run MCP stdio smoke test (`tools/list`, `get-yield-opportunities`, `list-supported-chains`).
- [ ] Run MCP HTTP smoke test against `/mcp` (`tools/list`, `get-top-yields`).
- [ ] Confirm `/health` endpoint returns `200` with `{ "status": "ok" }`.
- [ ] Run manual curl check for `GET /v2/yields?limit=1` to verify network connectivity.
- [ ] Monitor first 10 minutes of logs for `ToolError` or retry warnings.

## Launch
- [ ] Wire stdio transport into orchestrator / MCP gateway.
- [ ] Document operational runbook and escalation contacts.
- [ ] Schedule periodic dependency audits (monthly).
