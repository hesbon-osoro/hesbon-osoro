#!/usr/bin/env node
// Builds https://hesbon-osoro.github.io from this repository's README.md.
//
// The README is rendered by GitHub's own Markdown API, so the website matches
// the profile exactly, then wrapped in a themed page with SEO metadata and
// smooth expand/collapse for <details> sections. Every local asset the README
// references is copied next to the page so the site has no runtime
// dependency on this repository.
//
// Usage: GITHUB_TOKEN=... node scripts/site/build.mjs [--out _site]

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from './image-size.mjs';
import { pageTemplate } from './template.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const REPO = 'hesbon-osoro/hesbon-osoro';
const SITE_URL = 'https://hesbon-osoro.github.io/';
const BLOB_BASE = `https://github.com/${REPO}/blob/main/`;

export async function renderMarkdown(markdown, token) {
  const res = await fetch('https://api.github.com/markdown', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'hesbon-osoro-site-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: markdown, mode: 'markdown', context: REPO }),
  });
  if (!res.ok) {
    throw new Error(`GitHub Markdown API ${res.status}: ${await res.text()}`);
  }
  return res.text();
}

const isLocal = url =>
  !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url) && url.trim() !== '';

const normalise = url => decodeURIComponent(url.replace(/^\.\//, ''));

// Turns GitHub-flavoured HTML into HTML that works on a standalone page.
export function adaptHtml(html) {
  return addHeadingIds(
    html
      // GitHub wraps bare images in a link to the image itself; on a website
      // that just opens the raw file, so unwrap them.
      .replace(
        /<a target="_blank" rel="noopener noreferrer" href="([^"]+)"><img([^>]*?) src="\1"([^>]*)><\/a>/g,
        '<img$2 src="$1"$3>'
      )
      // GitHub prefixes ids with "user-content-" and fixes in-page links with
      // JavaScript; strip the prefix so #anchors work natively.
      .replace(/(id|name)="user-content-/g, '$1="')
      // Links to repository files (not assets) point at GitHub.
      .replace(/href="([^"]+)"/g, (match, url) => {
        if (!isLocal(url) || normalise(url).startsWith('assets/')) return match;
        return `href="${BLOB_BASE}${url.replace(/^\.\//, '')}"`;
      })
      // Lazy-load everything below the fold.
      .replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy"')
  );
}

export function slugify(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

// The Markdown API doesn't emit heading anchors (GitHub's UI adds them
// client-side), so give every heading without an id a GitHub-style slug.
export function addHeadingIds(html) {
  const seen = new Map();
  return html.replace(
    /<h([1-6])((?![^>]*\bid=)[^>]*)>([\s\S]*?)<\/h\1>/g,
    (match, level, attrs, inner) => {
      const base = slugify(inner) || 'section';
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
    }
  );
}

// In-page links whose target id doesn't exist on the page.
export function brokenAnchors(html) {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  return [
    ...new Set([...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1])),
  ].filter(id => !ids.has(id));
}

export function localAssets(html) {
  const refs = new Set();
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (isLocal(url) && normalise(url).startsWith('assets/')) {
      refs.add(normalise(url));
    }
  }
  return [...refs].sort();
}

// Adds an aspect-ratio to every local raster image so layout is stable
// before lazy-loaded images arrive.
export async function addAspectRatios(html, root) {
  const sizes = new Map();
  for (const asset of localAssets(html)) {
    if (!/\.(png|gif|jpe?g)$/i.test(asset)) continue;
    const size = imageSize(await readFile(path.join(root, asset)));
    if (size?.width && size?.height) sizes.set(asset, size);
  }
  return html.replace(/<img\b[^>]*>/g, tag => {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    const size = src && isLocal(src) && sizes.get(normalise(src));
    if (!size) return tag;
    const ratio = `aspect-ratio: ${size.width} / ${size.height}; height: auto;`;
    // GitHub already adds style="max-width: 100%"; extend it rather than
    // adding a second style attribute.
    return /\bstyle="/.test(tag)
      ? tag.replace(/\bstyle="/, `style="${ratio} `)
      : tag.replace(/^<img/, `<img style="${ratio}"`);
  });
}

function parseArgs(argv) {
  const args = { out: path.join(ROOT, '_site') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
  }
  return args;
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  const markdown = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const body = await addAspectRatios(
    adaptHtml(await renderMarkdown(markdown, token)),
    ROOT
  );

  const assets = localAssets(body);
  const missing = assets.filter(a => !existsSync(path.join(ROOT, a)));
  if (missing.length) throw new Error(`missing assets: ${missing.join(', ')}`);

  await mkdir(out, { recursive: true });
  for (const asset of assets) {
    const target = path.join(out, asset);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(ROOT, asset), target);
  }

  const page = pageTemplate({ body, siteUrl: SITE_URL });
  const broken = brokenAnchors(page);
  if (broken.length)
    throw new Error(`broken in-page links: #${broken.join(', #')}`);

  // Output is deterministic (no build timestamps) so the publishing workflow
  // only commits when the README or its assets actually change.
  await writeFile(path.join(out, 'index.html'), page);
  await writeFile(path.join(out, '.nojekyll'), '');
  await writeFile(
    path.join(out, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`
  );
  await writeFile(
    path.join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}</loc></url>\n</urlset>\n`
  );

  console.log(
    `Built ${path.relative(process.cwd(), out) || '.'}/index.html with ${assets.length} assets`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
