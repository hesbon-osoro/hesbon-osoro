// Page shell for the GitHub Pages site. The body is README HTML rendered by
// GitHub, so styling comes from github-markdown-css; everything here is the
// frame around it: metadata, theme switching, navigation and motion.

const MD_CSS = 'https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1';

const TITLE = 'Hesbon Osoro: Software & Platform Engineer';
const DESCRIPTION =
  'Software engineer building production web apps and the cloud platforms they run on: ' +
  'Go, TypeScript, React, Kubernetes, Docker, Terraform and AWS. ' +
  'Also available for MATLAB, R, Tableau, math and data-analysis work.';
const EMAIL = 'osoro@hesbon.dev';

const STYLES = `
  :root {
    --page-bg: #ffffff;
    --bar-bg: rgba(255, 255, 255, 0.85);
    --bar-border: #d1d9e0;
    --text: #1f2328;
    --muted: #59636e;
    --accent: #0969da;
    --cta-bg: #1f883d;
    --cta-text: #ffffff;
    --summary-bg: #f6f8fa;
    --summary-hover: #eaeef2;
  }
  :root[data-theme='dark'] {
    --page-bg: #0d1117;
    --bar-bg: rgba(13, 17, 23, 0.85);
    --bar-border: #3d444d;
    --text: #f0f6fc;
    --muted: #9198a1;
    --accent: #4493f8;
    --cta-bg: #238636;
    --cta-text: #ffffff;
    --summary-bg: #151b23;
    --summary-hover: #212830;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 72px; }
  body { margin: 0; background: var(--page-bg); color: var(--text); }

  .bar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 16px;
    padding: 10px max(16px, calc((100vw - 1012px) / 2 + 16px));
    background: var(--bar-bg);
    backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--bar-border);
    font: 500 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  }
  .bar .brand { color: var(--text); font-weight: 600; text-decoration: none; margin-right: auto; white-space: nowrap; }
  .bar nav { display: flex; gap: 16px; overflow-x: auto; scrollbar-width: none; }
  .bar nav a { color: var(--muted); text-decoration: none; white-space: nowrap; }
  .bar nav a:hover { color: var(--accent); }
  .theme-toggle {
    flex: none; width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid var(--bar-border); background: transparent; color: var(--text);
    cursor: pointer; font-size: 16px; line-height: 1;
  }

  .markdown-body {
    max-width: 1012px; margin: 0 auto; padding: 32px;
    background: var(--page-bg);
  }
  @media (max-width: 767px) {
    .markdown-body { padding: 16px; }
    .bar nav { display: none; }
  }

  /* Collapsible sections: a clear, clickable header instead of a bare triangle. */
  .markdown-body details {
    border: 1px solid var(--bar-border);
    border-radius: 10px;
    margin: 16px 0;
    overflow: hidden;
  }
  .markdown-body details > summary {
    cursor: pointer; list-style: none;
    display: block;
    padding: 12px 16px;
    background: var(--summary-bg);
    transition: background-color 0.2s ease;
  }
  .markdown-body details > summary::-webkit-details-marker { display: none; }
  .markdown-body details > summary:hover { background: var(--summary-hover); }
  .markdown-body details > summary::before {
    content: ''; display: inline-block; width: 8px; height: 8px;
    margin: 0 12px 2px 2px; vertical-align: middle;
    border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.3s ease;
  }
  .markdown-body details[open] > summary::before { transform: rotate(45deg); }
  .markdown-body details > :not(summary) { margin-left: 16px; margin-right: 16px; }
  /* github-markdown-css sizes tables to max-content, which changes as images
     load; a fixed full-width layout keeps the open animation's target height
     accurate. */
  .markdown-body details > table {
    display: table; width: calc(100% - 32px); table-layout: fixed; margin-top: 16px;
  }

  .hire {
    position: fixed; right: 20px; bottom: 20px; z-index: 10;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 18px; border-radius: 999px;
    background: var(--cta-bg); color: var(--cta-text);
    font: 600 15px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    text-decoration: none;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hire:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3); }

  footer {
    max-width: 1012px; margin: 0 auto; padding: 24px 32px 96px;
    color: var(--muted); font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border-top: 1px solid var(--bar-border);
  }
  footer a { color: var(--accent); }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before { transition: none !important; }
  }
`;

