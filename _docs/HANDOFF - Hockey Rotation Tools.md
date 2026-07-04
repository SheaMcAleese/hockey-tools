# Hockey Rotation Tools — Project Handoff

**Purpose of this file:** drop it into a fresh Claude conversation to continue work without re-reading the whole chat. It is a context primer, not the source code. The two apps live as files on disk (paths below) — read those directly when you need to edit them. Do **not** paste the full app HTML into chat; it's large and wastes tokens.

**Owner:** Shea McAleese — HP coach, NZ Hockey. Builds these as game-day tools (used on an iPad on the bench via the Documents by Readdle app, opened from Dropbox). One of them he also intends to sell.

**Last worked:** 2026-06-25.

---

## The two apps (both single-file, offline HTML + localStorage)

Folder: `~/Library/CloudStorage/Dropbox/NZ Hockey/07 - Hockey Tools (Web Apps)/`

| File | What it is | Status |
|---|---|---|
| `Black Sticks Sub Sheet v2.html` | Shea's full game-day bench-management tool. The powerful one. | Active dev |
| `ELV8 Rotation Builder.html` | The simple, **sellable** product. ELV8-branded, buyer-renameable. | Active dev |
| `Black Sticks Sub Sheet.html` | ORIGINAL of the above. **Do not edit.** Kept as his safe game-day copy. | Frozen |
| `hockey-rotation.html` | ORIGINAL simple generator the ELV8 app was rebuilt from. **Do not edit.** | Frozen |

**Golden rule:** only ever edit the `v2` / `ELV8` files. The two originals are his live fallbacks and must stay untouched until he says otherwise.

---

## How to preview/verify changes (important — CloudStorage is sandbox-blocked)

