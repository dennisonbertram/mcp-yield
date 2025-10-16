import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { stakeKitClient } from '../../src/client/stakekit.js';

describe('stakekit client', () => {
  it('uses fallback host on 404', async () => {
    const primary = nock('https://api.stakek.it').get('/v2/test').reply(404);
    const fallback = nock('https://api.yield.xyz').get('/v1/test').reply(200, { ok: true });
    const result = await stakeKitClient.get('/test');
    expect(result.source).toBe('fallback');
    expect(result.data).toEqual({ ok: true });
    primary.done();
    fallback.done();
  });

  it('retries on transient errors', async () => {
    const scope = nock('https://api.stakek.it')
      .get('/v2/retry')
      .twice()
      .reply(500)
      .get('/v2/retry')
      .reply(200, { success: true });
    const result = await stakeKitClient.get('/retry');
    expect(result.data).toEqual({ success: true });
    scope.done();
  });
});
