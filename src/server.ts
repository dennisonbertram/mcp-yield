import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerYieldTools } from './tools/yields.js';
import { registerChainTools } from './tools/chains.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { logger } from './utils/logger.js';
import './config.js';

const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string; version?: string };

export const createYieldServer = () => {
  const server = new McpServer({
    name: pkg.name ?? 'mcp-yield',
    version: pkg.version ?? '0.0.0'
  });

  registerYieldTools(server);
  registerChainTools(server);
  registerResources(server);
  registerPrompts(server);

  logger.debug('Yield MCP server created', { transport: 'shared-factory' });

  return server;
};

export type YieldServer = ReturnType<typeof createYieldServer>;
