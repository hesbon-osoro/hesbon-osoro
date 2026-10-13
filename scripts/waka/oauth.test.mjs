import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { authHeader, fetchStats } from './index.mjs';
import { authorizeUrl, expiryDate, extractCode } from './oauth-setup.mjs';

const fresh = {
  start: '2026-09-13T00:00:00Z',
  end: '2026-10-13T23:59:59Z',
  is_up_to_date: true,
  languages: [],
};

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization });
    const [status, body] =
      responses[Math.min(calls.length - 1, responses.length - 1)];
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      json: async () => body,
    };
  };
  return { impl, calls };
}

describe('authHeader', () => {
  it('prefers the OAuth token over the API key', () => {
    assert.deepEqual(
      authHeader({
        WAKATIME_ACCESS_TOKEN: 'waka_tok',
        WAKATIME_API_KEY: 'key',
      }),
      { scheme: 'oauth', value: 'Bearer waka_tok' }
    );
  });

  it('falls back to the API key with Basic auth', () => {
    assert.deepEqual(authHeader({ WAKATIME_API_KEY: 'key' }), {
      scheme: 'api-key',
      value: `Basic ${Buffer.from('key').toString('base64')}`,
    });
  });

  it('returns null without credentials', () => {
    assert.equal(authHeader({}), null);
  });
});

describe('fetchStats', () => {
  it('sends the Bearer token to the last_30_days stats endpoint', async () => {
    const { impl, calls } = fakeFetch([[200, { data: fresh }]]);
    assert.deepEqual(await fetchStats('Bearer t', { fetchImpl: impl }), fresh);
    assert.equal(
      calls[0].url,
      'https://wakatime.com/api/v1/users/current/stats/last_30_days'
    );
    assert.equal(calls[0].auth, 'Bearer t');
  });

  it('waits for stale stats instead of publishing them', async () => {
    const stale = { ...fresh, is_up_to_date: false };
    const { impl, calls } = fakeFetch([
      [200, { data: stale }],
      [200, { data: fresh }],
    ]);
    assert.deepEqual(
      await fetchStats('Bearer t', { fetchImpl: impl, delayMs: 0 }),
      fresh
    );
    assert.equal(calls.length, 2);
  });

  it('gives up on stats that never become current', async () => {
    const { impl } = fakeFetch([
      [200, { data: { ...fresh, is_up_to_date: false } }],
    ]);
    await assert.rejects(
      fetchStats('Bearer t', { fetchImpl: impl, attempts: 2, delayMs: 0 }),
      /still being calculated/
    );
  });

  it('does not retry rejected credentials (e.g. API key after Nov 1)', async () => {
    const { impl, calls } = fakeFetch([[401, { error: 'Unauthorized' }]]);
    await assert.rejects(
      fetchStats('Basic k', { fetchImpl: impl, delayMs: 0 }),
      /HTTP 401: Unauthorized/
    );
    assert.equal(calls.length, 1);
  });

  it('retries server errors and rate limits', async () => {
    const { impl, calls } = fakeFetch([
      [503, {}],
      [429, {}],
      [200, { data: fresh }],
    ]);
    assert.deepEqual(
      await fetchStats('Bearer t', { fetchImpl: impl, delayMs: 0 }),
      fresh
    );
    assert.equal(calls.length, 3);
  });
});

