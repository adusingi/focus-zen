---
type: Tasks
title: Focus Zen open tasks
description: Paused work, with the branch it lives on and why it is paused.
timestamp: 2026-11-19T06:15:46+09:00
---

# Open tasks

No paused work.

## Site: move to the Mobayilo design system, Tokyo Night theme (paused 2026-11-19)

Owner asked: "go for https://design.mobayilo.com/ a tokyo night theme". Not started in code; current
site (bae6f63) is the Clarity Board look. Work on `main` (no feature branch). Plan:

- Vendor `site/src/design-system.css` again from `~/Documents/Code/p/design-system` (see the old
  copy in `3cf3f6c^`): the `tokyo-night` theme block from `themes/src/themes.ts`, the `:root`
  scales and `.mo-btn` from `ui/styles.css`, and `ui/footer.css`. Set `data-theme="tokyo-night"`.
- Fonts back to the system pair: Cormorant Garamond (restore both woff2 from `3cf3f6c^`) +
  Inconsolata; drop Gloock and Onest.
- Restyle `base.css`, `home.css`, `home-media.css`, `thanks.css` onto the theme variables
  (`--background`, `--panel`, `--line`, `--foreground`, `--muted`, `--accent`, `--accent-strong`)
  and `--mo-radius-*`; pill `.mo-btn` buttons (Get Focus Zen, Support & download $5), rounded cards.
- Keep the page structure: sticky bar, centred hero, 01–05 sections, working list in 01 / Write.
- Footer: the shared `mo-footer` (render with `ui/bin/mo-footer.mjs`, config like
  `ui/examples/footer/mobayilo.json`).
- theme-color `#151a2d`; take og.png again (scale 0.8, 1500×788).
