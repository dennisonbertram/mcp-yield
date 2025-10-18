# Code Review Fix Plan - Parallel TDD Implementation

**Date:** 2025-10-18
**Status:** Ready for parallel execution
**Total Issues:** 10 (5 Critical, 5 High Priority)

---

## Implementation Strategy

Using **TDD-implementer agents in parallel** to fix all 10 issues simultaneously, then merge all changes back to main branch.

---

## Task Breakdown

### Task 1: Performance Fixes (Issues 1 & 2)
**Agent:** tdd-implementer-1
**Branch:** `fix/performance-o-n-squared`
**Files:** `src/tools/yields.ts`
**Tests:** Add performance test for large datasets

**Issue 1 - Lending Yields (Line 465-466):**
```typescript
// BEFORE: O(n²)
items: response.summaries.map((summary) => ({
  collateralFactor: response.raw.find((entry) => entry.id === summary.id)?.metrics?.collateralFactor,
  borrowApy: response.raw.find((entry) => entry.id === summary.id)?.metrics?.borrowApy
}))

// AFTER: O(n) with Map
const entryMap = new Map(response.raw.map((e) => [e.id, e]));
items: response.summaries.map((summary) => {
  const entry = entryMap.get(summary.id);
  return {
    ...summary,
    collateralFactor: entry?.metrics?.collateralFactor,
    borrowApy: entry?.metrics?.borrowApy
  };
})
```

**Issue 2 - Vault Yields (Line 492-502):**
Same pattern - use Map-based lookup instead of nested find().

---

### Task 2: Type Safety Fixes (Issues 3 & 5)
**Agent:** tdd-implementer-2
**Branch:** `fix/type-safety`
**Files:** `src/services/catalog.ts`, `src/types/stakekit.ts`
**Tests:** Add tests for malformed API responses

**Issue 3 - Unsafe Type Cast (catalog.ts:33):**
```typescript
// BEFORE
const tokens = data.map((item: any) => item.token);

// AFTER
const tokens = data
  .filter((item): item is { token: unknown } =>
    typeof item === 'object' && item !== null && 'token' in item
  )
  .map((item) => item.token);
```

**Issue 5 - Weak Validation (stakekit.ts:59):**
```typescript
// BEFORE
components: z.array(z.any()).optional()

// AFTER
const rewardComponentSchema = z.object({
  rate: z.number().optional(),
  rateType: z.string().optional(),
  token: tokenRefSchema.optional(),
  yieldSource: z.string().optional(),
  description: z.string().optional()
}).passthrough();

components: z.array(rewardComponentSchema).optional()
```

---

### Task 3: Error Handling (Issues 4 & 7)
**Agent:** tdd-implementer-3
**Branch:** `fix/error-handling`
**Files:** `src/index.ts`, `src/http.ts`
**Tests:** Simulate startup failures and unhandled rejections

**Issue 4 - Unhandled Promise (index.ts:42):**
```typescript
// BEFORE
start();

// AFTER
start().catch((error) => {
  logger.error('Fatal error during startup', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
```

**Issue 7 - Global Error Handlers:**
```typescript
// Add to both index.ts and http.ts
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
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

### Task 4: HTTP Server Fixes (Issues 6 & 10)
**Agent:** tdd-implementer-4
**Branch:** `fix/http-server`
**Files:** `src/http.ts`
**Tests:** Concurrent session tests, memory leak tests

**Issue 6 - Memory Leak (http.ts:37-76):**
```typescript
// BEFORE
this.pending.add(session);
try {
  await server.connect(session.transport);
  return session;
} catch (error) {
  this.pending.delete(session);
  throw error;
}

// AFTER
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

**Issue 10 - Race Condition (http.ts:146-147):**
```typescript
// BEFORE
async evictIdleSessions(): Promise<void> {
  const staleSessions = Array.from(this.sessions.values()).filter(
    (session) => session.lastUsed < cutoff && !session.closing
  );
  for (const session of staleSessions) {
    await this.destroySession(session);
  }
}

// AFTER
async evictIdleSessions(): Promise<void> {
  const staleSessions = Array.from(this.sessions.values()).filter(
    (session) => session.lastUsed < cutoff && !session.closing
  );
  const toDestroy: SessionContext[] = [];
  for (const session of staleSessions) {
    if (!session.closing) {
      session.closing = true;  // Atomic flag
      toDestroy.push(session);
    }
  }
  for (const session of toDestroy) {
    await this.destroySession(session);
  }
}
```

