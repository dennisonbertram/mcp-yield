# Yield.xyz API Reference Summary

## API Basics

### Base URL
```
https://api.yield.xyz
```

### Authentication
All API requests require an API key passed in the header:
```bash
X-API-KEY: <YOUR_API_KEY>
```

To obtain an API key:
- Email hello@yield.xyz
- OR sign up via Customer Dashboard: https://dashboard.stakek.it

### Request/Response Format
- **Content-Type**: `application/json`
- **Request Body**: JSON-encoded for POST endpoints
- **Response**: JSON for all responses including errors

### Example Request
```bash
curl https://api.yield.xyz/v1/yields \
  -H "X-API-KEY: <YOUR_API_KEY>"
```

---

## API Architecture

The API is organized around 4 main categories:

### 1. Discovery Endpoints
Find and explore yield opportunities

**Get All Yields**
```
GET /v1/yields
```
- Returns: Array of `YieldDto` objects
- Query params: `network`, `token`, `inputToken`, `provider`
- Use case: Populate yield feed, filter opportunities

**Get Single Yield**
```
GET /v1/yields/{yieldId}
```
- Returns: Single `YieldDto` with full metadata
- Includes: schemas, validators, fee structures, lifecycle settings

**Get Networks**
```
GET /v1/networks
```
- Returns: List of supported blockchain networks (80+)

**Get Providers**
```
GET /v1/providers
```
- Returns: List of protocol providers (Lido, Aave, Morpho, etc.)

**Get Validators**
```
GET /v1/yields/{yieldId}/validators
```
- Returns: Available validators for staking yields
- Includes: APR, commission, stake data per validator

---

### 2. Portfolio Endpoints
Track user positions and balances

**Get Balances for Specific Yield**
```
GET /v1/yields/{yieldId}/balances?address={walletAddress}
```
- Returns: Array of `BalanceDto` objects
- Shows: amount, USD value, lifecycle state, validator info, pending actions

**Get Aggregate Balances**
```
POST /v1/yields/balances
```
- Request body: `{ addresses: string[], networks?: string[] }`
- Returns: Portfolio-wide view across all yields and networks
- Use case: Dashboard, portfolio tracking

**Balance Lifecycle States:**
- `active` - Currently earning yield
- `entering` - Deposit in progress
- `exiting` - Unstaking/cooldown period
- `withdrawable` - Ready to withdraw
- `claimable` - Accumulated rewards
- `locked` - Subject to vesting/restrictions

---

### 3. Action Endpoints
Execute yield operations via intent-based calls

**Enter a Yield**
```
POST /v1/actions/enter
```
Request body:
```json
{
  "yieldId": "string",
  "address": "string",
  "arguments": {
    "amount": "string",
    "validatorAddress": "string (optional)",
    "additionalAddresses": {} // chain-specific
  }
}
```
- Returns: `ActionDto` with array of `TransactionDto[]`
- Includes: unsigned transactions, gas estimates, routing logic

**Exit a Yield**
```
POST /v1/actions/exit
```
Request body:
```json
{
  "yieldId": "string",
  "address": "string",
  "arguments": {
    "amount": "string",
    "validatorAddress": "string (optional)"
  }
}
```
- Returns: Complete unstaking transaction flow
- Handles: cooldown periods, multi-step withdrawals

**Manage a Position**
```
POST /v1/actions/manage
```
Request body:
```json
{
  "yieldId": "string",
  "address": "string",
  "action": "CLAIM_REWARDS | RESTAKE_REWARDS | REDELEGATE",
  "passthrough": "string", // from balance.pendingActions
  "arguments": {} // depends on action type
}
```
- Use case: Claim rewards, restake, switch validators
- Requires: `passthrough` data from balance endpoint

---

### 4. Health Endpoint
Check API status

```
GET /v1/health
```
- Returns: API health status

---

## Key Data Types

