# Complete Guide: Building Your First MCP Server for DeFi Data

**Learn by doing: Connect Claude to real-time yield data in 30 minutes**

---

## What You'll Build

By the end of this tutorial, you'll have:
- A working MCP server that provides DeFi yield data to Claude
- Hands-on understanding of the Model Context Protocol
- A template for building your own MCP servers
- Claude answering DeFi questions with real-time data

**Prerequisites:**
- Node.js 18+ installed
- Basic TypeScript knowledge
- 30 minutes of focused time
- (Optional) Claude Desktop for testing

**What we WON'T assume you know:**
- MCP protocol details (we'll explain everything)
- DeFi expertise (we'll keep it simple)
- Advanced TypeScript patterns (we'll start basic)

Let's dive in!

---

## Part 1: Understanding MCP (5 minutes)

### What is MCP and Why Should You Care?

**The Problem:**
AI assistants like Claude are incredibly smart, but they're frozen in time. When you ask "What's the best ETH staking yield?", Claude can explain staking conceptually, but doesn't know today's current rates.

**The Solution:**
Model Context Protocol (MCP) is a standard way for AI assistants to connect to external data sources and tools.

Think of it like this:
- **Before MCP:** Claude is like a brilliant professor from 2023 - knows theory, but outdated on current data
- **After MCP:** Claude is like that same professor with a research assistant constantly feeding them breaking news

### MCP Components

Every MCP server has three core components:

**1. Tools** - Actions the AI can perform
```typescript
// Example: A tool that fetches current weather
{
  name: "get-weather",
  description: "Get current weather for a city",
  inputSchema: {
    city: z.string()
  },
  handler: async (args) => {
    const weather = await fetchWeather(args.city);
    return { temperature: weather.temp, conditions: weather.conditions };
  }
}
```

**2. Resources** - Contextual information the AI can read
```typescript
// Example: A resource providing background info
{
  uri: "weather://san-francisco",
  mimeType: "text/plain",
  text: "San Francisco: Known for fog, mild climate, microclimates..."
}
```

**3. Prompts** - Guided workflows for complex tasks
```typescript
// Example: A prompt that guides multi-step analysis
{
  name: "plan-trip",
  description: "Plan a trip based on weather",
  handler: async (args) => {
    return {
      goal: "Plan optimal travel dates based on weather patterns",
      steps: [
        "Fetch weather forecast for destination",
        "Identify best weather windows",
        "Check hotel prices for those dates",
        "Recommend best 3-day window"
      ],
      recommendedTools: ["get-weather", "search-hotels"]
    };
  }
}
```

### Our Project: mcp-yield

We're building an MCP server that provides DeFi yield data from StakeKit. When complete, you can ask Claude:
- "Show me the top 5 ETH staking yields"
- "Compare USDC lending on Aave vs Compound"
- "What are the risks of Lido staking?"

And Claude will answer with real-time data!

---

## Part 2: Project Setup (5 minutes)

### Step 1: Create Project Directory

```bash
mkdir mcp-yield-tutorial
cd mcp-yield-tutorial
```

### Step 2: Initialize Node.js Project

```bash
npm init -y
```

### Step 3: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk axios zod dotenv
npm install -D typescript @types/node ts-node vitest
```

**What each does:**
- `@modelcontextprotocol/sdk` - Official MCP implementation
- `axios` - HTTP client for API calls
- `zod` - Schema validation (critical for type safety)
- `dotenv` - Environment variable loading
- `typescript` - Type-safe development
- `ts-node` - Run TypeScript directly (dev only)
- `vitest` - Testing framework

### Step 4: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Why these settings?**
- `strict: true` - Catches errors early
- `ESNext` modules - Modern JavaScript
- `outDir: dist` - Compiled code goes here

### Step 5: Create Project Structure

```bash
mkdir -p src/{tools,types,client,utils}
touch src/index.ts src/server.ts
touch .env.example .env
```

Your structure should look like:
```
mcp-yield-tutorial/
├── src/
│   ├── tools/      # Tool implementations
│   ├── types/      # Type definitions
│   ├── client/     # API client
│   ├── utils/      # Helpers
│   ├── server.ts   # MCP server
│   └── index.ts    # Entry point
├── package.json
├── tsconfig.json
├── .env.example
└── .env
```

### Step 6: Get StakeKit API Key

1. Visit https://api.stakek.it
2. Sign up (free tier is fine)
3. Copy your API key
4. Add to `.env`:

```bash
# .env
STAKEKIT_API_KEY=your_api_key_here
```

Great! Setup complete. Let's start coding.

---

## Part 3: Building the API Client (10 minutes)

### Step 1: Create Type Definitions

Create `src/types/stakekit.ts`:

```typescript
import { z } from 'zod';

// Define what a yield opportunity looks like
export const stakeKitYieldSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  network: z.string().optional(),
  apy: z.number().optional(),
  tvlUsd: z.number().optional(),
  token: z.object({
    symbol: z.string().optional(),
    network: z.string().optional()
  }).optional()
});

// Infer TypeScript type from Zod schema
export type StakeKitYield = z.infer<typeof stakeKitYieldSchema>;

// API response format
export const stakeKitYieldListResponseSchema = z.object({
  data: z.array(stakeKitYieldSchema),
  limit: z.number().optional(),
  offset: z.number().optional(),
  total: z.number().optional()
});
```

**Why Zod?**
- Runtime validation (TypeScript only validates at compile-time)
- If API changes, we catch it immediately
- Self-documenting code

### Step 2: Create API Client

Create `src/client/stakekit.ts`:

```typescript
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const STAKEKIT_API_KEY = process.env.STAKEKIT_API_KEY;
const STAKEKIT_BASE_URL = 'https://api.stakek.it/v2';

if (!STAKEKIT_API_KEY) {
  throw new Error('STAKEKIT_API_KEY environment variable is required');
}

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: STAKEKIT_BASE_URL,
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${STAKEKIT_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Simple client with basic error handling
export const stakeKitClient = {
  async get<T>(path: string, params?: object): Promise<T> {
    try {
      const response = await axiosInstance.get<T>(path, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `StakeKit API error: ${error.response?.status} ${error.message}`
        );
      }
      throw error;
    }
  }
};
```

**Key points:**
- Centralized API configuration
- Authorization header automatically added
- Basic error handling
- Type-safe (returns generic `T`)

### Step 3: Test the Client

Create `src/test-client.ts` (temporary test file):

```typescript
import { stakeKitClient } from './client/stakekit.js';
import { stakeKitYieldListResponseSchema } from './types/stakekit.js';

async function test() {
  try {
    console.log('Fetching yields from StakeKit...');
    const data = await stakeKitClient.get('/yields', { limit: 5 });

    // Validate response
    const validated = stakeKitYieldListResponseSchema.parse(data);

    console.log(`Found ${validated.data.length} yields:`);
    validated.data.forEach(yield_ => {
      console.log(`- ${yield_.id}: ${yield_.apy}% APY`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
```

Run it:
```bash
npx ts-node --esm src/test-client.ts
```

**Expected output:**
```
Fetching yields from StakeKit...
Found 5 yields:
- eth-staking-lido: 3.8% APY
- eth-staking-rocket-pool: 3.5% APY
- ...
```

If it works, delete `test-client.ts` - we don't need it anymore!

---

## Part 4: Creating Your First Tool (10 minutes)

### Step 1: Create Tool Implementation

Create `src/tools/yields.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { stakeKitClient } from '../client/stakekit.js';
import { stakeKitYieldListResponseSchema } from '../types/stakekit.js';

export const registerYieldTools = (server: McpServer) => {
  // Register a tool that lists yield opportunities
  server.registerTool(
    'get-yield-opportunities',  // Tool name (kebab-case)
    {
      title: 'List yield opportunities',
      description: 'Returns paginated yield opportunities with APY and metadata. ' +
                   'Use this to discover staking, lending, and vault yields across networks.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional()
          .describe('Maximum number of results (1-100, default 20)'),
        network: z.string().optional()
          .describe('Filter by network (e.g., "ethereum", "polygon")')
      }
    },
    async (args) => {
      try {
        // Parse and validate input
        const parsed = z.object({
          limit: z.number().int().min(1).max(100).default(20).optional(),
          network: z.string().optional()
        }).parse(args ?? {});

        // Fetch from API
        const data = await stakeKitClient.get('/yields', {
          limit: parsed.limit,
          network: parsed.network
        });

        // Validate response
        const validated = stakeKitYieldListResponseSchema.parse(data);

        // Transform to simpler format
        const summaries = validated.data.map(item => ({
          id: item.id,
          name: item.name ?? item.id,
          network: item.network ?? item.token?.network ?? 'unknown',
          type: item.type ?? 'unknown',
          apy: item.apy ?? null,
          tvlUsd: item.tvlUsd ?? null
        }));

        // Return in MCP format
        return {
          structuredContent: {
            items: summaries,
            count: summaries.length,
            total: validated.total
          },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(summaries, null, 2)
            }
          ]
        };
      } catch (error) {
        // MCP-compatible error
        throw {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
};
```

**What's happening here?**

1. **Tool registration**: `server.registerTool(name, metadata, handler)`
2. **Input schema**: Zod defines what parameters are valid
3. **Handler**: Async function that does the work
4. **Error handling**: Convert any error to MCP format
5. **Return format**: Both structured data and text representation

### Step 2: Create MCP Server

Create `src/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerYieldTools } from './tools/yields.js';

export const createYieldServer = () => {
  // Create MCP server instance
  const server = new McpServer({
    name: 'mcp-yield',
    version: '1.0.0'
  });

  // Register our tools
  registerYieldTools(server);

  return server;
};
```

Simple factory pattern - creates server and registers tools.

### Step 3: Create Stdio Transport

Create `src/index.ts`:

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createYieldServer } from './server.js';

// Create server
const server = createYieldServer();

// Create stdio transport (for Claude Desktop)
const transport = new StdioServerTransport();

// Connect them
await server.connect(transport);

console.error('MCP Yield server running on stdio');
```

**Why stderr for the log?**
- Stdout is reserved for MCP JSON-RPC messages
- Stderr is for human-readable logs
- Claude Desktop shows stderr in logs

### Step 4: Add Build Script

Update `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Step 5: Build and Test

```bash
# Compile TypeScript
npm run build

# You should now have a dist/ folder

# Test manually (sends JSON-RPC to stdin)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1,"params":{}}' | node dist/index.js
```

**Expected output:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get-yield-opportunities",
        "description": "Returns paginated yield opportunities...",
        "inputSchema": { ... }
      }
    ]
  }
}
```

Success! You've built a working MCP server!

---

## Part 5: Integrating with Claude Desktop (5 minutes)

### Step 1: Find Config File

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add Server Configuration

Edit the file (create if it doesn't exist):

```json
{
  "mcpServers": {
    "yield": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-yield-tutorial/dist/index.js"
      ],
      "env": {
        "STAKEKIT_API_KEY": "your_actual_api_key_here"
      }
    }
  }
}
```

**Important:**
- Use **absolute path** (not relative)
- On Windows, use forward slashes or escape backslashes
- Replace `your_actual_api_key_here` with your real key

### Step 3: Restart Claude Desktop

Completely quit and restart Claude Desktop (not just refresh).

### Step 4: Test It!

Open Claude Desktop and ask:

> "Use the get-yield-opportunities tool to show me the top 5 yields"

Claude should:
1. Recognize the tool is available
2. Call it with appropriate parameters
3. Show you the results

**Example conversation:**
```
You: Show me the top 5 DeFi yields right now

Claude: I'll fetch the current yield opportunities for you.

[Claude calls get-yield-opportunities tool with limit: 5]

Here are the top 5 yield opportunities:

1. ETH Staking - Lido (Ethereum)
   - APY: 3.8%
   - TVL: $15.2B

2. ETH Staking - Rocket Pool (Ethereum)
   - APY: 3.5%
   - TVL: $2.8B

[... etc]
```

**Congratulations!** You've built a working MCP server and connected it to Claude!

---

## Part 6: Adding More Tools (Bonus)

Let's add one more tool to make it more useful.

### Add Tool: Get Yield Details

Update `src/tools/yields.ts` to add a second tool:

```typescript
export const registerYieldTools = (server: McpServer) => {
  // ... existing get-yield-opportunities tool ...

  // NEW TOOL: Get details for specific yield
  server.registerTool(
    'get-yield-details',
    {
      title: 'Get yield opportunity details',
      description: 'Fetches comprehensive information about a specific yield by ID. ' +
                   'Use this after get-yield-opportunities to learn more about a yield.',
      inputSchema: {
        yieldId: z.string()
          .describe('Unique yield identifier (e.g., "eth-staking-lido")')
      }
    },
    async (args) => {
      try {
        const { yieldId } = z.object({
          yieldId: z.string()
        }).parse(args ?? {});

        // Fetch detailed data
        const data = await stakeKitClient.get(`/yields/${yieldId}`);

        // Note: In real implementation, you'd validate this too
        // For tutorial, we'll keep it simple

        return {
          structuredContent: data,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw {
            code: 'NOT_FOUND',
            message: `Yield ${args?.yieldId} not found. ` +
                     `Use get-yield-opportunities to see available yields.`
          };
        }
        throw {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
};
```

Rebuild and restart Claude:

```bash
npm run build
# Restart Claude Desktop
```

Now try:
> "Get details for eth-staking-lido"

Claude will call your new tool!

---

## Part 7: Testing Your Tools (Optional but Recommended)

### Create Test File

Create `tests/yields.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createYieldServer } from '../src/server.js';

describe('Yield Tools', () => {
  it('should list tools', () => {
    const server = createYieldServer();
    const tools = server.listTools();

    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'get-yield-opportunities'
      })
    );
  });

  // In real tests, you'd mock the API
  // We'll keep it simple for the tutorial
});
```

Add test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Run tests:
```bash
npm test
```

---

## Troubleshooting Common Issues

### Issue: "Tool not found" in Claude

**Solution:**
1. Check absolute path in `claude_desktop_config.json`
2. Verify you ran `npm run build`
3. Restart Claude Desktop completely
4. Check Claude Desktop logs: `~/Library/Logs/Claude/`

### Issue: "Authentication failed"

**Solution:**
1. Verify `STAKEKIT_API_KEY` in `.env`
2. Check key is valid at https://api.stakek.it
3. Ensure key is in `claude_desktop_config.json` env section

### Issue: "Module not found" errors

**Solution:**
1. Check `"type": "module"` is in `package.json`
2. Verify imports use `.js` extension (even for `.ts` files)
3. Run `npm install` to ensure dependencies installed

### Issue: TypeScript compilation errors

**Solution:**
1. Check `tsconfig.json` matches tutorial
2. Run `npx tsc --noEmit` to see detailed errors
3. Verify all imports have correct paths

---

## What You've Learned

Congratulations! You've learned:

1. What MCP is and why it matters
2. How to structure an MCP server project
3. How to create type-safe API clients with Zod
4. How to register tools with proper schemas
5. How to connect your server to Claude Desktop
6. How to test and debug MCP servers

### Next Steps

Want to go further? Try:

**Add more tools:**
- `get-networks` - List supported blockchain networks
- `get-top-yields` - Get yields sorted by APY
- `compare-yields` - Compare two yields side-by-side

**Add error handling:**
- Retry logic for failed API calls
- Fallback to secondary API
- Better error messages

**Add caching:**
- Cache API responses for 5 minutes
- Reduce API calls and improve speed

**Add prompts:**
- Create guided workflows
- Help Claude orchestrate multiple tools

**Deploy it:**
- Run as HTTP server for remote access
- Deploy to cloud (AWS, Google Cloud, etc.)
- Create Docker container

### Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [mcp-yield full source](https://github.com/your-repo/mcp-yield)
- [StakeKit API Docs](https://docs.yield.xyz/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Share Your Build!

Built something cool with MCP? Share it:
- Post on Twitter/X with #ModelContextProtocol
- Share in the comments below
- Submit to MCP servers directory

---

## Complete Code Reference

### Final Project Structure

```
mcp-yield-tutorial/
├── src/
│   ├── client/
│   │   └── stakekit.ts         # API client
│   ├── tools/
│   │   └── yields.ts            # Tool implementations
│   ├── types/
│   │   └── stakekit.ts          # Type definitions
│   ├── server.ts                # MCP server factory
│   └── index.ts                 # Entry point (stdio transport)
├── dist/                        # Compiled JavaScript (after build)
├── tests/
│   └── yields.test.ts           # Tests
├── package.json
├── tsconfig.json
├── .env                         # Your API key (gitignored)
└── .env.example                 # Template for others
```

### Key Files Recap

**package.json:**
```json
{
  "name": "mcp-yield-tutorial",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.0",
    "axios": "^1.12.2",
    "dotenv": "16.4.7",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^24.7.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**.env.example:**
```bash
STAKEKIT_API_KEY=your_api_key_here
```

---

## FAQ

**Q: Can I use this with ChatGPT or other AI assistants?**
A: Yes! Any MCP-compatible client can use your server. MCP is a standard protocol.

**Q: Do I need to know DeFi to build MCP servers?**
A: No! This tutorial used DeFi as an example, but you can build MCP servers for any data source.

**Q: Is the StakeKit API free?**
A: Yes, there's a free tier that's generous for personal use.

**Q: Can I deploy this to production?**
A: This tutorial code is educational. For production, add error handling, monitoring, tests, and security hardening.

**Q: How do I add authentication to my MCP server?**
A: For stdio mode (Claude Desktop), no auth needed. For HTTP mode, use standard API authentication.

**Q: What other data sources work with MCP?**
A: Anything with an API! Weather, stocks, sports scores, databases, internal company data - sky's the limit.

**Q: Can I charge for my MCP server?**
A: Yes! You can build commercial MCP servers. Just handle billing and authentication appropriately.

---

**Questions?** Drop them in the comments - I'll answer everything from beginner to advanced!

**Built something cool?** Share a link - I'd love to see what you create!

**Want the full production version?** Check out the complete mcp-yield implementation on GitHub (link in comments).

---

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
