// Drift: where a surface disagrees with the catalog. Each finding names the surface, the app, what's
// wrong, what the catalog says, and how bad it is. "Expected absences" are honoured: an app is only
// missing from a surface the catalog puts it on.
const norm = (s) => String(s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '');
export const normUrl = (u) => { if (!u) return ''; const x = u.startsWith('/') ? `https://mutaafaziz.com${u}` : u; return x.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, ''); };
const names = (a) => [a.name, ...(a.aka ?? [])].map(norm);
// An app's own GitHub repo is always a fair link for it.
const urls = (a) => [a.url, ...(a.urls ?? []), ...(a.repo ? [`https://github.com/mutaaf/${a.repo}`] : [])].map(normUrl);
const ID_SURFACES = new Set(['launcher', 'dock', 'playbill', 'marquee', 'labs']);

// Prose surfaces (llms.txt) name things first and link whatever the sentence is about, so match by name first
// and judge presence anywhere in the text, not only in bullets.
const PROSE = new Set(['llms']);

function match(apps, surface, e) {
  if (PROSE.has(surface) && e.name) { const n = norm(e.name); const a = apps.find((x) => names(x).includes(n)); if (a) return a; }
  if (ID_SURFACES.has(surface) && e.id) { const a = apps.find((x) => x.ids?.[surface] === e.id); if (a) return a; }
  if (e.bundle) { const a = apps.find((x) => x.store?.bundle === e.bundle); if (a) return a; }
  if (e.url) { const u = normUrl(e.url); const a = apps.find((x) => urls(x).includes(u)); if (a) return a; }
  if (e.name) { const n = norm(e.name); return apps.find((x) => names(x).includes(n)) ?? null; }
  return null;
}

/** apps: the public catalog with install facts merged (store.mjs publicApps). entries: READERS output. */
export function drift(apps, surface, entries) {
  const out = [], seen = new Set();
  const raw = entries.raw?.toLowerCase();
  // "OpenAero DFW · OUTATIME 88" is one line naming two apps: judge each by name.
  entries = entries.flatMap((e) => (e.name && e.name.includes(' · ') ? e.name.split(' · ').map((n) => ({ ...e, name: n, url: undefined })) : [e]));
  const f = (app, kind, detail, severity, want) => out.push({ surface, app, kind, detail, severity, ...(want ? { want } : {}) });
  for (const e of entries) {
    const a = match(apps, surface, e);
    if (!a) { if (surface !== 'llms') f(e.id ?? e.name ?? e.url, 'unknown', `lists "${e.name ?? e.id}" (${e.url ?? 'no url'}), which isn't in the catalog`, 'low'); continue; }
    if (seen.has(a.slug) && surface !== 'manifest') continue;
    seen.add(a.slug);
    if (!(a.surfaces ?? []).includes(surface)) { if (surface !== 'llms') f(a.slug, 'unexpected', `lists ${a.name}, but the catalog doesn't put it here`, 'low'); continue; }
    if (PROSE.has(surface)) { /* prose: presence and status claims only */ }
    else if (e.name && !names(a).includes(norm(e.name))) f(a.slug, 'name', `calls it "${e.name}"`, 'medium', a.name);
    if (!PROSE.has(surface) && e.url && !urls(a).includes(normUrl(e.url)) && !(a.store?.gate && normUrl(e.url) === normUrl(a.store.gate))) f(a.slug, 'url', `links ${e.url}`, 'high', a.url);
    if (e.audience && e.audience !== a.audience) f(a.slug, 'audience', `marks it ${e.audience}`, 'high', a.audience);
    if (e.bundle && a.store && e.bundle !== a.store.bundle) f(a.slug, 'bundle', `uses ${e.bundle}`, 'high', a.store.bundle);
    if (e.appStoreId && a.store?.appStoreId && String(e.appStoreId) !== a.store.appStoreId) f(a.slug, 'app-store-id', `uses ${e.appStoreId}`, 'high', a.store.appStoreId);
    if (a.install) {
      const t = `${e.text ?? ''} ${e.status ?? ''}`;
      if (a.install.live && /\b(public beta|in beta|beta)\b/i.test(t) && !/beta[^.]*\b(also|too)\b/i.test(t)) f(a.slug, 'stale-status', `still says beta: "${clip(t, /beta/i)}"`, 'high', a.install.label);
      if (!a.install.live && /on the app store/i.test(t)) f(a.slug, 'overclaim', `says it's on the App Store: "${clip(t, /on the app store/i)}"`, 'high', a.install.label);
      if (e.status && e.status !== a.install.label) f(a.slug, 'status-label', `labels it "${e.status}"`, 'medium', a.install.label);
    }
    if (a.store?.gate && e.text && /apps\.apple\.com|testflight\.apple\.com/i.test(e.text)) f(a.slug, 'gate', 'links a store directly instead of through the grown-up gate', 'high', a.store.gate);
  }
  const inProse = (a) => raw && ([a.name, ...(a.aka ?? [])].some((n) => raw.includes(n.toLowerCase())) || raw.includes(a.url.replace(/\/$/, '').toLowerCase()));
  for (const a of apps) if ((a.surfaces ?? []).includes(surface) && !seen.has(a.slug) && !inProse(a) && a.status !== 'retired') f(a.slug, 'missing', `doesn't list ${a.name}`, a.status === 'paused' ? 'low' : 'high');
  return out;
}

function clip(t, re) { const i = t.search(re); return t.slice(Math.max(0, i - 40), i + 40).trim(); }

/** One number for a surface: the share of expected apps it gets exactly right. */
export function score(apps, surface, findings) {
  const expected = apps.filter((a) => (a.surfaces ?? []).includes(surface)).length;
  const wrong = new Set(findings.filter((x) => x.severity !== 'low').map((x) => x.app)).size;
  return { expected, right: Math.max(0, expected - wrong) };
}
