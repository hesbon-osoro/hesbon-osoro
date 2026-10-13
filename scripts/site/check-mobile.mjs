#!/usr/bin/env node
// Mobile layout guard for the built website. Serves the build, opens it in
// headless Chrome at common phone widths in light and dark mode (with every
// <details> section expanded) and fails if anything causes horizontal
// scrolling or pushes the floating buttons off-screen.
//
// Usage: node scripts/site/check-mobile.mjs [_site]

import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WIDTHS = [320, 360, 390, 414];
const THEMES = ['light', 'dark'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve(dir) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, urlPath);
    if (!file.startsWith(dir)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(res);
  });
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => resolve(server))
  );
}

async function launchChrome() {
  const profile = mkdtempSync(path.join(tmpdir(), 'mobile-check-'));
  const chrome = spawn(
    process.env.CHROME_BIN || 'google-chrome',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  let targets;
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      break;
    } catch {
      await sleep(100);
    }
  }
  const ws = new WebSocket(
    targets.find(t => t.type === 'page').webSocketDebuggerUrl
  );
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    pending.get(msg.id)?.(msg);
  });
  const send = (method, params = {}) =>
    new Promise(resolve => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async expression =>
    (
      await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
    ).result.result?.value;
  const close = async () => {
    ws.close();
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    await exited;
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  };
  return { send, evaluate, close };
}

// Runs in the page: what overflows the viewport, ignoring content that
// scrolls inside its own box (code blocks) and the decorative background.
const MEASURE = `(() => {
  const vw = document.documentElement.clientWidth;
  const insideScroller = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('#keywords')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || (r.right <= vw + 1 && r.left >= -1) || insideScroller(el)) continue;
    const desc = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.textContent || el.getAttribute('src') || '').trim().slice(0, 40) + '"';
    offenders.push(desc + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
  }
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: offenders.slice(0, 10) };
})()`;

async function main() {
  const dir = path.resolve(process.argv[2] ?? '_site');
  if (!existsSync(path.join(dir, 'index.html'))) {
    console.error(`No index.html in ${dir}; run npm run build:site first.`);
    process.exit(2);
  }
  const server = await serve(dir);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const { send, evaluate, close } = await launchChrome();
  const failures = [];

  try {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 844,
          deviceScaleFactor: 2,
          mobile: true,
        });
        await send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-color-scheme', value: theme }],
        });
        await send('Page.navigate', { url });
        await sleep(1500);
        await evaluate(
          `document.querySelectorAll('details').forEach(d => d.open = true); new Promise(r => setTimeout(r, 500))`
        );
        const m = await evaluate(MEASURE);
        const label = `${width}px ${theme}`;
        if (m.scrollWidth > m.vw)
          failures.push(
            `${label}: page is ${m.scrollWidth}px wide (horizontal scroll)`
          );
        for (const o of m.offenders) failures.push(`${label}: overflows: ${o}`);
        console.log(
          `${failures.length ? '…' : '✔'} ${label}: page ${m.scrollWidth}px, ${m.offenders.length} overflowing elements`
        );
      }
    }
  } finally {
    await close();
    server.close();
  }

  if (failures.length) {
    for (const f of failures) console.error(`::error::${f}`);
    process.exit(1);
  }
  console.log(
    `Mobile layout OK at ${WIDTHS.join(', ')}px in light and dark mode.`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
