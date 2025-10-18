# API Endpoint Testing Results

**Date:** 2025-10-16
**Tested:** api.stakek.it vs api.yield.xyz

---

## Key Finding: Wrong Base URL

**Current Code Uses:** `https://api.stakek.it/v2/`
**Should Use:** `https://api.yield.xyz/v1/`

---

## Endpoint Test Results

| Endpoint | api.stakek.it/v2 | api.yield.xyz/v1 | Status |
|----------|------------------|------------------|--------|
| `/networks` | Returns `{data: ["ethereum", ...]}` (strings) | Returns `[{id, name, category, ...}]` (objects) | ✅ USE v1 |
| `/tokens` | Not tested | Returns error | ❌ Need alternative |
| `/providers` | 404 | Returns `{items: [{id, name, ...}]}` | ✅ EXISTS |
| `/yields` | Returns `{data: []}` (empty) | Returns `{items: []}` (empty) | ⚠️ No data |
| `/yields?network=X` | Not tested | Returns `{items: []}` (empty) | ⚠️ No data |

---

## Working Endpoints on api.yield.xyz/v1

### ✅ Networks
```bash
curl 'https://api.yield.xyz/v1/networks' -H 'X-API-KEY: ...'

# Returns:
[
  {
    "id": "ethereum",
    "name": "Ethereum",
    "category": "evm",
    "logoURI": "https://assets.stakek.it/networks/ethereum.svg"
  },
  ...
]

# Total: 94 networks
```

### ✅ Providers
```bash
curl 'https://api.yield.xyz/v1/providers' -H 'X-API-KEY: ...'

# Returns:
{
  "items": [
    {
      "id": "lido",
      "name": "Lido",
      "website": "https://lido.fi/",
      "logoURI": "https://assets.stakek.it/providers/lido.svg",
      "tvlUsd": null,
      "type": "protocol"
    },
    ...
  ]
}
```

### ⚠️ Yields (No Data Currently)
```bash
curl 'https://api.yield.xyz/v1/yields?limit=10' -H 'X-API-KEY: ...'

# Returns:
{
  "items": [],
  "pagination": {...}
}
```

### ❌ Tokens (Error)
```bash
curl 'https://api.yield.xyz/v1/tokens?limit=2' -H 'X-API-KEY: ...'

# Returns:
{
  "statusCode": 400,
  "message": "...",
  "timestamp": "..."
}
```

---

## Required Code Changes

### 1. Change Base URL
```typescript
// src/config.ts or src/client/stakekit.ts

// OLD:
const BASE_URL = 'https://api.stakek.it/v2';

// NEW:
const BASE_URL = 'https://api.yield.xyz/v1';
```

### 2. Update Network Endpoint
```typescript
// Change endpoint and response handling

// OLD:
GET /v2/networks
// Response: {data: ["ethereum", ...], hasNextPage: true, ...}

// NEW:
GET /v1/networks
// Response: [{id: "ethereum", name: "Ethereum", ...}, ...]
```

### 3. Add Providers Support
```typescript
// NEW endpoint available:
GET /v1/providers
// Response: {items: [{id, name, website, ...}]}

// Use this for protocol tools!
```

### 4. Fix Tokens (TBD - Endpoint has errors)
Options:
- Find correct v1 tokens endpoint
- Extract tokens from yields metadata
- Remove token tools temporarily

---

##Recommendations

### Immediate Fixes (Priority 1)
1. ✅ Change base URL to `api.yield.xyz/v1`
2. ✅ Update networks to use v1 format (array of objects)
3. ✅ Update providers to use v1 endpoint
4. ✅ Update response schemas for v1 format

### Medium Priority
5. Investigate correct tokens endpoint
6. Verify yields query parameter format

### Low Priority
7. Add fallback for empty yield data
8. Improve error messages when API has no data

---

## Next Steps

1. Update `src/client/stakekit.ts` base URL
2. Update `src/services/catalog.ts` to handle v1 responses
3. Update `src/types/stakekit.ts` schemas
4. Rebuild and test each tool
5. Update tests to match new response formats

---

## Notes

- The API currently has **no yield data** (both v1 and v2 return empty arrays)
- This is an **API data issue**, not a code issue
- Networks and Providers endpoints work perfectly on v1
- Tokens endpoint needs investigation or alternative solution
