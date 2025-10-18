import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { stakeKitClient } from '../client/stakekit.js';
import {
  StakeKitYield,
  stakeKitYieldListResponseSchema,
  stakeKitYieldSchema
} from '../types/stakekit.js';
import { createNotFoundError, createUpstreamError, formatToolError } from '../utils/errors.js';

const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .optional(),
  cursor: z.string().optional()
});

const listArgsSchema = paginationSchema.extend({
  network: z.string().optional(),
  type: z.string().optional()
});

const networkArgsSchema = paginationSchema.extend({
  networkId: z.string()
});

const tokenArgsSchema = paginationSchema.extend({
  tokenSymbol: z.string()
});

const stakingArgsSchema = paginationSchema.extend({
  includeLiquid: z.boolean().default(false).optional()
});

const lendingArgsSchema = paginationSchema.extend({
  protocol: z.string().optional()
});

const vaultArgsSchema = paginationSchema.extend({
  strategy: z.string().optional()
});

const topArgsSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5).optional(),
  minTvlUsd: z.number().min(0).default(0).optional(),
  type: z.string().optional()
});

const detailsArgsSchema = z.object({
  yieldId: z
    .string()
    .min(1, 'yieldId is required')
});

interface YieldSummary {
  id: string;
  name: string;
  network: string;
  type: string;
  apy?: number | null;
  rewardTokenSymbols: string[];
  tvlUsd?: number | null;
  riskLevel?: string;
  tags: string[];
}

interface YieldListData {
  raw: StakeKitYield[];
  summaries: YieldSummary[];
  meta: {
    limit?: number;
    offset?: number;
    cursor?: string;
    hasNextPage?: boolean;
    totalCount?: number;
  };
  source: 'primary' | 'fallback';
}

const toTitle = (value?: string | null) =>
  value && value.length > 0
    ? value
        .split(/[-_]/)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
    : undefined;

const getYieldName = (entry: StakeKitYield) =>
  entry.metadata?.name ?? entry.name ?? toTitle(entry.id) ?? entry.id;

const getYieldNetwork = (entry: StakeKitYield) => {
  const metadataNetwork = typeof (entry.metadata as Record<string, unknown> | undefined)?.['network'] === 'string'
    ? ((entry.metadata as Record<string, unknown>).network as string)
    : undefined;
  return entry.network ?? entry.token?.network ?? metadataNetwork ?? entry.networks?.[0] ?? 'unknown';
};

const getYieldType = (entry: StakeKitYield) =>
  entry.type ?? entry.metadata?.type ?? entry.metadata?.category ?? entry.category ?? 'unknown';

const getApy = (entry: StakeKitYield) =>
  entry.apy ?? entry.metrics?.apy ?? entry.metrics?.apr ?? entry.apr ?? null;

const getTvlUsd = (entry: StakeKitYield) => entry.tvlUsd ?? entry.metrics?.tvlUsd ?? entry.tvl ?? null;

const collectRewardSymbols = (entry: StakeKitYield) => {
  const rewards = entry.rewardTokens ?? entry.rewards?.map((reward) => reward.token).filter(Boolean) ?? [];
  const symbols = new Set<string>();
  for (const reward of rewards) {
    const symbol = reward?.symbol ?? reward?.name ?? reward?.id;
    if (symbol) {
      symbols.add(symbol.toString());
    }
  }
  if (symbols.size === 0 && entry.token?.symbol) {
    symbols.add(entry.token.symbol);
  }
  return Array.from(symbols);
};

const collectTags = (entry: StakeKitYield) => {
  const tags = new Set<string>();
  for (const tag of entry.tags ?? []) {
    tags.add(tag);
  }
  for (const tag of entry.metadata?.tags ?? []) {
    tags.add(tag);
  }
  for (const label of entry.metadata?.labels ?? []) {
    tags.add(label);
  }
  return Array.from(tags);
};

const dedupeById = (items: StakeKitYield[]) => {
  const map = new Map<string, StakeKitYield>();
  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
};