The preview server cannot serve the Dropbox/CloudStorage path directly (permission error). Workflow that works:
1. `cp "<the file>" /tmp/elv8preview/<name>.html`
2. Serve `/tmp/elv8preview` (there is a `hockey-tools` config in `~/Desktop/Shea Brain/.claude/launch.json` running `python3 -m http.server 8781` from `/tmp/elv8preview`).
3. Open `http://localhost:8781/<name>.html`, drive it with `preview_eval`, screenshot to verify.
4. After editing the real file, re-copy to /tmp and reload. Always edit the real Dropbox file (that's the source of truth); the /tmp copy is throwaway.

localStorage keys: Black Sticks uses `bs_subsheet_v1` (+ `bs_timer`). ELV8 uses `elv8_rotation_v1`. Clear these in the preview to reset to defaults when testing.

---

## ELV8 brand (for the sellable app)

From `~/.claude/skills/elv8-video/SKILL.md`:
- Background charcoal `#222`, accent gold `#D4AF37`, white text, font **Montserrat**, uppercase for emphasis, red `#FF4444` for negation.
- Product brand stays **"ELV8 Rotation Builder"** (it's Shea's product). Each buyer sets their own **team name + accent colour** (editable in-app, persisted).
- The app chrome is ELV8 dark/gold, but the printable rotation **sheet** keeps bright, match-readable colours: START green, INTERCHANGE red, GK blue, line position tags. The sheet is a clean light card so it prints well and reads at a glance.

Shea's comms style (if writing copy): warm but direct, no dashes (use commas), no emojis unless he uses them, no corporate-speak.

---

## Decisions locked in (don't re-litigate)

- **Both apps rebuilt as new files; originals frozen.** ✔
- **Black Sticks keeps its own light, high-contrast identity** (optimised for bench readability + print). NOT reskinned to ELV8 dark. Only the *injury panel* is dark/bespoke.
- **ELV8 app aesthetic = ELV8 dark/gold chrome + readable light sheet.** Buyer can rename team + pick accent.
- **ELV8 Print sheet edits save back into the game** (per-quarter `edits` override store).
- **ELV8 timer = light countdown only** (not full per-minute tracking).
- **Injury recovery, on-field shape stays the same** — Shea still fields a full 11, just fewer subs. "5/5/5" = bench rotation groups, not on-field counts.
- **Injury cadence is pre-set before the game** (saved), so in-game it's ~2 taps.
- **Screenshot buttons do BOTH:** a clean full-screen view AND a PNG download (offline SVG→canvas; falls back to "take a manual screenshot" if the browser blocks it).
- **Rank = minutes.** Order of players within a line (set in Squad) is their rank; top plays most. Drives the pod split.

---

## Black Sticks Sub Sheet v2 — feature map

**Engine (inherited from the original, untouched logic):** per-minute on/off grid (15 cols counting down, 4 quarters); auto-position (one player per LS/CS/RS slot from priority positions); rotation **units** ("take the same person off" cycles); **anchors** (heavy-minute players with one rest block); saved **formations**; **protected pairs** (warn if both off); custom **structures** (on-field line counts); **live match timer** driving a NOW/NEXT banner + bright/dim rows + quick-swap; **phone cards**; **game overview** with minute targets; multi-game storage, export/import, backup-all/restore-all, print.

**Dashboard rebuild (round 2):**
- Decluttered header: clean game bar (name, switcher, + New) + a `⋯` kebab menu (Duplicate / Export / Import / Backup all / Restore all / Delete).
- "SET UP IN ORDER" guide strip + numbered core tabs **1 Squad → 2 Positions → 3 Anchors → 4 Rotation**, then an "optional" group (Formations / Protected pairs / Game notes). Step numbers turn green when done (`setupDone()`).
- Squad panel grouped by line, card rows, colour dots, rank number per row.

**Other rounds:**
- Right-click a grid cell → set a position; applies to the **whole quarter** by default (with a "this minute" toggle). Fixes positions not sticking. Blank "—" option in the squad position dropdown.
- Drag-to-reorder: squad rows (coloured dot) and grid name cells. Arrows kept for touch.
- Formations rebuilt as a sleek **dark dashboard**: 8 built-in shapes preloaded as one-tap "drop on Q1–Q4" cards + save-your-own.
- Sub plan + Who-takes-who collapse behind fold boxes; each has a screenshot button (`popClean` overlay + `snapshotPNG`).
- Phone card screenshot via the same shared overlay (clean view + Download image).

**Injury recovery + rank pods (rounds 3–6) — the centrepiece:**
- Red **`⚠ PLAYER OUT`** button in the live timer bar. Flow: tap it → tap the injured player chip → done. Marks them out for the rest of the match (cleared from the live clock onward, struck-through "OUT" row, tap to bring back), and rebuilds an even **pod** rotation for every outfield line from the live clock to the end.
- **Pod rule:** spare players in a line (N − k, where k = on-field count) = number of pods, each pod carries one spare. So strikers 5 over 3 → "2-for-3 + 1-for-1"; backs 5 over 4 → "4-on-1-off". Implemented in `genLinePods()`.
- **Rank drives the pods.** Player order within a line = rank (set in Squad, top = plays most). `genEvenLine()` benches from the BOTTOM of the rank up, so rank 1 sits out least / plays most (verified: strikers 48/36/36/36/24 across a game, monotonic). The top players land in the bigger pod (more minutes), the bottom two in the 1-for-1 (less).
- **Generate by rank:** "⚡ Quick rotation by rank → Generate by rank" panel at the top of the Rotation tab. `generateByRank()` paints the whole game from ranks via pods — this is how ranking drives the NORMAL rotation, not just injuries.
- Per-line cadence in `state.injuryPlan`: `smEvery` (strikers/mids, default 3 min) and `backEvery` (backs, default 2 min). `state.outPlayers` holds the out list.
- Injury panel is **dark/bespoke**: charcoal card, red gradient header, line-coloured chip borders, gold rank circles, green/grey "plays more / plays less" pod tags, dashed drop-lanes. Drag a chip onto another to re-rank, or to another lane to move a player's line (lands at bottom = lowest rank).

---

## ELV8 Rotation Builder — feature map

- 3-step flow **Squad → Build → Print**, plus a 4th optional **Time** step.
- **Squad:** add players (name, line, position), grouped by line with colour dots.
- **Build:** pick a formation shape per quarter, set starters + interchange per line; rotation description writes itself; "1st sub" + timing per line; usage strip.
- **Print:** the bench sheet, one quarter per landscape page. **Every cell is editable** (contenteditable) and edits save into the game (`Q.edits` override store, cleared when a new formation is applied). Editable **PLAYS band** under each block (e.g. "Lane CS / Ward RS / Thomas CS/LS").
- **Time (4th step):** light per-quarter countdown clock + sub-reminder list pulled from Build. Optional.
- Branding: editable team name + accent colour (swatches), persisted. Generic/white-label by default. Export/import backup.
- Formation presets carried from the original generator (6-at-back, 5-5-6, 3-at-back variants, even 1-for-1, etc.).

---

## Known limitations & open items

- **90-second back rotation can't be exact on a minute grid.** The grid is 1-minute resolution, so the backs' true 90s cadence is rounded to whole minutes (`backEvery` default 2 ≈ 90s), flagged in the panel. OPEN: build a separate exact-90s back-line countdown/beeper that the bench follows by clock, independent of the grid.
- **PNG screenshot export is best-effort** (SVG foreignObject → canvas). Can fail on some Safari versions; falls back to the on-screen clean view for a manual screenshot. ELV8's Montserrat may not embed in the PNG.
- **Pod minute-sway tops out at the biggest pod's fraction** (a 2-for-3 player ≈ 2/3). For a player you want at near-full minutes, use **Anchors** (Black Sticks), not pods.
- ELV8 timer is a clock + reminder list only (no auto-firing alerts yet).

---

## "World-class" backlog (Shea is choosing what's next)

Recommended order if he greenlights:
1. **Sub buzzer** — clock beeps + flashes the next change a few seconds before it's due (biggest game-day feel improvement).
2. **True 90-second back-line timer** — closes the one honest gap (see limitations).
3. **Live minutes-so-far per player** during the game.
4. **Single green "ready to play" gate** (stronger than the current "X TO FIX" check).
5. **One-tap "send all" phone cards** as images.

He leaned toward doing **1 (buzzer)** and **2 (90s back timer)** first.

---

## Quick orientation for a new conversation

1. Read this file. 2. Read the two app files only when you need to edit them. 3. Confirm with Shea which app + which change before building (he likes a tight confirm-then-build rhythm and sharp clarifying questions; he dislikes flattery and waffle). 4. Verify in the /tmp preview and screenshot before saying it's done. 5. Never touch the two frozen originals.

There is also an auto-loaded memory file at `~/.claude/projects/-Users-sheamcaleese-Desktop-Shea-Brain/memory/project_hockey_rotation_tools.md` covering the same project rounds.
