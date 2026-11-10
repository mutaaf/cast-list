// /cast: the catalog as a theatre programme, with the house report (which surfaces agree) on top.
import { LABEL } from './sources.mjs';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ACTS = [['game', 'Games'], ['app', 'Apps'], ['library', 'Libraries'], ['company', 'Companies'], ['site', 'The house']];
const PLAT = { web: 'Web', ios: 'iPhone', ipad: 'iPad', android: 'Android', tv: 'TV', visionos: 'Vision Pro' };
const when = (iso) => (iso ? new Date(iso).toUTCString().replace(/:\d\d GMT$/, ' UTC').replace(/^\w+, /, '') : 'not yet');

function row(a) {
  const bill = a.install ? `<a class="badge ${a.install.live ? 'live' : ''}" ${a.install.href ? `href="${esc(a.install.href)}"` : ''}>${esc(a.install.label)}</a>` : a.status === 'paused' ? '<span class="badge dim">Resting</span>' : '';
  return `<li style="--c:${esc(a.color)}"><span class="dot" aria-hidden="true"></span><a class="who" href="${esc(a.url)}">${esc(a.name)}</a><span class="lead" aria-hidden="true"></span><span class="as">${esc(a.tagline)}</span>
<span class="meta">${(a.platforms ?? ['web']).map((p) => PLAT[p]).join(' · ')}${a.audience === 'kids' ? ' · <b>for kids</b>' : ''} · since ${esc(a.added)}</span>${bill}</li>`;
}

function house(drift) {
  if (!drift?.surfaces || !Object.keys(drift.surfaces).length) return '<p class="note">The first audit hasn\'t reported yet.</p>';
  const rows = Object.entries(drift.surfaces).map(([s, v]) => {
    const real = (v.findings ?? []).filter((f) => f.severity !== 'low');
    const ok = !v.error && !real.length;
    const detail = (v.findings ?? []).map((f) => `<li class="${f.severity}"><b>${esc(f.app)}</b> ${esc(f.detail)}${f.want ? ` <span class="want">should be ${esc(f.want)}</span>` : ''}</li>`).join('');
    return `<details${ok ? '' : ' open'}><summary><span class="mark ${v.error ? 'err' : ok ? 'ok' : 'off'}">${v.error ? '?' : ok ? '✓' : real.length}</span><span class="sn">${esc(LABEL[s] ?? s)}</span><span class="sc">${v.error ? esc(v.error) : `${v.right} of ${v.expected} right`}</span></summary>${detail ? `<ul>${detail}</ul>` : ''}</details>`;
  }).join('');
  const t = drift.totals ?? {};
  return `<p class="tally"><b>${t.agree ?? 0}</b> of <b>${t.surfaces ?? 0}</b> places that list the apps agree with this one${t.high ? `; <b>${t.high}</b> serious mismatch${t.high === 1 ? '' : 'es'} left` : ''}. Audited ${esc(when(drift.at))}.</p>${rows}`;
}

