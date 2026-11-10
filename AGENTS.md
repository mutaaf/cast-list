# Agents

- The catalog is the truth. To change an app's name, URL, tagline or where it's listed, change `catalog/apps.json` first; other surfaces follow.
- Never type store status into the catalog. It comes from Stage Manager.
- Never list a kids app's store or TestFlight URL anywhere; use its `store.gate`.
- The audit reports; it never edits another repo. Fixing drift is a PR in the repo that owns the surface.
- `npm test` must pass. CI runs `npm run check` on every PR.
