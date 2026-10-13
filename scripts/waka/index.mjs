#!/usr/bin/env node
// Renders the "Monthly development breakdown" block between the
// <!--START_SECTION:waka--> markers in README.md from the WakaTime API.
//
// A dependency-free port of athul/waka-readme's output format, so the block
// looks exactly as before. When the API is unavailable the existing block is
// kept and the run only warns, instead of failing the workflow.
//
// Usage: WAKATIME_ACCESS_TOKEN=... node scripts/waka/index.mjs
// (get the token once with: node scripts/waka/oauth-setup.mjs)

import net from 'node:net';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const README = path.join(ROOT, 'README.md');

export const CONFIG = {
  timeRange: 'last_30_days',
  languageCount: 5,
  graphLength: 25,
  blocks: '░▒▓█',
  prefixLength: 22,
  codeLang: 'txt',
  section: 'waka',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// "2026-09-09T00:00:00Z" -> "09 September 2026" (the date as WakaTime reports
// it, ignoring the timezone, like the original action).
export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) throw new Error(`unexpected date ${iso}`);
  const [, year, month, day] = match;
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function makeGraph(
  percent,
  length = CONFIG.graphLength,
  blocks = CONFIG.blocks
) {
  const markers = blocks.length - 1;
  const proportion = (percent / 100) * length;
  const full = Math.floor(proportion + 0.5 / markers);
  const remainder = Math.trunc((proportion - full) * markers + 0.5);
  let bar = blocks.at(-1).repeat(full);
  if (remainder > 0) bar += blocks[remainder];
  return bar + blocks[0].repeat(Math.max(length - bar.length, 0));
}

export function renderBlock(stats, config = CONFIG) {
  const lines = [
    `From: ${formatDate(stats.start)} - To: ${formatDate(stats.end)}`,
    '',
  ];
  const languages = stats.languages ?? [];
  if (!languages.length) return [...lines, 'No activity tracked'].join('\n');

  const padLength = Math.max(...languages.map(l => String(l.name).length));
  for (const lang of languages.slice(0, config.languageCount)) {
    const percent = Number(lang.percent);
    lines.push(
      `${String(lang.name).padEnd(padLength)}   ` +
        `${String(lang.text).padEnd(config.prefixLength)}` +
        `${makeGraph(percent, config.graphLength, config.blocks)}   ` +
        `${percent.toFixed(2).padStart(5, '0')} %`
    );
  }
  return lines.join('\n');
}

export function replaceSection(readme, content, config = CONFIG) {
  const start = `<!--START_SECTION:${config.section}-->`;
  const end = `<!--END_SECTION:${config.section}-->`;
  const pattern = new RegExp(`${start}[\\s\\S]+${end}`);
  if (!pattern.test(readme))
    throw new Error(`markers ${start} … ${end} not found`);
  return readme.replace(
    pattern,
    () => `${start}\n\n\`\`\`${config.codeLang}\n${content}\n\`\`\`\n\n${end}`
  );
}

// wakatime.com has IPv4 and IPv6 addresses. Node's Happy Eyeballs gives each
// only 250 ms by default, so on a network with broken IPv6 and a ~300 ms IPv4
// handshake every attempt is abandoned and fetch fails with ETIMEDOUT.
net.setDefaultAutoSelectFamilyAttemptTimeout(2_000);

// Undici reports network failures as a bare "fetch failed"; surface the cause.
export function describeError(err) {
  const cause = err?.cause;
  const detail = cause?.code ?? cause?.message;
  return detail && !String(err.message).includes(detail)
    ? `${err.message} (${detail})`
    : String(err?.message ?? err);
}

const STATS_URL = `https://wakatime.com/api/v1/users/current/stats/${CONFIG.timeRange}`;

// From November 1, 2026 WakaTime API keys are write-only (plugins only), so
// reading stats needs an OAuth access token with the read_stats scope. The
// API key stays as a fallback until then.
export function authHeader(env = process.env) {
  if (env.WAKATIME_ACCESS_TOKEN) {
    return { scheme: 'oauth', value: `Bearer ${env.WAKATIME_ACCESS_TOKEN}` };
  }
  if (env.WAKATIME_API_KEY) {
    const encoded = Buffer.from(env.WAKATIME_API_KEY).toString('base64');
    return { scheme: 'api-key', value: `Basic ${encoded}` };
  }
  return null;
}

