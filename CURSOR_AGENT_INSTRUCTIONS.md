# MCP Yield Server - Implementation Instructions for Cursor Agent

## Project Overview

Build an MCP (Model Context Protocol) server that provides DeFi yield data through the StakeKit API. This server will expose tools, resources, and prompts to help LLMs access and analyze yield opportunities across multiple blockchain networks.

**Repository**: https://github.com/dennisonbertram/mcp-yield
**API Provider**: StakeKit (yield.xyz)
**API Key**: `e71fed90-9b4d-46b8-9358-98d8777bd929`

## Critical Requirements

### 1. TESTING IS MANDATORY
- **YOU MUST TEST EVERY TOOL YOU BUILD**
- Use both cURL and stdio testing (see Testing Protocol below)
- DO NOT mark a tool as complete until it is tested and working
- An API returning empty results is NOT proof it works - verify thoroughly

### 2. NO HARDCODING
- **NEVER** hardcode the API key in source files
- Use environment variables with .env file support
- API key should only appear in:
  - `.env.example` (as placeholder)
  - Testing commands in this document
  - Environment variable configuration

### 3. COMPLETE IMPLEMENTATION
- Every tool must be fully implemented
- No TODOs or placeholder code
- No partial implementations
- Follow the exact specifications in the planning documents

## Planning Documents Location

All implementation plans are in `/docs/`:
- `0000_overview.md` - Master overview with API analysis
- `0001_server_setup.md` - Server foundation and authentication
- `0002_yield_tools.md` - Yield data retrieval tools (8 tools)
- `0003_chain_protocol_tools.md` - Chain/protocol management (6 tools)
- `0004_resources_prompts.md` - Resources and prompts for LLM context
- `0005_readme_deployment.md` - Documentation and deployment strategy

## Implementation Order

### Phase 1: Foundation (Task 0001)
1. Initialize TypeScript project with proper tsconfig
2. Install dependencies: `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `zod`
3. Create `.env.example` with: `STAKEKIT_API_KEY=your_api_key_here`
4. Implement environment variable loading
5. Create base server structure with MCP SDK
6. Implement StakeKit API client with authentication
7. Add proper error handling and logging

**Test Foundation**: Verify server starts and can make authenticated API calls

### Phase 2: Yield Tools (Task 0002)
Implement all 8 yield data tools in `0002_yield_tools.md`:
1. `get-yield-opportunities` - List all available yields
2. `get-yield-details` - Get specific yield details by ID
3. `get-yields-by-network` - Filter yields by blockchain
4. `get-yields-by-token` - Filter yields by token symbol
5. `get-staking-yields` - Get staking-specific yields
6. `get-lending-yields` - Get lending-specific yields
7. `get-vault-yields` - Get vault-specific yields
8. `get-top-yields` - Get highest APY yields

**Test Each Tool**: Use both cURL and stdio testing protocol (see below)

### Phase 3: Chain/Protocol Tools (Task 0003)
Implement all 6 tools in `0003_chain_protocol_tools.md`:
1. `list-supported-chains` - List all blockchain networks
2. `get-chain-details` - Get specific chain information
3. `list-supported-tokens` - List all supported tokens
4. `get-token-details` - Get token information
5. `list-protocols` - List DeFi protocols
6. `get-protocol-details` - Get protocol information

**Test Each Tool**: Use both cURL and stdio testing protocol

### Phase 4: Resources & Prompts (Task 0004)
Implement dynamic resources and prompts from `0004_resources_prompts.md`:
- 4 dynamic resources (yield opportunities, networks, tokens, protocols)
- 5 interactive prompts (compare yields, find optimal yield, etc.)

### Phase 5: Documentation & Deployment (Task 0005)
- Create comprehensive README
- Add usage examples
- Document all tools, resources, and prompts
- Create deployment guide

## Testing Protocol

### Environment Setup
```bash
# Create .env file (DO THIS FIRST)
echo 'STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929' > .env
```

### cURL Testing (Direct API)
Test the StakeKit API directly to understand expected responses:

```bash
# Test authentication and basic endpoint
curl -X GET 'https://api.stakek.it/v2/yields' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929' \
  -s | jq '.' | head -50

