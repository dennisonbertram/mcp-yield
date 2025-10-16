#!/bin/bash

# Test script for MCP server STDIO interface with real API

export STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929"

echo "Testing MCP server with real API..."
echo ""

echo "1. Initializing connection..."
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | node dist/index.js 2>/dev/null | jq -r '.result.serverInfo'

echo ""
echo "2. Listing available tools..."
echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929" node dist/index.js 2>/dev/null | jq -r '.result.tools[] | "\(.name): \(.description)"' | head -5

echo ""
echo "3. Testing list-supported-chains tool with real API..."
echo '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"list-supported-chains","arguments":{"includeTestnets":false}}}' | STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929" node dist/index.js 2>/dev/null | jq -r '.result.structuredContent.items[:3] | map("\(.name) (\(.id))")[]'

echo ""
echo "4. Testing list-protocols tool (now using providers endpoint)..."
echo '{"jsonrpc":"2.0","method":"tools/call","id":4,"params":{"name":"list-protocols","arguments":{}}}' | STAKEKIT_API_KEY="e71fed90-9b4d-46b8-9358-98d8777bd929" node dist/index.js 2>/dev/null | jq -r '.result.structuredContent.items[:3] | map("\(.name)")[]' 2>/dev/null || echo "No providers returned (may be empty)"

echo ""
echo "Test complete!"