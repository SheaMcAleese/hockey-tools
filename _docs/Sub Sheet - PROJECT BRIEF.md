# Black Sticks Sub Sheet — Project Brief

**Paste this file (or point Claude at it) at the start of a new session instead of re-reading the whole chat.**

## What it is
A single self-contained HTML web app for planning and running hockey substitutions for the NZ Black Sticks Men. No internet, no dependencies — all HTML/CSS/JS in one file. 4 quarters × 15 one-minute columns. Built for live bench use on an iPad, plus printed/screenshot backups.

## Files (in `NZ Hockey/07 - Hockey Tools (Web Apps)/`)
- **`Black Sticks Sub Sheet.html`** — the master/source file. Edit this one.
- **`Black Sticks Sub Sheet - iPad (Netlify)/`** — deploy copy: `index.html` (master + PWA bits), `sw.js` (offline cache), `manifest.webmanifest`, icons. Regenerate after any change to the master and bump the `sw.js` cache version (currently `bs-subsheet-v6`).

## Features built (all working + tested)
- **Setup tab strip** — the 7 setup sections (Squad / Positions / Rotation / Formations / Anchors / Protected pairs / Game notes) are ONE row of tabs above the grid, not stacked accordion panels. One open at a time; click the active tab again to collapse (clean default = all closed). Navy active state, gold dot; the Protected pairs tab shows a red dot when a pair is broken anywhere. `app.openSetupTab(name)` + `app.syncSetupTabs()` (kept in sync via renderTabs/renderAll). Body IDs unchanged (squadBody, priBody, …) so all render fns still target them. Hidden in print via `.no-print`.
- **Squad editor** — name, rank/number, line group, default position, role tags, per-game.
- **Priority positions** — each player's preferred spot(s), incl. generic STR/MID/DEF. "Apply to whole grid" relabel button.
- **Auto-position engine** — fills one player per slot (LS/CS/RS etc.) from priority order so you never see two of the same. Toggle under the grid. Honours manual locks.
- **Manual position locks** — right-click/long-press a cell → set exact position; it overrides auto. Lock marker hidden in print.
- **Rotation units** — "take the same person off" generator: ordered players + first-sub + cadence + which quarters → paints the grid automatically.
- **Structures** — per-quarter on-field shape (line counts). Built-in list + **user-created custom structures** (★) choosable per quarter, saved in store. NB: a structure stores *counts only*, not which body sits in which line — see Formations.
- **Formations** — saved shape **+ line map** you drop on any quarter. "Save current quarter as a formation" captures each player's line (effGroup) + the counts. Applying it (Q1–Q4 buttons) sets the structure AND auto-moves every player to the right line via `groupQ` — so a 3-at-back shape pushes the spare defender up to midfield instead of leaving six at the back. Positions (LS/CS/RS) still auto-fill from priority positions. Per-game (`state.formations`), travels with game export/backup. New panel between Rotation units and Anchors.
- **Per-quarter line moves** — a player can switch line for one quarter (e.g. FM moves DEF→MID in 3-at-back). Small line button on each name.
- **6-mid split** — when a quarter has ≥6 midfielders, splits into coloured ATTACKING / DEFENSIVE MIDFIELD blocks; 5 or fewer = single block.
- **"PLAYS" bands** — subtle free-text row under each line (Strikers/AM/DM/Back 4) for "who plays where".
- **Protected pairs** — two players who must never be off together (e.g. drag flickers). Live + planning warnings; folded into the readiness check.
- **Match timer** — START/STOP (for time-off), ±10s, RESET; pink column tracks the clock; bright rows = on, dim = off; NOW/NEXT banner.
- **Live quick-swap** — swap one player off for another from the current minute to end of quarter.
- **Counts & readiness** — per-line count rows (green/red per minute), role-coverage rows, "✓ PLAN READY / ⚠ N TO FIX" chip across all 4 quarters.
- **GAME tab** — minutes matrix, target minutes per player (+/-), quarter checks, player cards.
- **PHONE CARDS tab** — one card per player; tap to enlarge for screenshot → send to players; print one-per-page.
- **Game notes** — opposition / PCD / scoreline; shows as a banner + on cards.
- **Save/Backup** — auto-saves in browser (per device). Per-game Export/Import; whole-app **Backup all / Restore all** (one JSON, moves Mac↔iPad).
- **Print** — A4 landscape, one quarter per page, clean (lock marks, line buttons, panels hidden).

