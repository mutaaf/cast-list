# Cast List

The portfolio's one app catalog, live at [mutaafaziz.com/cast](https://mutaafaziz.com/cast). Phase 3 of the
event architecture ([Cue](https://github.com/mutaaf/cue), docs/ARCHITECTURE.md).

Fourteen places listed the apps, each typed by hand, and they disagreed: an app missing from the shared
launcher, a live app still called "public beta", one game under two names, ad and search services frozen on
their first seed. Cast List makes one list the truth and audits everything else against it.

```
catalog/apps.json ──CI checks the rules──▶ Cast List Worker ──▶ /cast/api/apps · /cast/api/launcher · /cast/apps.jsonld · /cast
                                               ▲
Stage Manager (App Store Connect, hourly) ─────┘ live store status: On the App Store / At App Review / In beta

Audit job (every 6 h, and on catalog change) ──reads 10 surfaces──▶ drift report ──▶ /cast/api/drift
                                                                        └── changed? ──▶ Cue: cast.drift.changed
```

## Three layers, three owners

| Layer | Where | Who changes it |
|---|---|---|
| **Identity**: name, URL, kind, audience, tagline, colour, platforms, store bundle, where it should be listed, and each surface's own id for it | `catalog/apps.json` | A PR. CI enforces the rules in `src/schema.mjs` |
| **Store facts**: live or not, at review, TestFlight link | Stage Manager, read from App Store Connect hourly | Apple |
| **Drift**: where a surface disagrees | The audit job | Nobody: it's measured |

## Rules the schema enforces

- Every app has an audience, `general` or `kids`. It decides ads, analytics and links downstream.
- A kids app on the App Store has a grown-up gate, and its download never links the store directly.
- `ads: false` means it can never be listed on Marquee.
- Every live public page on mutaafaziz.com names its `worker` and is on Playbill, or says why not in `notOn.playbill`. Playbill generates its routes and service bindings from this, so adding an app here is how it gets search copy.
- Each surface's id for an app is unique, and an app has an id only on surfaces it's listed on.
- Private entries never leave the Worker.

## What the audit checks

For each surface (the ⌘K launcher, the site dock, /apps, the manifest wall, llms.txt, resume.json,
Playbill, Marquee, the Labs page and Lobby's store files): apps missing from where the catalog puts them,
apps listed where they shouldn't be, a different name or URL, a different audience, bundle or App Store id,
a live app still described as beta, an unreleased one described as on the App Store, and a gated app linked
straight to a store. A reader that suddenly finds nothing is an error, never a clean bill.

## Feeds

- `GET /cast/api/apps`: the public catalog with live store status. `GET /cast/api/apps/<slug>`: one app.
- `GET /cast/api/launcher`: the launcher's `APPS` shape, so the launcher is generated, not typed.
- `GET /cast/apps.jsonld`: schema.org `ItemList` for search and AI answers.
- `GET /cast/api/drift`: the latest audit.
- RPC for Workers: `apps()`, `app(slug)`.

`npm test` (Node 22, no install). `npm run drift` runs the audit locally. `npm run deploy` tests, deploys and checks health.
