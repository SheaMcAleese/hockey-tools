# ELV8 Suite — Design & Build Reference Docs

One reference file per app. Each is **self-contained**: purpose, architecture, exact data model, function map, the full ELV8 design system, conventions, how to extend, how to test, and the **complete source code appended at the bottom**.

## How to use these
When you want Claude to do more work on one of the apps, **paste (or attach) that app's `.md` file** at the start of the conversation. Claude reads it and is instantly up to speed on that app — its structure, data shapes, design rules and full code — without re-exploring. Then just say what you want changed.

- Working on the session sheet / load planner → `training-load-planner.md`
- Working on opponent dossiers → `opposition-scout.md`
- Working on team sheets / formations → `squad-selection.md`
- Working on sub sheets / rotations → `rotation.md`
- Working on match-day lineups / the pitch → `match-lineup.md`
- Working on player feedback / review decks → `player-reviews.md`
- Working on the pitchside timer → `session-timer.md`

## Source of truth
The `.md` files are the **design + context brain**. The matching `.html` file in `ELV8 Suite/` is the **live source** Claude actually edits. The full source is also embedded at the bottom of each `.md` as a snapshot — if you change an app, that snapshot can go stale, so the `.html` always wins. (Ask Claude to "refresh the design doc" after a round of changes to re-sync the snapshot.)

## The shared standard (applies to every app)
- **Brand:** ELV8 charcoal + gold palette (bg `#1c1c1c`, gold `#D4AF37`, dark text on gold), Montserrat font. **No "ELV8" wordmark** — these are Black Sticks tools; document branding is a configurable programme name + crest (Vantage logo).
- **Premium documents:** charcoal masthead + gold hairline, eyebrow-labelled meta strip, no heavy gridlines (hairlines + zebra), colour as signal not blocks, gold-underlined section headers, a "Generated <date> · Private & Confidential" footer, A4 print.
- **Share Image:** every output has a one-tap PNG export (for WhatsApp) via `html2canvas` (loads on demand; needs internet, falls back to Print).
- Each app is a single offline HTML file storing data in `localStorage`.

## Locations
- Canonical: `Dropbox/NZ Hockey/07 - Hockey Tools (Web Apps)/ELV8 Suite/`
- Mirror: `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`
- Launcher: open `index.html` in the suite folder.