## How it runs on iPad (offline, live)
Deployed via Netlify (free signup site, password-free) → opened once in Safari on wifi → **Add to Home Screen**. The service worker caches everything, so it then runs fully offline forever. Game day: Auto-Lock = Never, Low Power off. Keep PDF screenshots of each quarter as backup.

## Data model (in localStorage key `bs_subsheet_v1`)
`store = { games:{name:state}, last, customStructures:[] }`. Each `state = { name, players:[{id,name,rank,group,pos,pp:[],roles:[],target,groupQ:[4]}], grid:{pid:[4][15]}, locks:{pid:[4][15]}, requiredQ:[4], structureQ:[4], units:[], anchors:[{id,playerId,mins,rest,qs[4]}], formations:[{id,name,req,lines:{pid:group}}], pairs:[], bands:{}, notes, autoPos }`.

## Conventions when editing
- Keep it one file, no external resources (offline).
- After editing the master: regenerate the iPad `index.html` (inject manifest/SW tags after `</title>` and SW-register script before `</body>`), bump `sw.js` cache version, re-drop folder to Netlify, reload once on iPad on wifi.
- Test JS by extracting the largest `<script>` block and `node --check`; logic-test with a small DOM stub.
- **Dropbox gotcha:** these files are Dropbox cloud-synced. A bash/python `open()` on a file that's been evicted to cloud-only can read EMPTY and silently clobber it on write (this happened to `sw.js` once). For small files like `sw.js`/`manifest`, use the Read/Write tools (they download cloud-only files), not bash. After any regen, verify `ls -la` sizes are non-zero.

---

## Rotation philosophy — the two-mode model (decided 2026-06-22)

The current rotation generator is **cadence-driven**: cadence + order → minutes fall out. It's excellent for bench clarity and equal rotation, but egalitarian by design, which causes two known problems:

1. **Hard to skew minutes** — equal carousel = equal minutes. No lever for priority players.
2. **Synchronised rest** — every unit's first sub fires at the same minute, so priority players' off-windows stack in the soft middle third of the quarter.

These are one root issue: the cadence drives the minutes, when for the best players we want the minutes to drive the cadence.

**The fix is a second, additive mode — not a replacement.** High-rotation sports run both at once:
- **Basketball — staggering:** offset rest so two stars are never off together; one always on.
- **Ice hockey — double-shift:** skew minutes openly via shift frequency; best players back on early.
- **AFL — minutes budget:** each player has a game-time target; interchange managed to it.
- **Field hockey — anchor + rotate:** the spine (best CB, CM engine, striker) plays heavy minutes and rests once at a bookend; the carousel runs around them in the energy positions.

### Anchor Mode — BUILT (2026-06-22, in master + iPad copy)
1. **Tag anchors** (the 12-of-15 players) — pulled out of the carousel.
2. **Anchors are minutes-driven** — single rest block at a **bookend** (start or end), never the middle.
3. **Stagger anchors** — staggered *within each line* so at least one anchor in that line is always on; rest blocks never overlap.
4. **Everyone else stays on the existing carousel.**

**How it works in the app now:**
- New **Anchors panel** (below Rotation units): pick player, set on-minutes (default 12), rest = auto / start / end, tick quarters → **GENERATE ANCHORS**.
- `auto` runs `solveAnchorRests(q)`: places each anchor's rest block at a bookend, staggered per line, soft middle filled last. Explicit start/end honoured.
- Anchored players show a gold ⚓ on the grid (hidden in print).
- Data: `state.anchors:[{id,playerId,mins,rest,qs[4]}]`.
- **Workflow:** generate anchors FIRST, keep anchors OUT of rotation units, then GENERATE ALL units for everyone else. Counts/readiness rows catch any overstaffing.
- Verified: 3 same-line anchors → non-overlapping bookend rests, ≥2 of 3 always on, soft middle fully manned.

**Offset-first-sub:** already supported — each rotation unit has a `first` (first-sub minute) field. Set different `first` values per unit (e.g. 2/4/6) to spread first-subs and smooth the middle even without anchors. No build needed.

Full build spec: **`Anchor Mode - Build Spec.md`**.

---

