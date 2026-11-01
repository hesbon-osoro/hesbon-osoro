import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateSvg } from './index.mjs';
import {
  calculateRank,
  renderPinCard,
  renderStatsCard,
  renderTopLangsCard,
  renderWakaTimeCard,
  topLanguages,
  wrapText,
} from './stat-cards.mjs';

const profile = {
  name: 'Hesbon Osoro',
  stars: 448,
  commits: 4280,
  prs: 76,
  issues: 22,
  reviews: 0,
  followers: 123,
  contributedTo: 0,
};

const repo = (name, langs, extra = {}) => ({
  name,
  isFork: false,
  stargazerCount: 0,
  languages: {
    edges: langs.map(([lang, size]) => ({
      size,
      node: { name: lang, color: '#123456' },
    })),
  },
  ...extra,
});

describe('calculateRank', () => {
  it('matches the rank github-readme-stats gave the same numbers', () => {
    assert.equal(calculateRank(profile).level, 'A-');
  });

  it('ranks an empty profile last', () => {
    const empty = {
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      stars: 0,
      followers: 0,
    };
    assert.equal(calculateRank(empty).level, 'C');
  });
});

describe('topLanguages', () => {
  it('skips forks, excluded repos and hidden languages', () => {
    const langs = topLanguages(
      [
        repo('app', [
          ['TypeScript', 300],
          ['HTML', 900],
          ['Go', 100],
        ]),
        repo('Python', [['Python', 5000]]),
        repo('fork', [['Rust', 5000]], { isFork: true }),
      ],
      { excludeRepos: ['python'], hide: ['html'], count: 6 }
    );
    assert.deepEqual(
      langs.map(l => [l.name, l.percent]),
      [
        ['TypeScript', 75],
        ['Go', 25],
      ]
    );
  });
});

describe('wrapText', () => {
  it('wraps on words and ellipsises past the line limit', () => {
    const lines = wrapText('one two three four five six', 9, 2);
    assert.deepEqual(lines, ['one two', 'three...']);
  });
});

describe('renderers', () => {
  it('draw valid, self-describing cards', () => {
    const stats = renderStatsCard(profile);
    assert.equal(validateSvg(stats), null);
    assert.match(stats, /Total Commits:<\/text>\s*<text[^>]*>4,280</);
    assert.match(stats, /Rank: A-/);

    const langs = renderTopLangsCard(
      topLanguages(
        [
          repo('a', [
            ['JavaScript', 3],
            ['TypeScript', 1],
          ]),
        ],
        {}
      )
    );
    assert.equal(validateSvg(langs), null);
    assert.match(langs, /JavaScript 75\.00%/);

    const pin = renderPinCard({
      nameWithOwner: 'me/<repo>',
      description: 'A & B',
      stargazerCount: 16,
      forkCount: 0,
      primaryLanguage: { name: 'JavaScript', color: '#f1e05a' },
    });
    assert.equal(validateSvg(pin), null);
    assert.match(pin, /me\/&lt;repo&gt;/);
    assert.match(pin, /A &amp; B/);
  });

  it('lists every WakaTime language used for at least a minute', () => {
    const out = renderWakaTimeCard({
      human_readable_range: 'since Oct 13 2021',
      human_readable_total_including_other_language: '2,534 hrs',
      languages: [
        {
          name: 'JavaScript',
          total_seconds: 2.6e6,
          percent: 28.7,
          text: '726 hrs 24 mins',
        },
        {
          name: 'TypeScript',
          total_seconds: 1.8e6,
          percent: 19.8,
          text: '501 hrs 1 min',
        },
        {
          name: 'C#',
          total_seconds: 9960,
          percent: 0.1,
          text: '2 hrs 46 mins',
        },
        { name: 'DOT', total_seconds: 1.2, percent: 0, text: '0 secs' },
      ],
    });
    assert.equal(validateSvg(out), null);
    assert.match(out, /2,534 hrs · since Oct 13 2021/);
    assert.match(out, /TypeScript:<\/text>/);
    assert.match(out, /C#:<\/text>/);
    assert.doesNotMatch(out, /DOT/);
  });
});
