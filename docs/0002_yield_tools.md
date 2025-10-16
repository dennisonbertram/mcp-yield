# Task 0002 – Yield Discovery Tooling

Implement eight MCP tools focused on exploring yield opportunities. Each tool calls StakeKit APIs, validates inputs with Zod, and returns structured JSON output that is easy for LLMs to interpret.

## Shared Requirements
- **File Location**: `src/tools/yields.ts` exporting registration helpers for the MCP server.
- **HTTP Paths**: Prefer `/v2` endpoints on `api.stakek.it`; fallback to `/v1` on `api.yield.xyz` if payload missing.
- **Validation**: Use Zod schemas for parameters and responses; convert API snake_case to camelCase where reasonable.
- **Pagination**: Support `limit`, `offset`, and `cursor` when the API exposes them. Provide defaults and document behaviour.
- **Error Handling**: Map HTTP errors to descriptive MCP tool errors (e.g., `NOT_FOUND`, `VALIDATION_ERROR`, `UPSTREAM_ERROR`).
- **Testing**: Add integration tests per tool under `tests/tools/yields.test.ts`. Mock HTTP via nock for offline tests; include at least one live test guarded by env flag.

## Tools

### 1. `get-yield-opportunities`
- **Description**: Return paginated list of yields with basic metadata.
- **Endpoint**: `GET /yields`
- **Arguments**: `{ limit?: number (default 20, max 100), offset?: number, network?: string, type?: string }`
- **Response Projection**: `[{ id, name, network, type, apy, rewardTokenSymbols, tvl, riskLevel, tags }]`
- **Notes**: Include `totalCount` when available. De-duplicate yields from fallback host.

### 2. `get-yield-details`
- **Description**: Fetch detailed data for a single yield by ID.
- **Endpoint**: `GET /yields/{yieldId}`
- **Arguments**: `{ yieldId: string }`
- **Response Projection**: Provide structured sections (overview, rewards, limits, liquidity, provider info, contract addresses).
- **Notes**: Surface warning if `supportsExit` is false or withdrawal periods > 7 days.

### 3. `get-yields-by-network`
- **Description**: Filter yields by blockchain network slug.
- **Endpoint**: `GET /yields?network={id}`
- **Arguments**: `{ networkId: string, limit?: number, offset?: number }`
- **Response Projection**: Same as list tool, but include network metadata (logo, category) when possible.
- **Notes**: If network unsupported, return `NOT_FOUND` with suggestion to use `list-supported-chains`.

### 4. `get-yields-by-token`
- **Description**: Filter yields by deposit/reward token symbol.
- **Endpoint**: `GET /yields?token={symbol}` (verify actual query param from API docs).
- **Arguments**: `{ tokenSymbol: string, limit?: number, offset?: number }`
- **Response Projection**: Add `tokenMatchType` (deposit/reward/both) and include token decimals if available.
- **Notes**: Perform case-insensitive matching; fallback to manual filter if API lacks parameter.

### 5. `get-staking-yields`
- **Description**: Return yields with type `staking` or `liquid_staking`.
- **Endpoint**: `GET /yields?type=staking`
- **Arguments**: `{ limit?: number, offset?: number, includeLiquid?: boolean }`
- **Response Projection**: Add `stakingMechanism` (validator, pool, restaking, etc.) derived from metadata.
- **Notes**: When `includeLiquid` true, merge results from both `staking` and `liquid_staking` types.

### 6. `get-lending-yields`
- **Description**: Return yields labeled as lending/borrowing markets.
- **Endpoint**: `GET /yields?type=lending`
- **Arguments**: `{ limit?: number, offset?: number, protocol?: string }`
- **Response Projection**: Include `collateralFactor`, `borrowApy`, `supplyApy` when provided.
- **Notes**: If `protocol` provided, filter results accordingly.

### 7. `get-vault-yields`
- **Description**: Surface vault or structured product opportunities.
- **Endpoint**: `GET /yields?type=vault`
- **Arguments**: `{ limit?: number, offset?: number, strategy?: string }`
- **Response Projection**: Summaries of strategies, lockup periods, performance fees.
- **Notes**: Include `riskRating` where the API exposes it; warn when data missing.

### 8. `get-top-yields`
- **Description**: Return top `n` yields sorted by APY (default 5).
- **Endpoint**: call list yields then sort locally to ensure deterministic output.
- **Arguments**: `{ limit?: number (default 5, max 20), minTvlUsd?: number, type?: string }`
- **Response Projection**: `[{ id, name, apy, network, type, tvlUsd }]` plus `generatedAt` timestamp.
- **Notes**: Filter out yields lacking APY or TVL before ranking. Document tie-breaking rule (alphabetical by id).

## Testing Strategy
1. **Unit Validation** – Zod schemas unit tests covering valid/invalid inputs.
2. **Mocked HTTP** – Use `nock` to simulate StakeKit responses for deterministic tests.
3. **Live Smoke Tests** – Guarded by `RUN_LIVE_TESTS` env var; execute limited real calls verifying authentication and parsing.
4. **Manual stdio** – Document commands for each tool using `echo '{...}' | node dist/index.js` with API key exported.

## Documentation Updates
- Update README tool table with descriptions and example arguments/responses.
- Provide usage snippets for top 3 tools in docs.
- Record curl transcripts (in `docs/YIELD_API_TESTING_RESULTS.md`) verifying endpoints.
