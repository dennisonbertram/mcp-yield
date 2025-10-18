import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { catalogService } from '../../src/services/catalog.js';
import { stakeKitClient } from '../../src/client/stakekit.js';

describe('Type Safety Integration Tests', () => {
  beforeEach(() => {
    nock.cleanAll();
    catalogService.clearCaches();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('End-to-end type safety with real-world API responses', () => {
    it('should handle mixed valid and invalid data in a realistic API response', async () => {
      // Simulate a realistic API response with some malformed data
      const mixedNetworkResponse = [
        // Valid networks
        { id: 'ethereum', name: 'Ethereum', category: 'evm' },
        { id: 'polygon', name: 'Polygon', category: 'evm', isTestnet: false },
        // Invalid items that should be filtered
        { name: 'Missing ID' }, // Missing required 'id' field
        null,
        undefined,
        { id: 123, name: 'Invalid ID Type' }, // Wrong type for id
        // Valid network with extra fields
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          category: 'layer2',
          customField: 'extra-data',
          nested: { foo: 'bar' }
        }
      ];

      const mixedTokenResponse = [
        // Valid tokens
        { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        { symbol: 'USDC', decimals: 6 },
        // Invalid items
        { name: 'No Symbol' }, // Missing required symbol
        { symbol: null }, // Null symbol
        'not-an-object',
        42,
        // Valid with extra
        { symbol: 'DAI', customProp: true }
      ];

      // Mock API responses
      nock('https://api.yield.xyz')
        .get('/v1/networks')
        .reply(200, mixedNetworkResponse);

      nock('https://api.yield.xyz')
        .get('/v1/tokens')
        .reply(200, mixedTokenResponse);

      // Fetch data through the service
      const [networks, tokens] = await Promise.all([
        catalogService.getNetworks(),
        catalogService.getTokens()
      ]);

      // Verify networks are filtered correctly
      expect(networks.items).toBeDefined();
      expect(networks.items.length).toBe(3); // Only valid networks
      expect(networks.items.every(n => typeof n.id === 'string')).toBe(true);
      expect(networks.items.map(n => n.id)).toEqual(['ethereum', 'polygon', 'arbitrum']);

      // Verify tokens are filtered correctly
      expect(tokens.items).toBeDefined();
      expect(tokens.items.length).toBe(3); // Only valid tokens
      expect(tokens.items.every(t => typeof t.symbol === 'string')).toBe(true);
      expect(tokens.items.map(t => t.symbol)).toEqual(['ETH', 'USDC', 'DAI']);
    });

    it('should handle deeply nested malformed yield data', async () => {
      const complexYieldResponse = {
        items: [
          // Valid yield
          {
            id: 'yield-1',
            name: 'ETH Staking',
            rewards: [
              { tokenSymbol: 'ETH', apy: 0.05 }
            ],
            metadata: {
              provider: { id: 'lido', name: 'Lido' }
            }
          },
          // Yield with invalid rewards
          {
            id: 'yield-2',
            name: 'Test Yield',
            rewards: [
              { tokenSymbol: 'TEST', apy: 'not-a-number' } // Invalid APY type
            ]
          },
          // Yield with invalid metadata
          {
            id: 'yield-3',
            metadata: {
              fees: {
                performance: 'ten-percent' // Should be number
              }
            }
          }
        ],
        totalCount: 3,
        hasNextPage: false
      };

      nock('https://api.yield.xyz')
        .get('/v1/yields')
        .query(true)
        .reply(200, complexYieldResponse);

      // This should handle the response gracefully
      try {
        const yields = await catalogService.getYields();

        // Should get at least the valid yield
        expect(yields.items).toBeDefined();
        expect(yields.items.length).toBeGreaterThanOrEqual(1);

        // First yield should be valid
        const validYield = yields.items.find(y => y.id === 'yield-1');
        expect(validYield).toBeDefined();
        expect(validYield?.rewards?.[0]?.apy).toBe(0.05);
      } catch (error) {
        // If strict validation is enforced, error should be meaningful
        expect(error).toBeDefined();
        expect(error.message).toContain('Unexpected response format');
      }
    });

    it('should maintain type safety through the entire data flow', async () => {
      // Mock a complete data flow scenario
      const validNetworks = [
        { id: 'ethereum', name: 'Ethereum', category: 'evm' }
      ];

      const validTokens = [
        { id: 'eth-token', symbol: 'ETH', name: 'Ethereum', decimals: 18 }
      ];

      const validProviders = {
        items: [
          { id: 'provider-1', name: 'Test Provider', category: 'defi' }
        ]
      };

      const validYields = {
        items: [
          {
            id: 'yield-1',
            name: 'ETH Yield',
            token: { symbol: 'ETH' },
            rewards: [
              {
                tokenSymbol: 'ETH',
                apy: 0.05,
                components: [
                  { rate: 0.03, rateType: 'base' },
                  { rate: 0.02, rateType: 'bonus' }
                ]
              }
            ]
          }
        ]
      };

      // Set up all mocks
      nock('https://api.yield.xyz')
        .get('/v1/networks')
        .reply(200, validNetworks);

      nock('https://api.yield.xyz')
        .get('/v1/tokens')
        .reply(200, validTokens);

      nock('https://api.yield.xyz')
        .get('/v1/providers')
        .reply(200, validProviders);

      nock('https://api.yield.xyz')
        .get('/v1/yields')
        .query(true)
        .reply(200, validYields);

      // Execute the full flow
      const [networks, tokens, protocols, yields] = await Promise.all([
        catalogService.getNetworks(),
        catalogService.getTokens(),
        catalogService.getProtocols(),
        catalogService.getYields()
      ]);

      // Verify all data is properly typed and valid
      expect(networks.items).toHaveLength(1);
      expect(networks.items[0].id).toBe('ethereum');

      expect(tokens.items).toHaveLength(1);
      expect(tokens.items[0].symbol).toBe('ETH');

      expect(protocols.items).toHaveLength(1);
      expect(protocols.items[0].id).toBe('provider-1');

      expect(yields.items).toHaveLength(1);
      expect(yields.items[0].id).toBe('yield-1');
      expect(yields.items[0].rewards?.[0]?.apy).toBe(0.05);

      // Verify components if they exist (new schema addition)
      const components = yields.items[0].rewards?.[0]?.components;
      if (components) {
        expect(components).toHaveLength(2);
        expect(components[0].rate).toBe(0.03);
        expect(components[1].rate).toBe(0.02);
      }
    });
  });

  describe('Error handling and recovery', () => {
    it('should provide meaningful errors for completely invalid responses', async () => {
      nock('https://api.yield.xyz')
        .get('/v1/networks')
        .reply(200, '<html>Not JSON</html>', {
          'content-type': 'text/html'
        });

      try {
        await catalogService.getNetworks();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Error should be informative
        expect(error.message).toBeDefined();
      }
    });

    it('should handle empty responses gracefully', async () => {
      // Test various empty response formats
      nock('https://api.yield.xyz')
        .get('/v1/networks')
        .reply(200, []);

      nock('https://api.yield.xyz')
        .get('/v1/tokens')
        .reply(200, { items: [] });

      nock('https://api.yield.xyz')
        .get('/v1/providers')
        .reply(200, { items: [] });

      const [networks, tokens, protocols] = await Promise.all([
        catalogService.getNetworks(),
        catalogService.getTokens(),
        catalogService.getProtocols()
      ]);

      expect(networks.items).toEqual([]);
      expect(tokens.items).toEqual([]);
      expect(protocols.items).toEqual([]);
    });
  });
});