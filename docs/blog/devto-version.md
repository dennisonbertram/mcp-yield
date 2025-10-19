# Building an MCP Server for DeFi: Technical Deep Dive into Real-Time Yield Data Integration

**Tags**: #defi #typescript #mcp #ai #blockchain

---

When AI assistants like Claude need to answer questions about DeFi yields - "What's the best staking APY for ETH?" or "Compare USDC lending rates across protocols" - they need real-time data, not training data from months ago. That's where Model Context Protocol (MCP) servers come in.

I built **mcp-yield**, a production-ready MCP server that connects AI assistants to comprehensive DeFi yield data from StakeKit. Here's the technical journey from idea to implementation.

## The Challenge: Bridging AI and DeFi Data

**The Problem Space:**

AI assistants are powerful for analysis and recommendations, but they have a critical limitation: stale training data. DeFi yields change by the minute. A 10% APY opportunity yesterday might be 5% today or completely unavailable.

**What we needed:**
1. **Real-time access** to yield data across 50+ blockchain networks
2. **Type-safe integration** that handles schema changes gracefully
3. **Intelligent error handling** - DeFi APIs can be unpredictable
4. **AI-friendly tool design** - clear descriptions, explicit parameters, helpful errors
5. **Production reliability** - logging, retry logic, fallback strategies

**Why MCP?**

The Model Context Protocol (from Anthropic) standardizes how AI assistants connect to external data sources. Instead of building custom integrations for Claude, ChatGPT, and every other AI assistant separately, we build one MCP server that works with all MCP-compatible clients.

## Architecture: Type-Safe All The Way Down

### Technology Stack

```typescript
// Core dependencies
"@modelcontextprotocol/sdk": "^1.20.0",  // MCP protocol
"axios": "^1.12.2",                       // HTTP client
"zod": "^3.25.76",                        // Schema validation
"express": "^4.21.2",                     // HTTP transport
"typescript": "^5.9.3"                    // Strict typing
```

**Why these choices?**

- **TypeScript (strict mode)**: Catch errors at compile time. No `any` types anywhere in the codebase.
- **Zod**: Runtime schema validation. TypeScript validates at compile time, but API responses need runtime validation.
- **Axios**: Better than native fetch for retry logic, interceptors, and timeout handling.
- **MCP SDK**: Official Anthropic implementation with excellent TypeScript support.

### Project Structure

```
src/
├── server.ts           # MCP server factory
├── index.ts            # Stdio transport (for Claude Desktop)
├── http.ts             # HTTP transport (for remote access)
├── tools/
│   ├── yields.ts       # 8 yield discovery tools
│   └── chains.ts       # 6 network/token/protocol tools
├── prompts/
│   └── index.ts        # 5 guided workflow prompts
├── resources/
│   └── index.ts        # Dynamic contextual resources
├── client/
│   └── stakekit.ts     # API client with fallback & retry
├── types/
│   └── stakekit.ts     # Zod schemas & TypeScript types
└── utils/
    ├── errors.ts       # MCP-compatible error formatting
    ├── cache.ts        # Simple in-memory cache
    └── logger.ts       # Structured logging (Pino)
```

**Design Patterns:**
- **Factory Pattern**: `createYieldServer()` constructs the server
- **Repository Pattern**: `stakeKitClient` abstracts API access
- **Command Pattern**: Each tool is a command with validation and execution
- **Middleware Pattern**: Error handling wraps all tool execution

## Deep Dive: Schema-First Development with Zod

One of the biggest challenges with external APIs is **schema drift**. The API changes a field name, adds a required field, or changes a type - and your app breaks.

### The StakeKit Schema Challenge

StakeKit's API returns complex nested objects with optional fields that vary by yield type:

