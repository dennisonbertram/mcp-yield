# MCP Yield Server

The MCP Yield Server exposes StakeKit (yield.xyz) yield intelligence through the [Model Context Protocol](https://modelcontextprotocol.io). It packages a stdio MCP server that surfaces:

- Eight discovery tools that query staking, lending, and vault opportunities across supported networks.
- Six catalog tools covering networks, tokens, and DeFi protocols.
- Five guided prompts plus dynamic resources to enrich assistant workflows.

The server follows the multi-phase plan in [`docs/`](docs/) and is suitable for both automated assistants and manual operators that need consistent access to live yield data.

---

## Quick Start

### Prerequisites
- Node.js 18 or newer
- npm 9+
- A StakeKit API key (`https://api.stakek.it`)

### Installation
```bash
npm install
cp .env.example .env
# edit .env and set STAKEKIT_API_KEY=your_api_key
```

### Development server
```bash
npm run dev
```
This runs the stdio server directly with TypeScript support.

### Production build
```bash
npm run build
npm run start:stdio   # stdio transport
# or
PORT=3000 npm run start:http   # HTTP transport on the configured port
```
The build command outputs compiled JavaScript to `dist/`. The stdio server reads from `stdin`/`stdout` using the MCP protocol, while the HTTP server exposes `/mcp` (JSON-RPC) and `/health` endpoints for remote orchestration. Streamable HTTP clients must send an `initialize` request first, record the returned `Mcp-Session-Id`, include both `Mcp-Session-Id` and `Mcp-Protocol-Version` headers on follow-up calls, and advertise `Accept: application/json, text/event-stream` to remain spec compliant.

---

## Configuration
Environment variables are loaded from `.env` via [`dotenv`](https://www.npmjs.com/package/dotenv).

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `STAKEKIT_API_KEY` | ✅ | – | StakeKit API key used for every outbound call. |
| `STAKEKIT_BASE_URL` | ➖ | `https://api.stakek.it/v2` | Primary StakeKit host. |
| `STAKEKIT_FALLBACK_URL` | ➖ | `https://api.yield.xyz/v1` | Failover host for 404/204 responses. |
| `LOG_LEVEL` | ➖ | `info` | Pino-style log level for stdout logs. |
| `PORT` | ➖ | `3000` | Listening port when running the HTTP transport. |

Set variables in `.env` or pass them directly when starting the server:
```bash
STAKEKIT_API_KEY=sk_live_your_key npm run start:stdio
```

---

## Available MCP Tools

| Tool | Description | Key Arguments | Example |
| --- | --- | --- | --- |
| `get-yield-opportunities` | Paginated feed of all StakeKit yields with metadata. | `limit`, `offset`, `cursor`, `network`, `type` | `{ "method": "tools/call", "params": { "name": "get-yield-opportunities", "arguments": { "limit": 5 }}}` |
| `get-yield-details` | Detailed breakdown for a single yield opportunity. | `yieldId` | `"arguments": { "yieldId": "ethereum-eth-lido-staking" }` |
| `get-yields-by-network` | Filter yields by blockchain network id. | `networkId`, pagination fields | `"arguments": { "networkId": "ethereum", "limit": 10 }` |
| `get-yields-by-token` | Discover yields that accept or reward a token symbol. | `tokenSymbol`, pagination fields | `"arguments": { "tokenSymbol": "ETH" }` |
| `get-staking-yields` | Staking and liquid staking opportunities. | `limit`, `offset`, `cursor`, `includeLiquid` | `"arguments": { "includeLiquid": true }` |
| `get-lending-yields` | Lending markets with collateral metrics. | `protocol`, pagination fields | `"arguments": { "protocol": "aave" }` |
| `get-vault-yields` | Vault strategies including fee data. | `strategy`, pagination fields | `"arguments": { "strategy": "covered" }` |
| `get-top-yields` | Highest APY opportunities subject to filters. | `limit`, `minTvlUsd`, `type` | `"arguments": { "limit": 3, "minTvlUsd": 100000 }` |
| `list-supported-chains` | StakeKit network catalog with status flags. | `category`, `includeTestnets` | `"arguments": { "includeTestnets": false }` |
| `get-chain-details` | Network metadata plus notable yields. | `networkId` | `"arguments": { "networkId": "polygon" }` |
| `list-supported-tokens` | Token catalog with deduped network coverage. | `networkId`, `symbol`, `limit` | `"arguments": { "limit": 25 }` |
| `get-token-details` | Token metadata and top supporting yields. | `tokenId` or `symbol`, optional `networkId` | `"arguments": { "symbol": "USDC" }` |
| `list-protocols` | Protocol list with aggregate yield metrics. | `category`, `chain` | `"arguments": { "chain": "ethereum" }` |
| `get-protocol-details` | Protocol deep dive and APY stats. | `protocolId` | `"arguments": { "protocolId": "lido" }` |

### Dynamic Resources
- `yield-detail` → `yield://{yieldId}` JSON summary with peer statistics.
- `network-detail` → `network://{networkId}` Markdown overview of a network.
- `token-detail` → `token://{tokenId}` JSON token profile with multi-chain coverage.
- `protocol-detail` → `protocol://{protocolId}` JSON protocol dossier.
- `networks-overview` → `networks://all` JSON snapshot grouping networks by category.

### Guided Prompts
| Prompt | Purpose | Notable Arguments |
| --- | --- | --- |
| `compare-yields` | Walkthrough for comparing specific yield IDs. | `yieldIds` (array), `criteria` |
| `find-optimal-yield` | Assist with network/token constrained yield search. | `networkId`, `tokenSymbol`, `minTvlUsd`, `riskTolerance` |
| `network-due-diligence` | Generates diligence packet for a network. | `networkId` |
| `protocol-risk-review` | Risk summary for a protocol + associated yields. | `protocolId` |
| `token-yield-availability` | Maps deployment options for a token. | `tokenSymbol` |

---

## Testing

### Automated tests
```bash
npm test
```
Vitest covers the client retry logic, tools, resources, and prompts. Tests use `nock` by default to isolate the StakeKit API. Set `RUN_LIVE_TESTS=1` to enable live integration cases.

### Type checking
```bash
npm run lint
```

### Manual API smoke tests
```bash
# list yields via curl
curl -s "https://api.stakek.it/v2/yields?limit=3" \
  -H "X-API-KEY: $STAKEKIT_API_KEY" | jq '.data[0]'

# query a single yield
curl -s "https://api.stakek.it/v2/yields/ethereum-eth-lido-staking" \
  -H "X-API-KEY: $STAKEKIT_API_KEY" | jq '{id, apy, metadata}'
```

### MCP stdio smoke tests
```bash
npm run build
# list tools
echo '{"jsonrpc":"2.0","method":"tools/list","id":1,"params":{}}' \
  | STAKEKIT_API_KEY=$STAKEKIT_API_KEY node dist/index.js

# fetch top yields
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-top-yields","arguments":{"limit":3}}}' \
  | STAKEKIT_API_KEY=$STAKEKIT_API_KEY node dist/index.js
```

### MCP HTTP smoke tests
```bash
npm run build
STAKEKIT_API_KEY=$STAKEKIT_API_KEY PORT=3000 npm run start:http &
SERVER_PID=$!
sleep 1

# initialize a session and capture the MCP session id header
INIT_HEADERS=$(mktemp)
curl -sD "$INIT_HEADERS" -o /tmp/init-response.json http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"manual-smoke","version":"1.0.0"}}}'
SESSION_ID=$(grep -i 'mcp-session-id' "$INIT_HEADERS" | awk '{print $2}' | tr -d '\r')
cat /tmp/init-response.json | jq '.result.serverInfo'

# list tools within the established session
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H 'Mcp-Protocol-Version: 2025-03-26' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | jq '.result.tools | length'

# tear down the session cleanly
curl -s -X DELETE http://localhost:3000/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H 'Mcp-Protocol-Version: 2025-03-26'

kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
```


---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| `Authentication failed` errors | Missing or invalid `STAKEKIT_API_KEY`. | Confirm `.env` and export variables before starting the server. |
| Repeated `429` responses | StakeKit rate limiting. | Back off for a few seconds. The client automatically retries transient errors. |
| `ToolError: [INTERNAL_ERROR] Invalid URL` | Proxy or base URL misconfiguration. | Ensure `STAKEKIT_BASE_URL` and `STAKEKIT_FALLBACK_URL` include protocol and are reachable without proxies, or set `proxy: false` on axios. |
| `ZodError` validation failures | Upstream schema drift. | Capture the `structuredContent` payload from logs and update `src/types/stakekit.ts` + relevant parsing logic. |
| No tools/resources visible | Server not built or env not loaded. | Run `npm run build` and start via `npm run start:stdio` with a configured `.env`. |

---

## Development Workflow
1. Create a feature branch from `work`.
2. Run `npm run lint` and `npm test` locally.
3. Update documentation alongside code changes.
4. Commit with clear messages (e.g., `feat: add get-top-yields tool`).
5. Submit a PR with the Vitest output attached.

The repository uses strict TypeScript with `moduleResolution=node` and ships only compiled artifacts in `dist/`.

---

## Deployment

### Docker
A production container is supplied via `Dockerfile`.

```bash
docker build -t mcp-yield .
docker run --rm -e STAKEKIT_API_KEY=sk_live_your_key mcp-yield
```

The default command launches the stdio transport. When embedding in another process (e.g., MCP-compatible orchestrators), connect the container’s stdio to your manager or wrap it with a lightweight bridge.

### Manual
- Ensure `.env` is populated.
- Run `npm run build`.
- Start with `npm run start:stdio` and pipe JSON-RPC requests to stdin.

For managed environments, store secrets using platform secret stores (AWS Secrets Manager, GCP Secret Manager, 1Password) and inject them as environment variables.

---

## Appendix
- Planning artifacts: [`docs/`](docs/)
- StakeKit API Reference: <https://docs.yield.xyz/>
- Model Context Protocol: <https://modelcontextprotocol.io>
- Issue tracker: submit bugs via GitHub issues.

