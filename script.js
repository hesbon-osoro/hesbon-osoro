function scrollToTopOrBottom() {
  const button = document.getElementById('scroll-button');
  if (window.scrollY > window.innerHeight / 2) {
    // Scroll to top
    button.classList.add('top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // Scroll to bottom
    button.classList.remove('top');
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }
}

document.getElementById('date').innerHTML = new Date().getFullYear();

var keywords = [
  'JavaScript',
  'CSS',
  'HTML',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Java',
  'C',
  'Python',
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
  'Node.js',
  'Postgres',
  'Gatsby',
  'Next',
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

function leftAndRightBackgroundTextGenerator() {
  // keywords = keywords.concat(keywords);
  keywords.sort((a, b) => a - b);
  var minimumCount = 5;
  for (const keyword of keywords) {
    var word = document.createElement('span');
    word.textContent = keyword;
    // var wordSize = Math.min(6, (0.45 * keywords[i].length) / minimumCount);
    var wordSize = getRandomFontSize(0.2, 2);
    word.style.fontSize = wordSize + 'em';
    word.style.position = 'absolute';
    // Generate a random number between 0 and 1 using Math.random
    var random = Math.random();

    // If the random number is less than 0.5, place the word on the left side of the screen
    if (random < 0.5) {
      word.style.left = keyword.length + 'px';
      // '0px';
    }
    // If the random number is greater than or equal to 0.5, place the word on the right side of the screen
    else {
      word.style.right = keyword.length + 'px';
    }

    // word.style.left = `${randomValue(0, window.innerWidth)}px`;
    word.style.top = `${randomValue(0, window.innerHeight)}px`;
    word.style.transform = `rotate(${randomValue(0, 360)}deg)`;
    word.style.color = colors[randomValue(0, colors.length - 1)];
    word.style.textShadow = '2px 2px 5px rgb(51, 51, 51)';
    document.getElementById('keywords').appendChild(word);
  }
}

leftAndRightBackgroundTextGenerator();

function allBackgroundTextGenerator() {
  keywords = keywords.concat(keywords, keywords);
  keywords.sort((a, b) => a - b);
  var minimumCount = 5;
  for (const keyword of keywords) {
    var word = document.createElement('span');
    word.textContent = keyword;
    // var wordSize = Math.min(6, (0.45 * keywords[i].length) / minimumCount);
    var wordSize = getRandomFontSize(0.2, 1);
    word.style.fontSize = wordSize + 'em';
    word.style.position = 'absolute';
    word.style.left = `${randomValue(0, window.innerWidth)}px`;
    word.style.top = `${randomValue(0, window.innerHeight)}px`;
    word.style.transform = `rotate(${randomValue(0, 360)}deg)`;
    word.style.color = colors[randomValue(0, colors.length - 1)];
    word.style.textShadow = '2px 2px 5px rgb(51, 51, 51)';
    document.getElementById('keywords').appendChild(word);
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
  // Generate a random number between 0 and 1
  var random = Math.random();

  // Calculate a font size within the desired range (minSize to maxSize)
  var fontSize = Math.floor(random * (maxSize - minSize + 1) + minSize);

  // Return the font size as a string with the 'px' suffix
  return fontSize;
}