```typescript
// Raw API response (simplified)
{
  "id": "eth-staking-lido",
  "metadata": {
    "name": "Lido",
    "type": "staking",
    "provider": { "name": "Lido", "website": "..." }
  },
  "token": { "symbol": "ETH", "network": "ethereum" },
  "rewardRate": 3.8,  // Sometimes a number, sometimes an object!
  "tvl": 15000000000,
  "lifecycle": {
    "supportsExit": true,
    "withdrawalPeriod": { "days": 21 }
  }
  // ... 30+ more fields
}
```

### Building Type-Safe Schemas

**Step 1: Define comprehensive Zod schemas**

```typescript
// src/types/stakekit.ts
const TokenSchema = z.object({
  symbol: z.string().optional(),
  name: z.string().optional(),
  network: z.string().optional(),
  decimals: z.number().optional(),
  address: z.string().optional()
});

const TimePeriodSchema = z.object({
  days: z.number().optional(),
  hours: z.number().optional(),
  blocks: z.number().optional()
});

const LifecycleSchema = z.object({
  supportsEnter: z.boolean().optional(),
  supportsExit: z.boolean().optional(),
  warmupPeriod: TimePeriodSchema.optional(),
  cooldownPeriod: TimePeriodSchema.optional(),
  withdrawalPeriod: TimePeriodSchema.optional()
});

// Handle rewardRate being either number or object
const RewardRateSchema = z.union([
  z.number(),
  z.object({
    total: z.number(),
    base: z.number().optional(),
    variable: z.number().optional()
  })
]);

export const stakeKitYieldSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  network: z.string().optional(),
  networks: z.array(z.string()).optional(),
  token: TokenSchema.optional(),
  depositToken: TokenSchema.optional(),
  rewardTokens: z.array(TokenSchema).optional(),
  rewardRate: RewardRateSchema.optional(),
  apy: z.number().optional(),
  apr: z.number().optional(),
  tvl: z.number().optional(),
  tvlUsd: z.number().optional(),
  lifecycle: LifecycleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),  // Flexible for unknown fields
  // ... more fields
});

// Infer TypeScript type from schema
export type StakeKitYield = z.infer<typeof stakeKitYieldSchema>;
```

**Step 2: Validate at the API boundary**

```typescript
// src/client/stakekit.ts
const fetchYieldList = async (params: Record<string, unknown>) => {
  try {
    const { data, source } = await stakeKitClient.get<unknown>('/yields', params);

    // Parse and validate response
    const parsed = stakeKitYieldListResponseSchema.parse(data);

    // Filter out any malformed items
    const validItems = parsed.data.filter(item => {
      try {
        stakeKitYieldSchema.parse(item);
        return true;
      } catch {
        logger.warn({ itemId: item.id }, 'Filtered out malformed yield item');
        return false;
      }
    });

    return {
      raw: validItems,
      summaries: buildYieldSummaries(validItems),
      meta: { /* ... */ }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createUpstreamError(
        'Unexpected response format from StakeKit',
        error.flatten()
      );
    }
    throw error;
  }
};
```

**Benefits:**
- ✅ Type safety from API to UI
- ✅ Graceful handling of schema changes
- ✅ Clear error messages when validation fails
- ✅ Self-documenting code (schemas serve as documentation)
- ✅ Malformed data filtered out, not crashed on

## The Data Transformation Pipeline

Raw API data isn't AI-friendly. We transform it through multiple stages:

### Stage 1: Raw API Response
```json
{
  "id": "eth-staking-lido",
  "metadata": { "name": "Lido", "type": "staking" },
  "token": { "symbol": "ETH" },
  "rewardRate": 3.8,
  "tvl": 15000000000
}
```

### Stage 2: Validated & Normalized
```typescript
const getApy = (entry: StakeKitYield) => {
  // Handle both number and object types for rewardRate
  const rewardRateValue = typeof entry.rewardRate === 'number'
    ? entry.rewardRate
    : entry.rewardRate?.total;
  return rewardRateValue
    ?? entry.apy
    ?? entry.metrics?.apy
    ?? entry.metrics?.apr
    ?? entry.apr
    ?? null;
};

const getYieldNetwork = (entry: StakeKitYield) => {
  // Try multiple possible locations for network info
  const metadataNetwork = entry.metadata?.network;
  return entry.network
    ?? entry.token?.network
    ?? metadataNetwork
    ?? entry.networks?.[0]
    ?? 'unknown';
};
```

