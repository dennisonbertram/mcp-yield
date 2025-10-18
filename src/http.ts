import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createYieldServer, type YieldServer } from './server.js';
import { Logger, logger } from './utils/logger.js';

export interface HttpServerOptions {
  port?: number;
}

interface SessionContext {
  id?: string;
  server: YieldServer;
  transport: StreamableHTTPServerTransport;
  lastUsed: number;
  closing: boolean;
}

const SESSION_IDLE_TTL_MS = 5 * 60 * 1000;
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000;

class HttpSessionRegistry {
  private readonly sessions = new Map<string, SessionContext>();
  private readonly pending = new Set<SessionContext>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      void this.evictIdleSessions();
    }, SESSION_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  async createSession(): Promise<SessionContext> {
    const server = createYieldServer();
    const requestId = Logger.createRequestId();
    const sessionLogger = logger.child({ transport: 'http', requestId });

    const session: SessionContext = {
      server,
      transport: new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: async (sessionId: string) => {
          session.id = sessionId;
          this.pending.delete(session);
          this.sessions.set(sessionId, session);
          sessionLogger.info('MCP HTTP session initialized', { sessionId });
        },
        onsessionclosed: async (sessionId: string) => {
          sessionLogger.info('MCP HTTP session received close request', { sessionId });
          await this.destroySession(session);
        }
      }),
      lastUsed: Date.now(),
      closing: false
    };

    session.transport.onclose = () => {
      if (session.id) {
        this.sessions.delete(session.id);
      }
    };

    session.transport.onerror = (error: Error) => {
      sessionLogger.warn('HTTP transport error', {
        sessionId: session.id,
        error: error.message
      });
    };

    this.pending.add(session);

    try {
      await server.connect(session.transport);
      sessionLogger.debug('MCP HTTP session transport connected');
      return session;
    } catch (error) {
      sessionLogger.error('Failed to connect MCP HTTP session transport', {
        error: (error as Error).message
      });
      this.pending.delete(session);
      await this.destroySession(session);
      throw error;
    }
  }

  get(sessionId: string | undefined): SessionContext | undefined {
    if (!sessionId) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  touch(session: SessionContext) {
    session.lastUsed = Date.now();
  }

  async destroySession(session: SessionContext): Promise<void> {
    if (session.closing) {
      return;
    }
    session.closing = true;

    if (session.id) {
      this.sessions.delete(session.id);
    }
    this.pending.delete(session);

    try {
      await session.transport.close();
    } catch (error) {
      logger.warn('Failed to close HTTP transport', {
        transport: 'http',
        error: (error as Error).message,
        sessionId: session.id
      });
    }

    try {
      await session.server.close();
    } catch (error) {
      logger.warn('Failed to close MCP server instance', {
        transport: 'http',
        error: (error as Error).message,
        sessionId: session.id
      });
    }
  }

  async evictIdleSessions(): Promise<void> {
    const cutoff = Date.now() - SESSION_IDLE_TTL_MS;
    const staleSessions = Array.from(this.sessions.values()).filter(
      (session) => session.lastUsed < cutoff && !session.closing
    );

    // Prevent race condition: Use atomic flag check to ensure each session
    // is only destroyed once, even with concurrent evictIdleSessions calls
    const toDestroy: SessionContext[] = [];
    for (const session of staleSessions) {
      if (!session.closing) {
        session.closing = true; // Set flag atomically before async operations
        toDestroy.push(session);
      }
    }

    // Destroy only the sessions we successfully marked for destruction
    for (const session of toDestroy) {
      logger.info('Evicting idle MCP HTTP session', {
        transport: 'http',
        sessionId: session.id,
        idleMs: Date.now() - session.lastUsed
      });
      await this.destroySession(session);
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupTimer);
    const sessions = [...this.pending.values(), ...this.sessions.values()];
    await Promise.all(sessions.map((session) => this.destroySession(session)));
  }
}

const getSessionIdFromHeaders = (req: Request): string | undefined => {
  const header = req.headers['mcp-session-id'];
  if (!header) {
    return undefined;
  }
  return Array.isArray(header) ? header[0] : header;
};

interface HttpAppContext {
  app: express.Express;
  registry: HttpSessionRegistry;
}

export const createHttpAppContext = (): HttpAppContext => {
  const registry = new HttpSessionRegistry();
  const app = express();

  app.locals.sessionRegistry = registry;
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const handleMcpRequest = async (req: Request, res: Response) => {
    const requestId = Logger.createRequestId();
    const requestLogger = logger.child({ transport: 'http', requestId });
    const startTime = performance.now();

    let session: SessionContext | undefined;

    try {
      const sessionId = getSessionIdFromHeaders(req);
      session = registry.get(sessionId);

      if (!session) {
        if (req.method !== 'POST') {
          requestLogger.warn('HTTP request missing session identifier', {
            method: req.method,
            path: req.path
          });
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: missing or unknown MCP session id'
            },
            id: null
          });
          return;
        }
        session = await registry.createSession();
      }

      registry.touch(session);
      await session.transport.handleRequest(req, res, req.body);

      requestLogger.info('Handled MCP HTTP request', {
        path: req.path,
        method: req.method,
        sessionId: session.id,
        durationMs: Math.round(performance.now() - startTime)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      requestLogger.error('Failed to handle MCP HTTP request', {
        message,
        method: req.method,
        path: req.path
      });

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }

      if (session && !session.id) {
        void registry.destroySession(session);
      }
    }
  };

  app.post('/mcp', (req, res) => {
    void handleMcpRequest(req, res);
  });
  app.get('/mcp', (req, res) => {
    void handleMcpRequest(req, res);
  });
  app.delete('/mcp', (req, res) => {
    void handleMcpRequest(req, res);
  });

  return { app, registry };
};

export const createHttpApp = () => createHttpAppContext().app;

export const startHttpServer = async ({ port }: HttpServerOptions = {}) => {
  const resolvedPort = port ?? Number.parseInt(process.env.PORT ?? '3000', 10);
  const { app, registry } = createHttpAppContext();

  return await new Promise<Server>((resolve, reject) => {
    const httpServer = app
      .listen(resolvedPort, () => {
        logger.info('MCP yield server listening (http transport)', { port: resolvedPort });
        resolve(httpServer);
      })
      .on('error', (error) => {
        logger.error('HTTP server failed to start', { error: (error as Error).message });
        void registry.shutdown();
        reject(error);
      })
      .on('close', () => {
        void registry.shutdown();
      });
  });
};

const isMainModule = () => {
  const entryPoint = process.argv[1];
  return entryPoint ? import.meta.url === pathToFileURL(entryPoint).href : false;
};

if (isMainModule()) {
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

  void startHttpServer();
}
