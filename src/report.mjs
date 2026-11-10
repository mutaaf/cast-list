// Build a drift report from fetched surface texts. Shared by the scheduled job and tests.
import { READERS, readLobby } from './surfaces.mjs';
import { drift, score } from './drift.mjs';

export function report(apps, texts, lobbyFiles = {}, at = new Date().toISOString()) {
  const surfaces = {};
  for (const [surface, text] of Object.entries(texts)) {
    if (text == null) continue;
    if (text instanceof Error) { surfaces[surface] = { error: String(text.message).slice(0, 200) }; continue; }
    try {
      const entries = READERS[surface](text);
      if (!entries.length) throw new Error('read no entries: the reader is out of date with the page');
      const findings = drift(apps, surface, entries);
      surfaces[surface] = { ...score(apps, surface, findings), findings };
    } catch (e) { surfaces[surface] = { error: String(e.message).slice(0, 200) }; }
  }
  if (Object.keys(lobbyFiles).length) {
    // A listing file that couldn't be read (a private repo) is reported as unread, not as missing.
    const unread = Object.entries(lobbyFiles).filter(([, t]) => t == null).map(([slug]) => slug);
    const entries = readLobby(lobbyFiles);
    const findings = drift(apps.filter((a) => !unread.includes(a.slug)), 'lobby', entries);
    for (const slug of unread) findings.push({ surface: 'lobby', app: slug, kind: 'unread', detail: 'its store/lobby.json is in a repo the audit can\'t read', severity: 'low' });
    for (const e of entries) {
      const a = apps.find((x) => x.slug === e.slug);
      if (a?.store?.appStoreId && !e.appStoreId) findings.push({ surface: 'lobby', app: a.slug, kind: 'app-store-id', detail: 'has no ios.ascAppId, so Lobby can\'t find the listing without a lookup', severity: 'low', want: a.store.appStoreId });
    }
    surfaces.lobby = { ...score(apps, 'lobby', findings), findings };
  }
  const list = Object.values(surfaces).flatMap((s) => s.findings ?? []);
  const sig = list.filter((f) => f.severity !== 'low').map((f) => `${f.surface}:${f.app}:${f.kind}`).sort().join('|');
  return {
    at, surfaces, sig,
    totals: { surfaces: Object.keys(surfaces).length, agree: Object.values(surfaces).filter((s) => !s.error && !(s.findings ?? []).some((f) => f.severity !== 'low')).length, high: list.filter((f) => f.severity === 'high').length, medium: list.filter((f) => f.severity === 'medium').length, low: list.filter((f) => f.severity === 'low').length },
  };
}
