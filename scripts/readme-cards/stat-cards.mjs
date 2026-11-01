// Renders the GitHub stats, top languages, pinned repo and WakaTime cards from
// the GitHub and WakaTime APIs. These replace github-readme-stats, whose public
// deployment was paused in October 2026, and keep its dark look so the README
// reads the same. Only public activity is counted, whichever token is used.

const GRAPHQL_URL = 'https://api.github.com/graphql';
const REST_URL = 'https://api.github.com';
const WAKATIME_URL = 'https://wakatime.com/api/v1/users';

const THEME = {
  bg: '#151515',
  title: '#009933',
  text: '#9f9f9f',
  icon: '#79ff97',
};

const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif";

// Octicons, as github-readme-stats drew them.
const ICONS = {
  star: 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z',
  commits:
    'M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z',
  prs: 'M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z',
  issues:
    'M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z',
  repo: 'M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z',
  fork: 'M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-3 8.75a.75.75 0 10-1.5 0 .75.75 0 001.5 0z',
};

const escapeXml = s =>
  String(s).replace(
    /[<>&'"]/g,
    c =>
      `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[c]};`
  );

const fmt = n => Number(n.toFixed(2));

function card({
  width,
  height,
  title,
  desc,
  header,
  headerX = 25,
  style = '',
  body,
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(desc)}</desc>
  <style>
    .header { font: 600 18px ${FONT}; fill: ${THEME.title}; }
    .stat { font: 600 14px ${FONT}; fill: ${THEME.text}; }
    .small { font: 400 12px ${FONT}; fill: ${THEME.text}; }
    .icon { fill: ${THEME.icon}; }
    ${style}
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${THEME.bg}"/>
  <text x="${headerX}" y="35" class="header">${escapeXml(header)}</text>
  ${body}
</svg>
`;
}

const icon = (d, x = 0, y = 0) =>
  `<svg x="${x}" y="${y}" width="16" height="16" viewBox="0 0 16 16" class="icon"><path fill-rule="evenodd" d="${d}"/></svg>`;

// --- GitHub ---------------------------------------------------------------

async function graphql(token, query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'readme-cards',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map(e => e.message).join('; '));
  return data;
}

async function searchCount(token, kind, q) {
  const res = await fetch(
    `${REST_URL}/search/${kind}?per_page=1&q=${encodeURIComponent(q)}`,
    {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'readme-cards',
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub search ${res.status}`);
  return (await res.json()).total_count;
}

const PROFILE_QUERY = `
  query ($login: String!, $after: String) {
    user(login: $login) {
      name
      followers { totalCount }
      repositoriesContributedTo(first: 1, privacy: PUBLIC, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
      contributionsCollection { totalPullRequestReviewContributions }
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, privacy: PUBLIC) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          isFork
          stargazerCount
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`;

const PIN_QUERY = `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      description
      stargazerCount
      forkCount
      primaryLanguage { name color }
    }
  }
`;

/** Everything the stats and top-languages cards need, public repos only. */
export async function fetchGitHubProfile({ login, token }) {
  const repos = [];
  let user;
  for (let after = null; ;) {
    ({ user } = await graphql(token, PROFILE_QUERY, { login, after }));
    repos.push(...user.repositories.nodes);
    if (!user.repositories.pageInfo.hasNextPage) break;
    after = user.repositories.pageInfo.endCursor;
  }
  const [commits, prs, issues] = await Promise.all([
    searchCount(token, 'commits', `author:${login} is:public`),
    searchCount(token, 'issues', `author:${login} type:pr is:public`),
    searchCount(token, 'issues', `author:${login} type:issue is:public`),
  ]);
  return {
    name: user.name || login,
    followers: user.followers.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    reviews: user.contributionsCollection.totalPullRequestReviewContributions,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    commits,
    prs,
    issues,
    repos,
  };
}

export async function fetchRepo({ owner, name, token }) {
  const { repository } = await graphql(token, PIN_QUERY, { owner, name });
  if (!repository) throw new Error(`repository ${owner}/${name} not found`);
  return repository;
}

