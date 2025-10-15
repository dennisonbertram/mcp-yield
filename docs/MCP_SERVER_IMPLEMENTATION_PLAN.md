# MCP Yield Server - Comprehensive Implementation Plan

**Version:** 1.0
**Date:** 2025-10-15
**Status:** Ready for Implementation
**Validation:** ✅ Cross-checked with Context7 (MCP SDK + Yield.xyz API)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Jobs to Be Done Analysis](#jobs-to-be-done-analysis)
4. [Tool Design - Basic Mode](#tool-design---basic-mode-13-tools)
5. [Tool Design - Advanced Mode](#tool-design---advanced-mode-12-tools)
6. [MCP Resources](#mcp-resources-6-dynamic-resources)
7. [MCP Prompts](#mcp-prompts-5-guided-workflows)
8. [Project Structure](#project-structure)
9. [Technology Stack](#technology-stack)
10. [TDD Strategy](#tdd-strategy)
11. [Implementation Phases](#implementation-phases)
12. [Configuration](#configuration)
13. [Validation & Verification](#validation--verification)
14. [Success Criteria](#success-criteria)
15. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

Build a modern, production-ready Model Context Protocol (MCP) server for Yield.xyz that exposes **user-focused tools** representing complete workflows rather than raw API wrappers. The server will support both stdio (local/Claude Desktop) and HTTP (web) transports, follow strict TDD principles, and provide an optional advanced mode for power users.

### Key Philosophy

**"Jobs to be Done"** - Design tools around what users want to accomplish, not what the API endpoints are called.

**Example:**
- ❌ Bad: `api-post-actions-enter` (API-focused)
- ✅ Good: `prepare-stake` (user intention-focused)

### Core Metrics

- **13 Basic Mode Tools** (user workflows)
- **12 Advanced Mode Tools** (API surface, optional)
- **6 Dynamic Resources** (contextual data)
- **5 Guided Prompts** (complex workflows)
- **2 Transports** (stdio + HTTP)
- **80%+ Test Coverage** (TDD approach)

---

## Architecture Philosophy

### Design Principles

1. **User-Centric**: Tools represent user goals, not API endpoints
2. **Progressive Disclosure**: Basic mode (simple), Advanced mode (power users)
3. **Self-Documenting**: Clear titles, descriptions, structured schemas
4. **Fail-Safe**: Robust error handling, validation, helpful error messages
5. **Performance**: Intelligent caching, batch operations where possible
6. **Testability**: TDD from day one, comprehensive test coverage

### NOT Just an API Wrapper

This server is **NOT**:
- A 1:1 mapping of API endpoints to tools ❌
- A simple proxy layer ❌
- An unvalidated pass-through ❌

This server **IS**:
- A thoughtful abstraction layer ✅
- A workflow orchestrator ✅
- A user experience enhancement ✅
- A validated, intelligent intermediary ✅

---

## Jobs to Be Done Analysis

### Validated User Journeys (from Yield.xyz API research)

#### Journey 1: Discovery & Exploration
**User Goal:** "I want to find the best yield opportunity for my assets"

**Current Pain Points:**
- Too many options across 90+ networks
- Hard to compare APYs, risks, requirements
- Complex metadata (cooldowns, fees, validators)

**Our Solution:**
- `discover-yields` - Smart filtering + sorting
- `compare-yields` - Side-by-side comparison
- `explain-yield` - Plain English explanations

#### Journey 2: Position Entry
**User Goal:** "I want to stake my tokens safely"

**Current Pain Points:**
- Complex multi-step processes
- Validator selection confusion
- Gas cost uncertainty
- Transaction construction complexity

**Our Solution:**
- `prepare-stake` - One-command entry workflow
- `find-validators` - Smart validator recommendations
- `estimate-costs` - Complete cost breakdown
- Auto-constructs ready-to-sign transactions

#### Journey 3: Portfolio Management
**User Goal:** "I want to track my investments"

**Current Pain Points:**
- Positions scattered across networks
- Unclear earning status
- Pending actions hidden in API responses

**Our Solution:**
- `check-my-positions` - Unified portfolio view
- `check-my-balances` - Complete balance snapshot
- `check-my-earnings` - Performance tracking

#### Journey 4: Position Exit
**User Goal:** "I want to unstake my tokens"

**Current Pain Points:**
- Cooldown periods unclear
- Multi-step exit processes (unstake → withdraw)
- Pending action management

**Our Solution:**
- `prepare-unstake` - Complete exit workflow
- Auto-detects pending actions (WITHDRAW, etc.)
- Clear cooldown warnings

#### Journey 5: Research & Planning
**User Goal:** "I want to understand before committing"

**Current Pain Points:**
- Historical data scattered
- Return projections unclear
- Risk assessment difficult

**Our Solution:**
- `analyze-yield-history` - APY trends, volatility
- `calculate-returns` - "What if" scenarios
- Resource-based deep-dives

---

## Tool Design - Basic Mode (13 Tools)

### Category 1: Discovery & Information (4 tools)

#### Tool 1: `discover-yields`

**Job**: Help a user quickly surface viable opportunities that fit simple filters (token, network, APY).

**Input Schema** (Zod):
```typescript
{
  token: z.string().optional().describe('Filter by underlying token symbol (e.g., ETH, AVAX)'),
  network: z.string().optional().describe('Filter by Yield.xyz network id (e.g., ethereum, avalanche-c)'),
  minApy: z.number().optional().describe('Minimum APY as a percentage (e.g., 4.5 for 4.5%)'),
  yieldType: z.enum(['liquid-staking', 'native-staking', 'lending', 'vault', 'restaking']).optional(),
  limit: z.number().min(1).max(50).default(10)
}
```

**Output Schema**:
```typescript
{
  total: z.number(),
  yields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    network: z.string(),
    type: z.string(),
    apy: z.number(),
    rewardType: z.string(),
    cooldownDays: z.number().nullable(),
    minAmount: z.string().nullable().describe('Minimum entry amount in native units, if provided'),
    providerName: z.string().nullable(),
    supportsExit: z.boolean(),
    highlighted: z.boolean(),
    warnings: z.array(z.string())
  })),
  topPick: z.string().optional().describe('Yield id selected by scoring heuristic'),
  notes: z.array(z.string())
}
```

**Smart Features**:
- Normalises responses from both `https://api.stakek.it/v1/yields` (returns `{ data: [...] }`) and `https://api.yield.xyz/v1/yields` (returns `{ items: [...] }`).
- Highlights the top three APY opportunities after filters and designates a `topPick` using a transparent scoring heuristic (`apy`, cooldown penalty, fee penalty, minimum amount penalty).
- Generates `warnings` from factual metadata, e.g. cooldown > 7 days, minimum amount > 1 token, entry disabled.
- Returns `notes` describing applied filters and whether the project account is missing any yields because of enablement constraints.

**API Mapping**: `GET /v1/yields` with optional `network`, `token`, and `type` query params. Falls back to client-side filtering when the API host does not expose dedicated filters.

---

#### Tool 2: `compare-yields`

**Job**: Provide a side-by-side view for a shortlist so the user can decide which opportunity best fits their constraints.

**Input Schema**:
```typescript
{
  yieldIds: z.array(z.string()).min(2).max(5),
  focus: z.enum(['apy', 'liquidity', 'cooldown']).default('apy')
}
```

**Output Schema**:
```typescript
{
  comparison: z.array(z.object({
    yieldId: z.string(),
    name: z.string(),
    network: z.string(),
    providerName: z.string().nullable(),
    apy: z.number(),
    rewardType: z.string(),
    cooldownDays: z.number().nullable(),
    minAmount: z.string().nullable(),
    supportsExit: z.boolean(),
    gasToken: z.string().nullable(),
    feeSummary: z.object({
      depositFee: z.boolean(),
      managementFee: z.boolean(),
      performanceFee: z.boolean()
    }),
    warnings: z.array(z.string())
  })),
  recommendation: z.string(),
  rationale: z.array(z.string())
}
```

**Smart Features**:
- Fetches each yield via `GET /v1/yields/{yieldId}` to ensure the latest APY/metadata.
- Builds `feeSummary` from `metadata.fee` and `feeConfigurations`.
- Generates objective `warnings` (e.g., "Exit currently disabled", "Cooldown 15 days").
- Forms a natural-language `recommendation` with supporting bullet `rationale` referencing the comparison focus.

**API Mapping**: `GET /v1/yields/{yieldId}` for each id. If the project key lacks access, the tool surfaces an actionable warning instead of failing.

---

#### Tool 3: `explain-yield`

**Job**: Translate raw yield metadata into a user-readable briefing.

**Input Schema**:
```typescript
{
  yieldId: z.string()
}
```

**Output Schema**:
```typescript
{
  summary: z.string(),
  keyFacts: z.object({
    network: z.string(),
    type: z.string(),
    apy: z.number(),
    rewardSchedule: z.string().nullable(),
    cooldownDays: z.number().nullable(),
    warmupDays: z.number().nullable(),
    withdrawDays: z.number().nullable(),
    supportsExit: z.boolean(),
    supportsLedger: z.boolean().nullable()
  }),
  requirements: z.object({
    minAmount: z.string().nullable(),
    requiredArguments: z.array(z.string())
  }),
  fees: z.object({
    depositFee: z.boolean(),
    managementFee: z.boolean(),
    performanceFee: z.boolean()
  }),
  gasToken: z.string().nullable(),
  rewardTokens: z.array(z.string()),
  warnings: z.array(z.string()),
  documentation: z.string().nullable()
}
```

**Smart Features**:
- Parses `args.enter.args` schemas to list required arguments (`amount`, `validatorAddress`, etc.).
- Derives human text for warmup/cooldown (e.g., "Withdrawals available after 5 days").
- Emits warnings for missing exit path, high minimums, or unsupported Ledger flows.
- Uses documentation URL from metadata when present.

**API Mapping**: `GET /v1/yields/{yieldId}`.

---

#### Tool 4: `find-validators`

**Job**: Help the user choose a validator when a yield supports delegation choices.

**Input Schema**:
```typescript
{
  yieldId: z.string().describe('Yield to inspect; must support validators'),
  preferredOnly: z.boolean().default(false)
}
```

**Output Schema**:
```typescript
{
  validators: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    address: z.string(),
    network: z.string(),
    apr: z.number().nullable(),
    commission: z.number().nullable(),
    isPreferred: z.boolean().optional(),
    status: z.string().nullable(),
    totalStake: z.string().nullable(),
    notes: z.array(z.string())
  })),
  summary: z.string(),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Calls `GET /v1/yields/{yieldId}/validators`. When the API returns 400 (integration without multiple validators), the tool returns an empty list plus a limitation note instead of an error.
- Automatically filters for preferred validators when `preferredOnly=true`.
- Adds notes for high commission (>10%) or inactive status.

**API Mapping**: `GET /v1/yields/{yieldId}/validators`. Falls back to `GET /v1/yields/validators?preferredValidatorsOnly=true` when available in future releases.

---

### Category 2: Portfolio & Monitoring (3 tools)

#### Tool 5: `check-my-positions`

**Job**: Provide a consolidated view of a wallet’s active and pending yield positions.

**Input Schema**:
```typescript
{
  walletAddress: z.string().describe('Checksum or bech32 address supported by Yield.xyz'),
  networks: z.array(z.string()).optional().describe('Optional list of network ids to limit results')
}
```

**Output Schema**:
```typescript
{
  positions: z.array(z.object({
    yieldId: z.string(),
    yieldName: z.string(),
    network: z.string(),
    status: z.enum(['active', 'entering', 'exiting', 'withdrawable', 'claimable', 'locked', 'unknown']),
    amount: z.string(),
    amountUsd: z.number().nullable(),
    isEarning: z.boolean(),
    lastUpdated: z.string(),
    pendingActions: z.array(z.object({
      type: z.string(),
      passthrough: z.string(),
      description: z.string()
    })),
    notes: z.array(z.string())
  })),
  totals: z.object({
    valueUsd: z.number().nullable(),
    earningPositions: z.number(),
    pendingActions: z.number()
  }),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Uses `POST /v1/yields/balances` with the address list. If the project is not enabled for a yield, the tool records a limitation instead of failing (observed 400 response).
- Derives `status` from the API’s `type` field and normalises unknown states.
- Converts pending action metadata into actionable descriptions for follow-up tools (`prepare-unstake`, `manage`).

**API Mapping**: `POST /v1/yields/balances` with `{ addresses: [walletAddress], networks? }`. Optionally supplements with `GET /v1/yields/{id}/balances` when the aggregate endpoint is unavailable.

---

#### Tool 6: `check-my-balances`

**Job**: Show a categorized balance breakdown (staked vs rewards vs available).

**Input Schema**:
```typescript
{
  walletAddress: z.string(),
  networks: z.array(z.string()).optional(),
  includeRewards: z.boolean().default(true)
}
```

**Output Schema**:
```typescript
{
  balances: z.array(z.object({
    category: z.enum(['staked', 'rewards', 'available', 'pending', 'unknown']),
    amount: z.string(),
    amountUsd: z.number().nullable(),
    tokenSymbol: z.string(),
    network: z.string(),
    yieldId: z.string().nullable(),
    isEarning: z.boolean(),
    notes: z.array(z.string())
  })),
  summary: z.object({
    totalUsd: z.number().nullable(),
    earningUsd: z.number().nullable(),
    rewardsUsd: z.number().nullable()
  }),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Re-uses the balances endpoint and groups rows by `type` to produce categories.
- When USD valuations are missing, annotates the row instead of zeroing it out.
- If the API rejects the request for project enablement reasons, the tool reports a limitation and returns an empty list.

**API Mapping**: `POST /v1/yields/balances`. Optionally supplements with `POST /v1/tokens/prices` for USD conversion when the account is allowed.

---

#### Tool 7: `check-my-earnings`

**Job**: Highlight accumulated rewards and estimate simple ROI using available data.

**Input Schema**:
```typescript
{
  walletAddress: z.string(),
  includeEstimatedRoi: z.boolean().default(true)
}
```

**Output Schema**:
```typescript
{
  earnings: z.array(z.object({
    yieldId: z.string(),
    yieldName: z.string(),
    rewardsAmount: z.string(),
    rewardsUsd: z.number().nullable(),
    estimatedRoi: z.number().nullable().describe('Percentage, derived from rewards vs current staked amount'),
    lastUpdated: z.string(),
    notes: z.array(z.string())
  })),
  totals: z.object({
    rewardsUsd: z.number().nullable()
  }),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Detects reward balances (`type === 'claimable'` or `isEarning=false`) and pairs them with the corresponding staked balance to compute a naive ROI when `includeEstimatedRoi`.
- Flags entries where the computation is approximate (e.g., missing USD price, missing staked baseline).

**API Mapping**: Same balance endpoints as above; all calculations are performed client-side.

---

### Category 3: Execution & Follow-up (4 tools)

#### Tool 8: `prepare-stake`

**Job**: Take a user intent (“stake X token”) and return the unsigned transactions plus guidance to execute safely.

**Input Schema**:
```typescript
{
  yieldId: z.string().optional(),
  token: z.string().optional(),
  network: z.string().optional(),
  amount: z.string().describe('Amount in human-readable units'),
  walletAddress: z.string().describe('Wallet that will sign the transactions'),
  validatorAddress: z.string().optional(),
  autoSelect: z.boolean().default(true)
}
```

**Output Schema**:
```typescript
{
  actionId: z.string(),
  selectedYield: z.object({
    id: z.string(),
    name: z.string(),
    network: z.string(),
    apy: z.number()
  }),
  transactions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    unsignedTransaction: z.string().describe('Hex payload to sign'),
    network: z.string(),
    gasEstimate: z.object({
      amount: z.string(),
      token: z.string()
    }).optional(),
    structuredTransaction: z.record(z.unknown()).optional()
  })),
  nextSteps: z.array(z.string()),
  guidance: z.array(z.string()),
  warnings: z.array(z.string())
}
```

**Smart Features**:
- Locates the best matching yield when `yieldId` is omitted by reusing the scoring helper from `discover-yields`.
- Builds the payload for `POST /v1/actions/enter` (`{ yieldId, address, arguments }`) using the `args.enter` schema to supply validator or routing arguments when required.
- Extracts unsigned transactions and explains how to broadcast them (direct submission vs `submit-hash`), including a reminder to poll `GET /v1/actions/{actionId}` for status.
- Adds warnings when exit is disabled or when the API indicates multi-step flows.

**API Mapping**:
1. `POST /v1/actions/enter`
2. Optional follow-up `GET /v1/actions/{actionId}` to confirm status.

---

#### Tool 9: `prepare-unstake`

**Job**: Orchestrate the unstake flow, including cooldown education and pending actions.

**Input Schema**:
```typescript
{
  yieldId: z.string(),
  walletAddress: z.string(),
  amount: z.string().optional(),
  validatorAddress: z.string().optional()
}
```

**Output Schema**:
```typescript
{
  actionId: z.string(),
  transactions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    unsignedTransaction: z.string(),
    network: z.string(),
    gasEstimate: z.object({ amount: z.string(), token: z.string() }).optional()
  })),
  cooldown: z.object({
    cooldownDays: z.number().nullable(),
    withdrawDays: z.number().nullable(),
    earliestWithdrawal: z.string().nullable()
  }),
  pendingFollowUps: z.array(z.string()),
  warnings: z.array(z.string()),
  nextSteps: z.array(z.string())
}
```

**Smart Features**:
- Uses `POST /v1/actions/exit` with the user input converted into the API’s expected payload.
- Calls `GET /v1/yields/{yieldId}` to communicate accurate cooldown/withdraw periods.
- Surfaces pending follow-up actions (e.g., WITHDRAW) when present in the response.

**API Mapping**: `POST /v1/actions/exit`, followed by optional `GET /v1/actions/{actionId}`.

---

#### Tool 10: `estimate-costs`

**Job**: Give the user a rough cost preview before they initiate a stake/unstake/claim.

**Input Schema**:
```typescript
{
  action: z.enum(['stake', 'unstake', 'claim']),
  yieldId: z.string(),
  amount: z.string(),
  walletAddress: z.string()
}
```

**Output Schema**:
```typescript
{
  estimateAvailable: z.boolean(),
  gas: z.object({ amount: z.string().nullable(), token: z.string().nullable() }),
  protocolFees: z.array(z.object({
    type: z.string(),
    valueBps: z.number().nullable(),
    notes: z.string()
  })),
  assumptions: z.array(z.string()),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Attempts to call `GET /v1/actions/estimate-gas` when supported; when the endpoint returns 404/501, the tool falls back to heuristics using `metadata.gasFeeToken`, `metadata.fee`, and `feeConfigurations`.
- Communicates clearly whether the estimate is authoritative or heuristic (`estimateAvailable`).

**API Mapping**: `GET /v1/actions/estimate-gas` (if enabled) plus `GET /v1/yields/{yieldId}` for fee metadata.

---

#### Tool 11: `track-transaction`

**Job**: Poll an action until completion and summarise remaining work.

**Input Schema**:
```typescript
{
  actionId: z.string(),
  includeTransactions: z.boolean().default(true)
}
```

**Output Schema**:
```typescript
{
  status: z.enum(['created', 'waiting', 'processing', 'success', 'failed', 'stale']),
  completedAt: z.string().nullable(),
  nextPollSeconds: z.number(),
  transactions: z.array(z.object({
    id: z.string(),
    status: z.string(),
    explorerUrl: z.string().nullable(),
    submittedHash: z.string().nullable()
  })).optional(),
  pendingActions: z.array(z.string()),
  notes: z.array(z.string())
}
```

**Smart Features**:
- Calls `GET /v1/actions/{actionId}` and, when needed, follows linked transaction ids with `GET /v1/transactions/{id}`.
- Suggests a polling cadence based on current status.
- Surfaces pending follow-ups when the action reports `WAITING_FOR_NEXT`.

**API Mapping**: `GET /v1/actions/{actionId}` with secondary `GET /v1/transactions/{transactionId}` as required.

---

### Category 4: Planning & Analysis (2 tools)

#### Tool 12: `analyze-yield-history`

**Job**: Provide whatever performance context is available, while gracefully handling missing historical data.

**Input Schema**:
```typescript
{
  yieldId: z.string(),
  lookbackDays: z.number().optional().describe('Preferred window if history is enabled for the account')
}
```

**Output Schema**:
```typescript
{
  historyAvailable: z.boolean(),
  apyHistory: z.array(z.object({ date: z.string(), apy: z.number() })),
  currentApy: z.number(),
  insights: z.array(z.string()),
  limitations: z.array(z.string())
}
```

**Smart Features**:
- Attempts to call an account-specific historic endpoint when enabled (Yield documentation references `/v1/yields/historic-rewards`).
- When the endpoint returns 404/not available (as with the current project key), the tool returns `historyAvailable: false`, includes today’s APY from `GET /v1/yields/{id}`, and adds limitations describing how to enable history with Yield.
- Provides generic insights (e.g., "History unavailable; using current APY 3.2% as proxy").

**API Mapping**: `POST /v1/yields/historic-rewards` when enabled, otherwise `GET /v1/yields/{yieldId}`.

---

#### Tool 13: `calculate-returns`

**Job**: Run basic “what if” projections using the current APY and configurable scenarios.

**Input Schema**:
```typescript
{
  amount: z.number().positive(),
  yieldId: z.string(),
  timeHorizon: z.enum(['30d', '90d', '180d', '1y', '2y']).default('1y'),
  compounding: z.enum(['none', 'monthly', 'continuous']).default('monthly')
}
```

**Output Schema**:
```typescript
{
  projections: z.object({
    base: z.object({ amount: z.string(), apy: z.number(), total: z.string() }),
    optimistic: z.object({ amount: z.string(), apy: z.number(), total: z.string() }),
    conservative: z.object({ amount: z.string(), apy: z.number(), total: z.string() })
  }),
  assumptions: z.array(z.string()),
  caveats: z.array(z.string())
}
```

**Smart Features**:
- Uses the current APY as the base case and adjusts ±10% for optimistic/conservative scenarios.
- Supports compounding frequency conversions.
- Clearly states that the calculation assumes APY stability and ignores protocol-specific penalties.

**API Mapping**: `GET /v1/yields/{yieldId}` for current APY.

---
## Tool Design - Advanced Mode (12 Tools)

**Enabled when `ADVANCED_MODE=true` in environment**

These are thin wrappers around API endpoints for power users who want direct API access:

1. **`api-get-networks`** → `GET /v1/networks`
2. **`api-get-yields`** → `GET /v1/yields`
3. **`api-get-yield-details`** → `GET /v2/yields/{id}`
4. **`api-get-token-prices`** → `POST /v1/tokens/prices`
5. **`api-create-enter-action`** → `POST /v1/actions/enter`
6. **`api-create-exit-action`** → `POST /v1/actions/exit`
7. **`api-create-manage-action`** → `POST /v1/actions/manage`
8. **`api-get-balances`** → `POST /v1/yields/balances`
9. **`api-get-validators`** → `GET /v1/validators`
10. **`api-submit-transaction-hash`** → `PUT /v1/actions/{actionId}/transactions/{index}/hash`
11. **`api-get-transaction-status`** → `GET /v1/transactions/{id}`
12. **`api-estimate-gas`** → Gas estimation endpoints

Each tool:
- Direct parameter pass-through
- Minimal transformation
- Raw API response returned
- Zod validation on inputs/outputs

---

## MCP Resources (6 Dynamic Resources)

Resources deliver pre-fetched or summarised data that Claude can cite while reasoning about the Yield ecosystem. All resources degrade gracefully when an endpoint is unavailable for the configured API key.

### Resource 1: `yield://{yieldId}`

**Purpose**: Provide a structured snapshot of a single yield, suitable for grounding explanations or comparisons.

**URI Template**: `yield://ethereum-eth-lido-staking`

**Content Type**: `application/json`

**Schema**:
```json
{
  "id": "string",
  "name": "string",
  "network": "string",
  "type": "string",
  "apy": "number",
  "rewardType": "string",
  "cooldownDays": "number | null",
  "warmupDays": "number | null",
  "withdrawDays": "number | null",
  "minAmount": "string | null",
  "supportsExit": "boolean",
  "provider": {
    "id": "string | null",
    "name": "string | null",
    "url": "string | null"
  },
  "gasToken": "string | null",
  "rewardTokens": ["string"],
  "documentation": "string | null"
}
```

**Implementation Notes**:
- Calls `GET /v1/yields/{yieldId}` using whichever host (`api.yield.xyz` or `api.stakek.it`) returns data for the project key.
- Normalises the response into the above projection, filling nulls when the upstream omits a field.
- Cached for 5 minutes.

---

### Resource 2: `network://{networkId}`

**Purpose**: Present basic network metadata plus a short list of notable yields.

**URI Template**: `network://ethereum`

**Content Type**: `text/markdown`

**Example Content**:
```markdown
# Ethereum

- Category: evm
- Logo: https://assets.stakek.it/networks/ethereum.svg

## Top Opportunities (by APY)
1. Lido Staked ETH — 3.25% APY
2. Rocket Pool ETH — 3.18% APY
3. Frax Staked ETH — 3.20% APY
```

**Implementation Notes**:
- Fetches core info from `GET /v1/networks` (on `api.yield.xyz`).
- Fetches yields via `GET /v1/yields?network={id}` (calling both hosts and picking the populated response).
- Sorted by APY and limited to the top five entries.
- Cached for 10 minutes.

---

### Resource 3: `validator://{network}/{validatorId}`

**Purpose**: Summarise validator details for networks that expose them.

**URI Template**: `validator://tron/100200` or `validator://cosmos/cosmosvaloper1...`

**Content Type**: `application/json`

**Schema**:
```json
{
  "validatorId": "string",
  "name": "string | null",
  "network": "string",
  "apr": "number | null",
  "commission": "number | null",
  "isPreferred": "boolean | null",
  "status": "string | null",
  "totalStake": "string | null",
  "notes": ["string"],
  "sourceYieldId": "string | null"
}
```

**Implementation Notes**:
- Primary path: `GET /v1/yields/{yieldId}/validators` if the validator is tied to a known yield.
- Fallback: `GET /v1/yields/validators?preferredValidatorsOnly=true` (when enabled) filtered by network/id.
- If the API reports "integration does not support multiple validators", the resource returns a minimal object with a note.
- Cached for 30 minutes (validator performance changes slowly).

---

### Resource 4: `networks://all`

**Purpose**: Provide the raw list of supported networks for quick reference or validation.

**URI**: `networks://all`

**Content Type**: `application/json`

**Payload**:
```json
[
  { "id": "ethereum", "name": "Ethereum", "category": "evm" },
  { "id": "avalanche-c", "name": "Avalanche C-Chain", "category": "evm" },
  ...
]
```

**Implementation Notes**:
- Calls `GET /v1/networks` (must use `api.yield.xyz`).
- Caches for 1 hour.

---

### Resource 5: `yields://top`

**Purpose**: Quickly surface the top-performing yields by APY across the catalogue.

**URI**: `yields://top`

**Content Type**: `application/json`

**Payload**:
```json
{
  "generatedAt": "ISO timestamp",
  "entries": [
    { "id": "ethereum-eth-lido-staking", "name": "Lido Staked ETH", "network": "ethereum", "apy": 0.0325 },
    ... up to 10 entries
  ],
  "notes": ["Data source: GET /v1/yields"]
}
```

**Implementation Notes**:
- Aggregates from the populated host (`api.stakek.it` has data for the current key).
- Sorts by APY descending and slices to the top ten.
- Cached for 5 minutes.

---

### Resource 6: `yields://network/{networkId}`

**Purpose**: Enumerate all available yields on a network with light-weight metadata for prompting.

**URI Template**: `yields://network/polygon`

**Content Type**: `application/json`

**Payload**:
```json
{
  "network": "polygon",
  "generatedAt": "ISO timestamp",
  "items": [
    {
      "id": "polygon-matic-liquid-staking",
      "name": "Lido Staked MATIC",
      "apy": 0.046,
      "supportsExit": true,
      "cooldownDays": 7
    }
  ]
}
```

**Implementation Notes**:
- Calls `GET /v1/yields?network={id}`.
- Adds derived booleans and cooldown days from metadata.
- Cached for 10 minutes.

---
## MCP Prompts (5 Guided Workflows)

Prompts provide **conversational templates** for complex workflows.

### Prompt 1: `stake-tokens`

**Purpose**: Guide user through complete staking flow

**Arguments**:
```typescript
{
  token: z.string(),
  amount: z.number(),
  network: z.string().optional()
}
```

**Message Flow**:
```
User: I want to stake {amount} {token}

Step 1: Finding best yields...
Step 2: Here are your options... [shows yields]
Step 3: Would you like to proceed with [top option]?
Step 4: Do you need help selecting a validator?
Step 5: Preparing transaction...
Step 6: Please sign this transaction...
```

---

### Prompt 2: `find-best-yield`

**Purpose**: Comparative analysis with recommendation

**Arguments**:
```typescript
{
  token: z.string(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional()
}
```

---

### Prompt 3: `exit-position`

**Purpose**: Guide through unstaking process

**Arguments**:
```typescript
{
  yieldId: z.string(),
  amount: z.string().optional()
}
```

---

### Prompt 4: `portfolio-review`

**Purpose**: Comprehensive portfolio analysis

**Arguments**:
```typescript
{
  walletAddress: z.string()
}
```

---

### Prompt 5: `validator-selection`

**Purpose**: Help choose best validator

**Arguments**:
```typescript
{
  network: z.string()
}
```

---

## Project Structure

```
mcp-yield/
├── src/
│   ├── index.ts                    # stdio entry point
│   ├── http.ts                     # HTTP server entry
│   │
│   ├── server/
│   │   ├── McpYieldServer.ts       # Main MCP server class
│   │   ├── config.ts               # Environment/config management
│   │   └── types.ts                # Shared TypeScript types
│   │
│   ├── api/
│   │   ├── YieldAPIClient.ts       # Core API client with caching
│   │   ├── endpoints.ts            # Endpoint definitions
│   │   ├── cache.ts                # Caching layer
│   │   └── types.ts                # API response types
│   │
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── discovery/              # 4 discovery tools
│   │   │   ├── discoverYields.ts
│   │   │   ├── compareYields.ts
│   │   │   ├── explainYield.ts
│   │   │   └── findValidators.ts
│   │   ├── portfolio/              # 3 portfolio tools
│   │   │   ├── checkMyPositions.ts
│   │   │   ├── checkMyBalances.ts
│   │   │   └── checkMyEarnings.ts
│   │   ├── execution/              # 4 execution tools
│   │   │   ├── prepareStake.ts
│   │   │   ├── prepareUnstake.ts
│   │   │   ├── estimateCosts.ts
│   │   │   └── trackTransaction.ts
│   │   ├── analysis/               # 2 analysis tools
│   │   │   ├── analyzeYieldHistory.ts
│   │   │   └── calculateReturns.ts
│   │   └── advanced/               # 12 advanced mode tools
│   │       └── [12 API wrapper tools]
│   │
│   ├── resources/
│   │   ├── index.ts                # Resource registry
│   │   ├── YieldResource.ts        # yield://{id}
│   │   ├── NetworkResource.ts      # network://{id}
│   │   ├── ValidatorResource.ts    # validator://{network}/{address}
│   │   ├── NetworksListResource.ts # networks://all
│   │   ├── TopYieldsResource.ts    # yields://top
│   │   └── NetworkYieldsResource.ts# yields://network/{id}
│   │
│   ├── prompts/
│   │   ├── index.ts                # Prompt registry
│   │   ├── stakeTokens.ts
│   │   ├── findBestYield.ts
│   │   ├── exitPosition.ts
│   │   ├── portfolioReview.ts
│   │   └── validatorSelection.ts
│   │
│   └── utils/
│       ├── formatting.ts           # Output formatting helpers
│       ├── validation.ts           # Zod schema validators
│       ├── errors.ts               # Custom error classes
│       ├── logger.ts               # Structured logging
│       └── cache.ts                # Cache utilities
│
├── tests/
│   ├── unit/
│   │   ├── api/
│   │   ├── tools/
│   │   ├── resources/
│   │   └── utils/
│   ├── integration/
│   │   ├── api-client.test.ts
│   │   └── tool-workflows.test.ts
│   └── e2e/
│       ├── stdio-transport.test.ts
│       └── http-transport.test.ts
│
├── docs/
│   ├── YIELD_API_TESTING_RESULTS.md   # ✅ Existing
│   ├── MCP_SERVER_IMPLEMENTATION_PLAN.md # This document
│   ├── ARCHITECTURE.md                # To create
│   ├── TOOLS_REFERENCE.md             # To create
│   └── README.md                      # To create
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.18.2",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4",
    "tsx": "^4.7.0",
    "@vitest/coverage-v8": "^1.0.4"
  }
}
```

### Rationale

- **MCP SDK**: Official TypeScript implementation
- **Express**: Battle-tested HTTP server
- **Zod**: Runtime type safety + validation
- **Vitest**: Modern, fast testing framework
- **tsx**: Fast TypeScript execution for development

---

## TDD Strategy

### Test Pyramid

```
        E2E (10%)
    Integration (20%)
   Unit Tests (70%)
```

### TDD Cycle (Red-Green-Refactor)

1. **Write failing test** - Define expected behavior
2. **Implement minimum** - Make test pass
3. **Refactor** - Improve code quality
4. **Repeat** - Next feature

### Example Test Structure

```typescript
// tests/unit/tools/discovery/discoverYields.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { discoverYields } from '@/tools/discovery/discoverYields';

describe('discoverYields Tool', () => {
  beforeEach(() => {
    // Mock API client
  });

  it('should filter yields by network', async () => {
    const result = await discoverYields({ network: 'ethereum' });
    expect(result.yields).toHaveLength(5);
    expect(result.yields.every(y => y.network === 'ethereum')).toBe(true);
  });

  it('should sort by APY descending', async () => {
    const result = await discoverYields({});
    const apys = result.yields.map(y => y.apy);
    expect(apys).toEqual([...apys].sort((a, b) => b - a));
  });

  it('should apply minAPY filter correctly', async () => {
    const result = await discoverYields({ minAPY: 5 });
    expect(result.yields.every(y => y.apy >= 5)).toBe(true);
  });

  it('should highlight top 3 yields', async () => {
    const result = await discoverYields({ limit: 10 });
    const highlighted = result.yields.filter(y => y.highlighted);
    expect(highlighted).toHaveLength(3);
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    await expect(discoverYields({})).rejects.toThrow();
  });

  it('should handle empty results', async () => {
    // Mock empty response
    const result = await discoverYields({ network: 'nonexistent' });
    expect(result.yields).toHaveLength(0);
  });
});
```

### Coverage Goals

- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical workflows
- **E2E tests**: Both transports functional

### Test Fixtures

Store in `tests/fixtures/`:
- `yields-response.json` - Sample API responses
- `balances-response.json`
- `validators-response.json`
- Mock wallet addresses
- Test transaction data

---

## Implementation Phases

### Phase 1: Foundation (Week 1) ✅ No dependencies

**Tasks**:

**1.1 Project Setup** (Day 1)
- Initialize TypeScript project
- Configure package.json with scripts
- Set up tsconfig.json (strict mode)
- Create .env.example
- Configure .gitignore
- Set up ESLint + Prettier

**1.2 API Client Core** (Days 2-3)
- Create `YieldAPIClient` class
- Implement authentication (X-API-KEY header)
- Implement dual-host fallback (prefer api.stakek.it for yields, api.yield.xyz for networks with retry)
- Add basic endpoints:
  - `GET /v1/networks`
  - `GET /v1/yields`
  - `GET /v2/yields/{id}`
  - `POST /v1/tokens/prices`
- Write comprehensive unit tests
- Mock API responses for testing

**1.3 Configuration Management** (Day 3)
- Create `config.ts` with environment validation
- Required: `YIELD_API_KEY`
- Optional: `ADVANCED_MODE`, `CACHE_ENABLED`, `LOG_LEVEL`
- Validate on startup
- Write config tests

**1.4 Error Handling** (Day 4)
- Create custom error classes:
  - `YieldAPIError`
  - `ValidationError`
  - `ConfigurationError`
- Implement error wrapping utility
- Add retry logic for transient failures
- Write error handling tests

**1.5 Test Infrastructure** (Day 5)
- Set up Vitest configuration
- Create test fixtures directory
- Implement API mock helpers
- Set up coverage reporting
- Configure CI pipeline (GitHub Actions)

**Deliverables**:
- ✅ Tested API client
- ✅ Config management
- ✅ Error handling framework
- ✅ Test infrastructure
- ✅ CI pipeline running

---

### Phase 2: Core Functionality (Week 2) ✅ Depends on Phase 1

**Tasks**:

**2.1 Discovery Tools** (Days 1-3)
- TDD: `discover-yields`
  - Test filtering by network, token, minAPY
  - Test sorting
  - Test highlighting logic
- TDD: `compare-yields`
  - Test multi-yield fetch
  - Test comparison matrix generation
  - Test recommendation logic
- TDD: `explain-yield`
  - Test plain English formatting
  - Test risk categorization
- TDD: `find-validators`
  - Test sorting options
  - Test preferred validator highlighting

**2.2 Resources** (Days 3-4)
- Implement `ResourceTemplate` usage
- Add in-memory caching layer
- TDD: `yield://{id}` resource
- TDD: `network://{id}` resource
- TDD: `validator://{network}/{address}` resource
- TDD: `networks://all` resource
- TDD: `yields://top` resource
- TDD: `yields://network/{id}` resource

**2.3 Basic Prompts** (Day 5)
- Implement `stake-tokens` prompt
- Implement `find-best-yield` prompt
- Implement `validator-selection` prompt
- Write integration tests

**Deliverables**:
- ✅ 4 discovery tools working
- ✅ 6 resources accessible
- ✅ 3 prompts functional
- ✅ Comprehensive test coverage

---

### Phase 3: Advanced Features (Week 3) ✅ Depends on Phase 2

**Tasks**:

**3.1 Portfolio Tools** (Days 1-2)
- TDD: `check-my-positions`
  - Test aggregation across yields
  - Test value calculations
  - Test pending action detection
- TDD: `check-my-balances`
  - Test balance categorization
  - Test USD valuations
- TDD: `check-my-earnings`
  - Test ROI calculations
  - Test performance analysis

**3.2 Execution Tools** (Days 3-4)
- TDD: `prepare-stake`
  - Test auto-selection logic
  - Test transaction construction
  - Test warnings generation
- TDD: `prepare-unstake`
  - Test cooldown detection
  - Test multi-step exit handling
- TDD: `estimate-costs`
  - Test gas estimation
  - Test fee aggregation
- TDD: `track-transaction`
  - Test status polling
  - Test explorer URL generation

**3.3 Analysis Tools** (Day 5)
- TDD: `analyze-yield-history`
  - Test trend calculation
  - Test volatility analysis
- TDD: `calculate-returns`
  - Test projection scenarios
  - Test assumption documentation

**3.4 Remaining Prompts** (Day 5)
- Implement `exit-position` prompt
- Implement `portfolio-review` prompt

**Deliverables**:
- ✅ All 13 basic mode tools working
- ✅ All 5 prompts functional
- ✅ Integration tests passing

---

### Phase 4: Advanced Mode (Week 4) ✅ Depends on Phase 2 (Optional)

**Tasks**:

**4.1 Advanced API Tools** (Days 1-3)
- Implement conditional registration based on `ADVANCED_MODE`
- TDD: All 12 API wrapper tools
  - Thin wrappers with validation
  - Raw response pass-through
  - Error handling

**4.2 Integration Tests** (Days 4-5)
- Test advanced mode enablement
- Test API wrapper functionality
- Test coexistence with basic mode

**Deliverables**:
- ✅ 12 advanced tools (conditional)
- ✅ Advanced mode tests

---

### Phase 5: Production Readiness (Week 5) ✅ Depends on Phase 3

**Tasks**:

**5.1 stdio Transport** (Days 1-2)
- Implement stdio server in `index.ts`
- Connect McpServer to StdioServerTransport
- E2E tests for stdio communication
- Test with Claude Desktop locally

**5.2 HTTP Transport** (Days 2-3)
- Implement HTTP server in `http.ts`
- Use Express + StreamableHTTPServerTransport
- Add health check endpoint (`/health`)
- Add CORS configuration
- Add rate limiting (optional)
- E2E tests for HTTP

**5.3 Documentation** (Day 4)
- Create `ARCHITECTURE.md`
  - System design
  - Data flow diagrams
  - Component interactions
- Create `TOOLS_REFERENCE.md`
  - All tool documentation
  - Input/output examples
  - Usage patterns
- Create `README.md`
  - Quick start guide
  - Installation
  - Configuration
  - Examples
- Create `API.md` (advanced mode reference)

**5.4 Production Polish** (Day 5)
- Add structured logging throughout
- Performance optimization
  - Caching tuning
  - Batch operations
- Error message improvements
- Security audit
  - Input validation review
  - API key handling
  - CORS configuration
- Final integration testing

**Deliverables**:
- ✅ stdio transport working
- ✅ HTTP transport working
- ✅ Complete documentation
- ✅ Production-ready code
- ✅ Security validated

---

## Configuration

### Environment Variables

**`.env.example`**:
```bash
# ===================================
# REQUIRED
# ===================================
YIELD_API_KEY=your_api_key_here

# ===================================
# OPTIONAL - API Configuration
# ===================================
YIELD_API_BASE_URL=https://api.stakek.it/v1
API_TIMEOUT=30000

# ===================================
# OPTIONAL - Feature Flags
# ===================================
ADVANCED_MODE=false
CACHE_ENABLED=true

# ===================================
# OPTIONAL - Logging
# ===================================
LOG_LEVEL=info

# ===================================
# OPTIONAL - HTTP Transport
# ===================================
PORT=3000
CORS_ORIGIN=*
RATE_LIMIT_ENABLED=false
```

### TypeScript Configuration

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev:stdio": "tsx src/index.ts",
    "dev:http": "tsx src/http.ts",
    "test": "vitest",
    "test:unit": "vitest --dir tests/unit",
    "test:integration": "vitest --dir tests/integration",
    "test:e2e": "vitest --dir tests/e2e",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src",
    "format": "prettier --write src tests",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Validation & Verification

### Pre-Implementation Checklist ✅

- [x] MCP TypeScript SDK patterns reviewed via Context7
- [x] Yield.xyz API capabilities verified via Context7
- [x] API endpoints tested with curl (see YIELD_API_TESTING_RESULTS.md)
- [x] Tool designs validated against MCP best practices
- [x] Resource templates match MCP specification
- [x] Project structure follows TypeScript conventions
- [x] TDD approach aligned with best practices
- [x] Phase dependencies clearly defined

### Key Validations Performed

1. **MCP SDK Patterns** ✅
   - `registerTool` with Zod schemas confirmed
   - `inputSchema` and `outputSchema` pattern validated
   - `structuredContent` + `content` response format verified
   - Resource templates (`ResourceTemplate`) confirmed
   - Prompt registration pattern validated

2. **Yield.xyz API** ✅
   - All endpoint patterns verified from documentation
   - Authentication method confirmed (X-API-KEY header)
   - Response structures documented
   - Balance lifecycle understood
   - Action workflow (enter/exit/manage) validated
   - Pending actions pattern understood

3. **Integration Points** ✅
   - API endpoints mapped to tool implementations
   - Resource URIs designed per MCP spec
   - Prompt argument schemas defined
   - Error handling patterns established

---

## Success Criteria

### Functional Requirements ✅

- [ ] All 13 basic mode tools functional
- [ ] All 6 resources accessible
- [ ] All 5 prompts working
- [ ] stdio transport operational
- [ ] HTTP transport operational
- [ ] Advanced mode toggleable (12 tools)

### Quality Requirements ✅

- [ ] 80%+ test coverage
- [ ] All tests passing
- [ ] No type errors
- [ ] Linting passing
- [ ] Documentation complete

### Integration Requirements ✅

- [ ] Works with Claude Desktop (stdio)
- [ ] Works via HTTP requests
- [ ] API key authentication working
- [ ] Error messages helpful
- [ ] Caching functional

### User Experience Requirements ✅

- [ ] Tool names intuitive
- [ ] Input schemas self-documenting
- [ ] Output clear and actionable
- [ ] Errors guide to resolution
- [ ] Resources provide context

---

## Risk Mitigation

### Risk 1: API Changes
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Comprehensive error handling
- Version-specific API client
- Graceful degradation
- Extensive caching

### Risk 2: Rate Limiting
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Implement caching aggressively
- Batch operations where possible
- Exponential backoff
- Cache TTLs tuned appropriately

### Risk 3: Complex Transaction Construction
**Probability**: Low
**Impact**: Medium
**Mitigation**:
- Start with simple flows (Lido, liquid staking)
- Add complexity incrementally
- Extensive testing with mock data
- Clear error messages for unsupported cases

### Risk 4: Testing Async Operations
**Probability**: Low
**Impact**: Low
**Mitigation**:
- Comprehensive API mocking
- Separate unit from integration tests
- Use test fixtures extensively
- Mock time-dependent operations

### Risk 5: Schema Changes
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Zod runtime validation catches changes
- Integration tests detect breaking changes
- Version API client separately
- Monitor API changelog

---

## Timeline Summary

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|--------------|-------------|
| Phase 1 | 5 days | None | Foundation + API client |
| Phase 2 | 7 days | Phase 1 | Core tools + resources |
| Phase 3 | 7 days | Phase 2 | Full basic mode |
| Phase 4 | 5 days | Phase 2 | Advanced mode (optional) |
| Phase 5 | 6 days | Phase 3 | Production ready |

**Total**: 4-5 weeks for complete implementation

---

## Next Steps

### Immediate Actions

1. **Review & Approve Plan**
   - Stakeholder review
   - Technical review
   - Approve to proceed

2. **Repository Setup**
   - Create feature branch: `feature/mcp-yield-server`
   - Initialize project structure
   - Set up CI/CD pipeline

3. **Phase 1 Kickoff**
   - Task 1.1: Project setup
   - Task 1.2: API client core
   - Follow TDD strictly

### Development Workflow

1. **Daily**:
   - Write tests first (TDD)
   - Implement to pass tests
   - Commit frequently (atomic commits)
   - Update documentation

2. **Weekly**:
   - Review progress against plan
   - Adjust timeline if needed
   - Demo working features
   - Gather feedback

3. **Phase Completion**:
   - All tests passing
   - Documentation updated
   - Code review completed
   - Demo to stakeholders

---

## Appendix

### References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Yield.xyz API Documentation](https://docs.yield.xyz)
- [API Testing Results](./YIELD_API_TESTING_RESULTS.md)
- [Zod Documentation](https://zod.dev)

### Glossary

- **MCP**: Model Context Protocol
- **Tool**: Executable function exposed to LLM
- **Resource**: Contextual data referenced by URI
- **Prompt**: Conversational template for workflows
- **Transport**: Communication layer (stdio or HTTP)
- **Advanced Mode**: Power user feature exposing raw API

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-15 | Initial plan - comprehensive review completed |

---

**Plan Status**: ✅ Ready for Implementation
**Review Status**: ✅ Validated against Context7 + API Testing
**Approval**: Pending stakeholder sign-off
