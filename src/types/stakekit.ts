import { z } from 'zod';

export const tokenRefSchema = z
  .object({
    id: z.string().optional(),
    symbol: z.string().optional(),
    name: z.string().optional(),
    network: z.string().optional(),
    decimals: z.number().optional(),
    address: z.string().optional(),
    type: z.string().optional()
  })
  .passthrough();

/**
 * Schema for reward component details.
 * Provides stronger type validation for reward-related data.
 */
export const rewardComponentSchema = z
  .object({
    rate: z.number().optional(),
    rateType: z.string().optional(),
    token: tokenRefSchema.optional(),
    yieldSource: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

export const rewardSchema = z
  .object({
    token: tokenRefSchema.optional(),
    tokenSymbol: z.string().optional(),
    apy: z.number().optional(),
    apr: z.number().optional(),
    rewardRate: z.number().optional(),
    rewardType: z.string().optional(),
    // Support for detailed reward components
    components: z.array(rewardComponentSchema).optional()
  })
  .passthrough();

export const lifecyclePeriodSchema = z
  .object({
    days: z.number().optional(),
    hours: z.number().optional(),
    minutes: z.number().optional()
  })
  .passthrough();

export const lifecycleSchema = z
  .object({
    supportsEnter: z.boolean().optional(),
    supportsExit: z.boolean().optional(),
    warmupPeriod: lifecyclePeriodSchema.optional(),
    cooldownPeriod: lifecyclePeriodSchema.optional(),
    withdrawalPeriod: lifecyclePeriodSchema.optional(),
    exitWindow: lifecyclePeriodSchema.optional()
  })
  .passthrough();

export const providerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    website: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

export const stakeKitYieldSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    integrationId: z.string().optional(),
    network: z.string().optional(),
    networks: z.array(z.string()).optional(),
    token: tokenRefSchema.optional(),
    depositToken: tokenRefSchema.optional(),
    rewardTokens: z.array(tokenRefSchema).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    type: z.string().optional(),
    apy: z.number().optional(),
    apr: z.number().optional(),
    tvl: z.number().optional(),
    tvlUsd: z.number().optional(),
    tvlUsd24hAgo: z.number().optional(),
    status: z
      .object({
        enter: z.boolean().optional(),
        exit: z.boolean().optional()
      })
      .partial()
      .optional(),
    lifecycle: lifecycleSchema.optional(),
    metrics: z
      .object({
        apy: z.number().optional(),
        apr: z.number().optional(),
        apyBase: z.number().optional(),
        apyReward: z.number().optional(),
        borrowApy: z.number().optional(),
        supplyApy: z.number().optional(),
        tvlUsd: z.number().optional(),
        collateralFactor: z.number().optional()
      })
      .partial()
      .optional(),
    rewards: z.array(rewardSchema).optional(),
    metadata: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        provider: providerSchema.optional(),
        providerId: z.string().optional(),
        strategy: z.string().optional(),
        type: z.string().optional(),
        labels: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().optional(),
        stakingMechanism: z.string().optional(),
        riskLevel: z.string().optional(),
        riskRating: z.string().optional(),
        warnings: z.array(z.string()).optional(),
        exit: lifecycleSchema.optional(),
        fees: z
          .object({
            performance: z.number().optional(),
            management: z.number().optional(),
            withdrawal: z.number().optional()
          })
          .partial()
          .optional()
      })
      .partial()
      .passthrough()
      .optional()
  })
  .passthrough();

export const stakeKitYieldListResponseSchema = z
  .object({
    data: z.array(stakeKitYieldSchema),
    limit: z.number().optional(),
    page: z.number().optional(),
    offset: z.number().optional(),
    hasNextPage: z.boolean().optional(),
    totalCount: z.number().optional(),
    total: z.number().optional(),
    nextCursor: z.string().optional(),
    cursor: z.string().optional()
  })
  .passthrough();

export type RewardComponent = z.infer<typeof rewardComponentSchema>;
export type StakeKitYield = z.infer<typeof stakeKitYieldSchema>;
export type StakeKitYieldListResponse = z.infer<typeof stakeKitYieldListResponseSchema>;

export const stakeKitNetworkSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    isTestnet: z.boolean().optional(),
    deprecated: z.boolean().optional(),
    deprecationReason: z.string().optional(),
    logo: z.string().optional(),
    nativeToken: tokenRefSchema.optional(),
    explorers: z.array(z.string()).optional(),
    blockTime: z.number().optional(),
    finality: z.string().optional(),
    gasToken: tokenRefSchema.optional(),
    tags: z.array(z.string()).optional()
  })
  .passthrough();

export type StakeKitNetwork = z.infer<typeof stakeKitNetworkSchema>;

export const stakeKitTokenSchema = z
  .object({
    id: z.string().optional(),
    symbol: z.string(),
    name: z.string().optional(),
    networks: z.array(z.string()).optional(),
    decimals: z.number().optional(),
    priceUsd: z.number().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    addresses: z.record(z.string()).optional()
  })
  .passthrough();

export type StakeKitToken = z.infer<typeof stakeKitTokenSchema>;

export const stakeKitProtocolSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
    networks: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    tvlUsd: z.number().optional(),
    audits: z.array(z.string()).optional(),
    riskFactors: z.array(z.string()).optional()
  })
  .passthrough();

export type StakeKitProtocol = z.infer<typeof stakeKitProtocolSchema>;

export type StakeKitSource = 'primary' | 'fallback';

export interface WithSource<T> {
  data: T;
  source: StakeKitSource;
}
