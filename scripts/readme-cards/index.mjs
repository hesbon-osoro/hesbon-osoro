#!/usr/bin/env node
// Snapshots the README's stat cards into assets/cards/ so the profile never
// shows a broken image when a third-party card service goes down.
//
// Usage: GITHUB_TOKEN=... node scripts/readme-cards/index.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS, ERROR_MARKERS } from './cards.mjs';
import { fetchContributions, renderActivityGraph } from './activity-graph.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const OUT_DIR = path.join(ROOT, 'assets/cards');
const LOGIN = process.env.README_USER || 'hesbon-osoro';
const TIMEOUT_MS = 30_000;
const MIN_BYTES = 400;

export function validateSvg(body) {
  const head = body.trimStart().slice(0, 300);
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) {
    return 'response is not an SVG';
  }
  if (body.length < MIN_BYTES)
    return `SVG is suspiciously small (${body.length} bytes)`;
  const marker = ERROR_MARKERS.find(re => re.test(body));
  return marker ? `SVG contains error marker ${marker}` : null;
}

async function fetchSvg(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': `${LOGIN}-readme-cards`,
      Accept: 'image/svg+xml,*/*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const problem = validateSvg(body);
  if (problem) throw new Error(problem);
  return body;
}

async function writeIfChanged(file, content) {
  const target = path.join(OUT_DIR, file);
  const previous = await readFile(target, 'utf8').catch(() => null);
  if (previous === content) return false;
  await writeFile(target, content);
  return true;
}

async function snapshotCard({ file, sources }) {
  const errors = [];
  for (const url of sources) {
    try {
      const svg = await fetchSvg(url);
      const changed = await writeIfChanged(file, svg);
      return { file, ok: true, changed, source: new URL(url).host };
    } catch (err) {
      errors.push(`${new URL(url).host}: ${err.message}`);
    }
  }
  return { file, ok: false, errors };
}

async function snapshotActivityGraph() {
  const file = 'activity-graph.svg';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return { file, ok: false, errors: ['GITHUB_TOKEN is not set'] };
  try {
    const data = await fetchContributions({ login: LOGIN, token });
    const changed = await writeIfChanged(file, renderActivityGraph(data));
    return { file, ok: true, changed, source: 'api.github.com/graphql' };
  } catch (err) {
    return { file, ok: false, errors: [err.message] };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const results = await Promise.all([
    snapshotActivityGraph(),
    ...CARDS.map(snapshotCard),
  ]);

  for (const r of results) {
    if (r.ok) {
      console.log(
        `✔ ${r.file.padEnd(22)} ${r.changed ? 'updated' : 'unchanged'} (${r.source})`
      );
    } else {
      console.warn(
        `✖ ${r.file.padEnd(22)} kept last good snapshot\n    ${r.errors.join('\n    ')}`
      );
    }
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length && process.env.GITHUB_ACTIONS) {
    console.log(
      `::warning title=README cards::${failed.map(r => r.file).join(', ')} served from last good snapshot`
    );
  }
  // Only fail the run when nothing could be refreshed at all; partial outages
  // are expected and handled by keeping the previous snapshot.
  if (failed.length === results.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
