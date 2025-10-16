import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { performance } from 'node:perf_hooks';
import { createYieldServer } from './server.js';
import { Logger, logger } from './utils/logger.js';

const transport = new StdioServerTransport();
const server = createYieldServer();

const start = async () => {
  const requestLogger = logger.child({ transport: 'stdio', requestId: Logger.createRequestId() });
  const startTime = performance.now();
  try {
    await server.connect(transport);
    requestLogger.info('MCP yield server started (stdio transport).', {
      durationMs: Math.round(performance.now() - startTime)
    });
  } catch (error) {
    requestLogger.error('Failed to start MCP yield server', {
      error: (error as Error).message
    });
    process.exitCode = 1;
  }
};

const shutdown = async (signal: string) => {
  const shutdownLogger = logger.child({ signal, transport: 'stdio', requestId: Logger.createRequestId() });
  shutdownLogger.info('Received shutdown signal');
  try {
    await transport.close();
    await server.close();
    shutdownLogger.info('Stdio transport closed successfully');
  } catch (error) {
    shutdownLogger.error('Error during shutdown', { error: (error as Error).message });
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start();
