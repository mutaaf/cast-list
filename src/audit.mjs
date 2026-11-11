// The audit, shared by the Worker (woken by Cue when a surface's repo is pushed, and daily) and the CLI script.
// It reads every place that lists the apps and compares each with the catalog. It reports; it never edits.
import { SOURCES, lobbySource } from './sources.mjs';
import { report } from './report.mjs';

const UA = { 'user-agent': 'cast-list-audit (+https://mutaafaziz.com/cast/)' };
export async function getText(u, f = fetch) {
  const r = await f(u, { headers: UA, cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} from ${u.replace(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/([^/]+)\/.*/, 'GitHub $1')}`);
  return r.text();
}

export async function audit(apps, { labs = null, get = getText } = {}) {
  const sources = { ...SOURCES, labs };
  const texts = Object.fromEntries(await Promise.all(Object.entries(sources).filter(([, u]) => u).map(async ([s, u]) => [s, await get(u).catch((e) => e)])));
  const lobby = Object.fromEntries(await Promise.all(apps.filter((a) => a.surfaces.includes('lobby')).map(async (a) => [a.slug, await get(lobbySource(a.store?.lobbyRepo ?? a.repo)).catch(() => null)])));
  return report(apps, texts, lobby);
}
