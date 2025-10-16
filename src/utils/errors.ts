export type ToolErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UPSTREAM_ERROR' | 'INTERNAL_ERROR';

export class ToolError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number
  ) {
    super(`[${code}] ${message}`);
    this.name = 'ToolError';
  }
}

export const createValidationError = (message: string, details?: unknown) =>
  new ToolError('VALIDATION_ERROR', message, details, 400);

export const createNotFoundError = (message: string, details?: unknown) =>
  new ToolError('NOT_FOUND', message, details, 404);

export const createUpstreamError = (message: string, details?: unknown, status?: number) =>
  new ToolError('UPSTREAM_ERROR', message, details, status);

export const createInternalError = (message: string, details?: unknown) =>
  new ToolError('INTERNAL_ERROR', message, details, 500);

export const formatToolError = (error: unknown): ToolError => {
  if (error instanceof ToolError) {
    return error;
  }
  if (error instanceof Error) {
    return new ToolError('INTERNAL_ERROR', error.message, error);
  }
  return new ToolError('INTERNAL_ERROR', 'Unknown error', error);
};