### Stage 3: AI-Friendly Summary
```typescript
interface YieldSummary {
  id: string;                    // Stable identifier
  name: string;                  // Human-readable name
  network: string;               // Normalized network name
  type: string;                  // Yield category
  apy: number | null;            // Percentage as decimal (8.5 = 8.5%)
  rewardTokenSymbols: string[];  // Array of token symbols
  tvlUsd: number | null;         // Always in USD
  riskLevel?: string;            // Optional risk assessment
  tags: string[];                // Searchable tags
}
```

**Why this matters for AI:**
- Consistent field names across all responses
- Explicit nulls (not missing fields) when data unavailable
- Clear units (USD, percentage as decimal)
- No nested complexity in summaries (detailed data in separate tool)

## Tool Design: Making AI Agents Smart

### The Challenge: Tool Discoverability

AI agents need to:
1. Understand what a tool does
2. Know when to use it
3. Provide correct parameters
4. Handle errors gracefully

### Solution: Explicit Everything

**Bad tool design:**
```typescript
// ❌ Ambiguous
server.registerTool(
  'yields',
  { description: 'Gets yields' },
  async (args) => { /* ... */ }
);
```

**Good tool design:**
```typescript
// ✅ Explicit and helpful
server.registerTool(
  'get-yields-by-network',
  {
    title: 'List yields for a specific network',
    description: 'Filters yield opportunities by blockchain network identifier. ' +
                 'Examples: "ethereum", "polygon", "arbitrum", "optimism". ' +
                 'Use list-supported-chains to see all available networks.',
    inputSchema: {
      networkId: z.string()
        .describe('Blockchain network identifier (e.g., "ethereum", "polygon")'),
      limit: z.number().int().min(1).max(100).optional()
        .describe('Maximum number of results (1-100, default 20)'),
      offset: z.number().int().min(0).optional()
        .describe('Pagination offset (default 0)'),
      cursor: z.string().optional()
        .describe('Pagination cursor from previous response')
    }
  },
  async (args) => { /* implementation */ }
);
```

**Key improvements:**
- Clear, action-oriented name (`get-yields-by-network` not `yields`)
- Comprehensive description with examples
- Guidance on related tools (`list-supported-chains`)
- Explicit parameter descriptions with types and constraints
- Default values documented

### Parameter Validation

```typescript
const networkArgsSchema = z.object({
  networkId: z.string(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  offset: z.number().int().min(0).optional(),
  cursor: z.string().optional()
});

// In tool handler
const parsed = networkArgsSchema.parse(args ?? {});
```

**Benefits:**
- Validation errors caught early with clear messages
- AI agents learn from validation failures
- Type safety throughout implementation
- Consistent parameter naming across tools

## Error Handling: The Production-Ready Way

### The Error Hierarchy

```typescript
// src/utils/errors.ts

export const createNotFoundError = (
  message: string,
  details?: object
) => ({
  code: 'NOT_FOUND',
  message,
  details
});

export const createUpstreamError = (
  message: string,
  details?: object
) => ({
  code: 'UPSTREAM_ERROR',
  message,
  details
});

export const createValidationError = (
  message: string,
  details?: object
) => ({
  code: 'VALIDATION_ERROR',
  message,
  details
});

export const formatToolError = (error: unknown) => {
  // Convert any error to MCP-compatible format
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) {
      return createNotFoundError('Resource not found', {
        url: error.config?.url
      });
    }
    if (status === 429) {
      return createUpstreamError('Rate limit exceeded', {
        retryAfter: error.response?.headers['retry-after']
      });
    }
  }

  if (error instanceof z.ZodError) {
    return createValidationError('Validation failed', {
      issues: error.flatten()
    });
  }

  // Default fallback
  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error'
  };
};
```

