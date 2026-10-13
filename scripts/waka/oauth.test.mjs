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
