# Balances

Yield.xyz provides normalized, lifecycle-aware balance endpoints that show a user's full portfolio of yield positions — across staking, lending, vaults, restaking, and more. Balances represent the complete lifecycle of a yield position, from deposit and activation to cooldown, claimable rewards, and locked states.

---

## When to Use This

Use balances to display current user positions, show pending rewards, detect claimable or withdrawable amounts, and surface next possible actions. These endpoints are critical for any wallet, explorer, or agent needing real-time visibility into yield positions.

---

## Overview

- Fetch balances for a specific yield:
  - `GET /v1/yields/{yieldId}/balances?address={wallet}`

- Fetch balances across all yields and networks:
  - `POST /v1/yields/balances`

Returns one or more `BalanceDto` objects per yield, showing:

- Token amount + USD equivalent
- Lifecycle status (active, exiting, claimable, etc.)
- Associated validator(s)
- Pending actions

---

## Core Concepts

### Key Fields

- `address`: wallet that owns this position
- `type`: balance status (see lifecycle below)
- `amount`: formatted value in token units
- `amountRaw`: base unit value
- `amountUsd`: approximate USD value
- `token`: asset metadata (symbol, decimals, network, etc.)
- `validator` / `validators`: staking validator(s), if applicable
- `pendingActions`: available follow-up flows (claim, restake, redelegate)
- `isEarning`: whether this position is currently generating yield

---

## Balance Lifecycle

The `type` field indicates what state the balance is in:

- `active`: currently staked or deployed and earning yield
- `entering`: deposit is in progress or awaiting confirmation
- `exiting`: unstaking or in cooldown period
- `withdrawable`: ready to withdraw after cooldown
- `claimable`: accumulated rewards
- `locked`: subject to vesting or protocol restrictions

Only `active` balances are considered yield-generating.

---

## Pending Actions

Balances may include one or more `pendingActions`. These are server-detected follow-ups based on the position's state and the yield's mechanics.

Examples include:

- `CLAIM_REWARDS`
- `RESTAKE_REWARDS`
- `REDELEGATE`
- `WITHDRAW`

Each pending action includes:

- `type`: the action type
- `passthrough`: opaque server-generated string required for execution
- `arguments`: optional schema for user input (e.g. selecting a validator)

To act on a pending action, call `POST /v1/actions/manage`, passing the:

- `yieldId`
- `address`
- `action` type
- `passthrough`
- `arguments` (and any user inputs like validator address)

---

## Example: Redelegation

1. Fetch balances with `GET /v1/yields/{yieldId}/balances`

2. Find a pending action with `type = REDELEGATE`

3. Call `POST /v1/actions/manage` with:
   - `passthrough` from the pending action
   - New `validatorAddress` under `arguments`

The response will include a fully constructed set of transactions to sign.

---

## Schema-First Design

All pending actions include argument schemas so you can dynamically build forms or dropdowns without hardcoding input fields. Fields like `amount`, `validatorAddress`, or `cosmosPubKey` are clearly defined in the schema.

---

## Summary

- Balances reflect all stages of a yield position across protocols and chains
- Each item includes lifecycle state, token metadata, validator info, and pending actions
- Use `pendingActions` to surface follow-ups like claim, withdraw, or redelegate
- All inputs are schema-driven and standardized
- Fully compatible with any signing infra or frontend

See the Core Concepts and API Reference for complete DTO structure and examples.
