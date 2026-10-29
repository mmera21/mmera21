// 🌸 Generates Mika's pink GitHub stats cards into assets/
// Runs inside GitHub Actions (see .github/workflows/stats.yml).
// Local test: node .github/scripts/stats.mjs --mock
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "mmera21";
const OUT = "assets";

const C = {
  bg: "#FFF0F6", border: "#FFC1DA", title: "#D6336C", text: "#862E5C",
  muted: "#A9497A", accent: "#F06595",
  shades: ["#FFE3EE", "#FFC1DA", "#FF8FB8", "#F06595", "#C2185B"],
  langs: ["#C2185B", "#E75480", "#F06595", "#FF8FB8", "#FFB3CF", "#FFD6E7"],
};
const FONT = "'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);

async function fetchData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is missing");
  const query = `query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { contributionCount date weekday } }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
        totalCount
        nodes {
          stargazerCount
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name } }
          }
        }
      }
    }
  }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "mika-stats" },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.user) throw new Error(JSON.stringify(json.errors || json));
  return json.data.user;
}

function mockData() {
  const weeks = [];
  const start = new Date(Date.UTC(2025, 9, 26));
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 864e5);
      const r = Math.random();
      days.push({ date: date.toISOString().slice(0, 10), weekday: d, contributionCount: r < .55 ? 0 : Math.floor(r * 12) });
    }
    weeks.push({ contributionDays: days });
  }
  const lang = (name, size) => ({ size, node: { name } });
  return {
    followers: { totalCount: 7 },
    contributionsCollection: {
      totalCommitContributions: 81, totalPullRequestContributions: 6, totalIssueContributions: 2,
      contributionCalendar: { totalContributions: 93, weeks },
    },
    repositories: {
      totalCount: 9,
      nodes: [
        { stargazerCount: 2, languages: { edges: [lang("PHP", 52000), lang("CSS", 18000), lang("JavaScript", 9000)] } },
        { stargazerCount: 0, languages: { edges: [lang("TypeScript", 30000), lang("HTML", 4000)] } },
        { stargazerCount: 1, languages: { edges: [lang("Ruby", 12000), lang("Dockerfile", 800)] } },
      ],
    },
  };
}

function sparkle(x, y, s = 1, delay = 0) {
  return `<path class="tw" style="animation-delay:${delay}s" fill="${C.accent}" d="M${x} ${y - 7 * s} l${2 * s} ${5 * s} l${5 * s} ${2 * s} l${-5 * s} ${2 * s} l${-2 * s} ${5 * s} l${-2 * s} ${-5 * s} l${-5 * s} ${-2 * s} l${5 * s} ${-2 * s}z"/>`;
}
const STYLE = `<style>
  .t { font: 700 18px ${FONT}; fill: ${C.title}; }
  .l { font: 400 14px ${FONT}; fill: ${C.text}; }
  .v { font: 700 14px ${FONT}; fill: ${C.text}; }
  .s { font: 400 11px ${FONT}; fill: ${C.muted}; }
  .big { font: 700 34px ${FONT}; fill: ${C.title}; }
  .row { animation: in .6s ease-out both; }
  .tw { animation: tw 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
  @keyframes tw { 0%,100% { opacity: .3; transform: scale(.7); } 50% { opacity: 1; transform: scale(1.1); } }
</style>`;
const frame = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${STYLE}
<rect x=".5" y=".5" rx="12" width="${w - 1}" height="${h - 1}" fill="${C.bg}" stroke="${C.border}"/>${body}</svg>`;

function statsCard(u) {
  const cc = u.contributionsCollection;
  const stars = u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0);
  const rows = [
    ["💻", "Commits (last year)", cc.totalCommitContributions],
    ["🔀", "Pull requests", cc.totalPullRequestContributions],
    ["📌", "Issues", cc.totalIssueContributions],
    ["📁", "Public repos", u.repositories.totalCount],
    ["⭐", "Stars earned", stars],
  ];
  const body = rows.map(([icon, label, val], i) =>
    `<g class="row" style="animation-delay:${i * .12}s">
      <text class="l" x="25" y="${70 + i * 25}">${icon}  ${label}:</text><text class="v" x="240" y="${70 + i * 25}">${fmt(val)}</text></g>`).join("");
  const total = cc.contributionCalendar.totalContributions;
  return frame(495, 200, `
  <text class="t" x="25" y="36">🌸 Mika's GitHub Stats</text>${body}
  <circle cx="400" cy="112" r="52" fill="none" stroke="${C.border}" stroke-width="7"/>
  <circle cx="400" cy="112" r="52" fill="none" stroke="${C.accent}" stroke-width="7" stroke-linecap="round"
    stroke-dasharray="326.7" stroke-dashoffset="${(326.7 * (1 - Math.min(total, 1000) / 1000)).toFixed(1)}" transform="rotate(-90 400 112)"/>
  <text class="big" x="400" y="118" text-anchor="middle">${fmt(total)}</text>
  <text class="s" x="400" y="138" text-anchor="middle">contributions</text>
  ${sparkle(455, 50, 1, 0)}${sparkle(345, 175, .8, 1.2)}`);
}

