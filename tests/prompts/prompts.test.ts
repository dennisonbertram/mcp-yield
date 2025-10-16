import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { registerPrompts as RegisterPrompts } from '../../src/prompts/index.js';

let registerPrompts: typeof RegisterPrompts;

beforeAll(async () => {
  ({ registerPrompts } = await import('../../src/prompts/index.js'));
});

const createServer = () => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerPrompts(server);
  return server as unknown as McpServer & { _registeredPrompts: Record<string, { callback: Function }> };
};

describe('prompts', () => {
  it('provides compare yields guidance', async () => {
    const server = createServer();
    const prompt = server._registeredPrompts['compare-yields'];
    const result = await prompt.callback({ yieldIds: ['a', 'b'] }, {});
    expect(result.structuredContent.steps.length).toBeGreaterThan(0);
  });

  it('validates token-yield-availability args', async () => {
    const server = createServer();
    const prompt = server._registeredPrompts['token-yield-availability'];
    await expect(prompt.callback({}, {})).rejects.toThrow();
  });
});
