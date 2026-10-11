import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adaptHtml,
  addHeadingIds,
  brokenAnchors,
  localAssets,
  slugify,
} from './build.mjs';
import { imageSize } from './image-size.mjs';
import { pageTemplate } from './template.mjs';

describe('adaptHtml', () => {
  it('unwraps the self-links GitHub puts around images', () => {
    const html =
      '<a target="_blank" rel="noopener noreferrer" href="assets/a.png"><img src="assets/a.png" alt="a" style="max-width: 100%;"></a>';
    assert.equal(
      adaptHtml(html),
      '<img loading="lazy" src="assets/a.png" alt="a" style="max-width: 100%;">'
    );
  });

  it('keeps images that link somewhere else', () => {
    const html = '<a href="https://hesbon.dev/"><img src="assets/a.png"></a>';
    assert.match(adaptHtml(html), /href="https:\/\/hesbon\.dev\/"/);
  });

  it('strips the user-content- id prefix so anchors work', () => {
    assert.equal(
      adaptHtml('<h2 id="user-content-sample-projects">x</h2>'),
      '<h2 id="sample-projects">x</h2>'
    );
  });

  it('points repository file links at GitHub', () => {
    assert.match(
      adaptHtml('<a href="./REPO_MANAGEMENT.md">docs</a>'),
      /href="https:\/\/github\.com\/hesbon-osoro\/hesbon-osoro\/blob\/main\/REPO_MANAGEMENT\.md"/
    );
  });

  it('leaves external, mailto, anchor and asset links alone', () => {
    for (const href of [
      'https://x.dev',
      'mailto:osoro@hesbon.dev',
      '#top',
      'assets/cards/stats.svg',
    ]) {
      assert.match(
        adaptHtml(`<a href="${href}">x</a>`),
        new RegExp(`href="${href}"`)
      );
    }
  });
});

describe('headings', () => {
  it('slugifies like GitHub, dropping emoji and punctuation', () => {
    assert.equal(slugify('🤝 Let’s Connect'), 'lets-connect');
    assert.equal(slugify('<b>Tech</b> Stack'), 'tech-stack');
  });

  it('adds ids to headings, de-duplicating and keeping existing ones', () => {
    const out = addHeadingIds('<h2>A</h2><h3>A</h3><h2 id="keep">B</h2>');
    assert.equal(
      out,
      '<h2 id="a">A</h2><h3 id="a-1">A</h3><h2 id="keep">B</h2>'
    );
  });

  it('finds in-page links without a target', () => {
    assert.deepEqual(
      brokenAnchors('<a href="#ok"></a><a href="#gone"></a><p id="ok"></p>'),
      ['gone']
    );
  });
});

describe('localAssets', () => {
  it('lists decoded local asset paths once', () => {
    const html =
      '<img src="assets/projects/custom%20pagination.png"><img src="./assets/projects/custom%20pagination.png"><img src="https://x/a.png">';
    assert.deepEqual(localAssets(html), [
      'assets/projects/custom pagination.png',
    ]);
  });
});

describe('imageSize', () => {
  it('reads PNG dimensions', () => {
    const png = Buffer.alloc(24);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(1908, 16);
    png.writeUInt32BE(948, 20);
    assert.deepEqual(imageSize(png), { width: 1908, height: 948 });
  });

  it('reads GIF dimensions', () => {
    const gif = Buffer.from('GIF89a\xf1\x00\xea\x00', 'latin1');
    assert.deepEqual(imageSize(gif), { width: 241, height: 234 });
  });

  it('reads JPEG dimensions from the SOF segment', () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11,
      0x08, 0x04, 0xd3, 0x06, 0xda, 0x03,
    ]);
    assert.deepEqual(imageSize(jpeg), { width: 1754, height: 1235 });
  });

  it('returns null for unknown formats', () => {
    assert.equal(imageSize(Buffer.from('<svg></svg>')), null);
  });
});

describe('pageTemplate', () => {
  const page = pageTemplate({
    body: '<h2 id="sample-projects">x</h2>',
    siteUrl: 'https://hesbon-osoro.github.io/',
  });

  it('includes SEO and social preview metadata', () => {
    assert.match(
      page,
      /<link rel="canonical" href="https:\/\/hesbon-osoro\.github\.io\/" ?\/?>/
    );
    assert.match(
      page,
      /<meta property="og:image" content="https:\/\/hesbon-osoro\.github\.io\/assets\/projects\/hesbon-dev\.png" ?\/?>/
    );
    assert.match(page, /"@type":"Person"/);
  });

  it('keeps the original site layout around the README', () => {
    for (const marker of [
      'id="keywords"',
      'class="background-wrapper"',
      'class="container"',
      'id="scroll-button"',
      'id="toggle-dark-mode-button"',
      'id="date"',
      'href="style.css"',
      'src="script.js"',
      'family=Chivo+Mono',
    ]) {
      assert.ok(page.includes(marker), `missing ${marker}`);
    }
    assert.match(
      page,
      /<main class="readme">\s*<h2 id="sample-projects">x<\/h2>/
    );
  });

  it('is deterministic so unchanged READMEs produce no commits', () => {
    assert.equal(
      page,
      pageTemplate({
        body: '<h2 id="sample-projects">x</h2>',
        siteUrl: 'https://hesbon-osoro.github.io/',
      })
    );
  });
});

describe('static/script.js', () => {
  it('never generates zero-size (invisible) keywords', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(
      new URL('./static/script.js', import.meta.url),
      'utf8'
    );
    const getRandomFontSize = new Function(
      `${source.match(/function getRandomFontSize[\s\S]*?\n}/)[0]}; return getRandomFontSize;`
    )();
    for (let i = 0; i < 2000; i++) {
      const size = getRandomFontSize(0.6, 1.2);
      assert.ok(size >= 0.6 && size <= 1.2, `size ${size}`);
    }
  });
});
