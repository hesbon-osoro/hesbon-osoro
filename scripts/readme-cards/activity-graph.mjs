// Renders the "contribution graph" card from GitHub's GraphQL API. This
// replaces github-readme-activity-graph, whose hosts (Cyclic, Vercel) are gone.

const GRAPHQL_URL = 'https://api.github.com/graphql';

const QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      name
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

const THEME = {
  bg: '#121112',
  title: '#a8a4a7',
  text: '#a8a4a7',
  grid: '#2b2a2b',
  line: '#1ca01f',
  point: '#dbe1dd',
  area: '#1ca01f',
};

export async function fetchContributions({ login, token, days = 31 }) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': `${login}-readme-cards`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { login, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);

  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map(e => e.message).join('; '));

  const user = data.user;
  const contributionDays =
    user.contributionsCollection.contributionCalendar.weeks
      .flatMap(w => w.contributionDays)
      .slice(-days);
  return { name: user.name || login, days: contributionDays };
}

const escapeXml = s =>
  s.replace(
    /[<>&'"]/g,
    c =>
      `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[c]};`
  );

function niceMax(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(s => s * magnitude * 4 >= value);
  return step * magnitude * 4;
}

export function renderActivityGraph({ name, days }) {
  const width = 1200;
  const height = 420;
  const pad = { top: 80, right: 40, bottom: 60, left: 70 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const counts = days.map(d => d.contributionCount);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = niceMax(Math.max(...counts, 1));
  const stepX = plotW / Math.max(days.length - 1, 1);

  const x = i => pad.left + i * stepX;
  const y = v => pad.top + plotH - (v / max) * plotH;
  const pts = counts.map((c, i) => [x(i), y(c)]);
  const fmt = n => n.toFixed(1);

  const linePath = pts
    .map(([px, py], i) => `${i ? 'L' : 'M'}${fmt(px)},${fmt(py)}`)
    .join(' ');
  const areaPath = `${linePath} L${fmt(x(days.length - 1))},${pad.top + plotH} L${pad.left},${pad.top + plotH} Z`;

  const yTicks = [0, 1, 2, 3, 4].map(i => {
    const v = (max / 4) * i;
    const py = fmt(y(v));
    return (
      `<line x1="${pad.left}" x2="${width - pad.right}" y1="${py}" y2="${py}" class="grid"/>` +
      `<text x="${pad.left - 12}" y="${py}" class="axis" text-anchor="end" dominant-baseline="middle">${v}</text>`
    );
  });

  const xTicks = days.map(
    (d, i) =>
      `<text x="${fmt(x(i))}" y="${pad.top + plotH + 24}" class="axis" text-anchor="middle">${Number(d.date.slice(8))}</text>`
  );

  const points = pts.map(
    ([px, py], i) =>
      `<circle cx="${fmt(px)}" cy="${fmt(py)}" r="4" class="point"><title>${days[i].date}: ${counts[i]} contributions</title></circle>`
  );

  const first = days[0]?.date ?? '';
  const last = days[days.length - 1]?.date ?? '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(name)}'s Contribution Graph</title>
  <desc id="desc">${total} contributions between ${first} and ${last}</desc>
  <style>
    .title { font: 600 22px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.title}; }
    .subtitle { font: 400 14px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; opacity: .8; }
    .axis { font: 400 12px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; }
    .grid { stroke: ${THEME.grid}; stroke-width: 1; }
    .line { fill: none; stroke: ${THEME.line}; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round;
            stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.6s ease-out forwards; }
    .area { fill: url(#areaFill); opacity: 0; animation: fade .8s ease-out .8s forwards; }
    .point { fill: ${THEME.point}; stroke: ${THEME.line}; stroke-width: 1.5; opacity: 0; animation: fade .6s ease-out 1.2s forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes fade { to { opacity: 1; } }
  </style>
  <defs>
    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${THEME.area}" stop-opacity=".45"/>
      <stop offset="100%" stop-color="${THEME.area}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="6" fill="${THEME.bg}"/>
  <text x="${width / 2}" y="38" class="title" text-anchor="middle">${escapeXml(name)}'s Contribution Graph</text>
  <text x="${width / 2}" y="62" class="subtitle" text-anchor="middle">${total} contributions · ${first} → ${last}</text>
  ${yTicks.join('\n  ')}
  <path d="${areaPath}" class="area"/>
  <path d="${linePath}" class="line" pathLength="1"/>
  ${points.join('\n  ')}
  ${xTicks.join('\n  ')}
  <text x="${width / 2}" y="${height - 12}" class="axis" text-anchor="middle">Days</text>
  <text transform="translate(20 ${pad.top + plotH / 2}) rotate(-90)" class="axis" text-anchor="middle">Contributions</text>
</svg>
`;
}