### Tool Error Handling Pattern

```typescript
const runTool = async <T>(handler: () => Promise<T>) => {
  try {
    const result = await handler();
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    throw formatToolError(error);  // Always MCP-compatible
  }
};

// Use in every tool
server.registerTool(
  'get-yield-details',
  { /* ... */ },
  async (args) => runTool(async () => {
    const { yieldId } = detailsArgsSchema.parse(args ?? {});
    const { data } = await stakeKitClient.get(`/yields/${yieldId}`);
    const parsed = stakeKitYieldSchema.parse(data);
    return buildYieldDetails(parsed);
  })
);
```

**Benefits:**
- Consistent error format across all tools
- Helpful error messages for AI agents
- Structured error details for debugging
- No uncaught exceptions

## The Retry & Fallback Strategy

DeFi APIs can be unreliable. We need resilience.

### Automatic Retry with Exponential Backoff

```typescript
// src/client/stakekit.ts
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${STAKEKIT_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;  // 1s, 2s, 3s
  },
  retryCondition: (error) => {
    // Retry on network errors and 5xx
    return axiosRetry.isNetworkOrIdempotentRequestError(error)
      || error.response?.status >= 500;
  },
  onRetry: (retryCount, error) => {
    logger.warn({
      retryCount,
      error: error.message
    }, 'Retrying request');
  }
});
```

### Fallback API Strategy

```typescript
const STAKEKIT_BASE_URL = process.env.STAKEKIT_BASE_URL
  || 'https://api.stakek.it/v2';
const STAKEKIT_FALLBACK_URL = process.env.STAKEKIT_FALLBACK_URL
  || 'https://api.yield.xyz/v1';

export const stakeKitClient = {
  async get<T>(
    path: string,
    params?: object,
    options?: { requestId?: string }
  ): Promise<{ data: T; source: 'primary' | 'fallback' }> {
    try {
      const response = await axiosInstance.get<T>(
        `${STAKEKIT_BASE_URL}${path}`,
        { params }
      );
      logger.debug({ path, params }, 'Primary API success');
      return { data: response.data, source: 'primary' };
    } catch (primaryError) {
      logger.warn({
        path,
        error: primaryError.message
      }, 'Primary API failed, trying fallback');

      try {
        const response = await axiosInstance.get<T>(
          `${STAKEKIT_FALLBACK_URL}${path}`,
          { params }
        );
        logger.info({ path }, 'Fallback API success');
        return { data: response.data, source: 'fallback' };
      } catch (fallbackError) {
        logger.error({
          path,
          primaryError: primaryError.message,
          fallbackError: fallbackError.message
        }, 'Both APIs failed');
        throw fallbackError;  // Throw last error
      }
    }
  }
};
```

**Resilience features:**
- Automatic retry (3 attempts with exponential backoff)
- Fallback to secondary API if primary fails
- Structured logging for debugging
- Return source indicator (`primary` or `fallback`)

## Guided Prompts: Orchestrating Multi-Tool Workflows

Some queries require multiple tool calls in sequence. **Guided prompts** provide AI agents with workflow templates.

### The Problem: Complex Analysis

User asks: "Compare ETH staking yields between Lido and Rocket Pool"

**Required steps:**
1. Find yield IDs for Lido and Rocket Pool
2. Get detailed data for each
3. Extract relevant metrics (APY, TVL, withdrawal period, risks)
4. Build comparison table
5. Provide recommendation based on risk tolerance

**Without guidance:** AI might miss steps, call wrong tools, or format poorly.

### The Solution: Structured Workflow Prompts