# Test specific yield details
curl -X GET 'https://api.stakek.it/v2/yields/ethereum-eth-lido-staking' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929' \
  -s | jq '.'

# Test network filtering
curl -X GET 'https://api.stakek.it/v2/yields?network=ethereum' \
  -H 'X-API-KEY: e71fed90-9b4d-46b8-9358-98d8777bd929' \
  -s | jq '.'
```

### stdio Testing (MCP Server)

After building the server (`npm run build`):

```bash
# Step 1: Initialize connection
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js

# Step 2: List available tools
echo '{"jsonrpc":"2.0","method":"tools/list","id":2,"params":{}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js

# Step 3: Test get-yield-opportunities tool
echo '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"get-yield-opportunities","arguments":{"limit":5}}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js

# Step 4: Test get-yield-details tool
echo '{"jsonrpc":"2.0","method":"tools/call","id":4,"params":{"name":"get-yield-details","arguments":{"yieldId":"ethereum-eth-lido-staking"}}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js

# Step 5: List resources
echo '{"jsonrpc":"2.0","method":"resources/list","id":5,"params":{}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js

# Step 6: List prompts
echo '{"jsonrpc":"2.0","method":"prompts/list","id":6,"params":{}}' | STAKEKIT_API_KEY=e71fed90-9b4d-46b8-9358-98d8777bd929 node dist/index.js
```

## Project Structure

```
mcp-yield/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── config.ts             # Environment configuration
│   ├── client/
│   │   └── stakekit.ts       # StakeKit API client
│   ├── tools/
│   │   ├── yields.ts         # Yield data tools
│   │   └── chains.ts         # Chain/protocol tools
│   ├── resources/
│   │   └── index.ts          # Dynamic resources
│   ├── prompts/
│   │   └── index.ts          # Interactive prompts
│   └── types/
│       └── stakekit.ts       # TypeScript types
├── dist/                     # Build output (gitignored)
├── docs/                     # Planning documentation
├── .env                      # Environment variables (gitignored)
├── .env.example             # Example environment file
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Success Criteria

Before considering the project complete:

1. ✅ All 14 tools implemented and tested
2. ✅ All 4 resources working and returning data
3. ✅ All 5 prompts functional
4. ✅ stdio testing passes for all tools
5. ✅ cURL testing validates API responses
6. ✅ No hardcoded API keys in source
7. ✅ Comprehensive README with examples
8. ✅ All TypeScript compiles without errors
9. ✅ Proper error handling throughout
10. ✅ Environment variable configuration working

## Dependencies to Install

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.7.2"
  }
}
```

## API Documentation Reference

StakeKit API Base URL: `https://api.stakek.it/v2`

Key endpoints:
- `GET /yields` - List all yield opportunities
- `GET /yields/{id}` - Get specific yield details
- `GET /networks` - List supported blockchain networks
- `GET /tokens` - List supported tokens

Authentication: Use `X-API-KEY` header with value `e71fed90-9b4d-46b8-9358-98d8777bd929`

## Common Pitfalls to Avoid

1. **Don't assume it works** - Always test with real API calls
2. **Don't hardcode secrets** - Use environment variables
3. **Don't skip error handling** - StakeKit API can return errors
4. **Don't leave TODOs** - Complete every implementation fully
5. **Don't guess at schemas** - Test API responses and define accurate types
6. **Don't forget newline termination** - stdio messages must end with \n
7. **Don't batch completions** - Test and verify each tool individually

## Getting Started

1. Read all planning docs in `/docs/`
2. Start with Phase 1 (server foundation)
3. Test API access with cURL commands above
4. Implement tools one at a time
5. Test each tool with stdio protocol before moving on
6. Document as you go
7. Verify all success criteria before completion

## Questions or Issues?

Refer to planning documents in `/docs/` for detailed specifications. Each task document contains:
- API endpoint specifications
- Expected request/response formats
- Error handling requirements
- Testing strategies
- Implementation checklists

**Remember**: The goal is production-ready code. Every tool must work perfectly before the project is complete.
