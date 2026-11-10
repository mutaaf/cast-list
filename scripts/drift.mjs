#!/usr/bin/env node
// The audit: read every surface that lists apps, compare it with the catalog, post the report to Cast List.
//   node scripts/drift.mjs            print the report
//   node scripts/drift.mjs --post     also post it (needs DRIFT_TOKEN)
// LABS_SOURCE (optional) is where the Labs page's list lives. CAST_URL defaults to the live service.
import { readFileSync } from 'node:fs';
import { SOURCES, lobbySource } from '../src/sources.mjs';
import { publicApps } from '../src/store.mjs';
import { report } from '../src/report.mjs';

const CAST = process.env.CAST_URL ?? 'https://mutaafaziz.com/cast';
const catalog = JSON.parse(readFileSync(new URL('../catalog/apps.json', import.meta.url), 'utf8'));
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'cast-list-audit (+https://mutaafaziz.com/cast/)' } }); if (!r.ok) throw new Error(`${r.status} from ${u.replace(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/([^/]+)\/.*/, 'GitHub $1')}`); return r.text(); };

// Store facts come from the live service (Stage Manager behind it); the catalog itself is this checkout's.
let apps = publicApps(catalog);
try {
  const live = await (await fetch(`${CAST}/api/apps`)).json();
  const facts = Object.fromEntries(live.apps.filter((a) => a.install).map((a) => [a.slug, a.install]));
  apps = apps.map((a) => (facts[a.slug] ? { ...a, install: facts[a.slug] } : a));
} catch (e) { console.error(`no live store facts (${e.message}); status checks skipped`); }

const sources = { ...SOURCES, labs: process.env.LABS_SOURCE || null };
const texts = Object.fromEntries(await Promise.all(Object.entries(sources).filter(([, u]) => u).map(async ([s, u]) => [s, await get(u).catch((e) => e)])));
const lobby = Object.fromEntries(await Promise.all(apps.filter((a) => a.surfaces.includes('lobby')).map(async (a) => [a.slug, await get(lobbySource(a.store?.lobbyRepo ?? a.repo)).catch(() => null)])));
const r = report(apps, texts, lobby);

for (const [s, v] of Object.entries(r.surfaces)) {
  console.log(v.error ? `✗ ${s}: ${v.error}` : `${v.findings.some((f) => f.severity !== 'low') ? '•' : '✓'} ${s}: ${v.right}/${v.expected} right`);
  for (const f of v.findings ?? []) console.log(`    [${f.severity}] ${f.app}: ${f.kind} — ${f.detail}${f.want ? ` (catalog: ${f.want})` : ''}`);
}
console.log(`${r.totals.agree}/${r.totals.surfaces} surfaces agree; ${r.totals.high} high, ${r.totals.medium} medium, ${r.totals.low} low`);

if (process.argv.includes('--post')) {
  const res = await fetch(`${CAST}/api/drift`, { method: 'POST', headers: { authorization: `Bearer ${process.env.DRIFT_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(r) });
  console.log(`posted: ${res.status} ${await res.text()}`);
  if (!res.ok) process.exit(1);
}