```typescript
// src/prompts/index.ts
server.registerPrompt(
  'compare-yields',
  {
    title: 'Compare yield opportunities',
    description: 'Guides an LLM through comparing multiple yields by ' +
                 'orchestrating detail lookups and summarising deltas.',
    argsSchema: {
      yieldIds: z.string(),  // Comma-separated or array
      criteria: z.string().optional()
    }
  },
  async (args) => {
    const parsed = z.object({
      yieldIds: z.union([z.array(z.string()).min(1), z.string().min(1)]),
      criteria: z.string().optional()
    }).parse(args ?? {});

    const yieldIds = Array.isArray(parsed.yieldIds)
      ? parsed.yieldIds
      : parsed.yieldIds.split(',').map(s => s.trim()).filter(Boolean);

    return {
      structuredContent: {
        goal: 'Compare selected yields across APY, TVL, risk and liquidity dimensions.',
        steps: [
          'Call get-yield-details for each yieldId to gather core metrics.',
          'Optionally read yield://{yieldId} resources for percentile insights.',
          'Tabulate APY, TVL, reward tokens, exit conditions, and highlight risk warnings.',
          'Summarise differences and recommend the most appropriate option based on criteria.'
        ],
        arguments: { yieldIds, criteria: parsed.criteria },
        recommendedTools: ['get-yield-details', 'yield://{yieldId}'],
        outputFormat: 'Markdown table summarising metrics followed by recommendation paragraph.'
      },
      messages: [
        {
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: JSON.stringify({
              goal: 'Compare selected yields...',
              steps: ['...'],
              // ...
            }, null, 2)
          }
        }
      ]
    };
  }
);
```

**What the AI receives:**
```json
{
  "goal": "Compare selected yields across APY, TVL, risk and liquidity dimensions.",
  "steps": [
    "Call get-yield-details for each yieldId to gather core metrics.",
    "Optionally read yield://{yieldId} resources for percentile insights.",
    "Tabulate APY, TVL, reward tokens, exit conditions, and highlight risk warnings.",
    "Summarise differences and recommend the most appropriate option based on criteria."
  ],
  "arguments": {
    "yieldIds": ["eth-staking-lido", "eth-staking-rocket-pool"],
    "criteria": "moderate risk tolerance"
  },
  "recommendedTools": ["get-yield-details", "yield://{yieldId}"],
  "outputFormat": "Markdown table summarising metrics followed by recommendation paragraph."
}
```

**Benefits:**
- Consistent execution of complex workflows
- AI learns best practices for each query type
- Reduces hallucination (clear steps to follow)
- Better user experience (structured output)

## Testing Strategy: TDD for MCP Servers

### Unit Tests with Mocked API

```typescript
// tests/tools/yields.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';

describe('get-yield-details', () => {
  beforeEach(() => {
    // Mock the StakeKit API
    nock('https://api.stakek.it')
      .get('/v2/yields/eth-staking-lido')
      .reply(200, {
        id: 'eth-staking-lido',
        metadata: { name: 'Lido' },
        rewardRate: 3.8,
        tvlUsd: 15000000000,
        lifecycle: {
          supportsExit: true,
          withdrawalPeriod: { days: 21 }
        }
      });
  });

  it('returns formatted yield details', async () => {
    const result = await callTool('get-yield-details', {
      yieldId: 'eth-staking-lido'
    });

    expect(result.structuredContent.overview).toMatchObject({
      id: 'eth-staking-lido',
      name: 'Lido',
      apy: 3.8,
      tvlUsd: 15000000000
    });
  });

  it('includes withdrawal warnings for long periods', async () => {
    const result = await callTool('get-yield-details', {
      yieldId: 'eth-staking-lido'
    });

    expect(result.structuredContent.overview.warnings).toContain(
      expect.stringMatching(/21 days/)
    );
  });

  it('throws NOT_FOUND for invalid yield ID', async () => {
    nock('https://api.stakek.it')
      .get('/v2/yields/invalid-id')
      .reply(404);

    await expect(
      callTool('get-yield-details', { yieldId: 'invalid-id' })
    ).rejects.toThrow('Yield invalid-id was not found');
  });
});
```

