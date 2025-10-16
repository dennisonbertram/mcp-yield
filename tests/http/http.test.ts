import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DEFAULT_NEGOTIATED_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { createHttpApp } from '../../src/http.js';

const initializeRequest = {
  jsonrpc: '2.0' as const,
  id: '1',
  method: 'initialize',
  params: {
    protocolVersion: DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: {
      name: 'http-test-client',
      version: '1.0.0'
    }
  }
};

const listToolsRequest = {
  jsonrpc: '2.0' as const,
  id: '2',
  method: 'tools/list',
  params: {}
};

describe('HTTP transport', () => {
  it('establishes an MCP session and lists tools', async () => {
    const app = createHttpApp();

    const initResponse = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send(initializeRequest);

    expect(initResponse.status).toBe(200);
    expect(initResponse.body.result).toBeDefined();

    const sessionId = initResponse.headers['mcp-session-id'];
    expect(typeof sessionId).toBe('string');

    const toolsResponse = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Mcp-Session-Id', sessionId as string)
      .set('Mcp-Protocol-Version', DEFAULT_NEGOTIATED_PROTOCOL_VERSION)
      .send(listToolsRequest);

    expect(toolsResponse.status).toBe(200);
    expect(toolsResponse.body.result).toBeDefined();
    expect(Array.isArray(toolsResponse.body.result.tools)).toBe(true);
    expect(toolsResponse.body.result.tools.length).toBeGreaterThan(0);
  });

  it('exposes a health check endpoint', async () => {
    const app = createHttpApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
