import { randomUUID } from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const envLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';
const minLevel = levelWeights[envLevel] ?? levelWeights.info;

export interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(private readonly context: LogContext = {}) {}

  private shouldLog(level: LogLevel) {
    return levelWeights[level] >= minLevel;
  }

  private emit(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...context
    };

    if (level === 'error') {
      console.error(JSON.stringify(payload));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  }

  child(context: LogContext) {
    return new Logger({ ...this.context, ...context });
  }

  debug(message: string, context?: LogContext) {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.emit('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.emit('error', message, context);
  }

  static createRequestId() {
    return randomUUID();
  }
}

export const logger = new Logger();
