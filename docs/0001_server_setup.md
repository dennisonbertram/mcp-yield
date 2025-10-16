# Task 0001 – Server Foundation & StakeKit Client

## Objectives
1. Scaffold a TypeScript MCP server project with stdio entrypoint.
2. Load configuration from environment with validation and helpful errors.
3. Implement a reusable StakeKit HTTP client with retries, logging, and host fallback.
4. Establish base testing and linting workflows.

## Deliverables
- `package.json` with scripts: `build`, `start:stdio`, `lint`, `test`.
- `tsconfig.json` targeting Node 18+, ES2022 modules, strict type checking.
- `.env.example` containing `STAKEKIT_API_KEY=your_api_key_here`.
- `src/config.ts` exporting validated config (using Zod) and loading `.env` via `dotenv`.
- `src/client/stakekit.ts` encapsulating axios instance, request helper, typed methods for generic GET/POST.
- `src/index.ts` wiring the MCP SDK server, registering tool/resource/prompt loaders (stubbed for now), and graceful shutdown handling.
- Logging utility (either simple console wrapper or pino-style) that annotates request IDs and error categories.
- Integration smoke test verifying authenticated call to `/yields`.

## Implementation Steps
1. **Project Initialization**
   - Run `npm init -y` (if not already). Install dependencies: `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `zod`.
   - Install dev deps: `typescript`, `@types/node`, optional `tsx` for dev.
   - Configure `tsconfig.json` with `rootDir: src`, `outDir: dist`, `moduleResolution: node`, `esModuleInterop: true`.
2. **Environment Handling**
   - Load `.env` at startup. Validate required vars with Zod. Throw descriptive error if missing.
   - Support overriding API base URL via optional `STAKEKIT_BASE_URL` (defaults to `https://api.stakek.it/v2`).
   - Provide helper to construct headers (e.g., `getAuthHeaders`).
3. **HTTP Client**
   - Create axios instance with base config (timeout 20s, JSON headers).
   - Implement interceptors or wrapper to log request/response metadata (method, path, duration).
   - Add retry logic (e.g., `axios-retry` or custom) for 429/5xx with exponential backoff and jitter.
   - Support fallback host (`https://api.yield.xyz/v1`) when primary host returns 404/204 for specific endpoints.
4. **MCP Server Skeleton**
   - Initialize MCP server with `createMcpServer()` from SDK.
   - Register placeholder tool/resource/prompt handlers returning `not implemented` errors (to be replaced in later tasks).
   - Implement stdio transport using `stdioServer` helper.
   - Ensure process signals (`SIGINT`, `SIGTERM`) trigger clean shutdown.
5. **Testing & Tooling**
   - Configure `npm test` to run TypeScript via `ts-node` or compiled JS integration tests.
   - Add first integration test hitting `/yields` with API key from env (skip if not set, but log reason).
   - Document manual curl command to verify connectivity.
6. **CI/Checks**
   - Add `.gitignore` for `dist`, `.env`, `node_modules`.
   - Optional: configure GitHub Actions workflow for lint/test (document if deferred).

## Acceptance Criteria
- Running `npm run build` emits compiled JS without TypeScript errors.
- `node dist/index.js` starts server and responds to `tools/list` with placeholders.
- Authenticated GET request to `/yields` succeeds using provided API key.
- Missing `STAKEKIT_API_KEY` results in clear startup error.
- Logs show request ID, endpoint, status, and duration.
