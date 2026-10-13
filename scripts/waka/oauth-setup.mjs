#!/usr/bin/env node
// One-time (then yearly) setup for the WakaTime OAuth token the README bot
// uses to read your stats. WakaTime API keys become write-only on 2026-11-01.
//
//   1. Create an app at https://wakatime.com/apps and add
//      https://wakatime.com/oauth/test to its "Authorized Redirect URIs".
//   2. node scripts/waka/oauth-setup.mjs
//
// The script opens the consent URL, exchanges the code for a token, checks it
// can read your stats, and stores it as the WAKATIME_ACCESS_TOKEN repository
// secret (plus its expiry date as a repository variable) through the GitHub
// CLI. Tokens are piped straight to `gh` and never printed or written to disk.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { fetchStats } from './index.mjs';

const REPO = process.env.README_REPO || 'hesbon-osoro/hesbon-osoro';
const REDIRECT_URI = 'https://wakatime.com/oauth/test';
const SCOPE = 'read_stats';
const TOKEN_LIFETIME_DAYS = 365; // WakaTime: code-flow tokens expire after a year

function ask(question, { secret = false } = {}) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  if (secret) {
    // Hide what's typed after the prompt.
    rl._writeToOutput = text => {
      if (text.startsWith(question)) process.stdout.write(question);
    };
  }
  return new Promise(resolve =>
    rl.question(question, answer => {
      rl.close();
      if (secret) process.stdout.write('\n');
      resolve(answer.trim());
    })
  );
}

export function authorizeUrl(clientId, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state,
  });
  return `https://wakatime.com/oauth/authorize?${params}`;
}

// Accepts the bare code or the whole URL WakaTime redirected to.
export function extractCode(input, expectedState) {
  if (!/^https?:\/\//.test(input)) return input;
  const url = new URL(input);
  const state = url.searchParams.get('state');
  if (state && state !== expectedState) {
    throw new Error('state mismatch: start the setup again');
  }
  const code = url.searchParams.get('code');
  if (!code) throw new Error('no ?code= in that URL');
  return code;
}

async function exchangeCode({ clientId, clientSecret, code }) {
  const res = await fetch('https://wakatime.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(
      `token exchange failed (HTTP ${res.status}): ${body.error_description ?? body.error ?? 'no access_token'}`
    );
  }
  return body;
}

export function expiryDate(tokenResponse, now = new Date()) {
  const fromResponse = Date.parse(tokenResponse.expires_at ?? '');
  const expires = Number.isFinite(fromResponse)
    ? new Date(fromResponse)
    : new Date(now.getTime() + TOKEN_LIFETIME_DAYS * 86_400_000);
  return expires.toISOString().slice(0, 10);
}

function gh(args, input) {
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.status !== 0)
    throw new Error(`gh ${args.slice(0, 2).join(' ')} failed`);
}

async function main() {
  console.log(`WakaTime OAuth setup for ${REPO}\n`);
  console.log('Before continuing, create an app at https://wakatime.com/apps');
  console.log(`and add ${REDIRECT_URI} to its Authorized Redirect URIs.\n`);

  const clientId =
    process.env.WAKATIME_CLIENT_ID || (await ask('App ID (client_id): '));
  const clientSecret =
    process.env.WAKATIME_CLIENT_SECRET ||
    (await ask('App Secret (client_secret, hidden): ', { secret: true }));
  if (!clientId || !clientSecret)
    throw new Error('client_id and client_secret are required');

  const state = randomBytes(16).toString('hex');
  console.log('\n1. Open this URL, sign in and click Authorize:\n');
  console.log(`   ${authorizeUrl(clientId, state)}\n`);
  console.log(
    '2. WakaTime then shows a code (or redirects to a URL containing ?code=).'
  );
  const code = extractCode(
    await ask('   Paste the code or the full URL: '),
    state
  );

  const token = await exchangeCode({ clientId, clientSecret, code });
  const scopes = String(token.scope ?? SCOPE);
  if (!scopes.split(/[ ,]+/).includes(SCOPE)) {
    throw new Error(`token is missing the ${SCOPE} scope (got: ${scopes})`);
  }

  process.stdout.write('\nChecking the token can read your stats... ');
  const stats = await fetchStats(`Bearer ${token.access_token}`, {
    attempts: 3,
    delayMs: 5_000,
  });
  console.log(
    `ok (${stats.languages?.length ?? 0} languages, ${stats.start?.slice(0, 10)} → ${stats.end?.slice(0, 10)})`
  );

  const expires = expiryDate(token);
  gh(
    ['secret', 'set', 'WAKATIME_ACCESS_TOKEN', '-R', REPO],
    token.access_token
  );
  gh([
    'variable',
    'set',
    'WAKATIME_TOKEN_EXPIRES',
    '-R',
    REPO,
    '--body',
    expires,
  ]);

  console.log(
    `\nDone. WAKATIME_ACCESS_TOKEN is stored in ${REPO} and expires on ${expires}.`
  );
  console.log(
    'The Waka Readme workflow opens a reminder issue 30 days before then;'
  );
  console.log(
    're-run this script to renew. You can now delete the WAKATIME_API_KEY secret.'
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(`\n${err.message}`);
    process.exit(1);
  });
}
