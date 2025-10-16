import { z } from 'zod';
import { stakeKitClient } from '../client/stakekit.js';
import {
  StakeKitNetwork,
  StakeKitProtocol,
  StakeKitToken,
  StakeKitYield,
  stakeKitNetworkSchema,
  stakeKitProtocolSchema,
  stakeKitTokenSchema,
  stakeKitYieldListResponseSchema
} from '../types/stakekit.js';
import { TTLCache } from '../utils/cache.js';
import { createUpstreamError } from '../utils/errors.js';

interface CachedList<T> {
  items: T[];
  source: 'primary' | 'fallback';
  fetchedAt: string;
}

const NETWORK_CACHE = new TTLCache<CachedList<StakeKitNetwork>>(5 * 60 * 1000);
const TOKEN_CACHE = new TTLCache<CachedList<StakeKitToken>>(5 * 60 * 1000);
const PROTOCOL_CACHE = new TTLCache<CachedList<StakeKitProtocol>>(5 * 60 * 1000);
const YIELD_CACHE = new TTLCache<CachedList<StakeKitYield>>(5 * 60 * 1000);

const parseListResponse = <T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T[] => {
  try {
    if (Array.isArray(data)) {
      return schema.array().parse(data);
    }
    if (data && typeof data === 'object' && 'data' in data) {
      const wrapped = (data as { data: unknown }).data;
      return schema.array().parse(wrapped);
    }
    const parsed = schema.parse(data);
    return [parsed];
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createUpstreamError(`Unexpected response format from ${endpoint}`, error.flatten());
    }
    throw error;
  }
};

const parseYieldResponse = (data: unknown, context: string) => {
  try {
    return stakeKitYieldListResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createUpstreamError(`Unexpected response format from ${context}`, error.flatten());
    }
    throw error;
  }
};

const shouldBypassCache = () => process.env.NODE_ENV === 'test';

const withCache = async <T>(cache: TTLCache<CachedList<T>>, key: string, loader: () => Promise<CachedList<T>>) => {
  if (!shouldBypassCache()) {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
  }
  const result = await loader();
  if (!shouldBypassCache()) {
    cache.set(key, result);
  }
  return result;
};

export const catalogService = {
  async getNetworks(): Promise<CachedList<StakeKitNetwork>> {
    return withCache(NETWORK_CACHE, 'networks', async () => {
      const { data, source } = await stakeKitClient.get<unknown>('/networks');
      const items = parseListResponse(stakeKitNetworkSchema, data, 'networks');
      return { items, source, fetchedAt: new Date().toISOString() };
    });
  },

  async getTokens(): Promise<CachedList<StakeKitToken>> {
    return withCache(TOKEN_CACHE, 'tokens', async () => {
      const { data, source } = await stakeKitClient.get<unknown>('/tokens');
      const items = parseListResponse(stakeKitTokenSchema, data, 'tokens');
      return { items, source, fetchedAt: new Date().toISOString() };
    });
  },

  async getProtocols(): Promise<CachedList<StakeKitProtocol>> {
    return withCache(PROTOCOL_CACHE, 'protocols', async () => {
      const { data, source } = await stakeKitClient.get<unknown>('/protocols');
      const items = parseListResponse(stakeKitProtocolSchema, data, 'protocols');
      return { items, source, fetchedAt: new Date().toISOString() };
    });
  },

  async getYields(): Promise<CachedList<StakeKitYield>> {
    return withCache(YIELD_CACHE, 'yields', async () => {
      const { data, source } = await stakeKitClient.get<unknown>('/yields', { limit: 200 });
      const parsed = parseYieldResponse(data, 'yields');
      return { items: parsed.data, source, fetchedAt: new Date().toISOString() };
    });
  },

  async getYieldsForNetwork(networkId: string): Promise<StakeKitYield[]> {
    const { data } = await stakeKitClient.get<unknown>('/yields', { network: networkId, limit: 50 });
    const parsed = parseYieldResponse(data, 'yields by network');
    return parsed.data;
  },

  async getYieldsForToken(symbol: string): Promise<StakeKitYield[]> {
    const { data } = await stakeKitClient.get<unknown>('/yields', { token: symbol, limit: 100 });
    const parsed = parseYieldResponse(data, 'yields by token');
    return parsed.data;
  },

  async getYieldsForProtocol(protocol: StakeKitProtocol): Promise<StakeKitYield[]> {
    const { items } = await this.getYields();
    return items.filter(
      (entry) => entry.metadata?.providerId === protocol.id || entry.metadata?.provider?.name === protocol.name
    );
  },

  clearCaches() {
    NETWORK_CACHE.clear();
    TOKEN_CACHE.clear();
    PROTOCOL_CACHE.clear();
    YIELD_CACHE.clear();
  }
};

export type CatalogService = typeof catalogService;
