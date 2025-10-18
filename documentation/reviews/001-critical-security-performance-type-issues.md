# MCP Yield Server - Code Review: Critical Issues

**Date:** 2025-10-18  
**Scope:** Critical and high-priority issues only  
**Status:** 10 issues identified  
**Test Status:** All 28 unit tests passing (baseline established)

---

## CRITICAL ISSUES (5)

### ISSUE 1: O(n²) Performance Degradation in Lending Yields Tool
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/tools/yields.ts:465-466`  
**SEVERITY:** CRITICAL  
**ISSUE:** The `get-lending-yields` tool performs nested `find()` operations inside a `map()` loop, creating O(n²) complexity. For every summary item, it scans the entire `response.raw` array twice.

```typescript
items: response.summaries.map((summary) => ({
  ...summary,
  supplyApy: summary.apy,
  collateralFactor: response.raw.find((entry) => entry.id === summary.id)?.metrics?.collateralFactor,
  borrowApy: response.raw.find((entry) => entry.id === summary.id)?.metrics?.borrowApy
})),
```

**IMPACT:** With 100+ yields returned, this scales to 10,000+ array iterations. With 1000+ yields, performance becomes prohibitive.

**FIX:** Pre-build a Map for O(1) lookups:
```typescript
const entryMap = new Map(response.raw.map((e) => [e.id, e]));
items: response.summaries.map((summary) => {
  const entry = entryMap.get(summary.id);
  return {
    ...summary,
    supplyApy: summary.apy,
    collateralFactor: entry?.metrics?.collateralFactor,
    borrowApy: entry?.metrics?.borrowApy
  };
})
```

---

### ISSUE 2: Identical O(n²) Pattern in Vault Yields Tool
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/tools/yields.ts:492-502`  
**SEVERITY:** CRITICAL  
**ISSUE:** Same nested `find()` pattern in `get-vault-yields` tool causes O(n²) performance.

```typescript
const items = response.summaries.map((summary) => {
  const entry = response.raw.find((e) => e.id === summary.id);  // Called for every summary
  return {
    ...summary,
    strategy: entry?.metadata?.strategy,
    lockup: entry?.lifecycle?.withdrawalPeriod,
    performanceFee: entry?.metadata?.fees?.performance,
    managementFee: entry?.metadata?.fees?.management,
    riskRating: entry?.metadata?.riskRating ?? entry?.metadata?.riskLevel
  };
});
```

**IMPACT:** Multiple metadata field lookups compound the performance issue.

**FIX:** Use Map-based lookup (same solution as Issue 1):
```typescript
const entryMap = new Map(response.raw.map((e) => [e.id, e]));
const items = response.summaries.map((summary) => {
  const entry = entryMap.get(summary.id);
  return { ...summary, /* access entry fields */ };
});
```

---

### ISSUE 3: Unsafe Type Cast with `any` in Catalog Service
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/services/catalog.ts:33`  
**SEVERITY:** CRITICAL  
**ISSUE:** Unsafe type casting defeats TypeScript's type safety system:

```typescript
const tokens = data.map((item: any) => item.token);
```

This allows arbitrary property access without validation. If API returns malformed data (missing `.token` property), runtime error occurs silently.

**FIX:** Use proper type checking:
```typescript
const tokens = data.map((item: unknown) => {
  if (item && typeof item === 'object' && 'token' in item) {
    return (item as Record<string, unknown>).token;
  }
  throw new Error(`Invalid token item format at index`);
});
```

---

### ISSUE 4: Uncaught Promise Rejection in Stdio Transport
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/index.ts:42`  
**SEVERITY:** CRITICAL  
**ISSUE:** The `start()` function is called without `await`, creating an unhandled promise rejection:

```typescript
start();  // Promise not awaited
```

If `start()` rejects (e.g., config validation fails), Node.js will emit `unhandledRejection` and exit with code 1, but without proper logging context.

**FIX:** Properly handle the promise:
```typescript
start().catch((error) => {
  logger.error('Fatal error during startup', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
```

---

### ISSUE 5: Weak Type Safety with `z.any()` in Reward Schema
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/types/stakekit.ts:59`  
**SEVERITY:** CRITICAL  
**ISSUE:** The reward rate schema uses `z.any()` which bypasses all validation:

```typescript
export const rewardRateSchema = z.object({
  total: z.number().optional(),
  rateType: z.string().optional(),
  components: z.array(z.any()).optional()  // DANGEROUS: accepts anything
}).passthrough();
```

**IMPACT:** If API returns malicious or malformed data in `components` array, it passes validation unchecked. This could lead to downstream errors or security issues when this data is logged or processed.

**FIX:** Define proper schema for components:
```typescript
const componentSchema = z.object({
  name: z.string(),
  rate: z.number()
}).passthrough();

export const rewardRateSchema = z.object({
  total: z.number().optional(),
  rateType: z.string().optional(),
  components: z.array(componentSchema).optional()
}).passthrough();
```

---

## HIGH-PRIORITY ISSUES (5)

### ISSUE 6: Session Memory Leak in HTTP Server
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/http.ts:37-76`  
**SEVERITY:** HIGH  
**ISSUE:** Sessions are added to `pending` Set but may not be cleaned up if connection fails before initialization:

```typescript
this.pending.add(session);  // Line 75
try {
  await server.connect(session.transport);
  // ...
  return session;  // Removes from pending only on success
} catch (error) {
  this.pending.delete(session);  // Only cleaned up on explicit error
  // ...
}
```

If an exception occurs after `pending.add()` but outside the try-catch, the session leaks.

**FIX:** Use try-finally block:
```typescript
this.pending.add(session);
try {
  await server.connect(session.transport);
  this.pending.delete(session);
  this.sessions.set(sessionId, session);
  return session;
} catch (error) {
  this.pending.delete(session);
  await this.destroySession(session);
  throw error;
}
```

