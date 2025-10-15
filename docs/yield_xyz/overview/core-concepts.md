# Core Concepts

**Yield.xyz's API** is your gateway to the full spectrum of on-chain yield — from native staking on Ethereum and Cosmos, to liquid staking via Lido, restaking, RWA yields, DeFi lending with Morpho and Aave, and other opportunities across 80+ networks.

Built for wallets, custodians, neo-banks, and agents, it standardizes access to yield across protocols and chains through four key primitives — all while preserving full self-custody.

The API constructs complete transaction flows, but leaves signing and execution entirely in your control — compatible with browser wallets, hardware devices, smart contract accounts, and institutional custody platforms.

- **Yields** — earning opportunities spanning staking, lending, vaults, restaking, RWA yield, and more
- **Yield details** — deep metadata defining how each opportunity works: reward mechanics, accepted tokens, fees, validator structure, lockups, and execution schemas
- **Balances** — a unified view of a user's positions across all lifecycle states: active, pending, cooling down, claimable, or locked
- **Actions** — simple intents (`enter`, `exit`, `manage`) that return ready-to-submit transaction sequences — complete with routing, formatting, validator selection, and approvals

---

## Discover Yields

Explore the entire yield landscape in one endpoint.

Use `GET /v1/yields` to discover thousands of live opportunities — from Ethereum validators and Cosmos staking to restaking strategies, liquid staking providers, and top DeFi protocols.

You can filter by:

- **Network** — Ethereum, Solana, Base, Cosmos, Avalanche, and more
- **Input token** — discover what's possible with your held assets
- **Protocol/provider** — Lido, Compound, Morpho, EigenLayer, etc.

Each yield comes enriched with:

- Real-time reward rates (broken down by source)
- Token and validator data
- Required arguments for actions
- Fee structures and supported transaction formats

All integration data is available directly via `GET /v1/yields`.
To query a single opportunity, you can also use `GET /v1/yields/{yieldId}`.

---

## Actions

Turn fragmented protocol logic into a single, clean integration.

Whether you're staking ETH, restaking stETH, delegating ATOM, or depositing into Aave — the Yield API lets you initiate any flow with a simple intent-based call.

Call `POST /v1/actions/{intent}` (`enter`, `exit`, or `manage`) and get back:

- A complete list of transactions to sign and submit
- Built-in gas estimation and status tracking

**Smart routing**: If the user holds a different input token than what the yield expects, the API returns a valid route — including swaps or bridges when needed.

**Self-custodial by design**: Yield.xyz never holds keys or manages execution. You get fully constructed transactions that can be signed with any existing infrastructure:

- Browser wallets (e.g. MetaMask, Phantom)
- Hardware wallets (e.g. Ledger via Ledger Live)
- Institutional custody platforms
- Smart contract wallets (e.g. Safe, Stackup, Kernel)
- Custom signers or MPC flows

No per-chain SDKs. No protocol-specific edge cases. Just standardized, signer-agnostic flows across all protocols.

### Monetize Yield Flows

Yield.xyz gives you full control over how you monetize yield flows within your app or platform:

- **Validator rebates** — earn a share of staking commission when using preferred validators
- **Deposit fees** — apply entry fees on the principal deposited
- **Performance fees** — take a cut of net rewards
- **Management fees** — apply TVL-based monetization on longer-term positions

All monetization options are declared in the `possibleFeeTakingMechanisms` metadata and automatically embedded into the transaction logic.

You control what's configured — the API handles the rest.

---

## Balances

Get real-time, full-fidelity views of user positions across all supported protocols and networks.

Use `GET /v1/yields/{yieldId}/balances` to inspect a specific opportunity — including:

- Active, entering, exiting, withdrawable, or claimable states
- Token and USD values
- Validator data (single or distributed)
- Reward status and pending actions

To build a portfolio-wide view, use `POST /v1/yields/balances` to batch queries across multiple addresses and networks.

Each response is normalized and includes contextual next actions — so your application always knows what the user can do next.

---

## Schema-First by Design

Every action, balance, and lifecycle step is driven by structured schemas.

These schemas define:

- Required fields, field types, and validations
- Nested inputs like `additionalAddresses`
- Dynamic references (e.g. validator selection)

This allows you to build fully dynamic forms and workflows without hardcoding any logic per yield or chain. The API tells you exactly what's required — and how to structure it.

---

## A Unified Yield Layer

With Yield.xyz, you no longer need to integrate staking, DeFi, and validator logic protocol by protocol.

You get:

- A single API for the entire yield landscape
- Normalized data across all yield types
- Full transaction generation and lifecycle handling
- Seamless monetization options
- Portfolio-aware balance tracking
- Self-custody support and signer-agnostic architecture

Whether you're building for custody, wallets, or yield infrastructure — the Yield.xyz API makes on-chain yield integration fast, scalable, and monetizable.