---

### Task 5: Input Validation & API Client (Issues 8 & 9)
**Agent:** tdd-implementer-5
**Branch:** `fix/validation-and-api`
**Files:** `src/client/stakekit.ts`, `src/tools/yields.ts`
**Tests:** Test undefined status codes, invalid parameters

**Issue 8 - Status Code Validation (stakekit.ts:86-90):**
```typescript
// BEFORE
const status =
  axiosError.response?.status ??
  (axiosError as { status?: number }).status ??
  (axiosError.request as { res?: { statusCode?: number } } | undefined)?.res?.statusCode;

// AFTER
const status: number | undefined =
  axiosError.response?.status ??
  (axiosError as { status?: number }).status ??
  (axiosError.request as { res?: { statusCode?: number } } | undefined)?.res?.statusCode;

const isAuthError = status === 401;
const isServerError = status !== undefined && RETRY_STATUS_CODES.has(status);
```

**Issue 9 - Input Validation (yields.ts:194-199):**
```typescript
// BEFORE
const toListParams = (args: z.infer<typeof paginationSchema> & Record<string, unknown>) => {
  const params: Record<string, unknown> = {};
  params.limit = ensurePositiveLimit(args.limit);
  if (args.offset !== undefined) {
    params.offset = args.offset;  // Could be any type
  }
  return params;
};

// AFTER
const toListParams = (args: z.infer<typeof paginationSchema>) => {
  const params: Record<string, string | number> = {};
  params.limit = ensurePositiveLimit(args.limit);
  if (args.offset !== undefined && typeof args.offset === 'number' && args.offset >= 0) {
    params.offset = args.offset;
  }
  return params;
};
```

---

## Parallel Execution Plan

Launch 5 TDD-implementer agents simultaneously:

```bash
# Agent 1: Performance fixes
tdd-implementer --branch fix/performance-o-n-squared --issues 1,2

# Agent 2: Type safety fixes
tdd-implementer --branch fix/type-safety --issues 3,5

# Agent 3: Error handling fixes
tdd-implementer --branch fix/error-handling --issues 4,7

# Agent 4: HTTP server fixes
tdd-implementer --branch fix/http-server --issues 6,10

# Agent 5: Validation & API fixes
tdd-implementer --branch fix/validation-and-api --issues 8,9
```

---

## Merge Strategy

After all agents complete:

1. **Verify each branch:**
   - All tests passing
   - Build successful
   - No conflicts with main

2. **Merge order (to minimize conflicts):**
   1. `fix/type-safety` (changes schemas)
   2. `fix/performance-o-n-squared` (changes yields.ts)
   3. `fix/validation-and-api` (changes yields.ts, stakekit.ts)
   4. `fix/error-handling` (changes index.ts, http.ts)
   5. `fix/http-server` (changes http.ts)

3. **Final verification:**
   - Run full test suite
   - Test all 14 MCP tools via stdio
   - Performance benchmark with 500+ yields

---

## Success Criteria

- ✅ All 28 unit tests passing
- ✅ All 10 issues fixed and verified
- ✅ No new issues introduced
- ✅ All 14 MCP tools functional
- ✅ Performance improved for large datasets
- ✅ Better error handling and logging
- ✅ Stronger type safety throughout

---

## Rollback Plan

If merge conflicts occur or tests fail:
- Each branch is independent and can be applied separately
- Can cherry-pick individual commits
- Can revert specific branches if needed

---

## Timeline

- **Parallel execution:** ~15-20 minutes (5 agents working simultaneously)
- **Merge & verification:** ~10 minutes
- **Total estimated time:** ~30 minutes

---

## Documentation Updates Needed

After successful merge:
- Update FINAL_STATUS.md with code quality improvements
- Document performance improvements
- Update testing recommendations
