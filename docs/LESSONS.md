# Lessons

| What happened | Why | What changed |
|---|---|---|
| The first live audit listed "Scout", "Builder" and "CI gates" as unknown apps | The Labs reader read every object in the file, not just the app array | It reads only `LABS_GAMES` (tested) |
| llms.txt read no entries at all | It's prose with bullets, not markdown links | Its reader reads bullets, and presence counts anywhere in the text, matched by name first |
| Hearth's store file was reported missing | It lives in a private repo the audit can't read | A file that can't be read is `unread`, never `missing` |
| The audit token in the GitHub secret would have carried a newline into the Authorization header | `gh secret set < file` keeps the file's trailing newline | The secret is set with `tr -d '\n'` |
| The launcher could no longer find 17-0 by typing "18-0" | The renamed app's old name wasn't a keyword | The launcher feed adds every `aka` name to the search words (tested) |
| Fourteen app lists drifted in four weeks | Each was typed by hand, and nothing compared them | This service: one catalog, everything else generated from it or audited against it |
