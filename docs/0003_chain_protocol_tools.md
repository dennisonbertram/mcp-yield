# Task 0003 – Chain, Token, and Protocol Tools

## Overview
Build six MCP tools that provide catalog information about supported networks, tokens, and protocols. These tools complement the yield discovery suite by enabling LLMs to validate identifiers and gather metadata before recommending actions.

## Shared Implementation Notes
- Source file: `src/tools/chains.ts` (split into helper modules if needed).
- Reuse the StakeKit client from Task 0001; share response typing utilities.
- Cache high-read endpoints (networks, tokens, protocols) in-memory for 5 minutes to reduce API load.
- Ensure parameter validation (Zod). Provide user-friendly error messages for invalid or missing identifiers.
- Always include `source` metadata indicating which upstream host returned the payload.

## Tools

### 1. `list-supported-chains`
- **Endpoint**: `GET /networks`
- **Arguments**: `{ category?: 'evm' | 'cosmos' | 'substrate' | string, includeTestnets?: boolean }`
- **Response**: Array of `{ id, name, category, isTestnet, logoUrl, nativeToken, explorerUrl }` plus summary counts.
- **Edge Cases**: Filter out deprecated networks; include `deprecationReason` when flagged by API.

### 2. `get-chain-details`
- **Endpoint**: `GET /networks/{networkId}` (if not available, derive by filtering list response).
- **Arguments**: `{ networkId: string }`
- **Response**: `{ id, name, category, blockTime, finality, gasToken, notableYields: [...] }`
- **Notes**: Compose `notableYields` by calling `/yields?network={id}` and selecting top 3 by APY (reuse logic from Task 0002).

### 3. `list-supported-tokens`
- **Endpoint**: `GET /tokens`
- **Arguments**: `{ networkId?: string, symbol?: string, limit?: number }`
- **Response**: Array of `{ id, symbol, name, networks: [...], decimals, priceUsd, tags }`.
- **Notes**: Deduplicate tokens across networks; include aggregated `networks` array.

### 4. `get-token-details`
- **Endpoint**: `GET /tokens/{tokenId}` or filter list fallback.
- **Arguments**: `{ tokenId?: string, symbol?: string, networkId?: string }` (at least one identifier required).
- **Response**: Detailed token object with `description`, `contractAddress`, `marketData`, `supportedYields` (top 5 by APY using Task 0002 helper).
- **Notes**: Validate that exactly one of `tokenId` or `symbol` is supplied; allow optional network scope for symbol disambiguation.

### 5. `list-protocols`
- **Endpoint**: `GET /protocols`
- **Arguments**: `{ category?: string, chain?: string }`
- **Response**: Array of `{ id, name, category, networks, tvlUsd, website, description }`.
- **Notes**: Provide derived fields `primaryChain` and `yieldCount` by correlating with yields endpoint.

### 6. `get-protocol-details`
- **Endpoint**: `GET /protocols/{protocolId}` (fallback to filtering list).
- **Arguments**: `{ protocolId: string }`
- **Response**: `{ id, name, description, website, networks, yields: [...], audits: [...], riskFactors: [...] }`
- **Notes**: Use yields helper to fetch associated yield IDs, include aggregated APY statistics (min/max/median).

## Testing Strategy
- Unit tests for parameter schema validation.
- Mocked HTTP tests verifying caching and fallback logic.
- Live smoke test hitting `list-supported-chains` and `get-token-details` (guarded by env flag).
- Document stdio commands mirroring Task 0002 style.

## Documentation
- Update README with new tool descriptions and sample outputs.
- Expand `docs/API_DATA_GAP_ANALYSIS.md` with any discrepancies discovered.
- Capture test transcripts in `docs/YIELD_API_TESTING_RESULTS.md`.
