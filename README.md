# MCP Yield Server

A production-ready Model Context Protocol (MCP) server that provides AI assistants with access to comprehensive DeFi yield data from StakeKit/yield.xyz. Discover and compare staking, lending, and vault opportunities across 50+ networks with real-time APY data and risk metrics.

## Features

- **14 specialized tools** for querying yield opportunities, networks, tokens, and protocols
- **5 guided prompts** for common workflows (yield comparison, network due diligence, etc.)
- **Dynamic resources** providing contextual data for enhanced AI responses
- **Type-safe API integration** with comprehensive error handling
- **Multiple transport modes**: stdio (for Claude Desktop) and HTTP (for remote access)
- **Production-grade logging** with structured output via Pino

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm 9+
- A StakeKit API key from [api.stakek.it](https://api.stakek.it)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd mcp-yield
npm install

# Configure your API key
cp .env.example .env
# Edit .env and set: STAKEKIT_API_KEY=your_api_key_here
```

### Build

```bash
npm run build
```

## Usage

### Option 1: Claude Desktop Integration (Recommended)

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yield": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-yield/dist/index.js"
      ],
      "env": {
        "STAKEKIT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-yield` with the actual path to your installation.

Restart Claude Desktop and the yield tools will be available in your conversations.

### Option 2: Stdio Mode (Manual Testing)

```bash
# Start the server in stdio mode
STAKEKIT_API_KEY=your_key npm run start:stdio

# Test with JSON-RPC commands via stdin
echo '{"jsonrpc":"2.0","method":"tools/list","id":1,"params":{}}' | \
  STAKEKIT_API_KEY=your_key node dist/index.js
```

### Option 3: HTTP Mode (Remote Access)

```bash
# Start HTTP server on port 3000
STAKEKIT_API_KEY=your_key PORT=3000 npm run start:http

# The server exposes:
# - POST /mcp - JSON-RPC endpoint
# - GET /health - Health check endpoint
```

## Available Tools

The server provides 14 tools organized into three categories:

### Yield Discovery (8 tools)

- `get-yield-opportunities` - Paginated list of all yield opportunities
- `get-yield-details` - Detailed breakdown for a specific yield
- `get-yields-by-network` - Filter yields by blockchain network
- `get-yields-by-token` - Find yields supporting a specific token
- `get-staking-yields` - Staking and liquid staking opportunities
- `get-lending-yields` - Lending markets with collateral metrics
- `get-vault-yields` - Vault strategies with fee data
- `get-top-yields` - Highest APY opportunities with filters

### Network & Token Catalog (4 tools)

- `list-supported-chains` - All supported blockchain networks
- `get-chain-details` - Network metadata and top yields
- `list-supported-tokens` - Token catalog with network coverage
- `get-token-details` - Token metadata and supporting yields

### Protocol Analysis (2 tools)

- `list-protocols` - DeFi protocol directory with metrics
- `get-protocol-details` - Protocol deep-dive and APY statistics

## Guided Prompts

The server includes 5 intelligent prompts to guide common workflows:

- `compare-yields` - Compare multiple yield opportunities side-by-side
- `find-optimal-yield` - Find best yields matching specific criteria
- `network-due-diligence` - Generate risk assessment for a network
- `protocol-risk-review` - Analyze protocol safety and yields
- `token-yield-availability` - Discover all yield options for a token

## Configuration

Environment variables can be set in `.env` or passed directly:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STAKEKIT_API_KEY` | Yes | - | Your StakeKit API key |
| `STAKEKIT_BASE_URL` | No | `https://api.stakek.it/v2` | Primary API endpoint |
| `STAKEKIT_FALLBACK_URL` | No | `https://api.yield.xyz/v1` | Fallback endpoint |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |
| `PORT` | No | `3000` | HTTP server port |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type checking
npm run lint

# Run with live API (requires STAKEKIT_API_KEY)
RUN_LIVE_TESTS=1 npm test
```

Test coverage includes:
- Unit tests for all tools and utilities
- Integration tests with mocked API responses
- Type safety validation
- Error handling scenarios

## Example Usage

### Via Claude Desktop

Once configured, you can ask Claude:

> "Show me the top 5 staking yields on Ethereum with at least $1M TVL"

> "Compare the yields for USDC lending across Aave and Compound"

> "What are the risks of staking ETH with Lido?"

### Via Stdio (Manual)

```bash
# Get top yields
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":2,
  "params":{
    "name":"get-top-yields",
    "arguments":{"limit":5,"minTvlUsd":1000000}
  }
}' | STAKEKIT_API_KEY=your_key node dist/index.js

# Get chain details
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":3,
  "params":{
    "name":"get-chain-details",
    "arguments":{"networkId":"ethereum"}
  }
}' | STAKEKIT_API_KEY=your_key node dist/index.js
```

## Docker Deployment

```bash
# Build the Docker image
docker build -t mcp-yield .

# Run in stdio mode
docker run --rm -e STAKEKIT_API_KEY=your_key mcp-yield

# Run in HTTP mode
docker run --rm -p 3000:3000 \
  -e STAKEKIT_API_KEY=your_key \
  -e PORT=3000 \
  mcp-yield npm run start:http
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Authentication failed" errors | Verify `STAKEKIT_API_KEY` is set correctly in `.env` or environment |
| "Tool not found" in Claude | Restart Claude Desktop after updating config |
| Rate limiting (429 errors) | Wait a few seconds; the client auto-retries transient errors |
| Type validation errors | Update to latest version; API schema may have changed |
| Empty tool responses | Check API key permissions and network connectivity |

## Development

### Project Structure

```
mcp-yield/
├── src/
│   ├── tools/          # Tool implementations (yields, chains)
│   ├── resources/      # Dynamic resources
│   ├── prompts/        # Guided prompts
│   ├── client/         # StakeKit API client
│   ├── types/          # TypeScript types and Zod schemas
│   ├── services/       # Business logic
│   └── utils/          # Shared utilities
├── tests/              # Test suites
├── docs/               # Planning and documentation
│   └── archive/        # Historical test reports
└── dist/               # Compiled output
```

### Development Workflow

1. Create feature branch from `main`
2. Write tests first (TDD approach)
3. Implement features with type safety
4. Run `npm run lint && npm test` before committing
5. Update documentation alongside code changes

### Important Technical Notes

- **Strict TypeScript**: No `any` types; comprehensive type safety throughout
- **Error handling**: All API errors are caught and formatted as MCP-compatible errors
- **Schema validation**: Zod schemas validate all API responses
- **Filtering**: Malformed API data is filtered out gracefully
- **Retry logic**: Automatic retry with exponential backoff for transient failures

## Documentation

- **Planning docs**: See `docs/` for detailed planning and implementation notes
- **Test archive**: Historical test reports in `docs/archive/`
- **Development log**: `DEVELOPMENT.md` contains TDD methodology and progress
- **Fix summaries**: Technical details in `CODE_REVIEW_FIX_PLAN.md`, `PARALLEL_FIX_SUMMARY.md`, etc.

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [StakeKit API Documentation](https://docs.yield.xyz/)
- [Claude Desktop](https://claude.ai/download)

## License

MIT

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass and type checking succeeds
5. Submit a pull request with a clear description

## Support

For issues or questions:
- GitHub Issues: Report bugs or request features
- Documentation: Check `docs/` for detailed technical information
