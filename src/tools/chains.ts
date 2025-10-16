import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { catalogService } from '../services/catalog.js';
import { StakeKitNetwork, StakeKitProtocol, StakeKitToken, StakeKitYield } from '../types/stakekit.js';
import { createNotFoundError, formatToolError } from '../utils/errors.js';

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
    throw formatToolError(error);
  }
};

const summarizeNetworks = (networks: StakeKitNetwork[]) => {
  const total = networks.length;
  const mainnets = networks.filter((network) => !network.isTestnet).length;
  const testnets = total - mainnets;
  return { total, mainnets, testnets };
};

const buildTokenMap = (tokens: StakeKitToken[], validNetworks?: Set<string>) => {
  const allowNetwork = (network?: string | null) => {
    if (!network) return false;
    return validNetworks ? validNetworks.has(network) : true;
  };
  const map = new Map<string, { token: StakeKitToken; networks: Set<string> }>();
  for (const token of tokens) {
    const key = token.symbol.toUpperCase();
    const current = map.get(key);
    const tokenNetworks = (token.networks ?? []).filter((network) => allowNetwork(network));
    if (current) {
      const networks = new Set(current.networks);
      for (const network of tokenNetworks) {
        networks.add(network);
      }
      current.networks = networks;
      current.token = {
        ...current.token,
        priceUsd: token.priceUsd ?? current.token.priceUsd,
        decimals: token.decimals ?? current.token.decimals
      };
    } else {
      map.set(key, {
        token,
        networks: new Set(tokenNetworks)
      });
    }
  }
  return map;
};

const formatYieldSummary = (yieldEntry: StakeKitYield) => ({
  id: yieldEntry.id,
  name: yieldEntry.metadata?.name ?? yieldEntry.name ?? yieldEntry.id,
  network: yieldEntry.network ?? yieldEntry.token?.network,
  apy: yieldEntry.apy ?? yieldEntry.metrics?.apy ?? yieldEntry.metrics?.apr ?? yieldEntry.apr ?? null,
  tvlUsd: yieldEntry.tvlUsd ?? yieldEntry.metrics?.tvlUsd ?? yieldEntry.tvl ?? null,
  type: yieldEntry.type ?? yieldEntry.metadata?.type ?? yieldEntry.metadata?.category ?? 'unknown'
});

