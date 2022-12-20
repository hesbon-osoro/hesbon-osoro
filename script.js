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
  'Cool profiles',
  'Software Engineer',
];
var colors = [
  '#1d7eca',
  '#9cd3db',
  '#007577',
  '#0c71c3',
  '#2ea3f2',
  '#b6dfe9',
  '#ffea1f',
  '#06dda5',
  '#0b8b88',
  '#0d3a78',
];

function randomValue(minVal, maxVal) {
  var interval = maxVal - minVal;
  return Math.floor(minVal + interval * Math.random());
}

function backgroundTextGenerator() {
  keywords = keywords.concat(keywords, keywords);
  var minimumCount = 5;
  for (var i = 0; i < keywords.length; i++) {
    var word = document.createElement('span');
    word.textContent = keywords[i];
    var wordSize = Math.min(6, (0.45 * keywords[i].length) / minimumCount);
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

backgroundTextGenerator();

function randomValue(minVal, maxVal) {
  // Ensure that minVal and maxVal are integers
  minVal = Math.floor(minVal);
  maxVal = Math.floor(maxVal);
  // Generate a random integer within the given range
  var interval = maxVal - minVal + 1;
  return Math.floor(minVal + interval * Math.random());
}
