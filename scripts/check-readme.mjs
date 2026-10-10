#!/usr/bin/env node
// Guards the profile README against the two ways it has broken before:
//  1. A blank line inside an HTML <table> ends the HTML block. GitHub then
//     renders the rest as Markdown (indented lines become code blocks) and
//     Prettier strips the indentation, so the table falls apart.
//  2. Images pointing at files that don't exist in the repo.

import { existsSync, readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'README.md';
const lines = readFileSync(file, 'utf8').split('\n');
const errors = [];

let tableDepth = 0;
lines.forEach((line, i) => {
  tableDepth += (line.match(/<table\b/g) ?? []).length;
  if (tableDepth > 0 && line.trim() === '') {
    errors.push(`${file}:${i + 1}: blank line inside <table> breaks rendering`);
  }
  tableDepth -= (line.match(/<\/table>/g) ?? []).length;
});

const text = lines.join('\n');
const localImages = [
  ...text.matchAll(/<img\b[^>]*?\bsrc="(?!https?:)([^"]+)"/g),
  ...text.matchAll(/!\[[^\]]*\]\((?!https?:)([^)\s]+)\)/g),
].map(m => decodeURIComponent(m[1]).replace(/^\.\//, ''));

for (const src of new Set(localImages)) {
  if (!existsSync(src)) errors.push(`${file}: image not found: ${src}`);
}

if (errors.length) {
  for (const e of errors) console.error(`::error::${e}`);
  process.exit(1);
}
console.log(
  `${file}: ${new Set(localImages).size} local images present, tables intact`
);
