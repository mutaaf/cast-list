// Store facts, live. The catalog says WHICH app is on the store; Stage Manager says what Apple says right now.
// These rules match mutaafaziz-site/scripts/stores-render.mjs (the manifest's download buttons).
export const LIVE = ['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'];
export const REVIEW = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_APPLE_RELEASE', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_DISTRIBUTION', 'ACCEPTED'];

/** What a person can do to get the app today, and what to call its state. Never a direct store link for a gated app. */
export function install(app, facts) {
  if (!app.store || !facts) return null;
  const live = Boolean(facts.liveVersion) || LIVE.includes(facts.state);
  const reviewing = REVIEW.includes(facts.state);
  const label = live ? 'On the App Store' : reviewing ? 'At App Review' : facts.testflight ? 'In beta' : 'In development';
  let href = null, kind = null;
  if (live) { href = app.store.gate ?? (app.store.appStoreId ? `https://apps.apple.com/app/id${app.store.appStoreId}` : null); kind = 'app-store'; }
  else if (facts.testflight && !app.store.gate) { href = facts.testflight; kind = 'testflight'; }
  return { live, label, href, kind, state: facts.state, version: facts.version, liveVersion: facts.liveVersion ?? null };
}

/** The public view of the catalog: private entries dropped, store facts merged. */
export function publicApps(catalog, snapshot = {}) {
  return catalog.apps.filter((a) => (a.visibility ?? 'public') === 'public').map((a) => {
    const out = { ...a };
    delete out.visibility;
    const store = install(a, a.store && snapshot[a.store.bundle]);
    if (store) out.install = store;
    return out;
  });
}
