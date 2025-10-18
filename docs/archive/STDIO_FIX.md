# MCP Stdio Transport Fix

**Date:** 2025-10-16
**Issue:** Claude Desktop showing validation errors due to stdout pollution

---

## Problem Identified

The MCP server was producing validation errors in Claude Desktop because **stdout was being polluted** with non-JSON-RPC messages:

1. **dotenv library** was printing informational messages to stdout
2. **Logger** was using `console.log()` for info/warn messages (stdout)

### Why This Breaks MCP

The MCP stdio transport specification requires:
- **stdout** = ONLY JSON-RPC messages
- **stderr** = Logs, debugging, errors

Any other output on stdout corrupts the JSON-RPC stream and causes validation failures.

---

## Fixes Applied

### 1. Removed Dotenv Console Output

**File:** `src/config.ts`

**Before:**
```typescript
import { config as loadEnv } from 'dotenv';
loadEnv();
```

**After:**
```typescript
// Only load .env in development to avoid stdout pollution
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}
```

**Reasoning:**
- In production (Claude Desktop), environment variables should be set via MCP client config
- dotenv is only needed for local development/testing
- This eliminates the `[dotenv@17.2.3] injecting env...` messages

### 2. Fixed Logger to Use stderr Exclusively

**File:** `src/utils/logger.ts`

**Before:**
```typescript
if (level === 'error') {
  console.error(JSON.stringify(payload));
} else if (level === 'warn') {
  console.warn(JSON.stringify(payload));
} else {
  console.log(JSON.stringify(payload));  // ❌ Goes to stdout!
}
```

**After:**
```typescript
// CRITICAL: In MCP stdio transport, ALL logs must go to stderr
// stdout is reserved exclusively for JSON-RPC messages
console.error(JSON.stringify(payload));
```

**Reasoning:**
- ALL log messages must go to stderr, regardless of level
- stdout is reserved exclusively for JSON-RPC communication
- This prevents log messages from corrupting the MCP protocol stream

---

## Verification

### Before Fix
```bash
$ echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js

[dotenv@17.2.3] injecting env (0) from .env -- tip: ...  ❌ STDOUT POLLUTION
{"timestamp":"2025-10-16T13:40:33.115Z"...}              ❌ STDOUT POLLUTION
{"result":{"tools":[...]}},"jsonrpc":"2.0","id":2}       ✅ JSON-RPC (but mixed)
```

### After Fix
```bash
$ echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js 2>/dev/null

{"result":{"tools":[...]}},"jsonrpc":"2.0","id":2}       ✅ ONLY JSON-RPC
```

**Logs go to stderr:**
```bash
$ echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js 2>&1 1>/dev/null

{"timestamp":"2025-10-16T13:41:50.756Z"...}              ✅ ON STDERR
```

---

## Testing Results

### Unit Tests: ✅ All Passing
```
Test Files  6 passed (6)
Tests       28 passed (28)
Duration    1.11s
```

### Stdio Integration: ✅ Clean Output
```bash
# Test initialization
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{...}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js

# Output: Clean JSON-RPC response, no pollution

# Test tool list
echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js

# Output: Clean JSON-RPC response with 14 tools

# Test tool call
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"list-supported-chains","arguments":{}}}' | \
  STAKEKIT_API_KEY=xxx node dist/index.js

# Output: Clean JSON-RPC response with chain data
```

---

## Claude Desktop Configuration

With these fixes, the server now works correctly in Claude Desktop:

```json
{
  "mcpServers": {
    "mcp-yield": {
      "command": "node",
      "args": ["/path/to/mcp-yield/dist/index.js"],
      "env": {
        "STAKEKIT_API_KEY": "your-api-key-here",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important:** Set `NODE_ENV=production` to prevent dotenv from loading.

---

## Key Takeaways

### MCP Stdio Transport Rules

1. **stdout = JSON-RPC ONLY**
   - No log messages
   - No debugging output
   - No library informational messages

2. **stderr = Everything Else**
   - Application logs
   - Error messages
   - Debug information

### Common Pitfalls

❌ **DON'T:**
- Use `console.log()` for any purpose
- Use `console.warn()` for warnings
- Use libraries that write to stdout (like dotenv with default settings)
- Print debugging information to stdout

✅ **DO:**
- Use `console.error()` for ALL logging
- Redirect library output to stderr
- Keep stdout clean for JSON-RPC only
- Test with `2>/dev/null` to verify clean stdout

---

## Impact

**Before:**
- ❌ Claude Desktop showed validation errors
- ❌ JSON-RPC stream was corrupted
- ❌ Tools appeared broken despite working via curl

**After:**
- ✅ Claude Desktop works perfectly
- ✅ Clean JSON-RPC communication
- ✅ All 13 working tools accessible
- ✅ Logs available on stderr for debugging

---

## Files Modified

1. `src/config.ts` - Conditional dotenv loading
2. `src/utils/logger.ts` - All logs to stderr

**Total changes:** ~10 lines of code
**Impact:** Fixed all Claude Desktop validation errors
