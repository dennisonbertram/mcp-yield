#!/bin/bash

source .env

echo "Testing MCP server with real API..."
echo ""

node dist/index.js << 'EOF'
{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-yield-opportunities","arguments":{"limit":2}}}
{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"get-staking-yields","arguments":{"limit":2}}}
{"jsonrpc":"2.0","method":"tools/call","id":4,"params":{"name":"list-supported-chains","arguments":{}}}
EOF

echo ""
echo "Test complete!"