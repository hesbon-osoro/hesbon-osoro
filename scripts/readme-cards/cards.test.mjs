import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderActivityGraph } from './activity-graph.mjs';
import { CARDS } from './cards.mjs';
import { validateSvg } from './index.mjs';

const pad = '<g/>'.repeat(200);
const svg = inner =>
  `<svg xmlns="http://www.w3.org/2000/svg">${inner}${pad}</svg>`;

describe('validateSvg', () => {
  it('accepts a normal card, with or without an XML prolog', () => {
    assert.equal(validateSvg(svg('<text>448 stars</text>')), null);
    assert.equal(
      validateSvg(`<?xml version="1.0"?>\n${svg('<text>ok</text>')}`),
      null
    );
  });

  it('rejects HTML error pages and plain-text failures', () => {
    assert.match(
      validateSvg('<!DOCTYPE html><title>Application Error</title>'),
      /not an SVG/
    );
    assert.match(
      validateSvg('Payment required\n\nDEPLOYMENT_DISABLED'),
      /not an SVG/
    );
  });

  it('rejects error cards served with a 200 status', () => {
    for (const message of [
      'Something went wrong! could not reach backend, try again later.',
      'error code: 1101',
      'Missing username',
      'Could not resolve to a User with the login of x',
    ]) {
      assert.match(validateSvg(svg(`<text>${message}</text>`)), /error marker/);
    }
  });

  it('rejects truncated responses', () => {
    assert.match(validateSvg('<svg></svg>'), /suspiciously small/);
  });
});

describe('CARDS config', () => {
  it('has unique file names and https sources', () => {
    const files = CARDS.map(c => c.file);
    assert.equal(new Set(files).size, files.length);
    for (const card of CARDS) {
      assert.ok(card.sources.length > 0, `${card.file} has no sources`);
      for (const url of card.sources)
        assert.equal(new URL(url).protocol, 'https:');
    }
  });
});

describe('renderActivityGraph', () => {
  const days = Array.from({ length: 31 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    contributionCount: i % 7 === 0 ? 0 : i,
  }));

  it('renders a valid, self-describing SVG', () => {
    const out = renderActivityGraph({ name: 'Hesbon Osoro', days });
    assert.equal(validateSvg(out), null);
    assert.match(out, /Hesbon Osoro's Contribution Graph/);
    assert.equal(out.match(/<circle /g).length, 31);
    const total = days.reduce((s, d) => s + d.contributionCount, 0);
    assert.match(out, new RegExp(`${total} contributions`));
  });

  it('escapes user-controlled text', () => {
    const out = renderActivityGraph({ name: '<script>&', days });
    assert.doesNotMatch(out, /<script>/);
    assert.match(out, /&lt;script&gt;&amp;/);
  });

  it('handles a month with no contributions', () => {
    const empty = days.map(d => ({ ...d, contributionCount: 0 }));
    const out = renderActivityGraph({ name: 'x', days: empty });
    assert.doesNotMatch(out, /NaN|Infinity/);
  });
});
