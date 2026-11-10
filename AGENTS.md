# Agents

- The catalog is the truth. To change an app's name, URL, tagline or where it's listed, change `catalog/apps.json` first; other surfaces follow.
- A new page on mutaafaziz.com needs `worker` and `ids.playbill` (then a catalog entry in mutaaf/playbill, whose CI fails until it has one), or a one-sentence `notOn.playbill`.
- Never type store status into the catalog. It comes from Stage Manager.
- Never list a kids app's store or TestFlight URL anywhere; use its `store.gate`.
- The audit reports; it never edits another repo. Fixing drift is a PR in the repo that owns the surface.
- `npm test` must pass. CI runs `npm run check` on every PR.
