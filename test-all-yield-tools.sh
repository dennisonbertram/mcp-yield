#!/bin/bash

source .env

echo "Testing all yield-related MCP tools..."
echo "======================================="
echo ""

# List of tools to test
TOOLS=(
    "get-yield-opportunities"
    "get-yield-details"
    "get-yields-by-network"
    "get-yields-by-token"
    "get-staking-yields"
    "get-lending-yields"
    "get-vault-yields"
    "get-top-yields"
    "list-supported-chains"
    "get-chain-details"
    "list-protocols"
    "get-protocol-details"
)

# Test each tool
for tool in "${TOOLS[@]}"; do
    echo "Testing: $tool"

    # Build request based on tool
    case "$tool" in
        "get-yield-details")
            ARGS='{"yieldId":"ethereum-eth-lido-staking"}'
            ;;
        "get-yields-by-network")
            ARGS='{"network":"ethereum","limit":1}'
            ;;
        "get-yields-by-token")
            ARGS='{"token":"ETH","limit":1}'
            ;;
        "get-chain-details")
            ARGS='{"chainId":"ethereum"}'
            ;;
        "get-protocol-details")
            ARGS='{"protocolId":"lido"}'
            ;;
        *)
            ARGS='{"limit":1}'
            ;;
    esac

    RESULT=$(echo "{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"id\":1,\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}
{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"id\":2,\"params\":{\"name\":\"$tool\",\"arguments\":$ARGS}}" | node dist/index.js 2>&1 | grep '"id":2' | grep -q '"isError":true')

    if [ $? -eq 0 ]; then
        echo "  ❌ FAILED"
    else
        echo "  ✅ SUCCESS"
    fi
done

echo ""
echo "Test complete!"