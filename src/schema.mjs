// What a catalog entry may say. The catalog is code: CI refuses an entry that breaks these rules.
export const KINDS = ['company', 'site', 'app', 'game', 'library'];
export const STATUS = ['live', 'beta', 'prototype', 'paused', 'retired'];
export const AUDIENCE = ['general', 'kids'];
export const PLATFORMS = ['web', 'ios', 'ipad', 'android', 'tv', 'visionos'];
// Every place that lists apps. Each one is audited against the catalog (src/surfaces.mjs).
export const SURFACES = ['launcher', 'dock', 'llms', 'resume', 'manifest', 'apps-page', 'playbill', 'marquee', 'labs', 'lobby'];
export const ID_SURFACES = ['launcher', 'dock', 'playbill', 'marquee', 'labs'];

const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/, DATE = /^\d{4}-\d{2}-\d{2}$/, COLOR = /^#[0-9A-Fa-f]{6}$/;

export function check(catalog) {
  const errors = [], seen = new Set(), ids = Object.fromEntries(ID_SURFACES.map((s) => [s, new Set()])), bundles = new Set();
  const bad = (a, why) => errors.push(`${a?.slug ?? '?'}: ${why}`);
  for (const a of catalog.apps ?? []) {
    if (!SLUG.test(a.slug ?? '')) bad(a, 'slug must be lowercase letters, digits and dashes');
    if (seen.has(a.slug)) bad(a, 'duplicate slug'); seen.add(a.slug);
    if (!a.name || a.name.length > 40) bad(a, 'name is required, at most 40 characters');
    if (!KINDS.includes(a.kind)) bad(a, `kind must be one of ${KINDS.join(', ')}`);
    if (!STATUS.includes(a.status)) bad(a, `status must be one of ${STATUS.join(', ')}`);
    if (!AUDIENCE.includes(a.audience)) bad(a, 'audience must be general or kids (it decides ads, analytics and links)');
    try { if (new URL(a.url).protocol !== 'https:') bad(a, 'url must be https'); } catch { bad(a, 'url must be a full URL'); }
    if (!a.tagline || a.tagline.length > 100) bad(a, 'tagline is required, at most 100 characters');
    if (!COLOR.test(a.color ?? '')) bad(a, 'color must be #RRGGBB');
    if (!DATE.test(a.added ?? '')) bad(a, 'added must be YYYY-MM-DD');
    for (const p of a.platforms ?? []) if (!PLATFORMS.includes(p)) bad(a, `unknown platform ${p}`);
    for (const s of a.surfaces ?? []) if (!SURFACES.includes(s)) bad(a, `unknown surface ${s}`);
    for (const [s, id] of Object.entries(a.ids ?? {})) {
      if (!ID_SURFACES.includes(s)) bad(a, `ids.${s} is not a surface with its own ids`);
      else if (ids[s].has(id)) bad(a, `ids.${s} "${id}" is used twice`); else ids[s].add(id);
      if (!(a.surfaces ?? []).includes(s)) bad(a, `has an id for ${s} but isn't listed on it`);
    }
    if (a.store) {
      if (!/^[a-z][\w.-]+$/i.test(a.store.bundle ?? '')) bad(a, 'store.bundle is required');
      if (bundles.has(a.store.bundle)) bad(a, 'store.bundle is used twice'); bundles.add(a.store.bundle);
      if (a.store.appStoreId && !/^\d{6,12}$/.test(a.store.appStoreId)) bad(a, 'store.appStoreId must be digits');
    }
    // The kids rule: a kids app with a store listing must route its download through a grown-up gate,
    // unless it's a web-first game whose native build isn't on the store.
    if (a.audience === 'kids' && a.store?.appStoreId && !a.store.gate) bad(a, 'a kids app on the App Store needs store.gate (a grown-up gate URL)');
    if (a.ads === false && (a.surfaces ?? []).includes('marquee')) bad(a, 'ads: false, so it can never be on Marquee');
  }
  return errors;
}
