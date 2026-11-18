---
type: Tasks
title: Focus Zen open tasks
description: Paused work, with the branch it lives on and why it is paused.
timestamp: 2026-11-18T23:02:22+09:00
---

# Open tasks

## Release 0.4.1: Developer ID signing and notarization (paused 2026-11-18)

Users saw "Apple could not verify Focus Zen is free of malware" because 0.4.0
was signed ad hoc and not notarized. 0.4.1 is signed with the Developer ID
certificate and notarized by Apple.

- Branches: `fix/notarize` (pushed), `release/0.4.1` (local only).
  `development` has the merge of `fix/notarize` locally (not pushed yet).
- Proven: a local build was accepted by Apple; `spctl` says
  `source=Notarized Developer ID`, and the app starts with hardened runtime.
- Paused because: Apple's first notarizations for the new account are slow
  (about 45 minutes). The CI test run 44309053127 hit its 60-minute limit
  while Apple still checked its submission `cd27dd56-e907-4eb8-ae46-61521d330b37`.
  The limit is now 90 minutes.
- To resume: check `xcrun notarytool history` (see README → Release). When
  submissions are fast again, merge `release/0.4.1` into `development`,
  fast-forward `main`, push both, push tag `v0.4.1`, check the published
  `.dmg` with `spctl`, update the download size on the site if it changed,
  then run `pnpm site:deploy`.
