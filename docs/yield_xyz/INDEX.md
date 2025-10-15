# Yield.xyz Documentation Index

Comprehensive documentation scraped from https://docs.yield.xyz/

**Scraping Date:** 2025-10-13
**Total Pages Scraped:** 17 core pages
**Status:** Core documentation complete, additional subpages available on website

---

## Overview Section

### Core Concepts & Architecture
1. **[Welcome/Getting Started](./overview/getting-started.md)** - `/docs/getting-started`
   - Introduction to Yield.xyz API
   - Quick start guide
   - Key features overview

2. **[Core Concepts](./overview/core-concepts.md)** - `/docs/core-concepts`
   - Four key primitives: Yields, Yield Details, Balances, Actions
   - Architecture overview
   - Self-custodial design principles

3. **[Discover Yields](./overview/discover-yields.md)** - `/docs/yield-metadata`
   - YieldDto structure and metadata
   - Filtering and querying yields
   - Schema-driven design
   - Usage patterns

4. **[Actions](./overview/actions.md)** - `/docs/actions`
   - Intent-based operations (enter, exit, manage)
   - Transaction construction
   - Schema-driven UX
   - Self-custodial signing

5. **[Balances](./overview/balances.md)** - `/docs/balances`
   - Lifecycle-aware balance tracking
   - Pending actions
   - Portfolio views
   - State management

### Advanced Features

6. **[Allocator Vaults & OAVs Introduction](./overview/allocator-vaults-introduction.md)** - `/docs/allocator-vaults-oavs-introduction`
   - Optimized Allocator Vaults overview
   - True APY calculations
   - Customization options

7. **[Fees](./overview/fees.md)** - `/docs/fees`
   - Deposit Fees (FeeWrapper contracts)
   - Performance Fees (vault-based)
   - Management Fees (AUM-based)
   - Monetization strategies

8. **[Preferred Validator Network](./overview/preferred-validator-network.md)** - `/docs/preferred-validator-network`
   - Curated validator registry
   - 25+ institutional validators
   - Selection criteria
   - API access

9. **[Shield](./overview/shield.md)** - `/docs/shield`
   - Zero-trust transaction validation
   - NPM package: @yieldxyz/shield
   - Multi-chain support
   - Security patterns

---

## Supported Yields Section

### Yield Categories

10. **[Staking](./supported-yields/staking.md)** - `/docs/staking-yields`
    - EVM Networks: Ethereum, Arbitrum, Base, Polygon, etc.
    - Non-EVM Networks: Cosmos, Solana, Near, Polkadot, etc.
    - 80+ supported networks

11. **[Stablecoins](./supported-yields/stablecoins.md)** - `/docs/stablecoin-yields`
    - 200+ stablecoin strategies
    - Supported protocols: Aave, Morpho, Compound, Yearn, etc.
    - Integration options
    - Monetization models

**Note:** DeFi section (`/docs/aave-lending`) has subpages that can be explored on the website for specific protocol integrations.

---

## Getting Started Section

### Integration Guides

12. **[Signers Package](./getting-started/signers-package.md)** - `/docs/signers-packages`
    - @stakekit/signers NPM package
    - Mnemonic and Ledger support
    - Multi-wallet compatibility
    - Code examples

### Additional Pages Available on Website

The following pages are available on docs.yield.xyz but not fully scraped in this collection:

- **Project Setup** (`/docs/creating-an-api-key`) - API key creation and configuration
- **Widget** (`/docs/widget`) - Embeddable widget integration
- **Rate Limits and Plans** (`/docs/rate-limits-and-plans`) - API usage limits
- **Terms of Use** (`/docs/terms-of-use`) - Legal terms
- **Privacy Policy** (`/docs/privacy-policy`) - Privacy information
- **Security Notices** (`/docs/security-notices`) - Security advisories

---

## Advanced Setup Section

Available on website but not fully scraped:

- **Geoblocking** (`/docs/geoblocking`) - Geographic restrictions
- **Whitelabel Validator Nodes** (`/docs/whitelabel-validator-nodes`) - Custom validator setup
- **Bring Your Own Node** (`/docs/bring-your-own-node`) - Node infrastructure

---

## FAQs Section

13. **[FAQs](./faqs/faqs.md)** - `/docs/faqs`
    - Supported blockchains
    - Yield types
    - Staking workflows
    - Validator selection
    - Technical questions

---

## Legacy Documentation

Available on website:

- **Legacy docs (V1)** (`/docs/legacy-docs-v1`) - Previous API version
- **API 2.0 Migration Guide** (`/docs/api-20-migration-guide-workflow-and-schema-changes`) - Migration instructions

---

## Quick Reference

### Key API Endpoints

- `GET /v1/yields` - List all yields
- `GET /v1/yields/{yieldId}` - Get specific yield
- `GET /v1/yields/{yieldId}/validators` - Get validators
- `GET /v1/yields/{yieldId}/balances` - Get balances
- `POST /v1/actions/enter` - Enter position
- `POST /v1/actions/exit` - Exit position
- `POST /v1/actions/manage` - Manage position

### Key Packages

- **API**: `https://api.yield.xyz/v1/`
- **Shield**: `@yieldxyz/shield` (NPM)
- **Signers**: `@stakekit/signers` (NPM)
- **Common**: `@stakekit/common` (NPM)

### External Resources

- **Main Website**: https://yield.xyz
- **Documentation**: https://docs.yield.xyz
- **API Reference**: https://docs.yield.xyz/reference
- **Dashboard**: https://dashboard.stakek.it
- **GitHub (Shield)**: https://github.com/stakekit/shield

---

## Documentation Structure

```
docs/yield_xyz/
├── INDEX.md (this file)
├── overview/
│   ├── getting-started.md
│   ├── core-concepts.md
│   ├── discover-yields.md
│   ├── actions.md
│   ├── balances.md
│   ├── allocator-vaults-introduction.md
│   ├── fees.md
│   ├── preferred-validator-network.md
│   └── shield.md
├── supported-yields/
│   ├── staking.md
│   └── stablecoins.md
├── getting-started/
│   └── signers-package.md
└── faqs/
    └── faqs.md
```

---

## Notes

1. **Completeness**: Core documentation is comprehensive. Additional pages with subpages (DeFi protocols, Widget setup, Advanced Setup) can be accessed directly on docs.yield.xyz.

2. **Updates**: Documentation may be updated on the website. Check docs.yield.xyz for the latest information.

3. **Code Examples**: Most pages include code snippets in TypeScript/JavaScript. Some examples reference environment variables and require API keys.

4. **Network Coverage**: 80+ networks supported across EVM and non-EVM chains.

5. **Self-Custody**: All integrations maintain self-custody - Yield.xyz never holds keys or executes transactions.