describe('oauth-setup helpers', () => {
  it('asks only for the read_stats scope via the WakaTime test redirect', () => {
    const url = new URL(authorizeUrl('app_123', 'st8'));
    assert.equal(
      url.origin + url.pathname,
      'https://wakatime.com/oauth/authorize'
    );
    assert.equal(url.searchParams.get('scope'), 'read_stats');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(
      url.searchParams.get('redirect_uri'),
      'https://wakatime.com/oauth/test'
    );
    assert.equal(url.searchParams.get('state'), 'st8');
  });

  it('accepts a bare code or the redirect URL, and checks state', () => {
    assert.equal(extractCode('abc', 's'), 'abc');
    assert.equal(
      extractCode('https://wakatime.com/oauth/test?code=xyz&state=s', 's'),
      'xyz'
    );
    assert.throws(
      () =>
        extractCode('https://wakatime.com/oauth/test?code=xyz&state=evil', 's'),
      /state mismatch/
    );
  });

  it('uses expires_at when provided, otherwise 365 days', () => {
    assert.equal(
      expiryDate({ expires_at: '2027-10-13T08:00:00Z' }),
      '2027-10-13'
    );
    assert.equal(
      expiryDate({}, new Date('2026-10-13T00:00:00Z')),
      '2027-10-13'
    );
  });
});

describe('describeError', () => {
  it('surfaces the network cause behind "fetch failed"', async () => {
    const { describeError } = await import('./index.mjs');
    const err = new TypeError('fetch failed', {
      cause: Object.assign(new Error('connect'), { code: 'ETIMEDOUT' }),
    });
    assert.equal(describeError(err), 'fetch failed (ETIMEDOUT)');
    assert.equal(
      describeError(new Error('HTTP 401: Unauthorized')),
      'HTTP 401: Unauthorized'
    );
  });
});

describe('stale stats (2-day lag, #14)', () => {
  const block = end =>
    `<!--START_SECTION:waka-->\n\n\`\`\`txt\nFrom: 11 September 2026 - To: ${end}\n\`\`\`\n\n<!--END_SECTION:waka-->`;

  it('polls until WakaTime finishes recalculating', async () => {
    const stale = {
      ...fresh,
      end: '2026-10-11T23:59:59Z',
      is_up_to_date: false,
    };
    const { impl, calls } = fakeFetch([
      [200, { data: stale }],
      [200, { data: stale }],
      [200, { data: stale }],
      [200, { data: fresh }],
    ]);
    const { fetchStats } = await import('./index.mjs');
    assert.deepEqual(
      await fetchStats('Bearer t', { fetchImpl: impl, delayMs: 0 }),
      fresh
    );
    assert.equal(calls.length, 4);
  });

  it('hands back the newest stale stats when polling runs out', async () => {
    const { fetchStats, StaleStatsError } = await import('./index.mjs');
    const stale = {
      ...fresh,
      end: '2026-10-12T23:59:59Z',
      is_up_to_date: false,
    };
    const { impl } = fakeFetch([[200, { data: stale }]]);
    const err = await fetchStats('Bearer t', {
      fetchImpl: impl,
      attempts: 3,
      delayMs: 0,
    }).catch(e => e);
    assert.ok(err instanceof StaleStatsError);
    assert.equal(err.staleData, stale);
    assert.match(err.message, /newest available ends 2026-10-12/);
  });

  it('reads the "To:" date of the current block', async () => {
    const { blockEndDate } = await import('./index.mjs');
    assert.equal(blockEndDate(block('11 October 2026')), '2026-10-11');
    assert.equal(blockEndDate('# no block'), null);
  });

  it('publishes stale stats only when newer than the README', async () => {
    const { staleFallback } = await import('./index.mjs');
    const err = { staleData: { end: '2026-10-12T23:59:59Z' } };
    assert.equal(staleFallback(err, block('11 October 2026')), err.staleData);
    assert.equal(staleFallback(err, block('12 October 2026')), null);
    assert.equal(staleFallback(err, block('13 October 2026')), null);
    assert.equal(
      staleFallback(new Error('HTTP 401'), block('11 October 2026')),
      null
    );
  });

  it('reads the real README block', async () => {
    const { blockEndDate } = await import('./index.mjs');
    const { readFile } = await import('node:fs/promises');
    const readme = await readFile(
      new URL('../../README.md', import.meta.url),
      'utf8'
    );
    assert.match(blockEndDate(readme), /^\d{4}-\d{2}-\d{2}$/);
  });
});
