import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDate,
  makeGraph,
  renderBlock,
  replaceSection,
} from './index.mjs';

// Blocks exactly as athul/waka-readme wrote them into README.md
// (October 2026 and the March 2026 commit d96ec9c).
const OCTOBER =
  '<!--START_SECTION:waka-->\n\n```txt\nFrom: 09 September 2026 - To: 09 October 2026\n\nPython       18 hrs 3 mins         \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   35.52 %\nMarkdown     17 hrs 38 mins        \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   34.69 %\nTypeScript   5 hrs 31 mins         \u2588\u2588\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   10.86 %\nHTML         3 hrs 2 mins          \u2588\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   06.00 %\nOther        2 hrs 25 mins         \u2588\u2592\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   04.77 %\n```\n\n<!--END_SECTION:waka-->';
const MARCH =
  '<!--START_SECTION:waka-->\n\n```txt\nFrom: 10 February 2026 - To: 12 March 2026\n\nTypeScript   5 hrs 46 mins         \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   54.85 %\nJSON         2 hrs 42 mins         \u2588\u2588\u2588\u2588\u2588\u2588\u2592\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   25.80 %\nMarkdown     1 hr 1 min            \u2588\u2588\u2592\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   09.71 %\nJavaScript   36 mins               \u2588\u2592\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   05.71 %\nOther        14 mins               \u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591   02.22 %\n```\n\n<!--END_SECTION:waka-->';

const octoberStats = {
  start: '2026-09-09T00:00:00Z',
  end: '2026-10-09T23:59:59Z',
  languages: [
    { name: 'Python', text: '18 hrs 3 mins', percent: 35.52 },
    { name: 'Markdown', text: '17 hrs 38 mins', percent: 34.69 },
    { name: 'TypeScript', text: '5 hrs 31 mins', percent: 10.86 },
    { name: 'HTML', text: '3 hrs 2 mins', percent: 6.0 },
    { name: 'Other', text: '2 hrs 25 mins', percent: 4.77 },
    { name: 'JSON', text: '1 hr 10 mins', percent: 2.3 },
  ],
};

const marchStats = {
  start: '2026-02-10T00:00:00Z',
  end: '2026-03-12T23:59:59Z',
  languages: [
    { name: 'TypeScript', text: '5 hrs 46 mins', percent: 54.85 },
    { name: 'JSON', text: '2 hrs 42 mins', percent: 25.8 },
    { name: 'Markdown', text: '1 hr 1 min', percent: 9.71 },
    { name: 'JavaScript', text: '36 mins', percent: 5.71 },
    { name: 'Other', text: '14 mins', percent: 2.22 },
  ],
};

describe('renderBlock', () => {
  it('reproduces the athul/waka-readme block byte for byte', () => {
    const empty = '<!--START_SECTION:waka-->\n<!--END_SECTION:waka-->';
    assert.equal(replaceSection(empty, renderBlock(octoberStats)), OCTOBER);
    assert.equal(replaceSection(empty, renderBlock(marchStats)), MARCH);
  });

  it('shows at most five languages', () => {
    const lines = renderBlock(octoberStats).split('\n');
    assert.equal(lines.length, 2 + 5);
    assert.ok(!lines.some(l => l.startsWith('JSON')));
  });

  it('handles a month with no tracked time', () => {
    assert.match(
      renderBlock({ ...octoberStats, languages: [] }),
      /No activity tracked$/
    );
  });
});

describe('makeGraph', () => {
  it('always draws 25 cells', () => {
    for (const p of [0, 0.1, 2.22, 33.3, 50, 99.99, 100]) {
      assert.equal([...makeGraph(p)].length, 25, `percent ${p}`);
    }
  });

  it('uses partial blocks for the remainder', () => {
    assert.equal(makeGraph(100), '█'.repeat(25));
    assert.equal(makeGraph(0), '░'.repeat(25));
    assert.equal(makeGraph(6).slice(0, 2), '█▓');
  });
});

describe('formatDate', () => {
  it('formats WakaTime ISO dates like the original action', () => {
    assert.equal(formatDate('2026-09-09T00:00:00Z'), '09 September 2026');
    assert.throws(() => formatDate('soon'));
  });
});

describe('replaceSection', () => {
  it('only touches the waka section', () => {
    const readme = `# Hi\n\n${OCTOBER}\n\n## More`;
    const out = replaceSection(readme, 'new');
    assert.match(out, /^# Hi\n\n<!--START_SECTION:waka-->\n\n```txt\nnew\n```/);
    assert.match(out, /## More$/);
  });

  it('fails loudly when the markers are missing', () => {
    assert.throws(() => replaceSection('# no markers', 'x'), /not found/);
  });

  it('treats $ in content literally', () => {
    assert.match(replaceSection(OCTOBER, 'cost $1 $&'), /cost \$1 \$&/);
  });
});
