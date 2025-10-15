# Yield.xyz API Data Fit Notes

**Date:** 2025-10-15
**Context:** Updated MCP plan aligns tool schemas with verified Yield.xyz responses. This note captures the remaining data caveats implementers should remember during Phase 1.

---

## Summary

| Topic | Status | Notes |
|-------|--------|-------|
| Historical rewards | ⚠️ Not available for this project key | `/v1/yields/historic-rewards` returns 404; tools must fall back to current APY and flag the limitation. |
| Action enablement | ⚠️ Project-scoped | Some yields/actions return 400 "not enabled". Surface as limitations in tools rather than failing. |
| Host selection | ✅ Documented | `api.yield.xyz` exposes `/v1/networks`; `api.stakek.it` currently returns populated `/v1/yields`. Client must try both. |
| Gas estimates | ⚠️ Optional | `/v1/actions/estimate-gas` may be disabled; heuristics should be used when unavailable. |
| Validators | ✅ Handled | Tools gracefully return empty results when a yield does not support validators. |

---

## Open Items

### 1. Historical Data (`analyze-yield-history`)
- Attempt `POST https://api.yield.xyz/v1/yields/historic-rewards` when the account is upgraded.
- Until then, return `historyAvailable: false`, include the live APY from `GET /v1/yields/{id}`, and explain how to enable history in the response.

### 2. Project Enablement for Balances/Actions
- `GET /v1/yields/{id}/balances` and `POST /v1/actions/{enter|exit}` may return 400 if the yield is not enabled for the API key.
- Implementation should catch the error and add a user-facing limitation message (e.g., "Yield not enabled for this project; contact Yield.xyz support").

### 3. Estimate Gas Endpoint
- `GET /v1/actions/estimate-gas` is not guaranteed. When it returns 404/501, reuse the heuristics defined in the plan (gas token symbol + fee configurations) and set `estimateAvailable=false`.

### 4. Host Resolution Strategy
- Preferred order: call `api.stakek.it` for yield catalog endpoints, retry on `api.yield.xyz` if empty; call `api.yield.xyz` first for network metadata.
- The API client should expose a simple fallback mechanism and log which host returned data.

---

## Heuristic Helpers (For Reference)

### Yield Scoring (used by `discover-yields`, `prepare-stake` auto-select)
```typescript
function score(yieldSummary: YieldSummary) {
  const minAmountPenalty = yieldSummary.minAmount ? Math.min(5, parseFloat(yieldSummary.minAmount)) : 0;
  const cooldownPenalty = yieldSummary.cooldownDays ? yieldSummary.cooldownDays * 0.2 : 0;
  const feePenalty = yieldSummary.hasManagementFee ? 10 : 0;
  return yieldSummary.apy * 100 - minAmountPenalty - cooldownPenalty - feePenalty;
}
```

### Warning Generation
```typescript
function buildWarnings(data: YieldDetails): string[] {
  const warnings: string[] = [];
  if (!data.status.exit) warnings.push('Exit currently disabled');
  if (data.cooldownDays && data.cooldownDays > 7) warnings.push(`Long cooldown (${data.cooldownDays} days)`);
  if (data.minAmount && parseFloat(data.minAmount) > 1) warnings.push(`High minimum amount (${data.minAmount})`);
  return warnings;
}
```

### ROI Estimation (Rewards vs Staked)
```typescript
function estimatedRoi(rewardsUsd?: number | null, stakedUsd?: number | null) {
  if (!rewardsUsd || !stakedUsd || stakedUsd === 0) return null;
  return +(rewardsUsd / stakedUsd * 100).toFixed(2);
}
```

---

## Next Validation Milestones

1. Secure access to the historic rewards endpoint (or document its unavailability for launch).
2. Confirm expected payloads for `POST /v1/actions/enter`/`exit` with an enabled project (ensure unsigned transactions are hex strings).
3. Verify whether `GET /v1/yields/validators` will be available to list preferred validators across networks.

---

*Maintained by: MCP Yield engineering*