const buildYieldSummaries = (items: StakeKitYield[]): YieldSummary[] =>
  items.map((entry) => ({
    id: entry.id,
    name: getYieldName(entry),
    network: getYieldNetwork(entry),
    type: getYieldType(entry),
    apy: getApy(entry),
    rewardTokenSymbols: collectRewardSymbols(entry),
    tvlUsd: getTvlUsd(entry),
    riskLevel: entry.metadata?.riskLevel ?? entry.metadata?.riskRating,
    tags: collectTags(entry)
  }));

const fetchYieldList = async (
  params: Record<string, unknown>,
  requestId?: string
): Promise<YieldListData> => {
  try {
    const { data, source } = await stakeKitClient.get<unknown>('/yields', params, {
      requestId
    });
    const parsed = stakeKitYieldListResponseSchema.parse(data);
    const deduped = dedupeById(parsed.data);
    return {
      raw: deduped,
      summaries: buildYieldSummaries(deduped),
      meta: {
        limit: parsed.limit,
        offset: parsed.offset,
        cursor: parsed.cursor ?? parsed.nextCursor,
        hasNextPage: parsed.hasNextPage,
        totalCount: parsed.totalCount ?? parsed.total
      },
      source
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createUpstreamError('Unexpected response format from StakeKit yields endpoint', error.flatten());
    }
    throw error;
  }
};

const ensurePositiveLimit = (limit?: number) => limit ?? 20;

const toListParams = (args: z.infer<typeof paginationSchema>) => {
  const params: Record<string, string | number> = {};
  const limit = ensurePositiveLimit(args.limit);
  params.limit = limit;

  // Validate offset is a non-negative number
  if (args.offset !== undefined && typeof args.offset === 'number' && args.offset >= 0) {
    params.offset = args.offset;
    params.page = Math.floor(args.offset / limit) + 1;
  }

  // Add cursor if provided
  if (args.cursor) {
    params.cursor = args.cursor;
  }

  return params;
};

const checkWithdrawalWarning = (entry: StakeKitYield) => {
  const warnings: string[] = [];
  const supportsExit = entry.lifecycle?.supportsExit ?? entry.metadata?.exit?.supportsExit ?? entry.status?.exit;
  if (supportsExit === false) {
    warnings.push('This yield does not currently support exits. Review liquidity before recommending.');
  }
  const withdrawalPeriod = entry.lifecycle?.withdrawalPeriod ?? entry.metadata?.exit?.withdrawalPeriod;
  const days = withdrawalPeriod?.days;
  if (days !== undefined && days > 7) {
    warnings.push(`Withdrawal period is ${days} days which exceeds the recommended 7-day threshold.`);
  }
  return warnings;
};

const buildYieldDetails = (entry: StakeKitYield) => {
  const warnings = checkWithdrawalWarning(entry);
  return {
    id: entry.id,
    name: getYieldName(entry),
    network: getYieldNetwork(entry),
    type: getYieldType(entry),
    description: entry.metadata?.description,
    apy: getApy(entry),
    apr: entry.apr ?? entry.metrics?.apr,
    tvlUsd: getTvlUsd(entry),
    provider: {
      id: entry.metadata?.providerId,
      name: entry.metadata?.provider?.name,
      website: entry.metadata?.provider?.website
    },
    tokens: {
      deposit: entry.depositToken ?? entry.token,
      rewards: entry.rewardTokens ?? entry.rewards?.map((reward) => reward.token).filter(Boolean)
    },
    lifecycle: {
      supportsEnter: entry.lifecycle?.supportsEnter ?? entry.status?.enter,
      supportsExit: entry.lifecycle?.supportsExit ?? entry.status?.exit,
      warmup: entry.lifecycle?.warmupPeriod,
      cooldown: entry.lifecycle?.cooldownPeriod,
      withdrawal: entry.lifecycle?.withdrawalPeriod
    },
    rewards: entry.rewards?.map((reward) => ({
      symbol: reward.tokenSymbol ?? reward.token?.symbol,
      apy: reward.apy ?? reward.rewardRate,
      type: reward.rewardType
    })),
    fees: entry.metadata?.fees,
    risk: {
      level: entry.metadata?.riskLevel ?? entry.metadata?.riskRating,
      tags: collectTags(entry),
      warnings: entry.metadata?.warnings
    },
    warnings
  };
};

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

