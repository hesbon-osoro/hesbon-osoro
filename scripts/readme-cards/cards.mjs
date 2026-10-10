// Every card the profile README shows, with providers listed in order of
// preference. The first source that returns a valid SVG wins; if all of them
// fail, the previously committed snapshot is kept so the README never renders
// a broken image.

const USER = 'hesbon-osoro';
const LEETCODE_USER = 'hesbon-osoro';
const WAKATIME_USER = 'wazimu';

export const CARDS = [
  {
    file: 'stack-code.svg',
    sources: [
      'https://skillicons.dev/icons?i=go,rust,ts,js,py,react,nextjs,nodejs,graphql,html,css&perline=11&theme=dark',
    ],
  },
  {
    file: 'stack-platform.svg',
    sources: [
      'https://skillicons.dev/icons?i=docker,kubernetes,terraform,aws,githubactions,prometheus,nginx,linux,bash,git&perline=11&theme=dark',
    ],
  },
  {
    file: 'stack-data.svg',
    sources: [
      'https://skillicons.dev/icons?i=postgres,mongodb,mysql,firebase&perline=11&theme=dark',
    ],
  },
  {
    file: 'typing.svg',
    sources: [
      `https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&duration=3500&pause=800&color=2FA4D7&vCenter=true&width=640&height=40&lines=I'm+Hesbon+%E2%80%94+A.K.A+Wazimu;Software+%26+Platform+Engineer;Kubernetes+%C2%B7+Docker+%C2%B7+Terraform+%C2%B7+Go;Shipping+reliable+systems+to+production`,
      `https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&duration=3500&pause=800&color=2FA4D7&vCenter=true&width=640&height=40&lines=I'm+Hesbon+%E2%80%94+A.K.A+Wazimu;Software+%26+Platform+Engineer;Kubernetes+%C2%B7+Docker+%C2%B7+Terraform+%C2%B7+Go;Shipping+reliable+systems+to+production`,
    ],
  },
  {
    file: 'trophies.svg',
    sources: [
      `https://github-trophies.vercel.app/?username=${USER}&theme=onedark&no-frame=true&margin-w=8&margin-h=8&column=7&row=2`,
      `https://github-profile-trophy.vercel.app/?username=${USER}&theme=onedark&no-frame=true&margin-w=8&margin-h=8&column=7&row=2`,
    ],
  },
  {
    file: 'stats.svg',
    sources: [
      `https://github-readme-stats.vercel.app/api?username=${USER}&count_private=true&show_icons=true&theme=dark&title_color=009933&include_all_commits=true&hide_border=true`,
    ],
  },
  {
    file: 'streak.svg',
    sources: [
      `https://streak-stats.demolab.com/?user=${USER}&theme=dark&hide_border=true`,
      `https://github-readme-streak-stats.herokuapp.com/?user=${USER}&theme=dark&hide_border=true`,
    ],
  },
  {
    file: 'top-langs.svg',
    sources: [
      `https://github-readme-stats.vercel.app/api/top-langs/?username=${USER}&layout=compact&theme=dark&title_color=009933&langs_count=10&hide_border=true`,
    ],
  },
  {
    file: 'pin.svg',
    sources: [
      `https://github-readme-stats.vercel.app/api/pin/?username=${USER}&repo=${USER}&theme=dark&title_color=009933&show_owner=true&hide_border=true`,
    ],
  },
  {
    file: 'wakatime.svg',
    sources: [
      `https://github-readme-stats.vercel.app/api/wakatime?username=${WAKATIME_USER}&theme=dark&title_color=009933&langs_count=10&hide_border=true`,
    ],
  },
  {
    file: 'leetcode-card.svg',
    sources: [
      `https://leetcard.jacoblin.cool/${LEETCODE_USER}?theme=dark&font=Source%20Code%20Pro&ext=heatmap`,
      `https://leetcode.card.workers.dev/${LEETCODE_USER}?theme=dark&font=Source%20Code%20Pro&ext=heatmap`,
    ],
  },
  {
    file: 'leetcode-stats.svg',
    sources: [
      `https://leetcode-stats-six.vercel.app/api?username=${LEETCODE_USER}&theme=dark`,
      `https://leetcode-stats.vercel.app/api?username=${LEETCODE_USER}&theme=Dark`,
    ],
  },
  {
    file: 'joke.svg',
    sources: [
      'https://readme-jokes.vercel.app/api?theme=dark&hideBorder',
      'https://readme-jokes.vercel.app/api',
    ],
  },
];

// Text that providers embed in a 200 OK response when they are actually down,
// rate limited, or misconfigured.
export const ERROR_MARKERS = [
  /something went wrong/i,
  /could not reach/i,
  /could not fetch/i,
  /DEPLOYMENT_DISABLED/,
  /payment required/i,
  /error code:?\s*\d+/i,
  /rate limit/i,
  /missing username/i,
  /user not found/i,
  /could not resolve to a user/i,
  /application error/i,
];
