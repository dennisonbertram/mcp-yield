import { describe, it, expect, beforeAll } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { registerChainTools as RegisterChainTools } from '../../src/tools/chains.js';

let registerChainTools: typeof RegisterChainTools;

beforeAll(async () => {
  ({ registerChainTools } = await import('../../src/tools/chains.js'));
});

const createServer = () => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerChainTools(server);
  return server as unknown as McpServer & { _registeredTools: Record<string, any> };
};

const callTool = async (server: McpServer & { _registeredTools: Record<string, any> }, name: string, args: unknown) => {
  const tool = server._registeredTools[name];
  expect(tool).toBeDefined();
  return tool.callback(args ?? {}, {});
};

const networksResponse = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    category: 'evm',
    isTestnet: false,
    logo: 'https://example.com/logo.png',
    nativeToken: { symbol: 'ETH' },
    explorers: ['https://etherscan.io']
  },
  {
    id: 'holesky',
    name: 'Holesky',
    category: 'evm',
    isTestnet: true
  },
  {
    id: 'deprecated-chain',
    name: 'Deprecated',
    category: 'evm',
    deprecated: true,
    deprecationReason: 'Merged into other network'
  }
];

const tokensResponse = [
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    networks: ['ethereum']
  },
  {
    id: 'weth',
    symbol: 'ETH',
    name: 'Wrapped Ether',
    networks: ['holesky'],
    priceUsd: 3400
  }
];

const protocolsResponse = [
  {
    id: 'lido',
    name: 'Lido',
    category: 'staking',
    description: 'Liquid staking',
    website: 'https://lido.fi',
    networks: ['ethereum'],
    audits: ['ChainSecurity'],
    riskFactors: ['Slashing']
  }
];

// v1 API providers response format
const providersResponse = {
  items: [
    {
      id: 'lido',
      name: 'Lido',
      type: 'staking',
      website: 'https://lido.fi',
      logoURI: 'https://example.com/lido.png'
    }
  ]
};

const yieldsResponse = {
  items: [
    {
      id: 'ethereum-eth-lido-staking',
      name: 'Lido Staked ETH',
      network: 'ethereum',
      apy: 0.05,
      tvlUsd: 1000000,
      metadata: {
        name: 'Lido Staked ETH',
        provider: { name: 'Lido', id: 'lido' },
        type: 'liquid_staking'
      },
      token: { symbol: 'ETH', network: 'ethereum' }
    }
  ],
  limit: 20,
  page: 1,
  hasNextPage: false
};

describe('chain and protocol tools', () => {
  it('lists supported chains using v1 API', async () => {
    // v1 API uses api.yield.xyz and returns direct array, not paginated response
    const scope = nock('https://api.yield.xyz').get('/v1/networks').reply(200, networksResponse);
    const server = createServer();
    const result = await callTool(server, 'list-supported-chains', { includeTestnets: false });
    expect(result.structuredContent.items).toHaveLength(1);
    scope.done();
  });

  it('fetches chain details with notable yields', async () => {
    const networkScope = nock('https://api.yield.xyz').get('/v1/networks').reply(200, networksResponse);
    const yieldScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.network === 'ethereum')
      .reply(200, yieldsResponse);
    const server = createServer();
    const result = await callTool(server, 'get-chain-details', { networkId: 'ethereum' });
    expect(result.structuredContent.notableYields.length).toBeGreaterThan(0);
    networkScope.done();
    yieldScope.done();
  });

  it('deduplicates tokens across networks', async () => {
    const networkScope = nock('https://api.yield.xyz').get('/v1/networks').reply(200, networksResponse);
    const tokenScope = nock('https://api.yield.xyz').get('/v1/tokens').reply(200, tokensResponse);
    const server = createServer();
    const result = await callTool(server, 'list-supported-tokens', {});
    expect(result.structuredContent.items[0].networks.length).toBe(2);
    networkScope.done();
    tokenScope.done();
  });

  it('fetches token details with supported yields', async () => {
    const tokenScope = nock('https://api.yield.xyz').get('/v1/tokens').reply(200, tokensResponse);
    const yieldScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.token === 'ETH')
      .reply(200, yieldsResponse);
    const server = createServer();
    const result = await callTool(server, 'get-token-details', { symbol: 'ETH' });
    expect(result.structuredContent.supportedYields.length).toBeGreaterThan(0);
    tokenScope.done();
    yieldScope.done();
  });

  it('lists providers (v1 API uses providers instead of protocols)', async () => {
    // v1 API uses /providers endpoint which returns {items: [...]}
    const providerScope = nock('https://api.yield.xyz').get('/v1/providers').reply(200, providersResponse);
    const yieldScope = nock('https://api.yield.xyz').get('/v1/yields').query(true).reply(200, yieldsResponse);
    const server = createServer();
    const result = await callTool(server, 'list-protocols', {});
    expect(result.structuredContent.items[0].yieldCount).toBe(1);
    providerScope.done();
    yieldScope.done();
  });

  it('returns provider details with statistics (v1 API uses providers)', async () => {
    const providerScope = nock('https://api.yield.xyz').get('/v1/providers').reply(200, providersResponse);
    const yieldScope = nock('https://api.yield.xyz').get('/v1/yields').query(true).reply(200, yieldsResponse);
    const server = createServer();
    const result = await callTool(server, 'get-protocol-details', { protocolId: 'lido' });
    expect(result.structuredContent.stats.medianApy ?? result.structuredContent.stats.maxApy).not.toBeUndefined();
    providerScope.done();
    yieldScope.done();
  });

  it('performs live network list when enabled', async () => {
    if (!process.env.RUN_LIVE_TESTS) {
      expect(true).toBe(true);
      return;
    }
    nock.enableNetConnect();
    const server = createServer();
    const result = await callTool(server, 'list-supported-chains', {});
    expect(result.structuredContent.items.length).toBeGreaterThan(0);
    nock.disableNetConnect();
  }, 20000);
});