## Formations — BUILT (2026-06-22)

Solves two problems: (1) changing a quarter's structure used to leave bodies in their old lines (six at the back going red); (2) no way to save and choose between set shapes.

- A **structure** stores counts only. A **Formation** stores counts **+ a line map** (which line each player sits in).
- **Save current quarter as a formation** captures every player's `effGroup` + the counts for the active quarter.
- **Apply (Q1–Q4 buttons)** sets the structure and moves each player to the right line via `groupQ` — spare defender slides up to midfield automatically. Positions (LS/CS/RS) still auto-fill from priority positions.
- Per-game: `state.formations:[{id,name,req,lines:{pid:group}}]`. Travels with game export/backup. Panel sits between Rotation units and Anchors.
- Workflow: build a quarter the way you want (structure + line buttons), save it, then drop it on any quarter. Build a few (3-4-3, 4-at-back, 6-strikers…) and pick per quarter.
- Verified: save captures line map, apply moves the body + sets counts + names the structure.

**Deploy reminder:** sw.js cache is now `bs-subsheet-v6` — re-drop the iPad folder to Netlify and reload once on wifi to pick up Anchor Mode + Formations + the setup tab strip.

---

## Setup tab strip — BUILT (2026-06-22)
The seven stacked accordion panels are now a single clean tab row above the grid (Squad / Positions / Rotation / Formations / Anchors / Protected pairs / Game notes). One open at a time, click active to collapse, navy/gold brand styling, red warning dot on the Pairs tab when a protected pair is broken. Functions: `openSetupTab`, `syncSetupTabs`. Verified open/switch/toggle-close behaviour + warning dot with a DOM stub. The dense game grid was left untouched on purpose — it's purpose-built for legibility at the bench.

---

## Bulletproof kit — BUILT (2026-07-03, in v2 only)

Six game-day reliability features added to `Black Sticks Sub Sheet v2.html` (JS syntax-checked + logic-tested with a DOM stub; frozen originals untouched):

1. **Storage protection** — `navigator.storage.persist()` requested on init; `save()` now also keeps a rolling backup in `bs_subsheet_v1_bak` (only overwritten when the existing backup is >10 min old, so there is always a restore point that predates recent damage); if the primary store is missing/corrupt on load, `restoreFromBak()` recovers it automatically. "saved HH:MM:SS" chip in the timer bar.
2. **UNDO button** — the existing 60-step undo stack now has a touch button in the timer bar (was Cmd/Ctrl-Z only, useless on iPad).
3. **Wake lock** — screen auto-stays-awake while the match clock runs (Wake Lock API, Safari 16.4+); re-acquired on visibilitychange; released on STOP/RESET. No more relying on remembering Auto-Lock = Never.
4. **Sub buzzer** — `checkBuzzer()` in tick(): ~12s before any minute boundary where the grid changes, plays a 3-beep rise (WebAudio, no files, unlocked on START) + flashes the timer bar red + shows "SUBS: OFF X · ON Y". Fires once per boundary, silent when nothing changes. Quarter-end horn at 0:00. Toggle: BUZZ ON/OFF button, persisted in `store.gear`.
5. **True back-line timer** — independent repeating countdown chip (default 90s, tap chip to change 30–300s), runs only while the match clock runs, distinct low double-beep + orange flash each cycle. Toggle: BACKS button. Closes the "90s can't be exact on a minute grid" gap.
6. **GAME DAY check** — button opens a pre-game overlay: storage-persist check, wake-lock support check, forced snapshot + download-game-file button, buzzer test, manual checklist (volume/silent switch/brightness/DND/charger).

New store field: `store.gear = {buzz, backOn, backSecs}`. New localStorage key: `bs_subsheet_v1_bak`. All new methods live between `save()` and the injury section, plus timer-section additions (`unlockAudio, beep, buzz, backBuzz, qEndBuzz, nextChange, checkBuzzer, toggleBuzz, tickBack, toggleBack, setBackSecs, acquireWake, releaseWake, openGameDay, restoreFromBak, snapshotNow, updateSavedChip`).

**Note:** WebAudio needs one user gesture — press START (or GAME DAY → Test sound) once and audio is unlocked for the session. iPad silent switch does not mute WebAudio in home-screen PWAs, but run the GAME DAY sound test anyway.