// github-readme-stats' rank: a weighted mix of CDFs against typical values,
// so the letter matches what the card showed before.
export function calculateRank({
  commits,
  prs,
  issues,
  reviews,
  stars,
  followers,
}) {
  const exp = x => 1 - 2 ** -x;
  const logNormal = x => x / (1 + x);
  const parts = [
    [2, exp(commits / 1000)],
    [3, exp(prs / 50)],
    [1, exp(issues / 25)],
    [1, exp(reviews / 2)],
    [4, logNormal(stars / 50)],
    [1, logNormal(followers / 10)],
  ];
  const weight = parts.reduce((s, [w]) => s + w, 0);
  const percentile =
    (1 - parts.reduce((s, [w, v]) => s + w * v, 0) / weight) * 100;
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const levels = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
  return {
    level: levels[thresholds.findIndex(t => percentile <= t)],
    percentile,
  };
}

export function renderStatsCard(profile) {
  const rank = calculateRank(profile);
  const rows = [
    ['star', 'Total Stars Earned', profile.stars],
    ['commits', 'Total Commits', profile.commits],
    ['prs', 'Total PRs', profile.prs],
    ['issues', 'Total Issues', profile.issues],
    ['repo', 'Contributed to (last year)', profile.contributedTo],
  ];
  const circumference = 2 * Math.PI * 40;
  const progress = fmt(circumference * (rank.percentile / 100));
  const body = `<g transform="translate(0, 55)">
    ${rows
      .map(
        ([key, label, value], i) => `<g transform="translate(25, ${i * 25})">
      ${icon(ICONS[key])}
      <text class="stat" x="25" y="12.5">${label}:</text>
      <text class="stat" x="219" y="12.5">${value.toLocaleString('en-US')}</text>
    </g>`
      )
      .join('\n    ')}
  </g>
  <g transform="translate(390.5, 97.5)">
    <circle r="40" class="rim"/>
    <circle r="40" class="ring" stroke-dasharray="${fmt(circumference)}" stroke-dashoffset="${progress}" transform="rotate(-90)"/>
    <text class="rank" text-anchor="middle" dominant-baseline="central">${rank.level}</text>
  </g>`;
  return card({
    width: 467,
    height: 195,
    title: `${profile.name}'s GitHub Stats, Rank: ${rank.level}`,
    desc: rows.map(([, label, value]) => `${label}: ${value}`).join(', '),
    header: `${profile.name}'s GitHub Stats`,
    style: `.rim { stroke: ${THEME.title}; stroke-width: 6; opacity: .2; }
    .ring { stroke: ${THEME.title}; stroke-width: 6; stroke-linecap: round; opacity: .8; }
    .rank { font: 800 24px ${FONT}; fill: ${THEME.text}; }`,
    body,
  });
}

/** Byte share per language across non-fork public repos. */
export function topLanguages(
  repos,
  { excludeRepos = [], hide = [], count = 6 }
) {
  const skipRepo = new Set(excludeRepos.map(r => r.toLowerCase()));
  const skipLang = new Set(hide.map(l => l.toLowerCase()));
  const totals = new Map();
  for (const repo of repos) {
    if (repo.isFork || skipRepo.has(repo.name.toLowerCase())) continue;
    for (const { size, node } of repo.languages.edges) {
      if (skipLang.has(node.name.toLowerCase())) continue;
      const prev = totals.get(node.name) ?? {
        name: node.name,
        color: node.color,
        size: 0,
      };
      prev.size += size;
      totals.set(node.name, prev);
    }
  }
  const top = [...totals.values()]
    .sort((a, b) => b.size - a.size)
    .slice(0, count);
  const sum = top.reduce((s, l) => s + l.size, 0) || 1;
  return top.map(l => ({
    ...l,
    color: l.color || '#858585',
    percent: (l.size / sum) * 100,
  }));
}

export function renderTopLangsCard(langs) {
  const barWidth = 250;
  let x = 0;
  const segments = langs.map(l => {
    const w = (l.percent / 100) * barWidth;
    const rect = `<rect x="${fmt(x)}" y="0" width="${fmt(w)}" height="8" fill="${l.color}"/>`;
    x += w;
    return rect;
  });
  const half = Math.ceil(langs.length / 2);
  const items = langs.map((l, i) => {
    const col = i < half ? 0 : 150;
    const row = i < half ? i : i - half;
    return `<g transform="translate(${col}, ${row * 25})">
      <circle cx="5" cy="6" r="5" fill="${l.color}"/>
      <text x="15" y="10" class="lang">${escapeXml(l.name)} ${l.percent.toFixed(2)}%</text>
    </g>`;
  });
  return card({
    width: 300,
    height: 90 + half * 25,
    title: 'Most Used Languages',
    desc: langs.map(l => `${l.name} ${l.percent.toFixed(2)}%`).join(', '),
    header: 'Most Used Languages',
    style: `.lang { font: 400 11px ${FONT}; fill: ${THEME.text}; }`,
    body: `<g transform="translate(25, 55)">
    <clipPath id="bar"><rect width="${barWidth}" height="8" rx="5"/></clipPath>
    <g clip-path="url(#bar)">${segments.join('')}</g>
    <g transform="translate(0, 25)">
    ${items.join('\n    ')}
    </g>
  </g>`,
  });
}