### YieldDto
Complete yield opportunity metadata:
```typescript
{
  id: string;                    // Canonical identifier
  network: string;               // Blockchain network
  token: TokenDto;               // Underlying token
  inputTokens: TokenDto[];       // Accepted entry tokens
  outputToken?: TokenDto;        // Receipt token (e.g. stETH)
  status: {
    enter: boolean;
    exit: boolean;
  };
  metadata: {
    name: string;
    description: string;
    logoURI: string;
    documentation: string;
  };
  rewardRate: {
    total: number;               // APY/APR percentage
    components: Array<{
      type: string;              // staking, incentive, MEV, points
      rate: number;
    }>;
  };
  mechanics: {
    arguments: {
      enter: SchemaDto;          // Required fields for entry
      exit: SchemaDto;           // Required fields for exit
      balance: SchemaDto;        // Required fields for balance query
    };
    fee?: FeeDto;
    cooldownPeriod?: number;
    withdrawPeriod?: number;
    warmupPeriod?: number;
  };
  validators?: ValidatorDto[];
  possibleFeeTakingMechanisms: string[];
}
```

### BalanceDto
User position data:
```typescript
{
  address: string;
  type: BalanceType;             // active, entering, exiting, etc.
  amount: string;                // Formatted value
  amountRaw: string;             // Base unit value
  amountUsd: number;
  token: TokenDto;
  validator?: ValidatorDto;
  validators?: ValidatorDto[];
  pendingActions?: Array<{
    type: string;                // CLAIM_REWARDS, REDELEGATE, etc.
    passthrough: string;         // Required for manage action
    arguments?: SchemaDto;       // Additional inputs needed
  }>;
  isEarning: boolean;
}
```

### TransactionDto
Unsigned transaction ready to sign:
```typescript
{
  title: string;
  type: string;
  network: string;
  stepIndex: number;
  unsignedTransaction: string;   // Raw transaction data
  annotatedTransaction?: {
    method: string;
    args: object;
  };
  structuredTransaction?: object; // Full structured format
  gasEstimate?: {
    amount: string;
    token: string;
  };
  explorerUrl?: string;
  description?: string;
  isMessage?: boolean;
}
```

### SchemaDto
JSON schema for dynamic form generation:
```typescript
{
  type: string;                  // object, string, number, enum
  required?: string[];
  properties?: {
    [key: string]: {
      type: string;
      title?: string;
      description?: string;
      minimum?: number;
      maximum?: number;
      enum?: string[];
    };
  };
}
```

---

## Workflow Examples

### 1. Discover and Enter a Yield
```bash
# Step 1: Get all yields
GET /v1/yields?network=ethereum&token=ETH

# Step 2: Get specific yield details
GET /v1/yields/{yieldId}

# Step 3: Enter the yield
POST /v1/actions/enter
{
  "yieldId": "eth-staking-lido",
  "address": "0x...",
  "arguments": {
    "amount": "1000000000000000000" // 1 ETH in wei
  }
}

# Step 4: Sign and broadcast returned transactions
# (done client-side with your wallet infrastructure)
```

### 2. Check Balances and Claim Rewards
```bash
# Step 1: Get balances
GET /v1/yields/{yieldId}/balances?address=0x...

# Step 2: Check for pending actions in response
# Look for pendingActions[].type === "CLAIM_REWARDS"

# Step 3: Claim rewards
POST /v1/actions/manage
{
  "yieldId": "eth-staking-lido",
  "address": "0x...",
  "action": "CLAIM_REWARDS",
  "passthrough": "<from balance.pendingActions[].passthrough>"
}
```

### 3. Portfolio-Wide View
```bash
POST /v1/yields/balances
{
  "addresses": ["0xWallet1", "0xWallet2"],
  "networks": ["ethereum", "polygon", "arbitrum"]
}
```

---

## Key Features

### Smart Routing
- API automatically handles token swaps/bridges if user holds different token than yield expects
- Returns complete multi-step transaction flow

### Self-Custodial
- API constructs transactions but NEVER signs or executes
- Compatible with any wallet infrastructure:
  - Browser wallets (MetaMask, Phantom)
  - Hardware wallets (Ledger)
  - Smart contract wallets (Safe, Stackup)
  - Institutional custody
  - Custom MPC solutions

### Schema-Driven
- All inputs defined by JSON schemas
- No hardcoded forms needed
- Dynamic UI generation from API metadata

### Monetization
- Validator rebates
- Deposit fees (FeeWrapper contracts)
- Performance fees (vault-based)
- Management fees (AUM-based)
- All declared in `possibleFeeTakingMechanisms`

---

## Rate Limits

See: https://docs.yield.xyz/docs/rate-limits-and-plans

---

## Support

- **Email**: hello@yield.xyz
- **Dashboard**: https://dashboard.stakek.it
- **Documentation**: https://docs.yield.xyz
- **API Reference**: https://docs.yield.xyz/reference
