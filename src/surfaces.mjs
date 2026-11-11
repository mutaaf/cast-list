// Every place that lists the apps, and how to read it. Each reader turns a surface's raw text into
// entries: { id?, name?, url?, text?, status? }. Pure functions, so they're tested on fixtures.
// Where a surface lives (src/sources.mjs) is kept apart from how it's read.
const all = (re, s) => [...String(s).matchAll(re)];
const unq = (s) => String(s).replace(/\\'/g, "'").replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, "'").trim();

export const READERS = {
  // github.com/mutaaf/launcher src/launcher.js: var APPS = [{ id, name, tip, href, ... }]
  launcher: (js) => all(/\{\s*id:\s*'([^']+)',\s*name:\s*(['"])((?:\\.|(?!\2).)*)\2,\s*tip:\s*(['"])((?:\\.|(?!\4).)*)\4,\s*href:\s*'([^']+)'/g, js)
    .map((m) => ({ id: m[1], name: unq(m[3]), text: unq(m[5]), url: m[6] })),
  // mutaafaziz.com: the launcher dock, <a class="ld-app" href data-app>...<b class="ld-name">
  dock: (html) => all(/<a class="ld-app" href="([^"]+)" data-app="([^"]+)"[^>]*>[\s\S]*?<b class="ld-name">([^<]+)<\/b>(?:\s*<span class="ld-tip">([^<]*)<\/span>)?/g, html)
    .map((m) => ({ id: m[2], url: m[1], name: unq(m[3]), text: unq(m[4] ?? '') })),
  // mutaafaziz.com/apps/: <h3><a href>Name</a></h3><p>blurb
  'apps-page': (html) => all(/<h3><a href="([^"]+)">([^<]+)<\/a><\/h3><p>([^<]*)/g, html).map((m) => ({ url: m[1], name: unq(m[2]), text: unq(m[3]) })),
  // mutaafaziz.com/manifest/: web tiles and native tiles (status label from App Store Connect)
  manifest: (html) => [
    ...all(/<a class="tile wb" href="([^"]+)">[\s\S]*?<b>([^<]+)<\/b><span>([^<]*)<\/span>/g, html).map((m) => ({ url: m[1], name: unq(m[2]), text: unq(m[3]) })),
    ...all(/<div class="tile ph" data-app="([^"]+)"><a class="tl" href="([^"]+)" aria-label="([^"]+)"[\s\S]*?<!--store:[^>]*--><i class="[^"]*">([^<]+)<\/i>/g, html).map((m) => ({ bundle: m[1], url: m[2], name: unq(m[3]), status: m[4] })),
  ],
  // mutaafaziz.com/llms.txt: bullet lines "- Name (when): what it is. https://url"
  llms: (md) => Object.assign(all(/^- ([^:(\n]+?)(?: \([^)\n]*\))?: (.+)$/gm, md).map((m) => ({ name: unq(m[1]), text: m[2], url: [...m[2].matchAll(/https:\/\/[^\s)]+[^\s).,;]/g)].pop()?.[0] })), { raw: String(md) }),
  // mutaafaziz.com/resume.json: projects[]
  resume: (json) => (JSON.parse(json).projects ?? []).map((p) => ({ name: p.name, url: p.url, text: p.description ?? '' })),
  // github.com/mutaaf/playbill catalog.json (the seed D1 starts from)
  playbill: (json) => JSON.parse(json).map((p) => ({ id: p.id, name: p.name, url: p.url, text: `${p.description ?? ''} ${p.summary ?? ''}`, audience: p.audience })),
  // github.com/mutaaf/marquee src/db.js SEED_APPS: [id, name, url, audience, is_game]
  // Marquee also seeds its own demo page (under /ads/); that's Marquee, not an app.
  marquee: (js) => all(/\[\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'(general|kids)'/g, js)
    .filter((m) => !/^https:\/\/mutaafaziz\.com\/ads\//.test(m[3])).map((m) => ({ id: m[1], name: m[2], url: m[3], audience: m[4] })),
  // the Labs page's data file: { id, name, tagline, description, playUrl, tags }
  labs: (ts) => String(ts).slice(Math.max(0, String(ts).indexOf('LABS_GAMES')), String(ts).indexOf('];', String(ts).indexOf('LABS_GAMES')) + 1 || undefined).split(/\n\s*\{\s*\n\s*id:\s*'/).slice(1).map((b) => ({
    id: b.match(/^([^']+)'/)?.[1], name: unq(b.match(/name:\s*'((?:\\.|[^'])*)'/)?.[1] ?? ''), url: b.match(/playUrl:\s*'([^']+)'/)?.[1],
    text: unq([...b.slice(b.indexOf("'") + 1).matchAll(/'((?:\\.|[^'])*)'/g)].map((x) => x[1]).join(' ')),
  })),
};

/** Lobby is per app: each native app's store/lobby.json. The reader takes { slug: jsonText }. */
export function readLobby(files) {
  return Object.entries(files).filter(([, t]) => t).map(([slug, t]) => { const j = JSON.parse(t); return { slug, name: j.name, bundle: j.ios?.bundleId, appStoreId: j.ios?.ascAppId, audience: j.audience }; });
}
