# Yield.xyz API Analysis - v1 vs v2 Endpoint Availability

**Date:** 2025-10-16
**Source:** Context7 documentation for yield.xyz

---

## Summary

After reviewing the official yield.xyz documentation via Context7, here's what endpoints are **actually available**:

---

## ✅ AVAILABLE ENDPOINTS (v1 API)

### Networks
```http
GET /v1/networks                      # All networks (DEPRECATED)
GET /v1/networks/enabled              # Enabled networks only ✅ USE THIS
GET /v1/yields/enabled/networks       # Networks with enabled yields
```

**Response Format (v1/networks/enabled):**
```json
[
  {
    "id": "ethereum",
    "name": "Ethereum",
    "category": "EVM",
    "isTestnet": false,
    // ... full network objects
  }
]
```

**✅ SOLUTION:** Use `/v1/networks/enabled` instead of `/v2/networks`

---

### Tokens
```http
GET /v1/tokens                        # All tokens (with filters)
GET /v1/tokens/enabled                # Enabled tokens only ✅ USE THIS
POST /v1/tokens/balances              # Get token balances
POST /v1/tokens/prices                # Get token prices
```

**Query Parameters for `/v1/tokens`:**
- `enabledYieldsOnly`: boolean (optional)
- `network`: string (optional)

**Response Format:**
```json
[
  {
    "symbol": "ETH",
    "name": "Ethereum",
    "network": "ethereum",
    "decimals": 18,
    "address": "0x...",
    "coinGeckoId": "ethereum",
    "logoURI": "https://...",
    "isPoints": false
  }
]
```

**✅ SOLUTION:** Use `/v1/tokens` or `/v1/tokens/enabled`

---

### Yields
```http
GET /v1/yields                        # List all yields ✅ USE THIS
GET /v1/yields/{yieldId}              # Get yield details ✅ WORKS
GET /v1/yields/enabled                # Enabled yields only
GET /v1/yields/{yieldId}/validators   # Get validators for a yield
GET /v1/yields/all                    # All yields (alternative)
POST /v1/yields/balances              # Get yield balances
POST /v1/yields/historic-rewards      # Get historical rewards
```

**Query Parameters for `/v1/yields`:**
- `network`: string (filter by network) ✅
- `token`: string (filter by token) ✅
- `inputToken`: string (filter by input token)
- `provider`: string (filter by provider)
- `offset`: number (pagination)
- `limit`: number (pagination)

**Response Format:**
```json
{
  "data": [
    {
      "id": "ethereum-eth-lido-staking",
      "token": {
        "symbol": "ETH",
        "name": "Ethereum",
        "network": "ethereum",
        // ...
      },
      "apy": 0.0318,
      "metadata": {
        "name": "Lido Staked ETH",
        "provider": { "name": "Lido" },
        // ...
      },
      "status": {
        "enter": true,
        "exit": true
      }
    }
  ],
  "hasNextPage": true,
  "limit": 20,
  "page": 1
}
```

**✅ SOLUTION:** Use `/v1/yields` with query params for filtering

---

## ❌ NOT AVAILABLE

### Protocols Endpoint
```http
GET /v1/protocols          # ❌ DOES NOT EXIST
GET /v2/protocols          # ❌ DOES NOT EXIST
```

**Evidence from Documentation:**
- Only mentioned is `GET /v1/providers` (new in v2 migration guide)
- No `/protocols` endpoint in any version
- The concept of "protocols" might be called "providers" in this API

**Possible Alternative:**
```http
GET /v1/providers          # Mentioned in v2 migration guide
```

---

## v1 vs v2 Differences

### v2 Changes (from migration guide)
1. **Discovery filters:** Advanced query params (input tokens, network, provider)
2. **Performance:** Pagination on large lists, leaner responses
3. **Validators:** Separate endpoint (`GET /v1/yields/{yieldId}/validators`)
4. **Token definitions:** Moved to top level of yield schema
5. **Option references:** Uses `optionsRef` for validators and enums

### v2 Endpoint for Networks
```http
GET /v2/networks
```

