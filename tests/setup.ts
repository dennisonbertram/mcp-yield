import nock from 'nock';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const querystring = require('node:querystring') as typeof import('node:querystring');

const originalParse = querystring.parse.bind(querystring);

querystring.parse = ((...args: Parameters<typeof originalParse>) => {
  const parsed = originalParse(...args);
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      parsed[key] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    } else if (Array.isArray(value)) {
      parsed[key] = value.map((item) =>
        typeof item === 'string' && /^-?\d+(\.\d+)?$/.test(item) ? Number(item) : item
      );
    }
  }
  return parsed;
}) as typeof originalParse;

process.env.STAKEKIT_API_KEY = process.env.STAKEKIT_API_KEY ?? 'test-key';
process.env.STAKEKIT_BASE_URL = process.env.STAKEKIT_BASE_URL ?? 'https://api.yield.xyz/v1';
process.env.STAKEKIT_FALLBACK_URL = process.env.STAKEKIT_FALLBACK_URL ?? 'https://api.stakek.it/v2';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';

if (!process.env.RUN_LIVE_TESTS) {
  nock.disableNetConnect();
  nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'));
} else {
  nock.enableNetConnect();
}

afterEach(() => {
  nock.cleanAll();
});
