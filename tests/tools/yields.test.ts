import { describe, it, expect, beforeAll } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { registerYieldTools as RegisterYieldTools } from '../../src/tools/yields.js';

let registerYieldTools: typeof RegisterYieldTools;

beforeAll(async () => {
  ({ registerYieldTools } = await import('../../src/tools/yields.js'));
});

const createServer = () => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerYieldTools(server);
  return server as unknown as McpServer & { _registeredTools: Record<string, any> };
};

const callTool = async (server: McpServer & { _registeredTools: Record<string, any> }, name: string, args: unknown) => {
  const tool = server._registeredTools[name];
  expect(tool).toBeDefined();
  return tool.callback(args ?? {}, {});
};

const baseListResponse = {
  items: [
    {
      id: 'ethereum-eth-lido-staking',
      name: 'Lido Staked ETH',
      network: 'ethereum',
      apy: 0.05,
      tvlUsd: 1000000,
      metadata: {
        name: 'Lido ETH',
        provider: { name: 'Lido' },
        tags: ['liquid-staking'],
        type: 'liquid_staking'
      },
      token: { symbol: 'ETH', network: 'ethereum' },
      rewardTokens: [{ symbol: 'ETH' }],
      lifecycle: { supportsExit: true }
    },
    {
      id: 'ethereum-eth-native-staking',
      name: 'Validator Staking',
      network: 'ethereum',
      apy: 0.04,
      tvlUsd: 800000,
      metadata: {
        name: 'Ethereum Native Staking',
        provider: { name: 'Ethereum' },
        tags: ['staking'],
        type: 'staking'
      },
      token: { symbol: 'ETH', network: 'ethereum' },
      rewardTokens: [{ symbol: 'ETH' }],
      lifecycle: { supportsExit: true }
    }
  ],
  limit: 20,
  page: 1,
  hasNextPage: false
};

const lendingResponse = {
  items: [
    {
      id: 'ethereum-usdc-aave',
      name: 'Aave USDC Lending',
      network: 'ethereum',
      apy: 0.025,
      metadata: {
        name: 'Aave USDC Lending',
        provider: { name: 'Aave', id: 'aave' },
        type: 'lending'
      },
      metrics: {
        apy: 0.025,
        collateralFactor: 0.75,
        borrowApy: 0.04
      },
      token: { symbol: 'USDC', network: 'ethereum' }
    }
  ],
  limit: 20,
  page: 1,
  hasNextPage: false
};

describe('yield tools', () => {
  it('returns paginated opportunities', async () => {
    const scope = nock('https://api.yield.xyz').get('/v1/yields').query(true).reply(200, baseListResponse);
    const server = createServer();
    const result = await callTool(server, 'get-yield-opportunities', { limit: 5 });
    expect(result.structuredContent.items).toHaveLength(2);
    expect(result.structuredContent.meta.limit).toBe(20);
    scope.done();
  });

  it('fetches yield details and surfaces warnings', async () => {
    const detailResponse = {
      id: 'polygon-matic-stake',
      name: 'Polygon Staking',
      network: 'polygon',
      apy: 0.08,
      metadata: {
        name: 'Polygon Staking',
        description: 'Stake MATIC',
        riskLevel: 'medium'
      },
      lifecycle: {
        supportsExit: false,
        withdrawalPeriod: { days: 10 }
      },
      token: { symbol: 'MATIC', network: 'polygon' }
    };
    const scope = nock('https://api.yield.xyz').get('/v1/yields/polygon-matic-stake').reply(200, detailResponse);
    const server = createServer();
    const result = await callTool(server, 'get-yield-details', { yieldId: 'polygon-matic-stake' });
    expect(result.structuredContent.overview.warnings).toHaveLength(2);
    scope.done();
  });

  it('filters by network and handles missing data', async () => {
    const scope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.network === 'nonexistent')
      .reply(200, { items: [], limit: 20 });
    const server = createServer();
    await expect(callTool(server, 'get-yields-by-network', { networkId: 'nonexistent' })).rejects.toThrow(
      /No yields found/
    );
    scope.done();
  });

  it('filters by token symbol', async () => {
    const scope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.token === 'ETH')
      .reply(200, baseListResponse);
    const server = createServer();
    const result = await callTool(server, 'get-yields-by-token', { tokenSymbol: 'ETH' });
    expect(result.structuredContent.items[0].tokenMatchType).toBeDefined();
    scope.done();
  });

  it('merges staking and liquid staking yields when requested', async () => {
    const baseScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.type === 'staking')
      .reply(200, baseListResponse);
    const liquidScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.type === 'liquid_staking')
      .reply(200, baseListResponse);
    const server = createServer();
    const result = await callTool(server, 'get-staking-yields', { includeLiquid: true });
    expect(result.structuredContent.items.length).toBeGreaterThan(0);
    baseScope.done();
    liquidScope.done();
  });

  it('returns lending market metrics', async () => {
    const scope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.type === 'lending')
      .reply(200, lendingResponse);
    const server = createServer();
    const result = await callTool(server, 'get-lending-yields', {});
    expect(result.structuredContent.items[0].collateralFactor).toBe(0.75);
    scope.done();
  });

  it('returns vault information', async () => {
    const vaultResponse = {
      items: [
        {
          id: 'ethereum-eth-vault',
          name: 'ETH Vault',
          network: 'ethereum',
          metadata: {
            name: 'ETH Vault',
            strategy: 'Covered Calls',
            fees: { performance: 0.1, management: 0.02 },
            riskRating: 'medium'
          },
          lifecycle: {
            withdrawalPeriod: { days: 3 }
          },
          token: { symbol: 'ETH', network: 'ethereum' },
          apy: 0.12
        }
      ]
    };
    const scope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.type === 'vault')
      .reply(200, vaultResponse);
    const server = createServer();
    const result = await callTool(server, 'get-vault-yields', {});
    expect(result.structuredContent.items[0].strategy).toBe('Covered Calls');
    scope.done();
  });

  it('ranks top yields by APY', async () => {
    const scope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.limit === 100)
      .reply(200, baseListResponse);
    const server = createServer();
    const result = await callTool(server, 'get-top-yields', { limit: 1 });
    expect(result.structuredContent.items).toHaveLength(1);
    expect(result.structuredContent.items[0].apy).toBeGreaterThan(0);
    scope.done();
  });

  it('performs live list call when enabled', async () => {
    if (!process.env.RUN_LIVE_TESTS) {
      expect(true).toBe(true);
      return;
    }
    nock.enableNetConnect();
    const server = createServer();
    const result = await callTool(server, 'get-yield-opportunities', { limit: 1 });
    expect(result.structuredContent.items.length).toBeGreaterThan(0);
    nock.disableNetConnect();
  }, 20000);
});
