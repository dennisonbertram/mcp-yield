import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { catalogService } from '../../src/services/catalog.js';

describe('Catalog Service Type Safety', () => {
  beforeEach(() => {
    // Clear nock interceptors before each test
    nock.cleanAll();
    // Clear caches before each test
    catalogService.clearCaches();
  });

  afterEach(() => {
    // Ensure all nock interceptors were used
    nock.cleanAll();
  });

  describe('getTokens - malformed API responses', () => {
    it('should handle API response with missing token fields gracefully', async () => {
      // This test verifies that the service properly handles malformed data
      // where some items might be missing required fields or have invalid types
      const malformedResponse = [
        { id: 'token1', symbol: 'ETH' }, // Valid token
        { notSymbol: 'BAD' }, // Missing required 'symbol' field
        null, // Null item
        { id: 'token2', symbol: 'BTC', name: 'Bitcoin' }, // Valid token
        undefined, // Undefined item
        { symbol: null }, // Symbol field is null (invalid)
        'string-item', // Non-object item
        42, // Number item
        { symbol: 123 }, // Symbol is wrong type (number instead of string)
        { id: 'token3', symbol: 'USDT', priceUsd: 'not-a-number' }, // Has invalid priceUsd type
        { id: 'token4', symbol: 'DAI', decimals: 18 }, // Valid token
      ];

      // Mock the API response
      nock('https://api.yield.xyz')
        .get('/v1/tokens')
        .reply(200, malformedResponse);

      // The service should filter out malformed items and only return valid tokens
      const result = await catalogService.getTokens();

      // We expect only the valid token items to be returned
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(3); // Should have 3 valid tokens (ETH, BTC, DAI)

      // Check that only valid items with proper token structure are returned
      result.items.forEach(item => {
        expect(item).toBeDefined();
        expect(item).not.toBeNull();
        // Each item must have a symbol (required field)
        expect(item.symbol).toBeDefined();
        expect(typeof item.symbol).toBe('string');
        // Check optional fields if present
        if (item.id) expect(typeof item.id).toBe('string');
        if (item.name) expect(typeof item.name).toBe('string');
        if (item.decimals) expect(typeof item.decimals).toBe('number');
        if (item.priceUsd) expect(typeof item.priceUsd).toBe('number');
      });

      // Should not include malformed items
      expect(result.items.some(item => JSON.stringify(item).includes('notSymbol'))).toBe(false);
      expect(result.items.some(item => JSON.stringify(item).includes('BAD'))).toBe(false);
      expect(result.items.some(item => item.symbol === null)).toBe(false);
      expect(result.items.some(item => typeof item.symbol === 'number')).toBe(false);

      // Verify we got the correct valid tokens
      const symbols = result.items.map(item => item.symbol);
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('DAI');
    });

    it('should handle completely invalid API responses', async () => {
      // Test with various completely invalid responses
      const invalidResponses = [
        null,
        undefined,
        'not-an-array',
        42,
        true,
        { notAnArray: true }
      ];

      for (const invalidResponse of invalidResponses) {
        nock.cleanAll();
        catalogService.clearCaches();

        nock('https://api.yield.xyz')
          .get('/v1/tokens')
          .reply(200, invalidResponse);

        // Should either return empty array or throw a meaningful error
        try {
          const result = await catalogService.getTokens();
          // If it doesn't throw, it should return a valid structure
          expect(result).toBeDefined();
          expect(result.items).toBeDefined();
          expect(Array.isArray(result.items)).toBe(true);
        } catch (error) {
          // If it throws, the error should be meaningful
          expect(error).toBeDefined();
          expect(error.message).toContain('Unexpected response format');
        }
      }
    });

    it('should handle API response with deeply nested malformed data', async () => {
      const complexMalformed = {
        data: [
          { token: { id: 'valid1', symbol: 'VALID1', nested: { bad: null } } },
          { token: { id: 'valid2', symbol: undefined, extra: [] } },
          { token: { id: null, symbol: 'NULLID' } }
        ]
      };

      nock('https://api.yield.xyz')
        .get('/v1/tokens')
        .reply(200, complexMalformed);

      const result = await catalogService.getTokens();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      // Should handle partial data gracefully
      result.items.forEach(item => {
        expect(item).toBeDefined();
        // Properties can be optional but if present should be correct type
        if (item.id !== undefined && item.id !== null) {
          expect(typeof item.id).toBe('string');
        }
        if (item.symbol !== undefined && item.symbol !== null) {
          expect(typeof item.symbol).toBe('string');
        }
      });
    });
  });

  describe('getNetworks - type safety', () => {
    it('should properly type-check network response data', async () => {
      const malformedNetworks = [
        { id: 'eth', name: 'Ethereum', category: 'evm' },
        { id: 123, name: null }, // Invalid types
        { notAnId: 'bad' }, // Missing required fields
        null,
        { id: 'btc', name: 'Bitcoin', extra: { nested: true } }
      ];

      nock('https://api.yield.xyz')
        .get('/v1/networks')
        .reply(200, malformedNetworks);

      const result = await catalogService.getNetworks();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();

      // Should only include properly typed items
      result.items.forEach(item => {
        expect(item).toBeDefined();
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe('string');
        if (item.name) expect(typeof item.name).toBe('string');
      });
    });
  });
});