**Response Format (v2):**
```json
{
  "data": ["ethereum", "arbitrum", "polygon", ...],
  "hasNextPage": true,
  "limit": 20,
  "page": 1
}
```

**⚠️ ISSUE:** v2 returns **string array** instead of full objects!

---

## Recommended Fixes for MCP Server

### 1. Networks Tools (CRITICAL FIX NEEDED)

**Current Issue:**
- Code uses `/v2/networks` expecting full objects
- API returns simple string array

**Fix:**
```typescript
// Change from:
const response = await get('/v2/networks')  // Returns strings

// To:
const response = await get('/v1/networks/enabled')  // Returns full objects
```

**Files to update:**
- `src/services/catalog.ts` - Change network endpoint to v1
- `src/types/stakekit.ts` - Ensure schema handles v1 response format

---

### 2. Tokens Tools (FIX NEEDED)

**Current Issue:**
- Likely using wrong endpoint or schema

**Fix:**
```typescript
// Use v1 tokens endpoint:
const response = await get('/v1/tokens/enabled')
// OR with filters:
const response = await get('/v1/tokens', {
  enabledYieldsOnly: true,
  network: 'ethereum'
})
```

---

### 3. Yields Tools (MINOR FIXES)

**Current Issue:**
- No yields returned (might be API data issue OR wrong query format)

**Verify Query Format:**
```typescript
// Ensure queries use correct param names:
const response = await get('/v1/yields', {
  network: 'ethereum',        // ✅ Correct param name
  token: 'ETH',              // ✅ Correct param name
  limit: 20,
  offset: 0
})
```

---

### 4. Protocols Tools (REMOVE OR REPLACE)

**Options:**

**Option A: Remove Protocol Tools**
- Delete `list-protocols` tool
- Delete `get-protocol-details` tool
- Remove from planning docs

**Option B: Use Providers Instead**
```typescript
// Try this endpoint (mentioned in v2 docs):
const response = await get('/v1/providers')
```

**Option C: Extract from Yields**
```typescript
// Derive protocol list from yield metadata:
const yields = await get('/v1/yields')
const providers = [...new Set(yields.map(y => y.metadata.provider.name))]
```

---

## Testing Recommendations

### 1. Test v1 Networks Endpoint
```bash
curl -s 'https://api.stakek.it/v1/networks/enabled' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929' | jq '.[0]'
```

**Expected:** Full network object with id, name, category, etc.

---

### 2. Test v1 Yields with Filters
```bash
curl -s 'https://api.stakek.it/v1/yields?network=ethereum&limit=5' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929' | jq '.data | length'
```

**Expected:** Array of yield objects

---

### 3. Test Providers Endpoint
```bash
curl -s 'https://api.stakek.it/v1/providers' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929'
```

**Expected:** Either provider list OR 404 (then remove protocol tools)

---

## Implementation Priority

### HIGH Priority (Blocking)
1. ✅ **Fix networks endpoint** - Change to `/v1/networks/enabled`
2. ✅ **Fix tokens endpoint** - Change to `/v1/tokens/enabled`
3. ✅ **Test providers endpoint** - Determine if protocol tools are possible

### MEDIUM Priority (Functional but empty)
4. **Verify yields filtering** - Test with v1 query params
5. **Update yield schemas** - Ensure they match v1 format

### LOW Priority (Nice to have)
6. **Add pagination support** - Use offset/limit properly
7. **Add caching layer** - Cache network/token lists

---

## Conclusion

### Root Cause of Test Failures

1. **Networks:** Using v2 endpoint that returns strings instead of objects ❌
2. **Tokens:** Likely using v2 or wrong schema ❌
3. **Protocols:** Endpoint doesn't exist - may need to use `/v1/providers` ❌
4. **Yields:** Possibly correct endpoint but wrong query format ⚠️

### Next Steps

1. Update API base URL to use `/v1` for networks, tokens
2. Test `/v1/providers` endpoint for protocol functionality
3. Verify yield query parameter format matches v1 spec
4. Update TypeScript schemas to match v1 response formats

**The MCP implementation is correct** - we just need to use the right API version and endpoints!