// Thrown when WakaTime never finishes recalculating within the polling
// window; carries the newest (stale) stats it did return.
export class StaleStatsError extends Error {
  constructor(staleData) {
    super(
      `stats still being calculated (newest available ends ${String(staleData.end).slice(0, 10)})`
    );
    this.name = 'StaleStatsError';
    this.staleData = staleData;
  }
}

// WakaTime calculates stats in the background: a request returns the cached
// copy (is_up_to_date=false) and triggers a refresh. Asking once a day meant
// always publishing the copy triggered the day before, two days behind, so
// keep polling (~5.5 min by default) until the fresh numbers are ready.
export async function fetchStats(
  authorization,
  {
    attempts = 8,
    delayMs = 15_000,
    maxDelayMs = 60_000,
    fetchImpl = fetch,
  } = {}
) {
  let lastError;
  let staleData = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(STATS_URL, {
        headers: {
          Authorization: authorization,
          'User-Agent': 'hesbon-osoro-readme',
        },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await res.json().catch(() => ({}));
      const data = body.data;
      if (res.ok && data?.start) {
        if (data.is_up_to_date !== false) return data;
        staleData = data;
        lastError = new StaleStatsError(data);
      } else {
        lastError = new Error(
          res.ok
            ? 'no stats in the response'
            : `HTTP ${res.status}: ${body.error ?? body.message ?? res.statusText}`
        );
        // Bad credentials or scope won't fix themselves on retry.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < attempts)
      await new Promise(r =>
        setTimeout(r, Math.min(attempt * delayMs, maxDelayMs))
      );
  }
  throw staleData ? new StaleStatsError(staleData) : lastError;
}

// The "To:" date of the block currently in the README, as YYYY-MM-DD.
export function blockEndDate(readme, config = CONFIG) {
  const section = readme.split(`<!--START_SECTION:${config.section}-->`)[1];
  const match = section && /To: (\d{2}) ([A-Za-z]+) (\d{4})/.exec(section);
  if (!match) return null;
  const month = MONTHS.indexOf(match[2]) + 1;
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[1]}`;
}

// When WakaTime is still recalculating, its newest (not yet final) stats are
// still better than freezing the block, but only if they are newer than what
// the README already shows.
export function staleFallback(err, readme) {
  if (!err?.staleData?.end) return null;
  const current = blockEndDate(readme);
  const staleEnd = String(err.staleData.end).slice(0, 10);
  return !current || staleEnd > current ? err.staleData : null;
}

async function main() {
  const auth = authHeader();
  if (!auth) {
    console.log(
      '::warning title=WakaTime::Set the WAKATIME_ACCESS_TOKEN secret (run scripts/waka/oauth-setup.mjs); README left unchanged'
    );
    return;
  }
  if (auth.scheme === 'api-key') {
    console.log(
      '::warning title=WakaTime::Using the API key, which stops working for stats on 2026-11-01. Run scripts/waka/oauth-setup.mjs to switch to OAuth.'
    );
  }

  const readme = await readFile(README, 'utf8');
  let stats;
  try {
    stats = await fetchStats(auth.value);
  } catch (err) {
    stats = staleFallback(err, readme);
    if (stats) {
      console.log(
        `::warning title=WakaTime::Stats still recalculating; published the newest available (to ${stats.end.slice(0, 10)}, README had ${blockEndDate(readme)}). The next run picks up the fresh numbers.`
      );
    } else {
      console.log(
        `::warning title=WakaTime::${describeError(err)}; kept the previous block`
      );
      return;
    }
  }

  const content = renderBlock(stats);
  console.log(content);
  const updated = replaceSection(readme, content);
  if (updated === readme) {
    console.log('WakaTime block unchanged.');
    return;
  }
  await writeFile(README, updated);
  console.log('README.md updated.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