const computeApyStats = (yields: StakeKitYield[]) => {
  const apys = yields
    .map((entry) => entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (apys.length === 0) {
    return { min: null, max: null, median: null };
  }
  const sorted = [...apys].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { min, max, median };
};

export const registerChainTools = (server: McpServer) => {
  server.registerTool(
    'list-supported-chains',
    {
      title: 'List supported blockchain networks',
      description: 'Returns StakeKit-supported networks with optional category and testnet filters.',
      inputSchema: {
        category: z.string().optional(),
        includeTestnets: z.boolean().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const { category, includeTestnets } = z
          .object({
            category: z.string().optional(),
            includeTestnets: z.boolean().optional()
          })
          .parse(args ?? {});
        const { items, source, fetchedAt } = await catalogService.getNetworks();
        const active = items.filter((network) => !network.deprecated);
        const filtered = active.filter((network) => {
          if (!includeTestnets && network.isTestnet) {
            return false;
          }
          if (category && network.category && network.category.toLowerCase() !== category.toLowerCase()) {
            return false;
          }
          return true;
        });
        return {
          items: filtered.map((network) => ({
            id: network.id,
            name: network.name,
            category: network.category,
            isTestnet: network.isTestnet ?? false,
            logoUrl: network.logo,
            nativeToken: network.nativeToken?.symbol,
            explorerUrl: network.explorers?.[0],
            deprecationReason: network.deprecationReason
          })),
          summary: {
            ...summarizeNetworks(filtered),
            fetchedAt,
            deprecatedCount: items.length - active.length
          },
          source
        };
      })
  );

  server.registerTool(
    'get-chain-details',
    {
      title: 'Get network details',
      description: 'Fetches detailed metadata for a network including top yields.',
      inputSchema: {
        networkId: z.string()
      }
    },
    async (args) =>
      runTool(async () => {
        const { networkId } = z.object({ networkId: z.string() }).parse(args ?? {});
        const { items, source, fetchedAt } = await catalogService.getNetworks();
        const network = items.find((item) => item.id === networkId);
        if (!network) {
          throw createNotFoundError(`Network ${networkId} was not found. Call list-supported-chains for valid identifiers.`);
        }
        const networkYields = await catalogService.getYieldsForNetwork(networkId);
        const notableYields = networkYields
          .map(formatYieldSummary)
          .filter((entry) => (entry.apy ?? 0) > 0)
          .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
          .slice(0, 3);
        return {
          network: {
            id: network.id,
            name: network.name,
            category: network.category,
            isTestnet: network.isTestnet ?? false,
            deprecationReason: network.deprecationReason,
            nativeToken: network.nativeToken,
            explorers: network.explorers,
            blockTime: network.blockTime,
            finality: network.finality,
            gasToken: network.gasToken,
            fetchedAt
          },
          notableYields,
          source
        };
      })
  );

  server.registerTool(
    'list-supported-tokens',
    {
      title: 'List supported tokens',
      description: 'Lists StakeKit token coverage with deduplicated network associations.',
      inputSchema: {
        networkId: z.string().optional(),
        symbol: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const { networkId, symbol, limit } = z
          .object({
            networkId: z.string().optional(),
            symbol: z.string().optional(),
            limit: z.number().int().min(1).max(200).optional()
          })
          .parse(args ?? {});
        const [networksResult, tokensResult] = await Promise.all([
          catalogService.getNetworks(),
          catalogService.getTokens()
        ]);
        const activeNetworkIds = new Set(
          networksResult.items.filter((network) => !network.deprecated).map((network) => network.id)
        );
        const map = buildTokenMap(tokensResult.items, activeNetworkIds);
        let values = Array.from(map.values());
        if (networkId) {
          values = values.filter((entry) => entry.networks.has(networkId));
        }
        if (symbol) {
          const lower = symbol.toLowerCase();
          values = values.filter((entry) => entry.token.symbol.toLowerCase().includes(lower));
        }
        const limited = values.slice(0, limit ?? values.length);
        return {
          items: limited.map((entry) => ({
            symbol: entry.token.symbol,
            name: entry.token.name,
            networks: Array.from(entry.networks),
            decimals: entry.token.decimals,
            priceUsd: entry.token.priceUsd,
            tags: entry.token.tags
          })),
          summary: {
            total: values.length,
            fetchedAt: tokensResult.fetchedAt
          },
          source: tokensResult.source
        };
      })
  );

  server.registerTool(
    'get-token-details',
    {
      title: 'Get token details',
      description: 'Provides metadata and leading yields for a token.',
      inputSchema: {
        tokenId: z.string().optional(),
        symbol: z.string().optional(),
        networkId: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const { tokenId, symbol, networkId } = z
          .object({
            tokenId: z.string().optional(),
            symbol: z.string().optional(),
            networkId: z.string().optional()
          })
          .refine((data) => Boolean(data.tokenId) !== Boolean(data.symbol), {
            message: 'Provide either tokenId or symbol, but not both.'
          })
          .parse(args ?? {});
        const { items, source, fetchedAt } = await catalogService.getTokens();
        const map = buildTokenMap(items);
        const tokens = Array.from(map.values());
        const match = tokens.find((entry) => {
          if (tokenId) {
            return entry.token.id === tokenId;
          }
          if (!symbol) {
            return false;
          }
          const baseMatch = entry.token.symbol.toLowerCase() === symbol.toLowerCase();
          const networkMatch = networkId ? entry.networks.has(networkId) : true;
          return baseMatch && networkMatch;
        });
        if (!match) {
          throw createNotFoundError('Token not found. Use list-supported-tokens to explore available symbols.');
        }
        const relatedYields = await catalogService.getYieldsForToken(match.token.symbol);
        const topYields = relatedYields
          .map(formatYieldSummary)
          .filter((entry) => (entry.apy ?? 0) > 0)
          .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
          .slice(0, 5);
        return {
          token: {
            id: match.token.id,
            symbol: match.token.symbol,
            name: match.token.name,
            description: match.token.description,
            decimals: match.token.decimals,
            networks: Array.from(match.networks),
            priceUsd: match.token.priceUsd,
            tags: match.token.tags,
            fetchedAt
          },
          supportedYields: topYields,
          source
        };
      })
  );

  server.registerTool(
    'list-protocols',
    {
      title: 'List supported DeFi protocols',
      description: 'Returns protocols with derived network and yield metrics.',
      inputSchema: {
        category: z.string().optional(),
        chain: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const { category, chain } = z
          .object({
            category: z.string().optional(),
            chain: z.string().optional()
          })
          .parse(args ?? {});
        const { items, source, fetchedAt } = await catalogService.getProtocols();
        const { items: yields } = await catalogService.getYields();
        const filtered = items.filter((protocol) => {
          if (category && protocol.category && protocol.category.toLowerCase() !== category.toLowerCase()) {
            return false;
          }
          if (chain && protocol.networks && !protocol.networks.includes(chain)) {
            return false;
          }
          return true;
        });
        const results = filtered.map((protocol) => {
          const related = yields.filter(
            (yieldEntry) =>
              yieldEntry.metadata?.providerId === protocol.id || yieldEntry.metadata?.provider?.name === protocol.name
          );
          return {
            id: protocol.id,
            name: protocol.name,
            category: protocol.category,
            networks: protocol.networks,
            tvlUsd: protocol.tvlUsd,
            website: protocol.website,
            description: protocol.description,
            primaryChain: protocol.networks?.[0],
            yieldCount: related.length,
            fetchedAt
          };
        });
        return {
          items: results,
          summary: {
            total: results.length,
            fetchedAt
          },
          source
        };
      })
  );

  server.registerTool(
    'get-protocol-details',
    {
      title: 'Get protocol details',
      description: 'Provides metadata, audits, and aggregate yield metrics for a protocol.',
      inputSchema: {
        protocolId: z.string()
      }
    },
    async (args) =>
      runTool(async () => {
        const { protocolId } = z.object({ protocolId: z.string() }).parse(args ?? {});
        const { items, source, fetchedAt } = await catalogService.getProtocols();
        const protocol = items.find((item) => item.id === protocolId);
        if (!protocol) {
          throw createNotFoundError('Protocol not found. Use list-protocols to explore available integrations.');
        }
        const related = await catalogService.getYieldsForProtocol(protocol);
        const stats = computeApyStats(related);
        return {
          protocol: {
            id: protocol.id,
            name: protocol.name,
            description: protocol.description,
            website: protocol.website,
            category: protocol.category,
            networks: protocol.networks,
            audits: protocol.audits,
            riskFactors: protocol.riskFactors,
            fetchedAt
          },
          yields: related.map(formatYieldSummary),
          stats: {
            yieldCount: related.length,
            minApy: stats.min,
            maxApy: stats.max,
            medianApy: stats.median
          },
          source
        };
      })
  );
};
