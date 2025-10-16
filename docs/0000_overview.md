# MCP Yield Server – Project Overview

## Purpose
- Deliver an MCP-compliant server that exposes curated DeFi yield data from the StakeKit/Yield.xyz API suite.
- Provide intuitive tools, resources, and prompts so downstream LLMs can reason about opportunities, compare yields, and orchestrate user actions safely.
- Maintain parity with StakeKit REST endpoints while adding guardrails (validation, caching, helpful error messages).

## Scope
1. **Foundation** – TypeScript MCP server using stdio transport, environment-managed secrets, StakeKit API client with retries and logging.
2. **Yield Discovery Tools** – 8 read-only tools covering discovery, filtering, and high-level metrics for yields.
3. **Chain & Protocol Intelligence** – 6 catalog tools surfacing supported networks, tokens, and protocols.
4. **Context Surfaces** – Dynamic resources and prompts that transform raw API data into MCP-native contextual knowledge.
5. **Documentation & Ops** – README, deployment guidance, testing instructions, and CI hooks (where applicable).

## Guiding Principles
- **Test-first**: Every tool and resource call path receives integration coverage via stdio harness and curl fixtures.
- **Least Surprise for LLMs**: Consistent naming, typed arguments, error transparency.
- **Secure by Default**: Never persist API keys in source control. Enforce runtime validation of configuration.
- **Resilient to API variance**: Handle fallback hosts (`https://api.stakek.it/v2`, `https://api.yield.xyz/v1`) and schema drift via Zod parsing.
- **Operational Observability**: Structured logging and clear error codes so debugging is straightforward.

## External Dependencies
- StakeKit REST API (authenticated with `X-API-KEY`).
- Model Context Protocol TypeScript SDK (`@modelcontextprotocol/sdk`).
- `axios` for HTTP, `zod` for schema validation, `dotenv` for configuration loading.

## Risks & Mitigations
| Risk | Description | Mitigation |
| --- | --- | --- |
| Rate limiting | Frequent polling across many resources | Cache responses, respect `Retry-After`, implement exponential backoff |
| Schema drift | Upstream adds/removes fields | Centralize Zod schemas, log validation issues with actionable guidance |
| Empty datasets | Some endpoints return 204/empty arrays | Guard response parsing, surface human-readable explanations |
| Tool misuse | LLM passes invalid params | Strict schema validation with descriptive errors |
| Transport errors | Network hiccups/timeouts | Retry with jitter, categorize errors (client vs server) |

## Deliverables
- Compiled MCP server (`dist/index.js`) with CLI entry point `npm run start:stdio`.
- Test suite (`npm test`) covering client, tools, resources, prompts.
- Documentation artifacts listed in task files below.
- Example stdio transcripts & curl recipes proving functionality.
