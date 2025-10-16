import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { catalogService } from '../services/catalog.js';
import { TTLCache } from '../utils/cache.js';
import { formatToolError } from '../utils/errors.js';
import { StakeKitNetwork, StakeKitYield } from '../types/stakekit.js';

const yieldCache = new TTLCache<unknown>(5 * 60 * 1000);
const networkCache = new TTLCache<unknown>(10 * 60 * 1000);
const tokenCache = new TTLCache<unknown>(10 * 60 * 1000);
const protocolCache = new TTLCache<unknown>(15 * 60 * 1000);
const allNetworksCache = new TTLCache<unknown>(30 * 60 * 1000);

const percentile = (value: number | null | undefined, peers: number[]) => {
  if (value === null || value === undefined || peers.length === 0) {
    return null;
  }
  const sorted = [...peers].sort((a, b) => a - b);
  const position = sorted.findIndex((score) => score >= value);
  const rank = position === -1 ? sorted.length : position + 1;
  return Math.round((rank / sorted.length) * 100);
};

const computePeerStats = (yields: StakeKitYield[]) => {
  const apys = yields
    .map((entry) => entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (apys.length === 0) {
    return { median: null, peers: [] as number[] };
  }
  const sorted = [...apys].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { median, peers: apys };
};

const toJsonContent = (uri: string, data: unknown) => ({
  uri,
  mimeType: 'application/json',
  text: JSON.stringify(data, null, 2)
});

const toMarkdownContent = (uri: string, markdown: string) => ({
  uri,
  mimeType: 'text/markdown',
  text: markdown
});

const buildYieldResource = async (yieldId: string) => {
  const { items } = await catalogService.getYields();
  const match = items.find((entry) => entry.id === yieldId);
  if (!match) {
    throw new Error(`Yield ${yieldId} not found.`);
  }
  const networkId = match.network ?? match.token?.network;
  const peerYields = networkId ? await catalogService.getYieldsForNetwork(networkId) : [];
  const stats = computePeerStats(peerYields);
  const percentileScore = stats.peers.length
    ? percentile(
        match.apy ?? match.metrics?.apy ?? match.metrics?.apr ?? match.apr ?? null,
        stats.peers
      )
    : null;
  return {
    id: match.id,
    name: match.metadata?.name ?? match.name ?? match.id,
    network: match.network ?? match.token?.network,
    type: match.type ?? match.metadata?.type ?? match.metadata?.category ?? 'unknown',
    apy: match.apy ?? match.metrics?.apy ?? match.metrics?.apr ?? match.apr ?? null,
    tvlUsd: match.tvlUsd ?? match.metrics?.tvlUsd ?? match.tvl ?? null,
    description: match.metadata?.description,
    provider: match.metadata?.provider,
    lifecycle: match.lifecycle,
    risk: {
      level: match.metadata?.riskLevel ?? match.metadata?.riskRating,
      warnings: match.metadata?.warnings
    },
    peerAnalysis: {
      networkMedianApy: stats.median ?? null,
      percentile: percentileScore
    }
  };
};

const buildNetworkMarkdown = async (networkId: string) => {
  const { items } = await catalogService.getNetworks();
  const network = items.find((entry) => entry.id === networkId);
  if (!network) {
    throw new Error(`Network ${networkId} not found.`);
  }
  const yields = await catalogService.getYieldsForNetwork(networkId);
  const top = yields
    .map((entry) => ({
      id: entry.id,
      name: entry.metadata?.name ?? entry.name ?? entry.id,
      apy: entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null,
      tvlUsd: entry.tvlUsd ?? entry.metrics?.tvlUsd ?? entry.tvl ?? null,
      type: entry.type ?? entry.metadata?.type ?? entry.metadata?.category ?? 'unknown'
    }))
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 5);
  const header = `# ${network.name} Network Overview`;
  const stats = `- **Category:** ${network.category ?? 'unknown'}\n- **Testnet:** ${network.isTestnet ? 'Yes' : 'No'}\n- **Native Token:** ${network.nativeToken?.symbol ?? 'N/A'}\n- **Explorers:** ${(network.explorers ?? []).join(', ') || 'N/A'}`;
  const tableHeader = `\n| Yield | APY | TVL (USD) | Type |\n| --- | --- | --- | --- |`;
  const tableRows = top
    .map((entry) => `| ${entry.name} | ${entry.apy ? `${(entry.apy * 100).toFixed(2)}%` : 'n/a'} | ${entry.tvlUsd ? `$${entry.tvlUsd.toLocaleString()}` : 'n/a'} | ${entry.type} |`)
    .join('\n');
  const cautions = network.deprecationReason
    ? `\n> **Caution:** ${network.deprecationReason}`
    : '';
  return `${header}\n\n${stats}${tableHeader}\n${tableRows || '| No active yields | - | - | - |'}${cautions}`;
};

