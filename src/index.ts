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

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

start().catch((error) => {
  logger.error('Fatal error during startup', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
