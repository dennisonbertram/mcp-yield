import { describe, it, expect, beforeAll } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { registerResources as RegisterResources } from '../../src/resources/index.js';

let registerResources: typeof RegisterResources;

beforeAll(async () => {
  ({ registerResources } = await import('../../src/resources/index.js'));
});

const createServer = () => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerResources(server);
  return server as unknown as McpServer & {
    _registeredResourceTemplates: Record<string, { readCallback: Function }>; // eslint-disable-line @typescript-eslint/ban-types
  };
};

const callResource = async (
  server: McpServer & { _registeredResourceTemplates: Record<string, { readCallback: Function }> },
  name: string,
  uri: string,
  variables: Record<string, string>
) => {
  const resource = server._registeredResourceTemplates[name];
  expect(resource).toBeDefined();
  return resource.readCallback(new URL(uri), variables, {});
};

const networksResponse = [
  { id: 'ethereum', name: 'Ethereum', category: 'evm', nativeToken: { symbol: 'ETH' }, explorers: ['https://etherscan.io'] }
];

const yieldsResponse = {
  data: [
    {
      id: 'ethereum-eth-lido-staking',
      name: 'Lido Staked ETH',
      network: 'ethereum',
      apy: 0.05,
      tvlUsd: 1000000,
      metadata: {
        name: 'Lido Staked ETH',
        description: 'Liquid staking',
        provider: { name: 'Lido', id: 'lido' },
        riskLevel: 'medium',
        type: 'liquid_staking'
      },
      lifecycle: {
        supportsExit: true
      },
      token: { symbol: 'ETH', network: 'ethereum' }
    }
  ],
  limit: 20,
  page: 1,
  hasNextPage: false
};

const tokensResponse = [
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', networks: ['ethereum'] }
];

const protocolsResponse = {
  items: [
    { id: 'lido', name: 'Lido', category: 'staking', description: 'Liquid staking', networks: ['ethereum'] }
  ]
};

describe('resources', () => {
  it('returns yield resource payload with peer analysis', async () => {
    const listScope = nock('https://api.yield.xyz').get('/v1/yields').query((params) => !params.network).reply(200, yieldsResponse);
    const peerScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.network === 'ethereum')
      .reply(200, yieldsResponse);
    const server = createServer();
    const result = await callResource(server, 'yield-detail', 'yield://ethereum-eth-lido-staking', {
      yieldId: 'ethereum-eth-lido-staking'
    });
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.peerAnalysis).toBeDefined();
    listScope.done();
    peerScope.done();
  });

  it('returns network markdown overview', async () => {
    const networkScope = nock('https://api.yield.xyz').get('/v1/networks').reply(200, networksResponse);
    const yieldScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.network === 'ethereum')
      .reply(200, yieldsResponse);
    const server = createServer();
    const result = await callResource(server, 'network-detail', 'network://ethereum', { networkId: 'ethereum' });
    expect(result.contents[0].mimeType).toBe('text/markdown');
    networkScope.done();
    yieldScope.done();
  });

  it('returns aggregated networks overview', async () => {
    const networkScope = nock('https://api.yield.xyz').get('/v1/networks').reply(200, networksResponse);
    const yieldScope = nock('https://api.yield.xyz').get('/v1/yields').query(true).reply(200, yieldsResponse);
    const server = createServer();
    const result = await callResource(server, 'networks-overview', 'networks://all', {});
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.categories[0].networks[0].yieldCount).toBe(1);
    networkScope.done();
    yieldScope.done();
  });

  it('builds token resource', async () => {
    const tokenScope = nock('https://api.yield.xyz').get('/v1/tokens').reply(200, tokensResponse);
    const yieldScope = nock('https://api.yield.xyz')
      .get('/v1/yields')
      .query((params) => params.token === 'ETH')
      .reply(200, yieldsResponse);
    const server = createServer();
    const result = await callResource(server, 'token-detail', 'token://eth', { tokenId: 'eth' });
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.yields.length).toBeGreaterThan(0);
    tokenScope.done();
    yieldScope.done();
  });

  it('builds protocol resource', async () => {
    const protocolScope = nock('https://api.yield.xyz').get('/v1/providers').reply(200, protocolsResponse);
    const yieldScope = nock('https://api.yield.xyz').get('/v1/yields').query(true).reply(200, yieldsResponse);
    const server = createServer();
    const result = await callResource(server, 'protocol-detail', 'protocol://lido', { protocolId: 'lido' });
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.yields.length).toBeGreaterThan(0);
    protocolScope.done();
    yieldScope.done();
  });
});
