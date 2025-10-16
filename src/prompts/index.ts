import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '../utils/errors.js';

const runPrompt = async <T>(handler: () => Promise<T>) => {
  try {
    const result = await handler();
    const message = JSON.stringify(result, null, 2);
    return {
      structuredContent: result,
      messages: [
        {
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: message
          }
        }
      ]
    };
  } catch (error) {
    throw formatToolError(error);
  }
};

export const registerPrompts = (server: McpServer) => {
  server.registerPrompt(
    'compare-yields',
    {
      title: 'Compare yield opportunities',
      description: 'Guides an LLM through comparing multiple yields by orchestrating detail lookups and summarising deltas.',
      argsSchema: {
        yieldIds: z.string(),
        criteria: z.string().optional()
      }
    },
    async (args) =>
      runPrompt(async () => {
        const parsed = z
          .object({
            yieldIds: z.union([z.array(z.string()).min(1), z.string().min(1)]),
            criteria: z.string().optional()
          })
          .parse(args ?? {});
        const yieldIds = Array.isArray(parsed.yieldIds)
          ? parsed.yieldIds
          : parsed.yieldIds
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean);
        return {
          goal: 'Compare selected yields across APY, TVL, risk and liquidity dimensions.',
          steps: [
            'Call get-yield-details for each yieldId to gather core metrics.',
            'Optionally read yield://{yieldId} resources for percentile and lifecycle insights.',
            'Tabulate APY, TVL, reward tokens, exit conditions, and highlight risk warnings.',
            'Summarise differences and recommend the most appropriate option based on provided criteria.'
          ],
          arguments: { yieldIds, criteria: parsed.criteria },
          recommendedTools: ['get-yield-details', 'yield://{yieldId}'],
          outputFormat: 'Markdown table summarising metrics followed by recommendation paragraph.'
        };
      })
  );

  server.registerPrompt(
    'find-optimal-yield',
    {
      title: 'Find optimal yield',
      description: 'Evaluates available yields for a target network or token and risk appetite.',
      argsSchema: {
        networkId: z.string().optional(),
        tokenSymbol: z.string().optional(),
        minTvlUsd: z.string().optional(),
        riskTolerance: z.enum(['conservative', 'balanced', 'aggressive']).optional()
      }
    },
    async (args) =>
      runPrompt(async () => {
        const parsed = z
          .object({
            networkId: z.string().optional(),
            tokenSymbol: z.string().optional(),
            minTvlUsd: z.string().optional(),
            riskTolerance: z.enum(['conservative', 'balanced', 'aggressive']).optional()
          })
          .parse(args ?? {});
        const minTvlUsd = parsed.minTvlUsd ? Number.parseFloat(parsed.minTvlUsd) : undefined;
        return {
          goal: 'Surface the highest quality yield opportunities for the requested parameters.',
          steps: [
            'Use get-yields-by-network and/or get-yields-by-token based on provided identifiers.',
            'Filter results by minimum TVL and align risk level with stated tolerance.',
            'Sort by APY and call get-yield-details for finalists to confirm lifecycle constraints.',
            'Summarise top 3 opportunities with rationale and caveats.'
          ],
          arguments: {
            networkId: parsed.networkId,
            tokenSymbol: parsed.tokenSymbol,
            minTvlUsd,
            riskTolerance: parsed.riskTolerance
          },
          recommendedTools: [
            'get-yields-by-network',
            'get-yields-by-token',
            'get-top-yields',
            'yield://{yieldId}'
          ],
          outputFormat: 'Bullet list describing each recommended yield with supporting metrics.'
        };
      })
  );

  server.registerPrompt(
    'network-due-diligence',
    {
      title: 'Network due diligence',
      description: 'Outlines the key facts about a network before recommending strategies.',
      argsSchema: {
        networkId: z.string()
      }
    },
    async (args) =>
      runPrompt(async () => {
        const parsed = z.object({ networkId: z.string() }).parse(args ?? {});
        return {
          goal: 'Produce a due diligence briefing on the specified network.',
          steps: [
            'Call get-chain-details to capture governance, finality, and native token info.',
            'Read network://{networkId} to obtain markdown overview and top yields.',
            'Review list-supported-tokens filtered by network to highlight liquid assets.',
            'Summarise validator considerations, notable protocols, and risk factors.'
          ],
          arguments: parsed,
          recommendedTools: ['get-chain-details', 'list-supported-tokens', 'network://{networkId}'],
          outputFormat: 'Narrative summary with sections for fundamentals, yields, and cautionary notes.'
        };
      })
  );

  server.registerPrompt(
    'protocol-risk-review',
    {
      title: 'Protocol risk review',
      description: 'Guides analysis of a protocol’s health, audits, and APY distribution.',
      argsSchema: {
        protocolId: z.string()
      }
    },
    async (args) =>
      runPrompt(async () => {
        const parsed = z.object({ protocolId: z.string() }).parse(args ?? {});
        return {
          goal: 'Assess protocol resilience and highlight any red flags.',
          steps: [
            'Invoke get-protocol-details to retrieve metadata and yield stats.',
            'Read protocol://{protocolId} for aggregated APY insights and risk considerations.',
            'Cross-reference yields with get-lending-yields or get-vault-yields if relevant.',
            'Summarise strengths, weaknesses, and actionable recommendations.'
          ],
          arguments: parsed,
          recommendedTools: ['get-protocol-details', 'protocol://{protocolId}', 'get-top-yields'],
          outputFormat: 'Risk report with sections for overview, metrics, audits, and recommendations.'
        };
      })
  );

  server.registerPrompt(
    'token-yield-availability',
    {
      title: 'Token yield availability',
      description: 'Helps determine where a token can be deployed for yield and how attractive each option is.',
      argsSchema: {
        tokenSymbol: z.string()
      }
    },
    async (args) =>
      runPrompt(async () => {
        const parsed = z.object({ tokenSymbol: z.string() }).parse(args ?? {});
        return {
          goal: 'Map all significant yield opportunities for the given token.',
          steps: [
            'Call get-yields-by-token to enumerate opportunities.',
            'Fetch token://{tokenSymbol} for metadata and cross-chain availability.',
            'Cluster yields by type (staking, lending, vault) and APY tiers.',
            'Recommend deployments aligned with liquidity depth and risk tolerance.'
          ],
          arguments: parsed,
          recommendedTools: ['get-yields-by-token', 'token://{tokenId}', 'get-top-yields'],
          outputFormat: 'Table grouped by yield type with APY ranges and risk commentary.'
        };
      })
  );
};
