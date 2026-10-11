// Page shell for hesbon-osoro.github.io: the site's original layout (random
// rotated keyword background, star-framed card, animated scrollbar, scroll and
// dark-mode buttons, footer) with the profile README rendered inside the card.
// Styles and behaviour live in static/style.css and static/script.js.

const TITLE = 'Hesbon Osoro: Software & Platform Engineer';
const DESCRIPTION =
  'Software engineer building production web apps and the cloud platforms they run on: ' +
  'Go, TypeScript, React, Kubernetes, Docker, Terraform and AWS. ' +
  'Also available for MATLAB, R, Tableau, math and data-analysis work.';
const KEYWORDS =
  'JavaScript, TypeScript, React, Next.js, Node.js, GraphQL, Go, Rust, Python, Kubernetes, Docker, ' +
  'Terraform, AWS, DevOps, Platform Engineering, MongoDB, PostgreSQL, MySQL, MATLAB, R, Tableau, ' +
  'Data Analysis, software engineering, web development, full stack development, Hesbon, ' +
  'Hesbon Osoro, Wazimu, Software Engineer, Developer, Portfolio, Resume';
const EMAIL = 'osoro@hesbon.dev';

export function pageTemplate({ body, siteUrl }) {
  const ogImage = `${siteUrl}assets/projects/hesbon-dev.png`;
  const person = {
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
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${TITLE}</title>
    <meta name="description" content="${DESCRIPTION}" />
    <meta name="keywords" content="${KEYWORDS}" />
    <link rel="canonical" href="${siteUrl}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@wazimu_hb" />
    <link rel="shortcut icon" href="./assets/icons/portfolio.png" type="image/x-icon" />
    <script>
      // Apply the saved or system theme before first paint (no white flash).
      try {
        var saved = localStorage.getItem('darkMode');
        var dark = saved === null ? matchMedia('(prefers-color-scheme: dark)').matches : saved === 'true';
        if (dark) document.documentElement.classList.add('dark-boot');
      } catch (e) {}
    </script>
    <link rel="stylesheet" href="style.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@300&family=Charm&display=swap"
      rel="stylesheet"
    />
    <script type="application/ld+json">${JSON.stringify(person)}</script>
    <script src="script.js" defer></script>
  </head>
  <body>
    <div class="keywords-background" id="keywords" aria-hidden="true"></div>
    <div class="background-wrapper">
      <div class="container">
        <button id="scroll-button" type="button" onclick="scrollToTopOrBottom()" aria-label="Scroll to bottom">
          <img src="./assets/icons/mouse1.png" alt="" />
        </button>
        <button id="toggle-dark-mode-button" type="button" aria-label="Toggle dark mode">
          <img src="./assets/icons/sun.png" id="sun" alt="" />
          <img src="./assets/icons/moon.png" id="moon" alt="" />
        </button>

        <main class="readme">
${body}
        </main>

        <footer>
          <p>
            &copy;<span id="date"></span>
            <a href="https://github.com/hesbon-osoro" target="_blank" rel="noopener noreferrer">
              <img src="./assets/icons/github.png" alt="GitHub" />
            </a>
            wazimu
          </p>
        </footer>
      </div>
    </div>
  </body>
</html>
`;
}
