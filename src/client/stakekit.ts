import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { performance } from 'node:perf_hooks';
import { appConfig, getAuthHeaders } from '../config.js';
import { createUpstreamError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface StakeKitRequestOptions {
  requestId?: string;
  useFallback?: boolean;
}

export interface StakeKitResponse<T> {
  data: T;
  source: 'primary' | 'fallback';
}

const RETRY_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

const createClient = (baseURL: string): AxiosInstance =>
  axios.create({
    baseURL,
    timeout: appConfig.REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    proxy: false
  });

export class StakeKitClient {
  private readonly primary: AxiosInstance;
  private readonly fallback: AxiosInstance;

  constructor() {
    this.primary = createClient(appConfig.STAKEKIT_BASE_URL);
    this.fallback = createClient(appConfig.STAKEKIT_FALLBACK_URL);
  }

  private async delay(attempt: number) {
    const base = 200 * 2 ** attempt;
    const jitter = Math.random() * 100;
    await new Promise((resolve) => setTimeout(resolve, base + jitter));
  }

  private async performRequest<T>(
    config: AxiosRequestConfig,
    options: StakeKitRequestOptions = {},
    attempt = 0,
    useFallback = false
  ): Promise<StakeKitResponse<T>> {
    const requestId = options.requestId ?? config.headers?.['x-request-id']?.toString() ?? undefined;
    const childLogger = logger.child({ requestId: requestId ?? undefined });
    const instance = useFallback ? this.fallback : this.primary;
    const start = performance.now();

    try {
      const response = await instance.request<T>({
        ...config,
        headers: {
          ...config.headers,
          ...getAuthHeaders()
        }
      });
      const duration = Math.round(performance.now() - start);
      childLogger.info('StakeKit request completed', {
        method: config.method ?? 'get',
        url: config.url,
        status: response.status,
        duration,
        fallback: useFallback
      });
      return {
        data: response.data,
        source: useFallback ? 'fallback' : 'primary'
      };
    } catch (error) {
      const axiosError = error as AxiosError & { code?: string };
      const status =
        axiosError.response?.status ??
        (axiosError as { status?: number }).status ??
        (axiosError.request as { res?: { statusCode?: number } } | undefined)?.res?.statusCode;
      const duration = Math.round(performance.now() - start);
      childLogger.warn('StakeKit request failed', {
        method: config.method ?? 'get',
        url: config.url,
        status,
        attempt,
        duration,
        fallback: useFallback,
        message: axiosError.message,
        code: axiosError.code
      });

      if (status === 401) {
        childLogger.error('Authentication failed for StakeKit request', { url: config.url });
        throw error;
      }

      if (!useFallback && (status === 404 || status === 204)) {
        childLogger.info('Retrying StakeKit request via fallback host', {
          url: config.url
        });
        return this.performRequest<T>(config, options, attempt, true);
      }

      if (attempt < MAX_RETRIES && (!status || RETRY_STATUS_CODES.has(status))) {
        await this.delay(attempt);
        return this.performRequest<T>(config, options, attempt + 1, useFallback);
      }

      const details = {
        status,
        code: axiosError.code,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        message: axiosError.message
      };

      if (status === 401 || status === 403) {
        throw createUpstreamError(
          'StakeKit API rejected the request. Confirm STAKEKIT_API_KEY is valid and has the necessary permissions.',
          details,
          status
        );
      }

      if (axiosError.code === 'ENETUNREACH') {
        throw createUpstreamError(
          'StakeKit host was unreachable (ENETUNREACH). Verify outbound network access or proxy configuration.',
          details,
          status
        );
      }

      throw createUpstreamError(
        `StakeKit request failed${status ? ` with status ${status}` : ''}.`,
        details,
        status
      );
    }
  }

  async get<T>(url: string, params?: Record<string, unknown>, options?: StakeKitRequestOptions): Promise<StakeKitResponse<T>> {
    return this.performRequest<T>(
      {
        method: 'GET',
        url,
        params
      },
      options
    );
  }

  async post<T>(url: string, data?: unknown, options?: StakeKitRequestOptions): Promise<StakeKitResponse<T>> {
    return this.performRequest<T>(
      {
        method: 'POST',
        url,
        data
      },
      options
    );
  }
}

export const stakeKitClient = new StakeKitClient();