export function page(list, drift) {
  const apps = list.apps;
  const acts = ACTS.map(([k, title], i) => {
    const xs = apps.filter((a) => a.kind === k);
    return xs.length ? `<section class="act"><h2><span>Act ${['I', 'II', 'III', 'IV', 'V'][i]}</span>${title}</h2><ol>${xs.map(row).join('')}</ol></section>` : '';
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cast List</title><meta name="description" content="Every app by Mutaaf Aziz in one catalog, with live App Store status and an audit of every place that lists them.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,800;1,6..96,500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
<link rel="alternate" type="application/json" href="/cast/api/apps"><link rel="alternate" type="application/ld+json" href="/cast/apps.jsonld">
<style>
:root{--paper:#f4eedf;--ink:#1c1813;--soft:#6b6252;--rule:#cfc3a8;--red:#9e1530;--gold:#a8823a;--ok:#2f6b3a;--card:#fbf7ec}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--paper:#100e0c;--ink:#efe6d2;--soft:#a39883;--rule:#3a332a;--red:#e2566c;--gold:#d2ab5c;--ok:#7cc48a;--card:#17140f}}
:root[data-theme=dark]{--paper:#100e0c;--ink:#efe6d2;--soft:#a39883;--rule:#3a332a;--red:#e2566c;--gold:#d2ab5c;--ok:#7cc48a;--card:#17140f}
*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.55 Newsreader,Georgia,serif;-webkit-font-smoothing:antialiased}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(120% 60% at 50% -10%,color-mix(in srgb,var(--red) 14%,transparent),transparent 60%);z-index:0}
main{position:relative;z-index:1;max-width:880px;margin:0 auto;padding:56px 16px 80px}
.top{text-align:center;border-bottom:3px double var(--rule);padding-bottom:28px;margin-bottom:36px;animation:rise .9s cubic-bezier(.2,.7,.2,1) both}
.kick{font:600 12px/1 Newsreader,serif;letter-spacing:.32em;text-transform:uppercase;color:var(--gold);margin:0 0 18px}
h1{font:800 clamp(56px,13vw,124px)/.86 "Bodoni Moda",serif;letter-spacing:-.02em;margin:0}h1 em{font-style:italic;font-weight:500;color:var(--red)}
.sub{font-style:italic;color:var(--soft);max-width:560px;margin:18px auto 0;font-size:19px}
.ver{font:12px/1.4 ui-monospace,Menlo,monospace;color:var(--soft);margin-top:14px;letter-spacing:.04em}
h2{font:500 30px/1.1 "Bodoni Moda",serif;margin:44px 0 14px;display:flex;align-items:baseline;gap:14px}h2 span{font:600 11px/1 Newsreader,serif;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
ol{list-style:none;margin:0;padding:0}
li{display:grid;grid-template-columns:14px auto 1fr auto;column-gap:10px;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--rule);animation:rise .7s cubic-bezier(.2,.7,.2,1) both}
li:nth-child(2){animation-delay:.04s}li:nth-child(3){animation-delay:.08s}li:nth-child(4){animation-delay:.12s}li:nth-child(5){animation-delay:.16s}li:nth-child(n+6){animation-delay:.2s}
.dot{width:10px;height:10px;border-radius:50%;background:var(--c);box-shadow:0 0 0 1px var(--rule);align-self:center}
.who{font:600 21px/1.2 "Bodoni Moda",serif;color:var(--ink);text-decoration:none}.who:hover{color:var(--red)}
.lead{border-bottom:2px dotted var(--rule);transform:translateY(-5px);min-width:20px}
.as{font-style:italic;color:var(--soft);text-align:right;max-width:330px}
.meta{grid-column:2/4;font-size:13.5px;color:var(--soft);letter-spacing:.02em}.meta b{color:var(--red);font-weight:600}
.badge{grid-column:4;grid-row:2;justify-self:end;font:600 11px/1 Newsreader,serif;letter-spacing:.14em;text-transform:uppercase;padding:6px 9px;border:1px solid var(--gold);color:var(--gold);border-radius:2px;text-decoration:none;white-space:nowrap}
.badge.live{background:var(--red);border-color:var(--red);color:var(--paper)}.badge.dim{border-color:var(--rule);color:var(--soft)}
.housebox{background:var(--card);border:1px solid var(--rule);padding:22px 22px 10px;box-shadow:0 1px 0 var(--rule),0 18px 40px -28px rgba(0,0,0,.4)}
.tally{margin:0 0 12px;font-size:18px}.tally b{font:800 22px "Bodoni Moda",serif;color:var(--red)}
details{border-top:1px solid var(--rule)}summary{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:11px 0;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}
.mark{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 13px ui-monospace,monospace;border:1.5px solid}.mark.ok{color:var(--ok)}.mark.off{color:var(--red);background:color-mix(in srgb,var(--red) 10%,transparent)}.mark.err{color:var(--gold)}
.sn{font-weight:600}.sc{color:var(--soft);font-size:14px;text-align:right}
details ul{margin:0 0 12px 44px;padding:0;list-style:none;font-size:15px}details li{display:block;border:0;padding:3px 0;animation:none}details li.low{color:var(--soft)}details li.high b{color:var(--red)}
.want{font-style:italic;color:var(--soft)}.note{color:var(--soft);font-style:italic}
.feeds{margin-top:56px;border-top:3px double var(--rule);padding-top:22px;font-size:15px;color:var(--soft);display:grid;gap:6px}.feeds a{color:var(--ink)}.feeds code{font:13px ui-monospace,Menlo,monospace}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
@media (max-width:600px){li{grid-template-columns:14px 1fr auto}.lead{display:none}.as{grid-column:2/4;text-align:left;max-width:none}.meta{grid-column:2/3}.badge{grid-column:3}summary{grid-template-columns:30px 1fr}.sc{grid-column:2;text-align:left}}
</style></head><body><main>
<header class="top"><p class="kick">Mutaaf Aziz presents</p><h1>Cast <em>List</em></h1>
<p class="sub">Every app in the company, in order of appearance. This is the one list: the launchers, the pages, the ad and search services all read it or answer to it.</p>
<p class="ver">catalog ${esc(list.version)} · store status from App Store Connect ${esc(when(list.storeAt))}</p></header>
<section><h2><span>Tonight</span>The house report</h2><div class="housebox">${house(drift)}</div></section>
${acts}
<footer class="feeds"><div>For machines: <a href="/cast/api/apps"><code>/cast/api/apps</code></a> · <a href="/cast/api/launcher"><code>/cast/api/launcher</code></a> · <a href="/cast/apps.jsonld"><code>/cast/apps.jsonld</code></a> · <a href="/cast/api/drift"><code>/cast/api/drift</code></a></div>
<div>Edit the catalog in <a href="https://github.com/mutaaf/cast-list">github.com/mutaaf/cast-list</a>. Store status comes live from <a href="https://github.com/mutaaf/stage-manager">Stage Manager</a>; changes are announced on <a href="/cue">Cue</a>.</div></footer>
</main></body></html>`;
}
