#!/bin/bash

API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929"

echo "=== MCP Yield Server - Manual Tool Testing ==="
echo ""

# Test each tool
test_tool() {
    local tool_name=$1
    local args=$2
    echo "Testing: $tool_name"

    result=$(echo "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"id\":1,\"params\":{\"name\":\"$tool_name\",\"arguments\":$args}}" | \
        STAKEKIT_API_KEY=$API_KEY node dist/index.js 2>/dev/null)

    if echo "$result" | grep -q '"isError":true'; then
        echo "  ❌ FAILED"
        echo "$result" | grep -o '"text":"[^"]*"' | head -1
    elif echo "$result" | grep -q '"result"'; then
        echo "  ✅ SUCCESS"
        # Try to extract some data
        echo "$result" | grep -o '"items":\[' > /dev/null && echo "    Has items array"
        echo "$result" | grep -o '"id":' | head -1 > /dev/null && echo "    Has id field"
    else
        echo "  ⚠️  UNKNOWN"
    fi
    echo ""
}

# Yield tools
test_tool "get-yield-opportunities" '{"limit":5}'
test_tool "get-yields-by-network" '{"networkId":"ethereum","limit":3}'
test_tool "get-yields-by-token" '{"tokenSymbol":"ETH","limit":3}'
test_tool "get-staking-yields" '{"limit":5}'
test_tool "get-lending-yields" '{"limit":5}'
test_tool "get-vault-yields" '{"limit":5}'
test_tool "get-top-yields" '{"limit":5}'

# Chain tools
test_tool "list-supported-chains" '{}'
test_tool "list-supported-tokens" '{"limit":10}'
test_tool "list-protocols" '{}'

echo "=== Testing Complete ==="
