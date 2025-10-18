# MCP Yield Server - Testing Guide

This document provides reference commands for testing the MCP yield server.

## Prerequisites

```bash
# Set environment variables
export STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929"
export NODE_ENV="production"

# Navigate to server directory
cd /Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield

# Ensure built
npm run build
```

## Basic Server Tests

### 1. Initialize Server Connection

```bash
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.'
```

### 2. List Available Tools

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.tools | length'
```

### 3. List Available Prompts

```bash
echo '{"jsonrpc":"2.0","method":"prompts/list","id":3,"params":{}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.prompts | map(.name)'
```

## Parameter Fix Verification Tests

### Test Fix 1: get-yields-by-network (networkId → network)

```bash
# Old parameter (should fail)
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yields-by-network","arguments":{"networkId":"ethereum","limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null

# New parameter (should work)
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-yields-by-network","arguments":{"network":"ethereum","limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .meta'
```

### Test Fix 2: Enum Validation (type parameter)

```bash
# Valid enum value
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-opportunities","arguments":{"type":"staking","limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .items | length'

# Invalid enum value (should show error)
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-yield-opportunities","arguments":{"type":"invalid"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.error.message'
```

### Test Fix 3: Removed Parameters

```bash
# Test get-staking-yields (includeLiquid removed)
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-staking-yields","arguments":{"limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .items | length'

# Test get-lending-yields (protocol removed)
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-lending-yields","arguments":{"limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .items | length'

# Test get-vault-yields (strategy removed)
echo '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"get-vault-yields","arguments":{"limit":3}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .items | length'
```

## Tool Functionality Tests

### Network Tools

```bash
# List supported chains
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"list-supported-chains","arguments":{}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .chains | length'

# Get Ethereum details
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-chain-details","arguments":{"networkId":"ethereum"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .chain.name'
```

### Token Tools

```bash
# List supported tokens
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"list-supported-tokens","arguments":{"limit":5}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .tokens | length'

# Get ETH token details
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-token-details","arguments":{"symbol":"ETH"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .token.symbol'
```

### Protocol Tools

```bash
# List all protocols
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"list-protocols","arguments":{}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .protocols | length'

# Get Lido protocol details
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-protocol-details","arguments":{"protocolId":"lido"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .protocol.name'
```

### Yield Tools

```bash
# Get yield opportunities with staking filter
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-opportunities","arguments":{"type":"staking","limit":5}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | {count: (.items | length), totalCount: .meta.totalCount}'

# Get Ethereum yields
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-yield-opportunities","arguments":{"network":"ethereum","limit":5}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .meta.totalCount'

# Get yield details
echo '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"get-yield-details","arguments":{"yieldId":"ethereum-eth-lido-staking"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | .overview.name'
```

## Pagination Tests

```bash
# Test offset pagination
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-opportunities","arguments":{"limit":5,"offset":0}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | {offset: .meta.offset, count: (.items | length), hasNextPage: .meta.hasNextPage}'

echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-yield-opportunities","arguments":{"limit":5,"offset":5}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.content[0].text | fromjson | {offset: .meta.offset, count: (.items | length), hasNextPage: .meta.hasNextPage}'
```

## Error Handling Tests

```bash
# Missing required parameter
echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-details","arguments":{}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.error.message | split(":")[0]'

# Invalid network ID
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-chain-details","arguments":{"networkId":"invalid-network"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.error.message'

# Invalid enum value
echo '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"get-top-yields","arguments":{"type":"invalid"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.error.code'
```

## stdout Cleanliness Tests

```bash
# Verify stdout is pure JSON-RPC (no log lines)
response=$(echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null)

# Should be valid JSON
echo "$response" | jq . > /dev/null && echo "Valid JSON: YES" || echo "Valid JSON: NO"

# Should not contain log markers
echo "$response" | grep -E 'timestamp.*level.*message' && echo "Has logs: YES" || echo "Has logs: NO"

# Should be single line
line_count=$(echo "$response" | wc -l)
echo "Line count: $line_count"
```

## Prompt Tests

```bash
# Get prompt definition
echo '{"jsonrpc":"2.0","method":"prompts/get","id":1,"params":{"name":"find-optimal-yield","arguments":{"networkId":"ethereum"}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result | keys'

# List all prompts
echo '{"jsonrpc":"2.0","method":"prompts/list","id":2,"params":{}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null | jq '.result.prompts | map(.name)'
```

## Performance Benchmarking

```bash
# Simple query timing
time (echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"list-supported-chains","arguments":{}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null > /dev/null)

# Complex query timing
time (echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-opportunities","arguments":{"type":"staking","network":"ethereum","limit":100}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null > /dev/null)

# Pagination timing
time (echo '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"get-yield-opportunities","arguments":{"limit":50,"offset":1000}}}' | \
  STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 NODE_ENV=production node dist/index.js 2>/dev/null > /dev/null)
```

## Common Issues & Troubleshooting

### Issue: "STAKEKIT_API_KEY is required"
**Solution:** Set the environment variable before running
```bash
export STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929"
```

### Issue: "Invalid arguments" error
**Solution:** Check the parameter name matches the new schema
- Old: `networkId` → New: `network`
- Old: `includeLiquid` → Removed
- Old: `cursor` → Removed

### Issue: stdout contains logs
**Solution:** Redirect stderr to /dev/null
```bash
command 2>/dev/null
```

### Issue: get-top-yields returns empty
**Solution:** This is expected - API returns null for APY values. Use get-yield-opportunities instead.

## Quick Reference: All Tools

| Tool | Required Params | Optional Params | Example |
|------|-----------------|-----------------|---------|
| list-supported-chains | None | includeTestnets | `{}` |
| get-chain-details | networkId | None | `{"networkId":"ethereum"}` |
| list-supported-tokens | None | networkId, symbol, limit | `{"limit":10}` |
| get-token-details | symbol | networkId | `{"symbol":"ETH"}` |
| list-protocols | None | category, chain | `{}` |
| get-protocol-details | protocolId | None | `{"protocolId":"lido"}` |
| get-yield-opportunities | None | limit, offset, network, type | `{"type":"staking","limit":5}` |
| get-yield-details | yieldId | None | `{"yieldId":"ethereum-eth-lido-staking"}` |
| get-yields-by-network | network | limit, offset | `{"network":"ethereum","limit":5}` |
| get-yields-by-token | tokenSymbol | limit, offset | `{"tokenSymbol":"ETH","limit":5}` |
| get-staking-yields | None | limit, offset | `{"limit":10}` |
| get-lending-yields | None | limit, offset | `{"limit":10}` |
| get-vault-yields | None | limit, offset | `{"limit":10}` |
| get-top-yields | None | limit, type | `{"limit":5,"type":"staking"}` |