export const registerYieldTools = (server: McpServer) => {
  server.registerTool(
    'get-yield-opportunities',
    {
      title: 'List yield opportunities',
      description: 'Returns paginated yield opportunities with APY and metadata for discovery.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional(),
        network: z.string().optional(),
        type: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = listArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          network: parsed.network,
          type: parsed.type
        };
        const response = await fetchYieldList(params);
        return {
          items: response.summaries,
          meta: response.meta,
          source: response.source
        };
      })
  );

  server.registerTool(
    'get-yield-details',
    {
      title: 'Get yield opportunity details',
      description: 'Fetches comprehensive information about a specific yield by identifier.',
      inputSchema: {
        yieldId: z.string()
      }
    },
    async (args) =>
      runTool(async () => {
        const { yieldId } = detailsArgsSchema.parse(args ?? {});
        try {
          const { data } = await stakeKitClient.get<unknown>(`/yields/${yieldId}`);
          const parsed = stakeKitYieldSchema.parse(data);
          return {
            overview: buildYieldDetails(parsed)
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw createUpstreamError('Unexpected response format from StakeKit yield details endpoint', error.flatten());
          }
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            throw createNotFoundError(`Yield ${yieldId} was not found. Verify the identifier using get-yield-opportunities.`);
          }
          throw error;
        }
      })
  );

  server.registerTool(
    'get-yields-by-network',
    {
      title: 'List yields for a specific network',
      description: 'Filters yield opportunities by blockchain network identifier.',
      inputSchema: {
        networkId: z.string(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = networkArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          network: parsed.networkId
        };
        const response = await fetchYieldList(params);
        if (response.summaries.length === 0) {
          throw createNotFoundError(
            `No yields found for network ${parsed.networkId}. Call list-supported-chains to confirm network availability.`,
            { networkId: parsed.networkId }
          );
        }
        return {
          items: response.summaries,
          meta: response.meta,
          source: response.source
        };
      })
  );

  server.registerTool(
    'get-yields-by-token',
    {
      title: 'List yields supporting a token',
      description: 'Finds yields that accept or reward a specific token symbol.',
      inputSchema: {
        tokenSymbol: z.string(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = tokenArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          token: parsed.tokenSymbol
        };
        const response = await fetchYieldList(params);
        const lowercaseSymbol = parsed.tokenSymbol.toLowerCase();
        const filteredRaw = response.raw.filter((entry) => {
          const depositSymbol = entry.depositToken?.symbol ?? entry.token?.symbol;
          const rewardSymbols = collectRewardSymbols(entry);
          return (
            depositSymbol?.toLowerCase() === lowercaseSymbol ||
            rewardSymbols.some((symbol) => symbol.toLowerCase() === lowercaseSymbol)
          );
        });
        if (filteredRaw.length === 0) {
          throw createNotFoundError(
            `No yields found for token ${parsed.tokenSymbol}. Verify symbol via list-supported-tokens.`,
            { tokenSymbol: parsed.tokenSymbol }
          );
        }
        const summaries = buildYieldSummaries(filteredRaw).map((summary) => ({
          ...summary,
          tokenMatchType: summary.rewardTokenSymbols.some((symbol) => symbol.toLowerCase() === lowercaseSymbol)
            ? 'reward'
            : 'deposit'
        }));
        return {
          items: summaries,
          meta: response.meta,
          source: response.source
        };
      })
  );

  server.registerTool(
    'get-staking-yields',
    {
      title: 'List staking and liquid staking yields',
      description: 'Retrieves staking yields with optional inclusion of liquid staking opportunities.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional(),
        includeLiquid: z.boolean().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = stakingArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          type: 'staking'
        };
        const stakingResponse = await fetchYieldList(params);
        let combinedRaw = stakingResponse.raw;
        if (parsed.includeLiquid) {
          const liquidResponse = await fetchYieldList({ ...params, type: 'liquid_staking' });
          combinedRaw = dedupeById([...stakingResponse.raw, ...liquidResponse.raw]);
        }
        const summaries = buildYieldSummaries(combinedRaw).map((summary) => ({
          ...summary,
          stakingMechanism: summary.type.includes('liquid') ? 'Liquid staking' : 'Validator'
        }));
        return {
          items: summaries,
          meta: stakingResponse.meta,
          source: stakingResponse.source
        };
      })
  );

  server.registerTool(
    'get-lending-yields',
    {
      title: 'List lending market yields',
      description: 'Returns yields categorized as lending or borrowing markets.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional(),
        protocol: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = lendingArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          type: 'lending'
        };
        const response = await fetchYieldList(params);
        const filteredSummaries = parsed.protocol
          ? response.summaries.filter((item) => item.name.toLowerCase().includes(parsed.protocol!.toLowerCase()))
          : response.summaries;

        // Create a Map for O(1) lookups instead of O(n) find operations
        const entryMap = new Map(response.raw.map((entry) => [entry.id, entry]));

        return {
          items: filteredSummaries.map((summary) => {
            const entry = entryMap.get(summary.id);
            return {
              ...summary,
              supplyApy: summary.apy,
              collateralFactor: entry?.metrics?.collateralFactor,
              borrowApy: entry?.metrics?.borrowApy
            };
          }),
          meta: response.meta,
          source: response.source
        };
      })
  );

  server.registerTool(
    'get-vault-yields',
    {
      title: 'List vault and structured product yields',
      description: 'Surfaces vault opportunities including strategy, lockup, and fee insights.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        cursor: z.string().optional(),
        strategy: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = vaultArgsSchema.parse(args ?? {});
        const params = {
          ...toListParams(parsed),
          type: 'vault'
        };
        const response = await fetchYieldList(params);
        const items = response.raw
          .filter((entry) =>
            parsed.strategy ? getYieldName(entry).toLowerCase().includes(parsed.strategy.toLowerCase()) : true
          )
          .map((entry) => ({
            ...buildYieldSummaries([entry])[0],
            strategy: entry.metadata?.strategy,
            lockup: entry.lifecycle?.withdrawalPeriod,
            performanceFee: entry.metadata?.fees?.performance,
            managementFee: entry.metadata?.fees?.management,
            riskRating: entry.metadata?.riskRating ?? entry.metadata?.riskLevel
          }));
        if (items.length === 0) {
          throw createNotFoundError(
            parsed.strategy
              ? `No vaults found matching strategy ${parsed.strategy}.`
              : 'No vault opportunities available from StakeKit at this time.'
          );
        }
        return {
          items,
          meta: response.meta,
          source: response.source
        };
      })
  );

  server.registerTool(
    'get-top-yields',
    {
      title: 'Top yields by APY',
      description: 'Returns the highest APY yields meeting optional TVL and type filters.',
      inputSchema: {
        limit: z.number().int().min(1).max(20).optional(),
        minTvlUsd: z.number().min(0).optional(),
        type: z.string().optional()
      }
    },
    async (args) =>
      runTool(async () => {
        const parsed = topArgsSchema.parse(args ?? {});
        const limit = parsed.limit ?? 5;
        const base = await fetchYieldList({ limit: 100, type: parsed.type });
        const ranked = base.summaries
          .filter((item) => (item.apy ?? 0) > 0 && (item.tvlUsd ?? 0) >= (parsed.minTvlUsd ?? 0))
          .sort((a, b) => {
            const apyDiff = (b.apy ?? 0) - (a.apy ?? 0);
            if (apyDiff !== 0) return apyDiff;
            return a.id.localeCompare(b.id);
          })
          .slice(0, limit)
          .map((item) => ({
            id: item.id,
            name: item.name,
            apy: item.apy,
            network: item.network,
            type: item.type,
            tvlUsd: item.tvlUsd
          }));
        if (ranked.length === 0) {
          throw createNotFoundError('No yields met the ranking criteria. Adjust filters and retry.');
        }
        return {
          generatedAt: new Date().toISOString(),
          items: ranked,
          meta: base.meta,
          source: base.source
        };
      })
  );
};