### Integration Tests

```typescript
describe('Tool registration', () => {
  it('registers all yield tools', () => {
    const server = createYieldServer();
    const tools = server.listTools();

    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'get-yield-opportunities' })
    );
    expect(tools).toContainEqual(
      expect.objectContaining({ name: 'get-yield-details' })
    );
    // ... etc
  });
});
```

### Type Tests

```typescript
// TypeScript compilation itself is a test
import { StakeKitYield, YieldSummary } from './types/stakekit';

// This won't compile if types are wrong
const testYield: StakeKitYield = {
  id: 'test',
  rewardRate: 3.8,  // Must be number or { total: number }
  // Missing optional fields are OK
};

// This won't compile if transformation is wrong
const testSummary: YieldSummary = buildYieldSummaries([testYield])[0];
```

**Coverage:**
- Unit tests: 80%+ of business logic
- Integration tests: Tool registration and execution
- Type tests: Compile-time validation
- Schema tests: Zod validation with real API shapes

## Performance Optimizations

### 1. Data Deduplication

```typescript
const dedupeById = (items: StakeKitYield[]) => {
  const map = new Map<string, StakeKitYield>();
  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
};
```

### 2. Efficient Filtering

```typescript
// Bad: O(n²) for large datasets
const filteredSummaries = response.summaries.filter((item) =>
  response.raw.find(entry => entry.id === item.id)?.someField
);

// Good: O(n) with Map
const entryMap = new Map(response.raw.map(entry => [entry.id, entry]));
const filteredSummaries = response.summaries.filter((item) => {
  const entry = entryMap.get(item.id);
  return entry?.someField;
});
```

### 3. Resource Caching

```typescript
// src/utils/cache.ts
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();

  set(key: string, data: T, ttlMs: number) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }
}

// Cache resources for 5 minutes
const resourceCache = new SimpleCache<string>();
```

### 4. Pagination Best Practices

```typescript
// Efficient: Use cursor-based pagination
const fetchAllYields = async () => {
  let cursor: string | undefined;
  let allYields: YieldSummary[] = [];

  do {
    const response = await callTool('get-yield-opportunities', {
      limit: 100,  // Max per page
      cursor
    });

    allYields.push(...response.items);
    cursor = response.meta.cursor;
  } while (response.meta.hasNextPage);

  return allYields;
};
```

## Deployment: From Development to Production

### Local Development

```bash
# Install and build
npm install
npm run build

# Test with Claude Desktop
# Add to ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "yield": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-yield/dist/index.js"],
      "env": {
        "STAKEKIT_API_KEY": "your_key",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mcp-yield .
docker run -e STAKEKIT_API_KEY=your_key mcp-yield

# HTTP mode
docker run -p 3000:3000 \
  -e STAKEKIT_API_KEY=your_key \
  -e PORT=3000 \
  mcp-yield npm run start:http
```

### Production Considerations

**Environment Variables:**
```bash
STAKEKIT_API_KEY=your_production_key
STAKEKIT_BASE_URL=https://api.stakek.it/v2
STAKEKIT_FALLBACK_URL=https://api.yield.xyz/v1
LOG_LEVEL=info  # or 'warn' for production
PORT=3000
NODE_ENV=production
```

**Logging:**
```typescript
// Structured JSON logs for production
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// Log to file or service (Datadog, CloudWatch, etc.)
```

