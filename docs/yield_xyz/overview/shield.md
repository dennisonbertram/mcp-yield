# Shield

Zero-trust transaction validation for Yield.xyz integrations.

## Overview

When interacting with on-chain yield protocols through the Yield API, transaction integrity is critical. Even a small modification can redirect funds or trigger unintended contract calls.

Shield is a lightweight validation library that lets you verify unsigned transactions from the Yield API before presenting them for signing. It's designed to be embedded directly into your integration — giving you full control over when and how validation occurs.

**GitHub repository:** https://github.com/stakekit/shield

**NPM Package:** https://www.npmjs.com/package/@yieldxyz/shield

### Key Features

- Zero-trust verification: Every transaction must match a pre-audited pattern.
- Multi-chain support: Works across EVM, Solana, and Tron (with Cosmos and other L2s coming soon).
- Easy to integrate: Add one validation call before your signing logic — no extra middleware required.
- Clear error reporting: Immediate feedback on invalid or ambiguous transactions.

**Installation**

```typescript
npm install @yieldxyz/shield
```

**Usage Example**

```typescript
import { Shield } from '@yieldxyz/shield';

const shield = new Shield();

// 1. Get transaction from Yield API
const response = await fetch('https://api.yield.xyz/v1/actions/enter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.YIELD_API_KEY,
  },
  body: JSON.stringify({
    yieldId: 'ethereum-eth-lido-staking',
    address: userWalletAddress,
    arguments: { amount: '0.01' },
  }),
});

const action = await response.json();

// 2. Validate each transaction before signing
for (const tx of action.transactions) {
  const result = shield.validate({
    unsignedTransaction: tx.unsignedTransaction,
    yieldId: action.yieldId,
    userAddress: userWalletAddress,
  });

  if (!result.isValid) {
    throw new Error(`Invalid transaction: ${result.reason}`);
  }
}

// 3. Proceed with signing
```

### How It Works

Shield uses pattern matching to analyze each transaction's structure, function calls, and parameters, validating them against a verified template for the specified yield integration.

If the transaction doesn't match the safe pattern — for example, if an attacker modified a withdrawal address — Shield immediately flags it:

- Invalid transaction: Withdrawal owner does not match user address
- You can decide how to handle the result: block the signing flow, display a warning, or log it for review.

### Supported Yield Integrations

| Chain | Yield ID | Description |
|-------|----------|-------------|
| Ethereum | `ethereum-eth-lido-staking` | Lido ETH staking |
| Solana | `solana-sol-native-multivalidator-staking` | Native SOL staking |
| Tron | `tron-trx-native-staking` | TRX native staking |

More integrations (Cosmos, Polkadot, Bittensor, additional EVM yields) are being continuously added.

You can check programmatically:

```typescript
shield.getSupportedYieldIds();
```

### API Reference

**`shield.validate(request)`**

Validates a transaction by auto-detecting its type.

**Parameters**

```typescript
{
  unsignedTransaction: string;  // Transaction from Yield API
  yieldId: string;              // Yield integration ID
  userAddress: string;          // User's wallet address
  args?: ActionArguments;       // Optional arguments
  context?: ValidationContext;  // Optional validation context
}
```

**Returns**

```typescript
{
  isValid: boolean;
  reason?: string;        // Why validation failed
  details?: any;          // Additional error info
  detectedType?: string;  // Auto-detected transaction type (for debugging)
}
```

---

`shield.isSupported(yieldId: string): boolean`

Checks whether a given yield integration is supported.

`shield.getSupportedYieldIds(): string[]`

Returns a list of all supported Yield IDs.

---

### Common Validation Errors

| Context | Error Message | Meaning |
|---------|---------------|---------|
| **Solana** | `Transfer recipient does not match new stake account` | Your SOL is being sent to a different wallet instead of the intended stake account. |
| **Solana** | `Delegate authority is not user address` | Someone else would gain control over your staked SOL. |
| **EVM / Ethereum** | `Transaction not to Lido stETH contract` | The transaction targets a fake contract attempting to steal your ETH. |
| **Pattern Detection** | `Transaction validation failed: No matching operation pattern found` | The transaction type doesn't match any valid pattern — likely malicious or corrupted. |

### Why Shield Matters

Each API layer in a DeFi integration increases potential attack surfaces. Shield enforces a zero-trust model, guaranteeing that the transaction users sign is exactly the one intended by Yield.xyz.

By validating before signing, you:

- Prevent tampering and phishing attempts
- Maintain user trust through transparency
- Add structural security without sacrificing UX
