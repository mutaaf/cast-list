import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check } from '../src/schema.mjs';
import { install, publicApps } from '../src/store.mjs';
import { READERS } from '../src/surfaces.mjs';
import { drift, normUrl } from '../src/drift.mjs';
import { report } from '../src/report.mjs';
import { launcher, jsonld } from '../src/feeds.mjs';
import { page } from '../src/page.mjs';

const catalog = JSON.parse(readFileSync(new URL('../catalog/apps.json', import.meta.url), 'utf8'));
const apps = publicApps(catalog);
const moon = catalog.apps.find((a) => a.slug === 'moon-club');

test('the catalog passes its own rules', () => assert.deepEqual(check(catalog), []));

test('the rules catch the mistakes that already happened once', () => {
  const bad = (patch) => check({ apps: [{ ...moon, ...patch }] }).join('\n');
  assert.match(bad({ store: { ...moon.store, gate: undefined } }), /grown-up gate/);
  assert.match(bad({ surfaces: [...moon.surfaces, 'marquee'], ids: { ...moon.ids, marquee: 'mpk' } }), /never be on Marquee/);
  assert.match(bad({ audience: 'children' }), /audience/);
  assert.match(bad({ ids: { ...moon.ids, playbill: 'x' } }), /isn't listed on it/);
  // Nov 10: three live apps sat off Playbill for weeks because nothing said they had to be on it.
  const hp = catalog.apps.find((a) => a.slug === 'hinge-pop');
  const off = { ...hp, surfaces: hp.surfaces.filter((s) => s !== 'playbill'), ids: { ...hp.ids, playbill: undefined } };
  delete off.ids.playbill;
  assert.match(check({ apps: [off] }).join(), /not on Playbill/);
  assert.deepEqual(check({ apps: [{ ...off, notOn: { playbill: 'A page that should not be ranked, for a stated reason.' } }] }), []);
  assert.match(check({ apps: [{ ...off, notOn: { playbill: 'no' } }] }).join(), /needs a reason/);
  assert.match(check({ apps: [{ ...hp, worker: undefined }] }).join(), /needs worker/);
  assert.match(check({ apps: [catalog.apps[0], { ...catalog.apps[1], ids: { launcher: catalog.apps[0].ids.launcher } }] }).join(), /used twice/);
});

test('install: a live gated app links its gate, never the store; a beta links TestFlight; review says so', () => {
  assert.deepEqual(install(moon, { state: 'READY_FOR_DISTRIBUTION', liveVersion: '0.15.0', testflight: 'https://testflight.apple.com/join/x' }).href, moon.store.gate);
  const gas = catalog.apps.find((a) => a.slug === 'cold-gas');
  assert.deepEqual(install(gas, { state: 'WAITING_FOR_REVIEW', testflight: 'https://testflight.apple.com/join/y' }), { live: false, label: 'At App Review', href: 'https://testflight.apple.com/join/y', kind: 'testflight', state: 'WAITING_FOR_REVIEW', version: undefined, liveVersion: null });
  assert.equal(install(gas, { state: 'READY_FOR_SALE', liveVersion: '1.0.0' }).href, 'https://apps.apple.com/app/id6830960344');
  assert.equal(install(moon, { state: 'PREPARE_FOR_SUBMISSION', testflight: 'https://testflight.apple.com/join/x' }).href, null); // gated: no TestFlight link
});

test('private entries never leave the building', () => {
  const out = publicApps({ apps: [...catalog.apps, { ...catalog.apps[0], slug: 'secret', visibility: 'private' }] });
  assert.ok(!out.some((a) => a.slug === 'secret' || 'visibility' in a));
});

test('Marquee\'s own demo page is not read as an app', () => {
  const js = "const SEED_APPS = [\n  ['coldgas', 'COLD GAS', 'https://mutaafaziz.com/coldgas/', 'general', 1],\n  ['demo', 'Demo page', 'https://mutaafaziz.com/ads/demo/', 'general', 0],\n];";
  assert.deepEqual(READERS.marquee(js).map((e) => e.id), ['coldgas']);
});

test('the launcher feed has exactly the launcher\'s shape and every launcher app', () => {
  const l = launcher(apps);
  assert.deepEqual(Object.keys(l[0]), ['id', 'name', 'tip', 'href', 'color', 'kind', 'kw']);
  assert.ok(l.some((x) => x.id === 'ct'));
  assert.match(l.find((x) => x.id === '180').kw, /18-0/, 'a renamed app is still found by its old name');
  assert.equal(new Set(l.map((x) => x.id)).size, l.length);
});

test('JSON-LD marks kids apps and never exposes a direct store link for a gated app', () => {
  const live = apps.map((a) => (a.slug === 'moon-club' ? { ...a, install: install(moon, { state: 'READY_FOR_SALE', liveVersion: '1' }) } : a));
  const item = jsonld(live).itemListElement.find((x) => x.item.name === 'Moon Club').item;
  assert.equal(item.installUrl, moon.store.gate);
  assert.ok(item.audience);
  assert.ok(!JSON.stringify(jsonld(live)).includes('apps.apple.com/app/id6829860949'));
});

const LAUNCHER = `var APPS = [
    { id: 'cg', name: 'COLD GAS', tip: 'Jump.', href: 'https://mutaafaziz.com/coldgas/', color: '#0B0B0C', kind: 'Game', kw: 'x' },
    { id: 'oa', name: 'OpenAero DFW', tip: "Fly a 737 over DFW, in today's weather.", href: 'https://mutaafaziz.com/openaero/', color: '#1E6FD9', kind: 'Game', kw: 'x' },
    { id: 'zz', name: 'Mystery', tip: 'Who?', href: 'https://example.com/', color: '#000000', kind: 'App', kw: 'x' }
  ];`;

test('readers handle quoting, and drift finds missing, unknown and wrong entries', () => {
  const e = READERS.launcher(LAUNCHER);
  assert.equal(e[1].text, "Fly a 737 over DFW, in today's weather.");
  const f = drift(apps, 'launcher', e);
  assert.ok(f.some((x) => x.kind === 'missing' && x.app === 'chalk-talk'));
  assert.ok(f.some((x) => x.kind === 'unknown' && x.severity === 'low'));
  const wrong = drift(apps, 'launcher', READERS.launcher(LAUNCHER.replace('COLD GAS', 'Cold Gases').replace('/coldgas/', '/coldgass/')));
  assert.ok(wrong.some((x) => x.app === 'cold-gas' && x.kind === 'name'));
  assert.ok(wrong.some((x) => x.app === 'cold-gas' && x.kind === 'url' && x.severity === 'high'));
});

test('a live app described as beta is stale; an unreleased one described as on the App Store is an overclaim', () => {
  const live = apps.map((a) => (a.slug === 'moon-club' ? { ...a, install: { live: true, label: 'On the App Store' } } : a.slug === 'hinge-pop' ? { ...a, install: { live: false, label: 'At App Review' } } : a));
  const labs = `export const LABS_GAMES = [
  {
    id: 'metaphases-kids',
    name: 'Moon Club',
    tagline: 'Money for kids',
    description: 'Learn money with Luna. Moon Club, now in public beta.',
    playUrl: 'https://mutaafaziz.com/metaphases/kids/',
    tags: ['iPhone + iPad beta'],
  },
  {
    id: 'hinge-pop',
    name: 'Hinge Pop',
    description: 'Now on the App Store.',
    playUrl: 'https://mutaafaziz.com/hingepop/',
  },
];
export const ROLES = [
  {
    id: 'scout',
    name: 'Scout',
  },
];`;
  const f = drift(live, 'labs', READERS.labs(labs));
  assert.ok(!f.some((x) => x.app === 'scout'), 'only the LABS_GAMES array is read');
  assert.ok(f.some((x) => x.app === 'moon-club' && x.kind === 'stale-status'));
  assert.ok(f.some((x) => x.app === 'hinge-pop' && x.kind === 'overclaim'));
});

test('a grouped line names both apps, prose counts mentions, and a repo link is a fair link', () => {
  const r = drift(apps, 'resume', READERS.resume(JSON.stringify({ projects: [{ name: 'OpenAero DFW · OUTATIME 88', url: 'https://mutaafaziz.com/openaero/' }, { name: 'aurora-field', url: 'https://github.com/mutaaf/aurora-field' }] })));
  assert.ok(!r.some((x) => ['openaero', 'outatime', 'aurora-field'].includes(x.app) && x.kind !== 'missing' && x.severity !== 'low'));
  assert.ok(!r.some((x) => x.app === 'outatime' && x.kind === 'missing'));
  const prose = READERS.llms('Founder of Digital Craft AI (https://digitalcraftai.com).\n- KIN: a creature. https://mutaafaziz.com/kin/\n');
  const l = drift(apps, 'llms', prose);
  assert.ok(!l.some((x) => x.app === 'digital-craft' || x.app === 'kin'));
  assert.equal(normUrl('/kin/'), 'https://mutaafaziz.com/kin');
});

test('a reader that finds nothing is an error, not a clean bill of health', () => {
  const r = report(apps, { launcher: 'nothing here', dock: new Error('503 from mutaafaziz.com') });
  assert.match(r.surfaces.launcher.error, /read no entries/);
  assert.match(r.surfaces.dock.error, /503/);
  assert.equal(r.totals.agree, 0);
});

test('the page renders the house report and every public app, escaped', () => {
  const html = page({ version: 'v1', storeAt: null, apps: [...apps, { ...apps[0], slug: 'x', name: '<script>' }] }, report(apps, { launcher: LAUNCHER }));
  assert.ok(html.includes('Chalk Talk') && html.includes('of <b>1</b> places'));
  assert.ok(!html.includes('<script>'));
});

test('a sentence that says an app is not on the App Store is not an overclaim', async () => {
  const { claimsStore } = await import('../src/drift.mjs');
  assert.equal(claimsStore('Builds exist for TestFlight testing; KIN is not on the App Store. It is made by me.'), false);
  assert.equal(claimsStore('It isn’t on the App Store yet.'), false);
  assert.equal(claimsStore('Now on the App Store.'), true);
  assert.equal(claimsStore('Not a toy. Now on the App Store.'), true);
  assert.equal(claimsStore('KIN is not on the App Store, but Hinge Pop is on the App Store.'), true);
});