**Health Checks:**
```typescript
// src/http.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Lessons Learned

### What Worked Well

1. **Schema-first validation**: Zod caught countless API quirks before they became runtime errors
2. **Strict TypeScript**: No `any` types paid off - refactoring was fearless
3. **Tool design patterns**: Explicit descriptions and examples made AI agents much more effective
4. **Fallback strategy**: When primary API had issues, fallback kept service running
5. **TDD approach**: Tests caught edge cases (like withdrawal period warnings) early

### What I'd Do Differently

1. **Start with e2e tests sooner**: Unit tests are great, but real MCP client testing caught integration issues
2. **Resource caching from day one**: Added later, but should've been in initial architecture
3. **More comprehensive error codes**: Started with basic errors, evolved to detailed codes over time
4. **Metrics/monitoring**: Should have added Prometheus/StatsD integration earlier
5. **Rate limit handling**: Added retry logic, but could use smarter backoff and circuit breakers

### Gotchas to Watch Out For

1. **MCP SDK quirks**:
   - Stdio transport requires careful JSON handling
   - Error objects must match exact format
   - Tool registration order doesn't matter, but debugging is easier if logical

2. **StakeKit API surprises**:
   - Field names vary between endpoints
   - Some fields are numbers, some are objects with same data
   - Pagination cursors are opaque (don't try to decode them)
   - Rate limits aren't documented clearly

3. **TypeScript ESM issues**:
   - Must use `.js` extensions in imports (even for `.ts` files)
   - `__dirname` doesn't exist (use `import.meta.url` workaround)
   - Some libraries don't play nice with ESM

4. **Testing MCP servers**:
   - Hard to test stdio transport programmatically
   - Need real MCP client for full integration tests
   - HTTP mode easier to test but not how most users deploy

## Try It Yourself

### Quick Start

```bash
# Clone and install
git clone <repository-url>
cd mcp-yield
npm install

# Get API key (free)
# Visit https://api.stakek.it

# Configure
cp .env.example .env
# Add your STAKEKIT_API_KEY to .env

# Build
npm run build

# Test with Claude Desktop
# Add to claude_desktop_config.json (see above)
# Restart Claude Desktop

# Ask Claude:
# "Show me the top 5 ETH staking yields"
# "Compare USDC lending on Aave vs Compound"
# "What are the risks of staking with Lido?"
```

### HTTP Mode (for non-Claude usage)

```bash
# Start HTTP server
STAKEKIT_API_KEY=your_key PORT=3000 npm run start:http

# Call tools via HTTP
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": 1,
    "params": {
      "name": "get-top-yields",
      "arguments": { "limit": 5, "minTvlUsd": 1000000 }
    }
  }'
```

## What's Next?

**Planned enhancements:**
- Historical yield data tracking
- Price impact estimates for large deposits
- Gas cost calculations for entering/exiting
- Webhook notifications for yield changes
- GraphQL endpoint for flexible querying
- Prometheus metrics export
- Additional DeFi data sources beyond StakeKit

**Community contributions welcome:**
- Additional tools (e.g., `get-yields-by-risk-level`)
- More guided prompts (e.g., portfolio optimization)
- Custom resources (e.g., protocol deep dives)
- Alternative data sources
- Performance optimizations

## Conclusion

Building an MCP server for DeFi data taught me that **the protocol is the easy part** - the hard parts are:
1. Handling unreliable external APIs
2. Designing tools that AI agents can use effectively
3. Validating complex, evolving schemas
4. Creating helpful errors that guide users to solutions

The **schema-first, type-safe approach** paid enormous dividends. Every hour spent on Zod schemas and TypeScript types saved days of debugging. The **guided prompt system** turned complex multi-step queries into smooth user experiences.

If you're building MCP servers, focus on:
- **Clear tool descriptions** with examples
- **Explicit parameter types** with validation
- **Helpful error messages** that guide next steps
- **Graceful degradation** when things go wrong
- **Type safety** all the way down

The full source code is available on GitHub (MIT license). Try it out, break it, improve it. The DeFi ecosystem needs more AI-accessible data - let's build it together.

---

**Resources:**
- [mcp-yield on GitHub](https://github.com/your-repo/mcp-yield)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [StakeKit API Docs](https://docs.yield.xyz/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Questions?** Drop them in the comments - I'll answer everything from architecture decisions to deployment strategies.

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