function langsCard(u) {
  const totals = {};
  for (const r of u.repositories.nodes)
    for (const e of r.languages.edges) totals[e.node.name] = (totals[e.node.name] || 0) + e.size;
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  let x = 25; const W = 300;
  const bar = top.map(([, s], i) => {
    const w = (s / sum) * W; const seg = `<rect x="${x.toFixed(1)}" y="52" width="${w.toFixed(1)}" height="10" fill="${C.langs[i]}"/>`;
    x += w; return seg;
  }).join("");
  const legend = top.map(([name, s], i) => {
    const cx = 25 + (i % 2) * 150, cy = 92 + Math.floor(i / 2) * 26;
    return `<g class="row" style="animation-delay:${i * .1}s"><circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${C.langs[i]}"/>
      <text class="l" x="${cx + 16}" y="${cy}">${esc(name)} <tspan class="s">${((s / sum) * 100).toFixed(1)}%</tspan></text></g>`;
  }).join("");
  return frame(350, 200, `
  <text class="t" x="25" y="36">🎀 Most Used Languages</text>
  <clipPath id="r"><rect x="25" y="52" width="${W}" height="10" rx="5"/></clipPath>
  <g clip-path="url(#r)"><rect x="25" y="52" width="${W}" height="10" fill="${C.border}"/>${bar}</g>${legend}`);
}

function activityCard(u) {
  const weeks = u.contributionsCollection.contributionCalendar.weeks;
  const max = Math.max(1, ...weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
  const shade = (n) => n === 0 ? C.shades[0] : C.shades[Math.min(4, 1 + Math.floor((n / max) * 3.999))];
  const S = 15, G = 3, X0 = 45, Y0 = 62;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1, labels = "";
  const cells = weeks.map((w, wi) => {
    const first = w.contributionDays[0];
    const m = new Date(first.date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && wi < weeks.length - 1) {
      if (lastMonth !== -1 || new Date(first.date + "T00:00:00Z").getUTCDate() <= 7)
        labels += `<text class="s" x="${X0 + wi * (S + G)}" y="${Y0 - 8}">${months[m]}</text>`;
      lastMonth = m;
    }
    return w.contributionDays.map((d) =>
      `<rect x="${X0 + wi * (S + G)}" y="${Y0 + d.weekday * (S + G)}" width="${S}" height="${S}" rx="4" fill="${shade(d.contributionCount)}"><title>${d.date}: ${d.contributionCount}</title></rect>`).join("");
  }).join("");
  const W = X0 + weeks.length * (S + G) + 25, H = Y0 + 7 * (S + G) + 40;
  const days = [["Mon", 1], ["Wed", 3], ["Fri", 5]].map(([n, i]) =>
    `<text class="s" x="12" y="${Y0 + i * (S + G) + 11}">${n}</text>`).join("");
  const legend = C.shades.map((c, i) =>
    `<rect x="${W - 150 + i * 19}" y="${H - 28}" width="${S}" height="${S}" rx="4" fill="${c}"/>`).join("");
  const total = u.contributionsCollection.contributionCalendar.totalContributions;
  return frame(W, H, `
  <text class="t" x="25" y="32">💗 ${total} contributions in the last year</text>${labels}${days}${cells}
  <text class="s" x="${W - 185}" y="${H - 17}">Less</text>${legend}<text class="s" x="${W - 52}" y="${H - 17}">More</text>
  ${sparkle(W - 30, 28, 1, 0)}`);
}

const data = process.argv.includes("--mock") ? mockData() : await fetchData();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/stats.svg`, statsCard(data));
writeFileSync(`${OUT}/langs.svg`, langsCard(data));
writeFileSync(`${OUT}/activity.svg`, activityCard(data));
console.log("🌸 Stats cards updated");
