# Cast List: working notes

Read README.md first. AGENTS.md has the rules.

| Nuance | What to do |
|---|---|
| The catalog repo is public | Never put a business repo's name in it. The Labs page's address is the `LABS_SOURCE` secret. Unannounced apps don't go in at all. |
| A surface's markup changes | Its reader returns nothing and the audit reports an error. Update `src/surfaces.mjs` and its test. |
| A store file is in a private repo | The audit reports it as `unread`, not `missing`. |
| Names | Matching ignores case, punctuation and a leading "The". Sanctioned variants go in `aka`. |
| llms.txt is prose | It's judged on presence and status claims only, matched by name first. |
| Store status lags | It's Stage Manager's last hourly read; `storeAt` says when. |
| The audit token | `~/.config/cast-list/drift-token` (mode 600) and the `DRIFT_TOKEN` repo secret; the Worker holds only its sha256. |