// Applies the saved or system theme before first paint to avoid a flash.
const THEME_BOOT = `
  (function () {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    var dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  })();
`;

const SCRIPT = `
  (function () {
    var root = document.documentElement;
    var light = document.getElementById('md-light');
    var dark = document.getElementById('md-dark');
    var toggle = document.querySelector('.theme-toggle');

    function apply(theme) {
      root.dataset.theme = theme;
      light.media = theme === 'light' ? 'all' : 'not all';
      dark.media = theme === 'dark' ? 'all' : 'not all';
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
    }
    apply(root.dataset.theme);
    toggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });

    // Smooth expand/collapse for <details>. Without JavaScript, or with
    // reduced motion, the native instant toggle still works.
    var reduce = matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('.markdown-body details').forEach(function (details) {
      var summary = details.querySelector(':scope > summary');
      if (!summary) return;
      var animation = null;

      summary.addEventListener('click', function (event) {
        if (reduce.matches || !details.animate) return;
        event.preventDefault();
        if (animation) return;

        var closing = details.open;
        var start = details.offsetHeight;
        if (!closing) details.open = true;
        var end = closing ? summary.offsetHeight + 2 : details.offsetHeight;
        var distance = Math.abs(end - start);

        animation = details.animate(
          { height: [start + 'px', end + 'px'] },
          { duration: Math.min(700, 250 + distance / 6), easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
        );
        animation.onfinish = animation.oncancel = function () {
          if (closing) details.open = false;
          animation = null;
        };
      });
    });
  })();
`;

export function pageTemplate({ body, siteUrl }) {
  const ogImage = `${siteUrl}assets/projects/hesbon-dev.png`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${TITLE}</title>
  <meta name="description" content="${DESCRIPTION}">
  <link rel="canonical" href="${siteUrl}">
  <meta name="theme-color" content="#0d1117">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESCRIPTION}">
  <meta property="og:url" content="${siteUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@wazimu_hb">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👋</text></svg>">
  <script>${THEME_BOOT}</script>
  <link id="md-light" rel="stylesheet" href="${MD_CSS}/github-markdown-light.css" media="(prefers-color-scheme: light)">
  <link id="md-dark" rel="stylesheet" href="${MD_CSS}/github-markdown-dark.css" media="(prefers-color-scheme: dark)">
  <style>${STYLES}</style>
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Hesbon Osoro',
    alternateName: 'Wazimu',
    jobTitle: 'Software & Platform Engineer',
    email: `mailto:${EMAIL}`,
    url: siteUrl,
    sameAs: [
      'https://github.com/hesbon-osoro',
      'https://www.linkedin.com/in/hesbon-osoro/',
      'https://twitter.com/wazimu_hb',
      'https://hesbon.dev/',
    ],
    knowsAbout: [
      'Kubernetes',
      'Docker',
      'Terraform',
      'AWS',
      'Go',
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'Python',
      'MATLAB',
      'R',
      'Tableau',
      'Data analysis',
    ],
  })}</script>
</head>
<body>
  <header class="bar">
    <a class="brand" href="#top">Hesbon Osoro</a>
    <nav aria-label="Sections">
      <a href="#platform-showcase">Showcase</a>
      <a href="#sample-projects">Projects</a>
      <a href="#certifications">Certifications</a>
      <a href="#lets-connect">Contact</a>
    </nav>
    <button class="theme-toggle" type="button" aria-label="Toggle theme">🌙</button>
  </header>
  <main id="top" class="markdown-body">
${body}
  </main>
  <footer>
    This page is generated from the
    <a href="https://github.com/hesbon-osoro/hesbon-osoro">hesbon-osoro profile README</a>
    and republished automatically whenever it changes.
  </footer>
  <a class="hire" href="mailto:${EMAIL}?subject=Project%20inquiry">✉️ Hire me</a>
  <script>${SCRIPT}</script>
</body>
</html>
`;
}
