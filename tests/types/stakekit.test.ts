import { describe, it, expect } from 'vitest';
import {
  rewardSchema,
  stakeKitYieldSchema,
  stakeKitYieldListResponseSchema,
  tokenRefSchema,
} from '../../src/types/stakekit.js';

describe('StakeKit Type Schemas', () => {
  describe('rewardSchema - type validation', () => {
    it('should parse valid reward data', () => {
      const validReward = {
        token: { id: 'eth', symbol: 'ETH', name: 'Ethereum' },
        tokenSymbol: 'ETH',
        apy: 0.05,
        apr: 0.048,
        rewardRate: 0.001,
        rewardType: 'staking',
      };

      const result = rewardSchema.parse(validReward);
      expect(result).toEqual(validReward);
    });

    it('should handle rewards with partial data', () => {
      const partialReward = {
        tokenSymbol: 'BTC',
        apy: 0.03,
      };

      const result = rewardSchema.parse(partialReward);
      expect(result.tokenSymbol).toBe('BTC');
      expect(result.apy).toBe(0.03);
    });

    it('should reject rewards with invalid type fields', () => {
      const invalidRewards = [
        { apy: 'not-a-number' }, // apy should be number
        { apr: true }, // apr should be number
        { tokenSymbol: 123 }, // tokenSymbol should be string
        { rewardType: null }, // rewardType should be string if present
        { token: 'not-an-object' }, // token should be object
      ];

      for (const invalidReward of invalidRewards) {
        expect(() => rewardSchema.parse(invalidReward)).toThrow();
      }
    });

    it('should handle rewards with extra fields via passthrough', () => {
      const rewardWithExtra = {
        tokenSymbol: 'USDC',
        apy: 0.02,
        customField: 'extra-data',
        nestedExtra: { foo: 'bar' },
      };

      const result = rewardSchema.parse(rewardWithExtra);
      expect(result).toEqual(rewardWithExtra);
    });
  });

  describe('tokenRefSchema - type validation', () => {
    it('should validate token references properly', () => {
      const validToken = {
        id: 'token-123',
        symbol: 'TKN',
        name: 'Test Token',
        network: 'ethereum',
        decimals: 18,
        address: '0x123...',
        type: 'ERC20',
      };

      const result = tokenRefSchema.parse(validToken);
      expect(result).toEqual(validToken);
    });

    it('should reject tokens with invalid field types', () => {
      const invalidTokens = [
        { decimals: '18' }, // decimals should be number
        { symbol: 123 }, // symbol should be string
        { network: true }, // network should be string
      ];

      for (const invalidToken of invalidTokens) {
        expect(() => tokenRefSchema.parse(invalidToken)).toThrow();
      }
    });
  });

  describe('stakeKitYieldSchema - complex type validation', () => {
    it('should parse valid yield with rewards array', () => {
      const validYield = {
        id: 'yield-123',
        name: 'ETH Staking',
        rewards: [
          { tokenSymbol: 'ETH', apy: 0.05 },
          { tokenSymbol: 'USDC', apr: 0.02 },
        ],
        metrics: {
          apy: 0.05,
          tvlUsd: 1000000,
        },
      };

      const result = stakeKitYieldSchema.parse(validYield);
      expect(result.id).toBe('yield-123');
      expect(result.rewards).toHaveLength(2);
    });

    it('should handle yields with malformed rewards array', () => {
      const yieldWithBadRewards = {
        id: 'yield-456',
        name: 'Test Yield',
        rewards: [
          { tokenSymbol: 'VALID', apy: 0.03 }, // Valid
          { apy: 'invalid' }, // Invalid - should be filtered
          null, // Null item
          { tokenSymbol: 123 }, // Invalid type
        ],
      };

      // The schema should either filter or reject entirely
      expect(() => stakeKitYieldSchema.parse(yieldWithBadRewards)).toThrow();
    });

    it('should validate nested metadata structure', () => {
      const yieldWithMetadata = {
        id: 'yield-789',
        metadata: {
          name: 'Test',
          provider: {
            id: 'provider-1',
            name: 'Test Provider',
            category: 'defi',
          },
          fees: {
            performance: 0.1,
            management: 0.02,
            withdrawal: 0.005,
          },
        },
      };

      const result = stakeKitYieldSchema.parse(yieldWithMetadata);
      expect(result.metadata?.provider?.id).toBe('provider-1');
      expect(result.metadata?.fees?.performance).toBe(0.1);
    });

    it('should reject yields with invalid nested data', () => {
      const invalidYields = [
        {
          id: 'test',
          metrics: {
            apy: 'not-a-number', // Should be number
          },
        },
        {
          id: 'test',
          metadata: {
            fees: {
              performance: 'ten-percent', // Should be number
            },
          },
        },
      ];

      for (const invalidYield of invalidYields) {
        expect(() => stakeKitYieldSchema.parse(invalidYield)).toThrow();
      }
    });
  });

  describe('stakeKitYieldListResponseSchema - response validation', () => {
    it('should parse valid paginated response with "data" field (matching actual API)', () => {
      // This test represents the ACTUAL StakeKit API v2 response structure
      const actualApiResponse = {
        data: [
          { id: 'yield-1', name: 'Yield 1' },
          { id: 'yield-2', name: 'Yield 2' },
        ],
        limit: 10,
        page: 1,
        hasNextPage: true,
        totalCount: 50,
      };

      const result = stakeKitYieldListResponseSchema.parse(actualApiResponse);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('yield-1');
      expect(result.limit).toBe(10);
      expect(result.page).toBe(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.totalCount).toBe(50);
    });

    it('should accept response with extra fields due to passthrough', () => {
      const responseWithItems = {
        data: [
          { id: 'yield-1', name: 'Yield 1' },
          { id: 'yield-2', name: 'Yield 2' },
        ],
        items: [ // This is extra field that passthrough allows
          { id: 'old-1', name: 'Old 1' },
        ],
        limit: 10,
        page: 1,
      };

      // The schema should parse "data" and pass through "items" as extra field
      const result = stakeKitYieldListResponseSchema.parse(responseWithItems);
      expect(result.data).toHaveLength(2);
      expect(result.items).toBeDefined(); // Passed through as extra field
    });

    it('should parse response with pagination metadata', () => {
      const validResponse = {
        data: [
          { id: 'yield-1', name: 'Yield 1' },
          { id: 'yield-2', name: 'Yield 2' },
        ],
        limit: 10,
        page: 1,
        hasNextPage: true,
        totalCount: 50,
      };

      const result = stakeKitYieldListResponseSchema.parse(validResponse);
      expect(result.data).toHaveLength(2);
      expect(result.totalCount).toBe(50);
    });

    it('should handle response with malformed yield data', () => {
      const responseWithBadData = {
        data: [
          { id: 'valid-1' }, // Valid
          { notId: 'invalid' }, // Missing required 'id'
          null, // Null item
          'string-item', // Non-object
        ],
      };

      // Should throw because data items don't match schema
      expect(() => stakeKitYieldListResponseSchema.parse(responseWithBadData)).toThrow();
    });

    it('should validate response metadata fields', () => {
      const invalidResponses = [
        { data: [], limit: 'ten' }, // limit should be number
        { data: [], page: true }, // page should be number
        { data: [], hasNextPage: 'yes' }, // hasNextPage should be boolean
      ];

      for (const invalidResponse of invalidResponses) {
        expect(() => stakeKitYieldListResponseSchema.parse(invalidResponse)).toThrow();
      }
    });
  });
});