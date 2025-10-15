# Discover Yields

Yield.xyz enables you to discover and explore yield opportunities across 80+ networks and protocols — from native staking and restaking to lending, liquid staking, vaults, and RWA strategies. Each opportunity is represented by a normalized `YieldDto`, making it easy to render, validate, and execute complete yield flows across chains.

---

## When to Use This

Use this endpoint to fetch a list of all supported yield opportunities, or to query metadata for a specific one. This is the entry point for displaying a user-facing yield feed, validator selector, or opportunity details in your app.

---

## Overview

- Endpoint: `GET /v1/yields`
- Filters: `network`, `token`, `inputToken`, `provider`
- Response type: `YieldDto[]`
- Core components: reward data, validator info, supported actions, argument schemas, lifecycle settings

Each yield returned includes full metadata and behavior: token definitions, rewards logic, argument schemas, fee structure, validator support, and execution availability.

---

## Core Concepts

### Key Fields

- `id`: canonical yield identifier (used in actions and balances)
- `network`: the chain this yield belongs to
- `token`: the underlying token (e.g. ETH, ATOM, SOL)
- `inputTokens`: accepted tokens for entering (e.g. for Smart Routing)
- `outputToken`: optional — what the user receives (e.g. stETH, vault shares)
- `status.enter` / `status.exit`: whether the yield is currently active
- `metadata`: includes name, description, logoURI, and documentation link
- `rewardRate`: shows current APY or APR estimate, broken down by source
- `providerId`: groups yields by protocol (e.g. Lido, Aave, Morpho)

---

## Usage Flow

1. Call `GET /v1/yields`

2. Filter the results (by network, token, inputToken, or provider)

3. Render cards or rows with:
   - `metadata.name`, `logoURI`
   - `rewardRate.total`, `rateType`
   - Token symbol(s) from `token` and `inputTokens`
   - Conditional CTA if `status.enter = true`

4. For validator-specific yields, fetch additional data via `GET /v1/yields/{yieldId}/validators`

---

## Argument Schemas

Each yield includes schema-driven arguments under:

- `mechanics.arguments.enter`
- `mechanics.arguments.exit`
- `mechanics.arguments.balance`

These schemas tell you exactly what to ask for — whether it's an `amount`, a `validatorAddress`, or a `cosmosPubKey`. Use this to dynamically generate forms and validate user input.

---

## Reward Rates and Validators

- `rewardRate.total` provides an estimated return (APR or APY)
- `rewardRate.components[]` breaks this down by source (staking, incentive, MEV, points)
- Validator-based yields have a `validators[]` endpoint with per-validator APR, commission, and stake data

Use this to build validator selectors or show performance comparisons across providers.

---

## Additional Metadata

- `entryLimits.minimum` / `maximum`: for UX guardrails
- `mechanics.cooldownPeriod`, `withdrawPeriod`, `warmupPeriod`: for modeling lifecycle
- `mechanics.fee`: shows any deposit, withdrawal, or performance fees
- `statistics`: TVL, user count, and average position size (optional)
- `tags[]`: useful for custom filters or categorization

---

## Schema-First Design

All yields are schema-driven. You don't need to hardcode validator dropdowns, amount fields, or Cosmos-specific logic. Just use the provided schemas to drive dynamic forms, validation, and execution logic.

---

## Summary

- Use `GET /v1/yields` to populate your yield feed
- Filter by chain, token, or provider
- Each `YieldDto` includes everything needed to render, validate, and submit an action
- For native staking, query validators separately
- Combine with `/balances` and `/actions` to create full lifecycle integrations

See API Reference for complete field-level details.
