function scrollToTopOrBottom() {
  if (window.scrollY > window.innerHeight / 2) {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // Scroll to bottom
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }
}

// Keep the mouse icon pointing the way the next click will scroll, not just
// after a click.
function updateScrollButton() {
  const button = document.getElementById('scroll-button');
  const goingUp = window.scrollY > window.innerHeight / 2;
  button.classList.toggle('top', goingUp);
  button.setAttribute(
    'aria-label',
    goingUp ? 'Scroll to top' : 'Scroll to bottom'
  );
}
window.addEventListener('scroll', updateScrollButton, { passive: true });
updateScrollButton();

document.getElementById('date').textContent = new Date().getFullYear();

var keywords = [
  'JavaScript',
  'TypeScript',
  'CSS',
  'HTML',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Java',
  'C',
  'Python',
  'Go',
  'Rust',
  'Kubernetes',
  'Docker',
  'Terraform',
  'AWS',
  'GitHub Actions',
  'Prometheus',
  'DevOps',
  'Platform Engineering',
  'MATLAB',
  'R',
  'Tableau',
  'Data Analysis',
  'Statistics',
  'software engineering',
  'web development',
  'full stack development',
  'front-end development',
  'back-end development',
  'database management',
  'web application development',
  'agile development',
  'Hesbon',
  'Hesbon Osoro',
  'Wazimu',
  'Github',
  'Github profile',
  'Cool portfolio',
  'Cool profile',
  'Software Engineer',
  'Developer',
  'Portfolio',
  'Stunning Portfolio',
  'Stunning profile',
  'Resume',
  'Developer Resume',
  'Top resume',
  'React',
  'Next.js',
  'Node.js',
  'GraphQL',
  'Postgres',
  'Gatsby',
  'CMS',
  'Contentful',
  'Pusher',
  'Contentful CMS',
];

var colors = [
  '#1d7eca',
  '#9cd3db',
  '#007577',
  '#0e5764',
  '#0c71c3',
  '#2ea3f2',
  '#2a1800',
  '#ffea1f',
  '#06dda5',
  '#0b8b88',
  '#0d3a78',
  '#f57200',
  '#124507',
  '#471404',
  '#00182c',
  '#13433a',
];

function createKeyword(keyword, minSize, maxSize) {
  var word = document.createElement('span');
  word.textContent = keyword;
  word.style.fontSize = getRandomFontSize(minSize, maxSize) + 'em';
  word.style.position = 'absolute';
  // Positions are percentages of the viewport, so the cloud keeps its shape
  // when the window is resized or viewed on a phone.
  word.style.top = randomValue(0, 98) + 'vh';
  word.style.transform = `rotate(${randomValue(0, 360)}deg)`;
  word.style.color = colors[randomValue(0, colors.length - 1)];
  word.style.textShadow = '2px 2px 5px rgb(51, 51, 51)';
  return word;
}

function leftAndRightBackgroundTextGenerator() {
  var container = document.getElementById('keywords');
  for (const keyword of keywords) {
    var word = createKeyword(keyword, 0.8, 2);
    // Pin each word to the left or right edge, where the card leaves room.
    if (Math.random() < 0.5) {
      word.style.left = keyword.length + 'px';
    } else {
      word.style.right = keyword.length + 'px';
    }
    container.appendChild(word);
  }
}

leftAndRightBackgroundTextGenerator();

function allBackgroundTextGenerator() {
  var container = document.getElementById('keywords');
  // Three passes over the list, without growing the shared array.
  for (const keyword of keywords.concat(keywords, keywords)) {
    var word = createKeyword(keyword, 0.6, 1.2);
    word.style.left = randomValue(0, 96) + 'vw';
    container.appendChild(word);
  }
}

allBackgroundTextGenerator();

function randomValue(minVal, maxVal) {
  // Ensure that minVal and maxVal are integers
  minVal = Math.floor(minVal);
  maxVal = Math.floor(maxVal);
  // Generate a random integer within the given range
  var interval = maxVal - minVal + 1;
  return Math.floor(minVal + interval * Math.random());
}

function getRandomFontSize(minSize, maxSize) {
  // A size between minSize and maxSize (in em), to two decimals. The previous
  // version floored to whole numbers, so many words came out at 0em and were
  // invisible.
  var size = minSize + Math.random() * (maxSize - minSize);
  return Math.round(size * 100) / 100;
}

const toggleDarkModeButton = document.getElementById('toggle-dark-mode-button');
const body = document.body;
const container = document.querySelector('.container');
// In dark mode the button shows the sun (switch to light), and vice versa.
const sunIcon = document.getElementById('sun');
const moonIcon = document.getElementById('moon');

function readDarkModePreference() {
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
  } catch (e) {
    // Storage can be unavailable (private mode); fall back to the system.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateDarkMode(dark) {
  body.classList.toggle('dark-mode', dark);
  container.classList.toggle('dark-mode', dark);
  sunIcon.style.display = dark ? 'block' : 'none';
  moonIcon.style.display = dark ? 'none' : 'block';
  toggleDarkModeButton.setAttribute(
    'aria-label',
    dark ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

toggleDarkModeButton.addEventListener('click', () => {
  const dark = !body.classList.contains('dark-mode');
  try {
    localStorage.setItem('darkMode', String(dark));
  } catch (e) {
    // Preference just won't persist.
  }
  updateDarkMode(dark);
});

updateDarkMode(readDarkModePreference());
document.documentElement.classList.remove('dark-boot');

// Smooth expand/collapse for the README's <details> sections (Featured
// Projects, Certifications, Peek at the code). Without JavaScript, or with
// reduced motion, the browser's instant toggle still works.
(function smoothDetails() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.readme details').forEach(details => {
    const summary = details.querySelector(':scope > summary');
    if (!summary) return;
    let animation = null;

    summary.addEventListener('click', event => {
      if (reduce.matches || !details.animate) return;
      event.preventDefault();
      if (animation) return;

      const closing = details.open;
      const start = details.offsetHeight;
      if (!closing) details.open = true;
      const end = closing ? summary.offsetHeight + 2 : details.offsetHeight;
      const distance = Math.abs(end - start);

      details.style.overflow = 'hidden';
      animation = details.animate(
        { height: [start + 'px', end + 'px'] },
        {
          duration: Math.min(700, 250 + distance / 6),
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }
      );
      animation.onfinish = animation.oncancel = () => {
        if (closing) details.open = false;
        details.style.overflow = '';
        animation = null;
      };
    });
  });
})();
