# Actions

The Yield.xyz Actions turns complex yield workflows into simple, intent-based operations. Whether you're staking, exiting, claiming rewards, or redelegating, the API returns fully constructed transactions — ready for you to sign and submit.

---

## When to Use This

Use this when you want to initiate or manage a yield position through a single, declarative API.
Whether you're building a wallet, agent, or yield aggregator — Actions let you abstract protocol logic without writing custom transaction flows.

---

## Overview

- Actions are intent-based: `enter`, `exit`, or `manage`
- Returns fully constructed transactions via `ActionDto`
- All inputs are schema-driven
- Signing and execution remain self-custodial

---

## Core Concepts

### Supported Intents

- `enter`: create a position (e.g. stake, lend, deposit)
- `exit`: unwind a position (e.g. unstake, withdraw)
- `manage`: follow-up actions (e.g. claim, restake, redelegate)

### DTOs Involved

- `ActionDto`: includes transaction steps, arguments, metadata
- `TransactionDto[]`: unsigned transactions, gas estimates, decoded content

### Schema-Driven UX

Each action exposes a formal schema under `mechanics.arguments`, which defines:

- Field names and types (e.g. string, number, enum)
- Which fields are required vs optional
- Dynamic references for validator lists
- Nested structures like `additionalAddresses`

This was intentionally designed so that you can generate dynamic forms in your frontend directly from the schema — no hardcoded fields required. Think of it as form-level introspection: all fields, types, and UI labels are part of the contract.

---

## Typical Flow

### 1. Fetch the Action Schema

Use `GET /v1/yields/{yieldId}` to retrieve required arguments for each action under `mechanics.arguments.enter`, `exit`.

This schema defines:

- Required fields like `amount`, `validatorAddress`, etc.
- Optional fields like `additionalAddresses.cosmosPubKey` (used by Cosmos, Tezos, etc.)
- Supported formats (address, number, options, dynamic refs)

You must read the schema before calling an action to pass the correct input.

---

### 2. Declare the Intent

Call one of:

- `POST /v1/actions/enter`
- `POST /v1/actions/exit`
- `POST /v1/actions/manage`

Each call requires:

- `yieldId`: ID of the yield opportunity
- `address`: user's wallet address
- `arguments`: schema-compliant input,
- `passthrough`: (optional) if `manage`
- `action`: (optional) if `manage`

Example: Redelegating to a new validator

- Intent: `manage`
- Action: `REDELEGATE`
- Includes `passthrough` from balances + new `validatorAddress`

---

### 3. Handle the Response

Each action returns:

- A list of transactions (`TransactionDto[]`)
- Metadata and status tracking
- Raw and annotated arguments

#### Transaction Details

Each transaction includes:

- `title`, `type`, `network`, `stepIndex`
- `unsignedTransaction`: raw data to sign
- `annotatedTransaction`: decoded method + args (e.g., `stake`, `validatorAddress`)
- `structuredTransaction`: full structured version (useful for simulations or MPCs)
- Optional: `gasEstimate`, `explorerUrl`, `description`, `isMessage`

Transactions are stateless and can be regenerated anytime using the same input.

---

### 4. Sign and Broadcast

Use any signing infrastructure:

- Yield.xyz SDK (`"@stakekit/signers"`)
- Native SDKs (ethers, cosmjs, solana/web3.js)
- Smart wallets (Safe)
- Hardware wallets or institutional custody

The API never signs or submits transactions — this is entirely in your control.

---

## Managing Positions

Use the `manage` intent to perform post-entry actions like:

- `CLAIM_REWARDS`
- `RESTAKE_REWARDS`
- `REDELEGATE` (e.g. switch validators)

You must retrieve the pending action payload via:

`GET /v1/yields/{yieldId}/balances`

This gives you:

- The `passthrough` blob
- Optional schema (`arguments`) for things like new validator selection

Use this data to construct your `POST /v1/actions/manage` request.

---

## Notes on Additional Context

Some chains require extra fields like `cosmosPubKey`. These are exposed in the `mechanics.arguments` schema under `additionalAddresses`.

If you use the SDK, these fields are handled automatically.

---

## Summary

- All actions are schema-first: no hardcoded fields
- The API builds full transaction flows — you sign and submit
- `enter`, `exit`, and `manage` cover all yield lifecycle needs
- Validator selection, cooldown logic, and approvals are fully abstracted
- Self-custody and signer flexibility are preserved

➡️ Explore API Reference for full schema and action details.