const buildTokenResource = async (tokenId: string) => {
  const { items } = await catalogService.getTokens();
  const token = items.find((entry) => entry.id === tokenId || entry.symbol === tokenId);
  if (!token) {
    throw new Error(`Token ${tokenId} not found.`);
  }
  const yields = await catalogService.getYieldsForToken(token.symbol);
  return {
    token: {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      description: token.description,
      decimals: token.decimals,
      networks: token.networks,
      priceUsd: token.priceUsd,
      tags: token.tags
    },
    yields: yields.map((entry) => ({
      id: entry.id,
      name: entry.metadata?.name ?? entry.name ?? entry.id,
      network: entry.network ?? entry.token?.network,
      apy: entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null,
      type: entry.type ?? entry.metadata?.type ?? entry.metadata?.category ?? 'unknown'
    }))
  };
};

const buildProtocolResource = async (protocolId: string) => {
  const { items } = await catalogService.getProtocols();
  const protocol = items.find((entry) => entry.id === protocolId);
  if (!protocol) {
    throw new Error(`Protocol ${protocolId} not found.`);
  }
  const yields = await catalogService.getYieldsForProtocol(protocol);
  const stats = computePeerStats(yields);
  return {
    protocol: {
      id: protocol.id,
      name: protocol.name,
      description: protocol.description,
      website: protocol.website,
      category: protocol.category,
      networks: protocol.networks,
      audits: protocol.audits,
      riskFactors: protocol.riskFactors
    },
    yields: yields.map((entry) => ({
      id: entry.id,
      name: entry.metadata?.name ?? entry.name ?? entry.id,
      apy: entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null,
      tvlUsd: entry.tvlUsd ?? entry.metrics?.tvlUsd ?? entry.tvl ?? null,
      type: entry.type ?? entry.metadata?.type ?? entry.metadata?.category ?? 'unknown'
    })),
    stats: {
      networkMedianApy: stats.median,
      yieldCount: yields.length
    }
  };
};

const buildAllNetworksResource = async () => {
  const { items } = await catalogService.getNetworks();
  const grouped = items.reduce<Record<string, StakeKitNetwork[]>>((acc, network) => {
    const category = network.category ?? 'unknown';
    acc[category] = acc[category] ?? [];
    acc[category].push(network);
    return acc;
  }, {});
  const { items: yields } = await catalogService.getYields();
  const counts = yields.reduce<Record<string, number>>((acc, entry) => {
    const networkId = entry.network ?? entry.token?.network ?? 'unknown';
    acc[networkId] = (acc[networkId] ?? 0) + 1;
    return acc;
  }, {});
  return {
    generatedAt: new Date().toISOString(),
    categories: Object.entries(grouped).map(([category, networks]) => ({
      category,
      networks: networks.map((network) => ({
        id: network.id,
        name: network.name,
        isTestnet: network.isTestnet ?? false,
        yieldCount: counts[network.id] ?? 0
      }))
    })),
    references: {
      tools: ['list-supported-chains', 'get-yields-by-network'],
      resources: ['network://{networkId}', 'yield://{yieldId}']
    }
  };
};

const resolveIdentifier = (variables: Record<string, string | string[]>) => {
  const [firstKey] = Object.keys(variables);
  const value = firstKey ? variables[firstKey] : undefined;
  if (Array.isArray(value)) {
    return value[0] ?? 'all';
  }
  return value ?? 'all';
};

export const registerResources = (server: McpServer) => {
  const register = (
    name: string,
    template: ResourceTemplate,
    cache: TTLCache<unknown>,
    ttl: number,
    format: 'json' | 'markdown',
    builder: (identifier: string) => Promise<unknown>
  ) => {
    server.registerResource(
      name,
      template,
      { title: name, description: `Dynamic resource for ${name}` },
      async (uri, variables) => {
        try {
          const identifier = resolveIdentifier(variables as Record<string, string | string[]>);
          const cached = cache.get(identifier);
          if (cached) {
            return {
              contents: [
                format === 'markdown'
                  ? toMarkdownContent(uri.href, cached as string)
                  : toJsonContent(uri.href, cached)
              ]
            };
          }
          const payload = await builder(identifier);
          cache.set(identifier, payload, ttl);
          return {
            contents: [
              format === 'markdown'
                ? toMarkdownContent(uri.href, payload as string)
                : toJsonContent(uri.href, payload)
            ]
          };
        } catch (error) {
          throw formatToolError(error);
        }
      }
    );
  };

  register(
    'yield-detail',
    new ResourceTemplate('yield://{yieldId}', { list: undefined }),
    yieldCache,
    5 * 60 * 1000,
    'json',
    (identifier) => buildYieldResource(identifier)
  );

  register(
    'network-detail',
    new ResourceTemplate('network://{networkId}', { list: undefined }),
    networkCache,
    10 * 60 * 1000,
    'markdown',
    (identifier) => buildNetworkMarkdown(identifier)
  );

  register(
    'token-detail',
    new ResourceTemplate('token://{tokenId}', { list: undefined }),
    tokenCache,
    10 * 60 * 1000,
    'json',
    (identifier) => buildTokenResource(identifier)
  );

  register(
    'protocol-detail',
    new ResourceTemplate('protocol://{protocolId}', { list: undefined }),
    protocolCache,
    15 * 60 * 1000,
    'json',
    (identifier) => buildProtocolResource(identifier)
  );

  register(
    'networks-overview',
    new ResourceTemplate('networks://all', { list: undefined }),
    allNetworksCache,
    30 * 60 * 1000,
    'json',
    async () => buildAllNetworksResource()
  );
};
