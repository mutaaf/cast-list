// Cast List: the portfolio's one app catalog. The catalog is code (catalog/apps.json, checked in CI);
// store facts are live from Stage Manager; the audit runs here, woken by Cue (a push to a surface's repo, and daily).
import { WorkerEntrypoint } from 'cloudflare:workers';
import catalog from '../catalog/apps.json';
import { publicApps } from './store.mjs';
import { launcher, jsonld } from './feeds.mjs';
import { page } from './page.mjs';
import { audit } from './audit.mjs';

const VERSION = (() => { let h = 2166136261; for (const c of JSON.stringify(catalog)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); })();
// No ETag: a feed can change with the code while the catalog doesn't, and five minutes of cache is enough.
const headers = (type, extra = {}) => ({ 'content-type': type, 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*', ...extra });
const json = (b, s = 200, h = {}) => new Response(JSON.stringify(b, null, 1), { status: s, headers: headers('application/json; charset=utf-8', h) });
const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

export default class CastList extends WorkerEntrypoint {
  async snapshot() { try { return (await this.env.STAGE?.snapshot()) ?? { apps: {} }; } catch { return { apps: {} }; } }
  async apps() { const s = await this.snapshot(); return { version: VERSION, storeAt: s.at ?? null, apps: publicApps(catalog, s.apps) }; }
  async app(slug) { return (await this.apps()).apps.find((a) => a.slug === slug) ?? null; }

  async fetch(req) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/cast/api/apps') return json(await this.apps());
    if (path.startsWith('/cast/api/apps/')) { const a = await this.app(path.slice(15)); return a ? json(a) : json({ error: 'no such app' }, 404); }
    if (path === '/cast/api/launcher') return json({ version: VERSION, apps: launcher(publicApps(catalog)) });
    if (path === '/cast/apps.jsonld') return new Response(JSON.stringify(jsonld((await this.apps()).apps), null, 1), { headers: headers('application/ld+json; charset=utf-8') });
    if (path === '/cast/api/drift' && req.method === 'GET') return json((await this.env.KV.get('drift', 'json')) ?? { at: null, surfaces: {} }, 200, { 'cache-control': 'no-store' });
    if (path === '/cast/api/drift' && req.method === 'POST') return this.takeDrift(req);
    if (path === '/cast/api/health') return json({ ok: true, service: 'cast-list', version: VERSION, apps: catalog.apps.length }, 200, { 'cache-control': 'no-store' });
    if (path === '/cast') {
      const [list, drift] = await Promise.all([this.apps(), this.env.KV.get('drift', 'json')]);
      return new Response(page(list, drift), { headers: headers('text/html; charset=utf-8', { 'cache-control': 'public, max-age=120', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" }) });
    }
    return json({ error: 'not found' }, 404);
  }

  // The audit job posts its report here. A change in what's wrong is an event, so agents and the owner hear about it.
  async takeDrift(req) {
    const auth = req.headers.get('authorization') ?? '';
    if (!this.env.DRIFT_TOKEN_HASH || (await sha256(auth.replace(/^Bearer /, ''))) !== this.env.DRIFT_TOKEN_HASH) return json({ error: 'a valid token is required' }, 401, { 'cache-control': 'no-store' });
    let r; try { r = await req.json(); } catch { return json({ error: 'the body must be JSON' }, 400); }
    if (!r?.surfaces || typeof r.sig !== 'string' || JSON.stringify(r).length > 200_000) return json({ error: 'not a drift report' }, 400);
    return json(await this.keep(r), 200, { 'cache-control': 'no-store' });
  }

  // Cue calls this when a listing surface's repo is pushed (after its deploy is live) and once a day.
  // Store facts come straight from Stage Manager, so the Worker never fetches itself.
  async audit() {
    const s = await this.snapshot();
    const r = await audit(publicApps(catalog, s.apps), { labs: this.env.LABS_SOURCE || null });
    // A network blip that blanks most surfaces mustn't overwrite a good report: throw, and Cue retries.
    if (Object.values(r.surfaces).filter((v) => v.error).length > Object.keys(r.surfaces).length / 2) throw new Error('most surfaces could not be read; not trusting this audit');
    const kept = await this.keep(r);
    return { ...kept, totals: r.totals };
  }

  async keep(r) {
    const before = await this.env.KV.get('drift', 'json');
    await this.env.KV.put('drift', JSON.stringify(r));
    let published = false;
    if (before?.sig !== r.sig && this.env.CUE) {
      const t = r.totals ?? {};
      const out = await this.env.CUE.publish({ type: 'cast.drift.changed', id: `drift:${r.at.slice(0, 13)}:${(await sha256(r.sig)).slice(0, 12)}`.replace(/[^\w.:-]/g, '_'), data: { surfaces: t.surfaces ?? 0, agree: t.agree ?? 0, high: t.high ?? 0, medium: t.medium ?? 0 } }).catch(() => null);
      published = Boolean(out?.ok);
    }
    return { ok: true, changed: before?.sig !== r.sig, published };
  }
}