/** Wrap text to lines of at most `width` characters, with an ellipsis past `lines`. */
export function wrapText(text, width, lines) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1].replace(/[\s.,;:]+$/, '') + '...';
  }
  return out;
}

export function renderPinCard(repo) {
  const desc = wrapText(repo.description || 'No description provided', 58, 3);
  const lang = repo.primaryLanguage;
  let x = 0;
  const footer = [];
  if (lang) {
    footer.push(`<g transform="translate(${x}, 0)">
      <circle cx="0" cy="-5" r="6" fill="${lang.color || '#858585'}"/>
      <text class="small" x="15">${escapeXml(lang.name)}</text>
    </g>`);
    x += 25 + lang.name.length * 7;
  }
  for (const [key, value] of [
    ['star', repo.stargazerCount],
    ['fork', repo.forkCount],
  ]) {
    if (key === 'fork' && !value) continue;
    footer.push(`<g transform="translate(${x}, 0)">
      ${icon(ICONS[key], 0, -13)}
      <text class="small" x="22">${value.toLocaleString('en-US')}</text>
    </g>`);
    x += 30 + String(value).length * 8;
  }
  const height = 105 + desc.length * 15;
  return card({
    width: 400,
    height,
    title: repo.nameWithOwner,
    desc: repo.description || '',
    header: repo.nameWithOwner,
    headerX: 50,
    style: `.description { font: 400 13px ${FONT}; fill: ${THEME.text}; }`,
    body: `${icon(ICONS.repo, 25, 22)}
  <text class="description" x="25" y="${55 + 6}">
    ${desc.map((l, i) => `<tspan x="25" dy="${i ? '1.2em' : 0}">${escapeXml(l)}</tspan>`).join('')}
  </text>
  <g transform="translate(30, ${height - 20})">
    ${footer.join('\n    ')}
  </g>`,
  });
}

// --- WakaTime -------------------------------------------------------------

/** All-time stats from the public profile; no key needed. */
export async function fetchWakaTime({ user }) {
  const res = await fetch(`${WAKATIME_URL}/${user}/stats`, {
    headers: { 'User-Agent': 'readme-cards' },
  });
  if (!res.ok) throw new Error(`WakaTime ${res.status}`);
  const { data } = await res.json();
  if (!data?.languages?.length)
    throw new Error('WakaTime returned no languages');
  // Stats still being recalculated come back partial; keep the last snapshot.
  if (data.is_up_to_date === false || (data.percent_calculated ?? 100) < 100)
    throw new Error(
      `WakaTime stats are still calculating (${data.percent_calculated}%)`
    );
  return data;
}

export function renderWakaTimeCard(stats, { minSeconds = 60 } = {}) {
  const langs = stats.languages.filter(l => l.total_seconds >= minSeconds);
  const rows = langs.map(
    (l, i) => `<g transform="translate(25, ${i * 25})">
      <text class="stat" y="12.5">${escapeXml(l.name)}:</text>
      <rect x="110" y="4" width="220" height="8" rx="5" class="track"/>
      <rect x="110" y="4" width="${fmt(Math.max((l.percent / 100) * 220, 2))}" height="8" rx="5" class="fill"/>
      <text class="stat light" x="350" y="12.5">${escapeXml(l.text)}</text>
    </g>`
  );
  const since = stats.human_readable_range || 'All time';
  const total =
    stats.human_readable_total_including_other_language ||
    stats.human_readable_total;
  return card({
    width: 495,
    height: 100 + langs.length * 25,
    title: 'WakaTime Stats',
    desc: `${total} ${since}: ${langs
      .slice(0, 10)
      .map(l => `${l.name} ${l.text}`)
      .join(', ')}`,
    header: 'WakaTime Stats',
    style: `.light { font-weight: 400; }
    .track { fill: ${THEME.text}; opacity: .35; }
    .fill { fill: ${THEME.title}; }`,
    body: `<text class="small" x="25" y="58">${escapeXml(total)} · ${escapeXml(since)}</text>
  <g transform="translate(0, 75)">
    ${rows.join('\n    ')}
  </g>`,
  });
}
