import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { stakeKitClient } from '../../src/client/stakekit.js';

describe('stakekit client', () => {
  it('uses correct base URL for primary API (api.yield.xyz/v1)', async () => {
    // This test verifies that the primary API is api.yield.xyz/v1
    const scope = nock('https://api.yield.xyz')
      .get('/v1/test')
      .reply(200, { ok: true });

    const result = await stakeKitClient.get('/test');
    expect(result.source).toBe('primary');
    expect(result.data).toEqual({ ok: true });
    scope.done();
  });

  it('uses fallback host on 404', async () => {
    // Primary should be api.yield.xyz/v1, fallback should be api.stakek.it/v2
    const primary = nock('https://api.yield.xyz').get('/v1/test').reply(404);
    const fallback = nock('https://api.stakek.it').get('/v2/test').reply(200, { ok: true });
    const result = await stakeKitClient.get('/test');
    expect(result.source).toBe('fallback');
    expect(result.data).toEqual({ ok: true });
    primary.done();
    fallback.done();
  });

  it('retries on transient errors', async () => {
    const scope = nock('https://api.yield.xyz')
      .get('/v1/retry')
      .twice()
      .reply(500)
      .get('/v1/retry')
      .reply(200, { success: true });
    const result = await stakeKitClient.get('/retry');
    expect(result.data).toEqual({ success: true });
    scope.done();
  });
});
