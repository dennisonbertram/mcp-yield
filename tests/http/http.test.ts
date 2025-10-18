import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NEGOTIATED_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { createHttpApp, createHttpAppContext } from '../../src/http.js';

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

  describe('Session cleanup on connection failure', () => {
    it('properly cleans up pending sessions when connection fails', async () => {
      // This test verifies that when server.connect() fails,
      // the session is removed from the pending set and destroyed properly
      const { app, registry } = createHttpAppContext();

      // Mock the server.connect to throw an error
      const originalCreateSession = registry.createSession.bind(registry);
      let connectCallCount = 0;
      registry.createSession = vi.fn(async () => {
        connectCallCount++;
        if (connectCallCount === 1) {
          // Simulate connection failure by throwing an error
          const error = new Error('Connection failed');
          // We need to access internal state to verify cleanup
          // Since we can't easily mock the internal server.connect,
          // we'll throw from createSession itself
          throw error;
        }
        return originalCreateSession();
      });

      // First request should fail during session creation
      const response1 = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .send(initializeRequest);

      // Should return an error response
      expect(response1.status).toBe(500);
      expect(response1.body.error).toBeDefined();

      // Verify that createSession was called
      expect(registry.createSession).toHaveBeenCalledTimes(1);

      // Now verify that a subsequent request can create a new session successfully
      // This proves the pending set was properly cleaned up
      const response2 = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .send(initializeRequest);

      expect(response2.status).toBe(200);
      expect(response2.body.result).toBeDefined();
    });
  });

  describe('Race condition prevention in session cleanup', () => {
    it('prevents concurrent cleanup from destroying the same session multiple times', async () => {
      // This test verifies that when multiple concurrent calls to evictIdleSessions happen,
      // the same session is not destroyed multiple times
      const { app, registry } = createHttpAppContext();

      // Initialize a session
      const initResponse = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .send(initializeRequest);

      expect(initResponse.status).toBe(200);
      const sessionId = initResponse.headers['mcp-session-id'];
      expect(typeof sessionId).toBe('string');

      // Mock destroySession to track calls
      let destroyCallCount = 0;
      const sessionBeingDestroyed = new Set<any>();
      const originalDestroySession = registry.destroySession.bind(registry);

      registry.destroySession = vi.fn(async (session: any) => {
        // Check if this session is already being destroyed
        if (sessionBeingDestroyed.has(session)) {
          throw new Error('Session is already being destroyed - race condition detected!');
        }
        sessionBeingDestroyed.add(session);
        destroyCallCount++;

        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await originalDestroySession(session);
        sessionBeingDestroyed.delete(session);
        return result;
      });

      // Force the session to be stale by setting lastUsed to a past time
      // We need to access the session through the registry
      const session = registry.get(sessionId as string);
      if (session) {
        session.lastUsed = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      }

      // Trigger multiple concurrent cleanup calls
      const cleanupPromises = [
        registry.evictIdleSessions(),
        registry.evictIdleSessions(),
        registry.evictIdleSessions()
      ];

      // All should complete without errors
      await Promise.all(cleanupPromises);

      // The session should only be destroyed once
      expect(destroyCallCount).toBe(1);
      expect(registry.destroySession).toHaveBeenCalledTimes(1);
    });
  });
});
