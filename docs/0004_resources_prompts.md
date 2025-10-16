# Task 0004 – MCP Resources and Prompts

## Goals
- Provide rich contextual resources that can be retrieved via URI by downstream LLM clients.
- Supply guided prompts that help LLMs orchestrate multi-step reasoning across the available tools.

## Dynamic Resources
Implement in `src/resources/index.ts` using MCP SDK resource interfaces. Each resource must:
- Validate URI structure with Zod.
- Fetch underlying data via StakeKit client (using caching from prior tasks).
- Return typed payload with explicit `contentType`.
- Cache responses using TTL per resource below (in-memory map acceptable initially).

### 1. `yield://{yieldId}`
- **Content Type**: `application/json`
- **Data**: Detailed snapshot mirroring `get-yield-details` output plus derived insights (e.g., APY percentile vs network median).
- **TTL**: 5 minutes.

### 2. `network://{networkId}`
- **Content Type**: `text/markdown`
- **Data**: Headline stats, network category, gas token, top 5 yields table, cautionary notes.
- **TTL**: 10 minutes.

### 3. `token://{tokenId}`
- **Content Type**: `application/json`
- **Data**: Token metadata, market data (price, 24h change if available), list of relevant yields with APY snapshots.
- **TTL**: 10 minutes.

### 4. `protocol://{protocolId}`
- **Content Type**: `application/json`
- **Data**: Protocol description, supported networks, audits, aggregated yield stats, risk considerations.
- **TTL**: 15 minutes.

### 5. `networks://all`
- **Content Type**: `application/json`
- **Data**: Summary of all networks grouped by category, counts of yields per network, quick links to relevant tools/resources.
- **TTL**: 30 minutes.

## Prompts
Implement in `src/prompts/index.ts`. Use MCP prompt schema with metadata and placeholders for tool calls. Prompts should encourage explicit tool usage and cite relevant resources.

1. **`compare-yields`**
   - Purpose: Guide LLM through comparing two or more yields by ID.
   - Steps: Fetch details via `get-yield-details`, optionally load `yield://` resources, produce comparison table highlighting APY, TVL, risks.

2. **`find-optimal-yield`**
   - Purpose: Evaluate yields for a target network/token and risk appetite.
   - Steps: Use `get-yields-by-network`/`get-yields-by-token`, filter by APY/TVL thresholds, surface top options with rationale.

3. **`network-due-diligence`**
   - Purpose: Summarize network fundamentals before recommending strategies.
   - Steps: Call `get-chain-details`, load `network://` resource, highlight validator set, native token, notable protocols.

4. **`protocol-risk-review`**
   - Purpose: Assess protocol health.
   - Steps: Use `get-protocol-details`, fetch `protocol://` resource, check audits, historical incidents, compare APYs vs peers.

5. **`token-yield-availability`**
   - Purpose: Determine where a token can be deployed for yield.
   - Steps: Call `get-yields-by-token`, cross-reference with `token://` resource, categorize by yield type and APY tier.

## Testing
- Unit tests ensuring resource URI parsing and prompt metadata validation.
- Integration tests loading each resource (mocked + live smoke) confirming TTL caching works.
- Manual stdio commands for `resources/list`, `resources/get`, and `prompts/list` documented in README.