---

### ISSUE 7: Missing Unhandled Rejection Handler
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/http.ts` & `src/index.ts`  
**SEVERITY:** HIGH  
**ISSUE:** No global `unhandledRejection` or `uncaughtException` handler. If any async operation fails without explicit catch, process crashes silently.

**FIX:** Add handlers in entry points:
```typescript
// In index.ts and http.ts
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise)
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
```

---

### ISSUE 8: Missing Status Code Validation in Error Handling
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/client/stakekit.ts:86-90`  
**SEVERITY:** HIGH  
**ISSUE:** Status code extraction attempts multiple unsafe fallbacks that may extract undefined:

```typescript
const status =
  axiosError.response?.status ??
  (axiosError as { status?: number }).status ??
  (axiosError.request as { res?: { statusCode?: number } } | undefined)?.res?.statusCode;
```

If all fallbacks are undefined, `status` is `undefined`, but then compared directly: `if (status === 401)`. This creates logic vulnerabilities.

**FIX:** Explicitly handle undefined:
```typescript
const status: number | undefined =
  axiosError.response?.status ??
  (axiosError as { status?: number }).status ??
  (axiosError.request as { res?: { statusCode?: number } } | undefined)?.res?.statusCode;

const isAuthError = status === 401;
const isServerError = status !== undefined && RETRY_STATUS_CODES.has(status);
```

---

### ISSUE 9: Unvalidated User Input in Parameter Passing
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/tools/yields.ts:194-199`  
**SEVERITY:** HIGH  
**ISSUE:** Parameters from user input are passed directly to Axios without type validation:

```typescript
const toListParams = (args: z.infer<typeof paginationSchema> & Record<string, unknown>) => {
  const params: Record<string, unknown> = {};
  const limit = ensurePositiveLimit(args.limit);
  params.limit = limit;
  if (args.offset !== undefined) {
    params.offset = args.offset;  // Could be any type
  }
  return params;  // Passed directly to axios.get()
};
```

Although `args` is typed, the `& Record<string, unknown>` allows additional unvalidated properties to be passed through.

**FIX:** Explicitly validate and sanitize:
```typescript
const toListParams = (args: z.infer<typeof paginationSchema>) => {
  const params: Record<string, unknown> = {};
  params.limit = ensurePositiveLimit(args.limit);
  if (args.offset !== undefined && typeof args.offset === 'number') {
    params.offset = args.offset;
  }
  return params;
};
```

---

### ISSUE 10: Race Condition in Session Cleanup
**FILE:** `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/src/http.ts:146-147`  
**SEVERITY:** HIGH  
**ISSUE:** Session destruction can be called multiple times concurrently:

```typescript
async evictIdleSessions(): Promise<void> {
  const cutoff = Date.now() - SESSION_IDLE_TTL_MS;
  const staleSessions = Array.from(this.sessions.values()).filter(
    (session) => session.lastUsed < cutoff && !session.closing
  );
  for (const session of staleSessions) {
    await this.destroySession(session);  // No atomic operation
  }
}
```

Between the check `!session.closing` and the call to `destroySession()`, another cleanup call might execute, leading to double-destruction attempts.

**FIX:** Use atomic flag update:
```typescript
async evictIdleSessions(): Promise<void> {
  const cutoff = Date.now() - SESSION_IDLE_TTL_MS;
  const staleSessions = Array.from(this.sessions.values()).filter(
    (session) => session.lastUsed < cutoff && !session.closing
  );
  const toDestroy: SessionContext[] = [];
  for (const session of staleSessions) {
    if (!session.closing) {
      session.closing = true;  // Atomically mark as closing first
      toDestroy.push(session);
    }
  }
  for (const session of toDestroy) {
    await this.destroySession(session);
  }
}
```

---

## SUMMARY TABLE

| # | File | Line | Severity | Type | Issue |
|---|------|------|----------|------|-------|
| 1 | yields.ts | 465-466 | CRITICAL | Performance | O(n²) nested find in lending yields |
| 2 | yields.ts | 492-502 | CRITICAL | Performance | O(n²) nested find in vault yields |
| 3 | catalog.ts | 33 | CRITICAL | Type Safety | Unsafe `any` type cast |
| 4 | index.ts | 42 | CRITICAL | Error Handling | Unhandled promise rejection |
| 5 | stakekit.ts | 59 | CRITICAL | Type Safety | Weak validation with `z.any()` |
| 6 | http.ts | 37-76 | HIGH | Memory Leak | Pending sessions not cleaned up |
| 7 | Both | - | HIGH | Error Handling | Missing unhandled rejection handlers |
| 8 | stakekit.ts | 86-90 | HIGH | Type Safety | Unsafe status code handling |
| 9 | yields.ts | 194-199 | HIGH | Input Validation | Unvalidated parameter passthrough |
| 10 | http.ts | 146-147 | HIGH | Concurrency | Race condition in cleanup |

---

## REMEDIATION PRIORITY

**Immediate (Production Blocker):**
- Issue 1 & 2: Performance degradation under load
- Issue 4: Unhandled startup errors
- Issue 5: Weak schema validation

**High Priority (Before Deployment):**
- Issue 3: Type safety violation
- Issue 6: Memory leak
- Issue 10: Race condition

**Medium Priority (Next Release):**
- Issue 7: Better error handling
- Issue 8 & 9: Defensive coding

---

## TESTING RECOMMENDATION

All issues can be verified with integration tests:
1. Load test with 500+ yields to expose O(n²) performance issues
2. Test malformed API responses to expose validation gaps
3. Simulate process crashes to verify error handlers
4. Concurrent HTTP session test to expose race conditions

