#!/usr/bin/env node
// Renders the "Monthly development breakdown" block between the
// <!--START_SECTION:waka--> markers in README.md from the WakaTime API.
//
// A dependency-free port of athul/waka-readme's output format, so the block
// looks exactly as before. When the API is unavailable the existing block is
// kept and the run only warns, instead of failing the workflow.
//
// Usage: WAKATIME_API_KEY=... node scripts/waka/index.mjs

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

async function fetchStats(apiKey, attempts = 4) {
  const url = `https://wakatime.com/api/v1/users/current/stats/${CONFIG.timeRange}`;
  const auth = Buffer.from(apiKey).toString('base64');
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          'User-Agent': 'hesbon-osoro-readme',
        },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.data?.start) return body.data;
      lastError = new Error(
        `HTTP ${res.status}: ${body.error ?? body.message ?? 'no data yet'}`
      );
      // WakaTime returns 202 while it is still computing stats; worth waiting.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt < attempts)
      await new Promise(r => setTimeout(r, attempt * 15_000));
  }
  throw lastError;
}

async function main() {
  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    console.log(
      '::warning title=WakaTime::WAKATIME_API_KEY is not set; README left unchanged'
    );
    return;
  }

  let stats;
  try {
    stats = await fetchStats(apiKey);
  } catch (err) {
    console.log(
      `::warning title=WakaTime::API unavailable (${err.message}); kept the previous block`
    );
    return;
  }

  const content = renderBlock(stats);
  console.log(content);
  const readme = await readFile(README, 'utf8');
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
