# Rotation Generator (Sub Sheet) — Design & Build Reference
> Reload this file to re-engage Claude for work on this app. Canonical source: `ELV8 Suite/rotation.html` (mirrored to `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`). Preview staging: `/tmp/elv8preview/`.

## 1. Purpose
A substitution rotation / interchange sub-sheet planner for field hockey. The coach maintains a squad roster, creates games (selecting which squad members are in for that game plus two GK options), then builds per-game sub sheets. Each sub sheet is tied to a formation preset and broken into position groups (Strikers / Midfield / Defenders). Each group defines a starter set, one interchange (bench) player, a rotation cycle type, first-rotation minute, timing rule, and free-text notes. The app auto-generates a plain-English rotation description per group and renders a premium, printable A4-landscape sub sheet (one per quarter) for handing to bench staff.

## 2. Architecture
- **Single-file** `rotation.html` — HTML + inline `<style>` + inline `<script>`. No build step, no framework, vanilla JS.
- **Font:** Montserrat (Google Fonts, weights 400/600/700/800/900) with system-font fallback stack.
- **Offline-capable** except for two online-only extras: the Google Fonts link and the html2canvas CDN (loaded lazily only when Share Image is used).
- **Persistence:** browser `localStorage` under the constant `STORAGE_KEY = 'hockeyRotationApp'`.
- **No external JS dependencies at load time.** html2canvas is injected on demand from cdnjs.

## 3. Data Model
Top-level `state` object:
```js
state = {
  squad: [Player],
  formationPresets: [Preset],   // DEFAULT_PRESETS + any custom
  games: [Game],
  ui: { currentView, currentGameId, currentSheetId }
}
```

**Player** (created by `loadDefaultSquad` / `addPlayer`):
```js
{ id: Number, name: String, primaryPos: String, altPos: String }
```
- `id` is a small integer (default squad uses index+1; `addPlayer` uses max id + 1).
- `primaryPos` / `altPos` drawn from `POSITIONS = ['RS','CS','LS','CM','RM','LM','LH','RH','CB','FM','FD','WH','GK']`. `altPos` may be `''`.

**Game** (created by `createGame`):
```js
{ id: String (uid), name, date, gk1, gk2, selectedSquad: [playerId], subSheets: [SubSheet] }
```
- `gk1` / `gk2` are stored as player **names** (strings), not ids — populated from GK-position players in the modal selects.
- `selectedSquad` is an array of player **ids** (ints), excludes GKs (checkbox grid filters `primaryPos !== 'GK'`).
- Optional `teamName` is read by the footer if present (not set anywhere in the UI; defaults to `'Performance Programme'`).

**SubSheet** (created by `addSubSheet`):
```js
{ id: String (uid), quarterLabel: String, formationPresetId: String, formationName: String, groups: [Group] }
```
- `quarterLabel` defaults to `'QUARTER ' + n`. `formationPresetId`/`formationName` empty until a preset is applied.

**Group** (built by `applyFormationPreset` from a preset group):
```js
{
  posLabel: String,            // e.g. 'LS / CS'
  section: 'STR' | 'MF' | 'DEF',
  rotationType: '1-for-1' | '3-player-cycle' | '4-player-cycle' | '5-player-cycle',
  starters: [ { playerId: Number, posTag: String } ],   // length set by rotationType
  interchange: { playerId: Number },                     // single object, NOT array
  firstRotationMin: Number,    // defaults to 4 on apply
  timing: String,              // free text, e.g. '4 on 4 off'
  positionNotes: String
}
```
- **Starter count by rotationType:** `1-for-1` → 1, `3-player-cycle` → 2, `4-player-cycle` → 3, `5-player-cycle` → 4 (cycle name = starters + 1 interchange).
- Note the preset templates only carry `{ posLabel, section, starterCount, rotationType }`; `applyFormationPreset` recomputes starter count from `rotationType` (NOT from the template's `starterCount` field) and adds the runtime fields.

**Preset / formationPresets templates** (`DEFAULT_PRESETS`, ids `p1,p2,p3,p4,p5,p8,p9,p6`):
```js
{ id: String, name: String, groups: [ { posLabel, section, starterCount, rotationType } ] }
```
Eight presets ship by default (various 5/6-at-back, 3-at-back, and "lose a player" variants). `loadState` merges saved customs (any preset whose id is not a default id) back in after the defaults.

## 4. State & Persistence
- `saveState()` writes `{squad, formationPresets, games, ui}` to `localStorage[STORAGE_KEY]`. Called after virtually every mutation.
- `loadState()` parses storage; restores squad/games/ui; for presets it always re-seeds `DEFAULT_PRESETS` then appends saved non-default presets (defaults can't be lost or stale). If `state.squad` ends up empty, it calls `loadDefaultSquad()`.
- `uid()` = `Date.now().toString(36) + random` — used for game and sheet ids (strings). Player ids are plain integers.
- Init sequence at bottom of script: `loadState(); renderRoster(); if (state.ui.currentView) switchView(state.ui.currentView);`

## 5. Views & Navigation
Four views, toggled by `switchView(view)` (adds `.active` to `#view-<name>` and the matching nav button, calls the view's render fn, saves state):
1. **Squad Roster** (`roster`) — editable table of players; Add Player, Export/Import JSON.
2. **Game Manager** (`games`) — game list + detail panel; New Game modal; per-game sub-sheet list (Dup / delete).
3. **Sub Sheet Builder** (`builder`) — formation picker + group panels + live player-usage sidebar.
4. **Preview / Print** (`preview`) — game/sheet selectors, Share Image, Print; renders the premium document into `#preview-output`.

Ships with a **default Black Sticks squad** via `loadDefaultSquad()` (21 players incl. GKs DIXON, RUETSCH) auto-loaded when storage is empty.

## 6. Key Functions
- `switchView(view)` — view router; also infers active nav button by text match.
- `renderRoster` / `updatePlayer` / `addPlayer` / `removePlayer` — roster CRUD; names auto-uppercased.
- `exportSquad` / `importSquad` — squad JSON download / file-read import.
- `renderGames` / `selectGame` / `renderGameDetail` — game list + detail rendering.
- `showNewGameModal` — populates the squad checkbox grid (non-GK) and the two GK selects (GK-position players).
- `createGame()` — reads the modal (name, date, checked player ids, gk1, gk2), pushes a Game, sets `currentGameId`.
- `deleteGame` / `addSubSheet(gameId)` / `duplicateSheet` / `deleteSheet` — sheet lifecycle. **`addSubSheet` REQUIRES a `gameId` arg.**
- `editSheet(gameId, sheetId)` — sets current ids and switches to builder.
- `renderBuilder` — draws builder layout, group panels (grouped by section dividers), and usage sidebar.
- `renderGroupPanel(group, gi, availablePlayers, sheet)` — one group's controls; builds player dropdowns that exclude players assigned elsewhere.
- `updateSheet` / `updateGroup` / `updateStarter` / `updateInterchange` — granular mutators (most re-render builder).
- `changeRotationType(gi, rotType)` — sets type AND grows/shrinks the `starters` array to the needed count.
- `applyFormationPreset(presetId)` — replaces `sheet.groups` from the preset, seeding starter slots and runtime fields.
- `generateRotationDesc(group)` — builds the plain-English rotation string (see §7).
- `getPlayerName(id)` — defined locally inside `generateRotationDesc` and `renderSubSheetOutput`; resolves a player id to a name (returns `'?'` or `''` if missing).
- `renderPreviewControls` — fills the game `<select>` then calls `renderPreview`.
- `renderPreview()` — resolves selected game, fills sheet `<select>`, filters sheets (all vs one), renders each via `renderSubSheetOutput`, then `equalizeRowHeights()`.
- `renderSubSheetOutput(sheet, game)` — builds the full premium sheet HTML string (see §7).
- `fmtNZDate(dateStr)` — formats a date as `dd MMM yyyy` (`en-NZ`); empty arg = today.
- `equalizeRowHeights()` — normalises `tr.data-row` heights per table.
- `ensureHtml2Canvas(cb)` / `shareImage()` — lazy-load html2canvas then snapshot `#preview-output` to PNG.

**Rotation description logic** (`generateRotationDesc`): for `1-for-1` → `"1 for 1 <inter> - <starter>"`. For N-player cycles it chains `<inter> for <last starter> / <starter[i]> for <starter[i-1]> ... / <starter[0]> for <inter>`, i.e. a full round-robin returning to the interchange.

## 7. The Printable Document (`renderSubSheetOutput` / `renderPreview`)
Output is written into `#preview-output` (one `.sub-sheet-output` block per sheet, joined). Per sheet, top to bottom:
- **Charcoal masthead** (`.doc-masthead`): left = `ROTATION SHEET` kicker (`.mh-kicker`) + game name (`.mh-title`); right = three gold-value items (`.mh-item` → `.mh-eyebrow` label + `.mh-value`) for **Quarter / Date / Formation**. 3px gold bottom border.
- **Meta strip** (`.doc-meta`): four `.meta-cell`s with 9px uppercase labels + bold values — **Formation, Goalkeepers (`gk1 / gk2`), Quarter, Key Rule** ("Take the same person off each time"). Hairline dividers.
- **Rotation table** (`.rotation-table`, fixed layout, 9 cols via `<colgroup>`): charcoal `<thead>` header row with coloured labels — **POS** (left), **START** (green, colspan 4), **INTERCHANGE** (red), **1ST ROT** (blue), **ROTATION** (grey), **TIMING** (gold/yellow).
- **Position-group section headers** (`tr.section-head` → `.sec-label`): DEFENDERS / MIDFIELD / STRIKERS (`sectionLabels` map), 11px uppercase, gold 2px underline. Emitted whenever `group.section` changes.
- **Data rows** (`tr.data-row`, alternating `.zebra`): POS cell (`td.cell-pos`) has gold 3px left accent bar + bold label; up to 4 starter cells (`td.cell-starter` with green-dot `.starter-name` + optional gold `.pos-tag`, empty = `td.cell-starter-empty` em-dash); interchange red pill (`.cell-interchange` → `.inter-pill`); 1st-rot minute chip (`.cell-1st-rot` → `.min-chip`, e.g. `4'`); rotation description (`.cell-rotation`, wraps); blue timing (`.cell-timing`).
- **Position notes row** (`tr.pos-notes-row`, only if `positionNotes` set): `.notes-text` with a `NOTE` eyebrow rendered via `::before`.
- **GK section**: its own section header `Goalkeeper`, then a `tr.data-row.gk-row` — `GK` pos, `gk1 or gk2` name spanning the starter columns, fixed `15'` chip, `"<gk> — full quarter"` rotation, `15 on` timing.
- **Footer** (`.doc-footer`): left = `<teamName> · Rotation Sheet`; right = `Generated <date> · Private & Confidential`.

Key classes: `.sub-sheet-output`, `.doc-masthead`, `.doc-meta`, `.doc-tablewrap`, `.rotation-table`, `.section-head`/`.sec-label`, `.data-row`/`.zebra`, `.cell-pos`, `.cell-starter`/`.starter-name`/`.pos-tag`, `.cell-interchange`/`.inter-pill`, `.cell-1st-rot`/`.min-chip`, `.cell-rotation`, `.cell-timing`, `.gk-row`, `.pos-notes-row`/`.notes-text`, `.doc-footer`.

## 8. ELV8 Premium Design System
Font Montserrat. App chrome bg #1c1c1c, panel #262626, panel2 #2f2f2f, inset #161616, borders #3c3c3c/#4a4a4a, gold #D4AF37 (hover #b8952e; DARK #1c1c1c text on gold), text #fff, muted #c4c4c4, dim #8c8c8c; functional good #2a9d3a, bad #e23b2e, blue #3aa7e0, orange #f4a259, yellow #f3c012, gk-green #7bc47f. NO "ELV8" wordmark. Premium document: white #fff body, ink #15171a; charcoal #1c1c1c masthead + 3px gold bottom border; eyebrow meta strip (9px uppercase #9a9a9a labels + bold values, hairlines #eef0f1/#e7e7e7); NO heavy gridlines (hairlines + zebra #fafbfc); colour as signal not blocks (START green #2a9d3a, INTERCHANGE red #e23b2e, TIMING gold/blue); section headers 11px uppercase letter-spacing 2px charcoal + 2px gold underline; charcoal footer (team/programme · "Generated <date> · Private & Confidential"); @media print A4 LANDSCAPE (table is wide), ~8mm, remove shadow/radius, print-color-adjust:exact. Share Image: ensureHtml2Canvas(cb) loads html2canvas from cdnjs; shareImage() targets `#preview-output` → PNG; needs internet, falls back to Print.

## 9. Conventions & Gotchas
- `addSubSheet` **REQUIRES a `gameId` argument** — there is no implicit "current game" fallback.
- `getPlayerName` is a local closure inside both `generateRotationDesc` and `renderSubSheetOutput`; there is no global one. It resolves player ids to names.
- `equalizeRowHeights` targets `tr.data-row` and runs inside a `requestAnimationFrame` after preview render; heights are measured live so the preview must be visible/laid out.
- GK plays the **full quarter** (`15'` chip, `15 on` timing) — it is hard-coded, not derived from any group.
- `gk1` / `gk2` are **names**, not ids. The interchange is a **single `{playerId}` object**, not an array.
- Dropdowns in the builder exclude any player already assigned in another group (and other slots of the same group), so a player can't be double-booked.
- Preview needs both a **game selected** and (if "Show all" is off) a **sheet selected**, otherwise it shows a placeholder.
- Default presets are always re-merged on load — editing the `DEFAULT_PRESETS` array in code is the only way to change a shipped preset; a stored copy won't override it.

## 10. How to Extend / Common Tasks
- **Add a formation preset:** append an object to `DEFAULT_PRESETS` with a fresh id and a `groups` array (`posLabel`, `section`, `starterCount`, `rotationType`). It auto-appears in the builder's Formation select.
- **Add a position:** add the code to `POSITIONS`; it flows into roster dropdowns.
- **Add a rotation type:** extend `rotTypes` in `renderGroupPanel`, the starter-count maps in `changeRotationType` and `applyFormationPreset`, and the cycle logic in `generateRotationDesc`.
- **Change the printable layout:** edit `renderSubSheetOutput` (HTML) plus the `.rotation-table` / `.doc-*` CSS. Keep the 9-column `<colgroup>` and `maxStarters = 4` consistent.
- **Add a meta field on the sheet:** add a `.meta-cell` in the masthead/meta strip in `renderSubSheetOutput` and a corresponding builder control + mutator (`updateSheet`).
- **Tweak the footer team label:** set `game.teamName` (currently only read, never written by UI).

## 11. Driving It in the Preview Harness
`state` lives in lexical scope (a top-level `let`), reachable from `preview_eval` but **not** on `window`. The default squad auto-loads on first run. To seed a previewable sheet without clicking through the modal:
1. Either call `createGame()` after filling the new-game modal inputs, OR construct directly: pick player ids, set `state.games[0]` (or push a Game) with `selectedSquad: [ids]`, `gk1`/`gk2` (names).
2. Push a SubSheet onto `game.subSheets` with populated `groups` (each group's `starters: [{playerId, posTag}]` and `interchange: {playerId}` using real player ids; set `section`, `posLabel`, `rotationType`, `firstRotationMin`, `timing`).
3. Set `state.ui.currentGameId`, call `saveState()`.
4. `switchView('preview')`, set the `#preview-game-select` value to the game id and fire `renderPreview()` (or just call `renderPreviewControls()` after setting `currentGameId`).
5. Inspect output in `#preview-output`.
Easiest path: drive `applyFormationPreset(presetId)` on a fresh sheet to get correctly-shaped groups, then fill `playerId`s.

## 12. Full Source Code
The complete source is appended below this line verbatim.

<!--FULL_SOURCE_BELOW-->


```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hockey Rotation Generator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif; background: #1c1c1c; color: #fff; min-height: 100vh; }

/* NAV */
nav { background: #262626; display: flex; align-items: center; padding: 0 20px; border-bottom: 2px solid #3c3c3c; }
nav .logo { font-weight: 900; font-size: 18px; padding: 14px 0; margin-right: 30px; color: #D4AF37; }
nav button { background: none; border: none; color: #8c8c8c; font-size: 14px; padding: 14px 18px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; }
nav button:hover { color: #fff; }
nav button.active { color: #fff; border-bottom-color: #D4AF37; }

/* VIEWS */
.view { display: none; padding: 24px; max-width: 1400px; margin: 0 auto; }
.view.active { display: block; }

/* COMMON */
h2 { font-size: 22px; margin-bottom: 16px; color: #D4AF37; }
h3 { font-size: 16px; margin-bottom: 10px; color: #c4c4c4; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .2s; }
.btn-primary { background: #D4AF37; color: #1c1c1c; }
.btn-primary:hover { background: #b8952e; }
.btn-secondary { background: #2f2f2f; color: #fff; }
.btn-secondary:hover { background: #3c3c3c; }
.btn-danger { background: #e23b2e; color: #fff; }
.btn-danger:hover { background: #b92e23; }
.btn-success { background: #2a9d3a; color: #fff; }
.btn-success:hover { background: #34b847; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
input, select, textarea { padding: 6px 10px; border: 1px solid #3c3c3c; border-radius: 4px; background: #161616; color: #fff; font-size: 13px; }
input:focus, select:focus { outline: none; border-color: #D4AF37; }
select { cursor: pointer; }
label { font-size: 13px; color: #c4c4c4; display: block; margin-bottom: 4px; }
.row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mt-16 { margin-top: 16px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

/* ROSTER TABLE */
.roster-table { width: 100%; border-collapse: collapse; }
.roster-table th { background: #D4AF37; padding: 8px 12px; text-align: left; font-size: 13px; color: #1c1c1c; }
.roster-table td { padding: 4px 6px; border-bottom: 1px solid #3c3c3c; }
.roster-table td input { width: 100%; background: transparent; border: 1px solid transparent; color: #fff; padding: 4px 6px; }
.roster-table td input:hover { border-color: #3c3c3c; }
.roster-table td input:focus { border-color: #D4AF37; background: #161616; }
.roster-table tr:hover { background: #2f2f2f; }
.roster-table td select { background: #161616; width: 80px; }

/* GAME LIST */
.game-card { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 16px; margin-bottom: 10px; cursor: pointer; transition: all .2s; }
.game-card:hover { border-color: #D4AF37; }
.game-card.active { border-color: #D4AF37; background: #2f2f2f; }
.game-card h4 { color: #fff; margin-bottom: 4px; }
.game-card small { color: #8c8c8c; }

/* SHEET LIST */
.sheet-card { background: #161616; border: 1px solid #3c3c3c; border-radius: 4px; padding: 10px 14px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all .2s; }
.sheet-card:hover { border-color: #D4AF37; }
.sheet-card.active { border-color: #D4AF37; background: #2f2f2f; }
.sheet-card .info { display: flex; flex-direction: column; }
.sheet-card .info span:first-child { font-weight: 600; font-size: 14px; }
.sheet-card .info span:last-child { font-size: 12px; color: #8c8c8c; }
.sheet-actions { display: flex; gap: 4px; }

/* BUILDER */
.builder-layout { display: flex; gap: 20px; }
.builder-sidebar { width: 280px; flex-shrink: 0; }
.builder-main { flex: 1; min-width: 0; }
.group-panel { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
.group-panel .group-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.group-panel .group-header input[type="text"] { width: 100px; font-weight: 700; }
.group-panel .players-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.group-panel .players-row select { width: 140px; }
.group-panel .players-row input[type="text"] { width: 50px; font-size: 12px; }
.group-panel .config-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.group-panel .config-row input[type="number"] { width: 55px; }
.group-panel .config-row input[type="text"] { width: 130px; }
.rotation-desc { font-size: 12px; color: #3aa7e0; margin-top: 6px; padding: 4px 8px; background: #161616; border-radius: 3px; }
.usage-panel { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 12px; }
.usage-panel .player-chip { display: inline-block; padding: 3px 8px; margin: 2px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.usage-panel .player-chip.assigned { background: #2a9d3a; color: #fff; }
.usage-panel .player-chip.unassigned { background: #e23b2e; color: #fff; }

/* SECTION LABEL */
.section-divider { text-align: center; font-size: 11px; font-weight: 700; color: #D4AF37; letter-spacing: 2px; margin: 14px 0 6px; text-transform: uppercase; }

/* ===================================================== */
/* OUTPUT / PREVIEW — ELV8 PREMIUM DOCUMENT SYSTEM        */
/* ===================================================== */
.sub-sheet-output {
  background: #fff; color: #15171a; margin: 0 auto 30px; max-width: 1180px;
  font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif;
  border: 1px solid #e7e7e7; border-radius: 10px; overflow: hidden;
  box-shadow: 0 18px 50px rgba(0,0,0,0.32);
}

/* MASTHEAD */
.doc-masthead { display: flex; justify-content: space-between; align-items: center;
  padding: 22px 30px; background: #1c1c1c; border-bottom: 3px solid #D4AF37; }
.doc-masthead .mh-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.doc-masthead .mh-kicker { font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  font-weight: 700; color: #8c8c8c; }
.doc-masthead .mh-title { font-size: 21px; font-weight: 800; color: #fff; line-height: 1.1;
  text-transform: uppercase; letter-spacing: 0.5px; }
.doc-masthead .mh-right { display: flex; gap: 26px; flex-shrink: 0; }
.doc-masthead .mh-item { display: flex; flex-direction: column; gap: 2px; text-align: right; }
.doc-masthead .mh-eyebrow { font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
  font-weight: 600; color: #7a7a7a; }
.doc-masthead .mh-value { font-size: 13px; font-weight: 700; color: #D4AF37;
  text-transform: uppercase; letter-spacing: 0.3px; }

/* META STRIP */
.doc-meta { display: flex; align-items: stretch; background: #fff; padding: 0 30px;
  border-bottom: 1px solid #e7e7e7; }
.doc-meta .meta-cell { display: flex; flex-direction: column; gap: 3px; padding: 13px 26px 13px 0;
  margin-right: 26px; border-right: 1px solid #ededed; }
.doc-meta .meta-cell:last-child { border-right: none; margin-right: 0; padding-right: 0; }
.doc-meta .meta-label { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
  font-weight: 600; color: #9a9a9a; }
.doc-meta .meta-value { font-size: 15px; font-weight: 700; color: #15171a; }

/* TABLE WRAP */
.doc-tablewrap { padding: 20px 30px 8px; }

/* SECTION HEADER (within tbody as a banded row) */
.rotation-table tr.section-head td { border: none; padding: 18px 4px 6px; text-align: left; }
.rotation-table tr.section-head:first-child td { padding-top: 4px; }
.rotation-table tr.section-head .sec-label { display: inline-block; font-size: 11px;
  text-transform: uppercase; letter-spacing: 2px; font-weight: 800; color: #1c1c1c;
  padding-bottom: 3px; border-bottom: 2px solid #D4AF37; }

/* TABLE BASE — no heavy gridlines */
.rotation-table { width: 100%; border-collapse: collapse; table-layout: fixed;
  font-variant-numeric: tabular-nums; }
.rotation-table th, .rotation-table td { border: none; padding: 9px 8px; font-size: 13px;
  text-align: center; vertical-align: middle; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; }

/* Header row — charcoal band */
.rotation-table thead th { background: #1c1c1c; color: #cfcfcf; font-weight: 700; font-size: 10px;
  letter-spacing: 1.5px; text-transform: uppercase; padding: 11px 6px; }
.rotation-table thead th.col-pos { text-align: left; padding-left: 14px; }
.rotation-table thead th.col-start { color: #6fce7d; }
.rotation-table thead th.col-interchange { color: #f08a82; }
.rotation-table thead th.col-1st-rot { color: #8fcdf0; }
.rotation-table thead th.col-rotation { color: #cfcfcf; }
.rotation-table thead th.col-timing { color: #f0d36a; }
.rotation-table thead th:first-child { border-top-left-radius: 6px; }
.rotation-table thead th:last-child { border-top-right-radius: 6px; }

/* Data rows — hairline separators + zebra */
.rotation-table tr.data-row td { border-bottom: 1px solid #eef0f1; }
.rotation-table tr.data-row.zebra td { background: #fafbfc; }

/* POS cell — gold left accent bar + dark label */
.rotation-table td.cell-pos { text-align: left; font-weight: 800; font-size: 13px; color: #15171a;
  padding-left: 14px; border-left: 3px solid #D4AF37; letter-spacing: 0.3px; }

/* Starter cells — refined: white cell, green dot + bold dark name, gold tag */
.rotation-table td.cell-starter { font-weight: 700; font-size: 13px; color: #15171a; }
.rotation-table td.cell-starter .starter-name { display: inline-flex; align-items: center; gap: 6px; }
.rotation-table td.cell-starter .starter-name::before { content: ''; width: 6px; height: 6px;
  border-radius: 50%; background: #2a9d3a; flex-shrink: 0; }
.rotation-table td.cell-starter .pos-tag { display: inline-block; margin-left: 5px;
  font-size: 10px; font-weight: 800; color: #b8952e; letter-spacing: 0.5px; }
.rotation-table td.cell-starter-empty { color: #d4d4d4; }

/* Interchange — refined red pill */
.rotation-table td.cell-interchange { font-size: 13px; }
.rotation-table td.cell-interchange .inter-pill { display: inline-block; padding: 4px 12px;
  background: #fdeceb; color: #c5271c; border: 1px solid #f3b6b1; border-radius: 100px;
  font-weight: 700; font-size: 12px; letter-spacing: 0.3px; }

/* 1st rotation — charcoal minute chip */
.rotation-table td.cell-1st-rot { font-weight: 800; font-size: 14px; color: #1c1c1c; }
.rotation-table td.cell-1st-rot .min-chip { display: inline-block; min-width: 26px; padding: 3px 8px;
  background: #f1f2f3; border-radius: 5px; font-variant-numeric: tabular-nums; }

/* Rotation description */
.rotation-table td.cell-rotation { font-size: 11.5px; font-weight: 600; color: #45494e;
  text-align: center; white-space: normal; word-wrap: break-word; line-height: 1.4; }

/* Timing — blue accent */
.rotation-table td.cell-timing { font-weight: 700; font-size: 12px; color: #1f6f9c; }

/* GK row */
.rotation-table tr.gk-row td { border-bottom: none; }
.rotation-table td.cell-gk-start { font-weight: 700; font-size: 13px; text-align: left;
  padding-left: 14px; color: #15171a; }
.rotation-table td.cell-gk-start .starter-name::before { content: ''; display: inline-block;
  width: 6px; height: 6px; border-radius: 50%; background: #2a9d3a; margin-right: 6px; }

/* Position notes row */
.rotation-table tr.pos-notes-row td { border-bottom: 1px solid #eef0f1; padding: 0 0 9px; }
.rotation-table tr.pos-notes-row .notes-text { display: inline-block; font-size: 10.5px;
  font-weight: 600; color: #8a6d1a; text-align: left; letter-spacing: 0.2px; }
.rotation-table tr.pos-notes-row .notes-text::before { content: 'NOTE'; display: inline-block;
  margin-right: 8px; font-size: 8.5px; letter-spacing: 1.5px; font-weight: 800; color: #c2a23e; }

/* FOOTER */
.doc-footer { display: flex; justify-content: space-between; align-items: center;
  padding: 12px 30px; background: #1c1c1c; margin-top: 14px; }
.doc-footer .ft-left { font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
  font-weight: 700; color: #d8d8d8; }
.doc-footer .ft-left .ft-accent { color: #D4AF37; }
.doc-footer .ft-right { font-size: 9.5px; letter-spacing: 0.8px; color: #8c8c8c; font-weight: 500; }

/* PREVIEW CONTROLS */
.preview-controls { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }

/* MODAL */
.modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100; justify-content: center; align-items: center; }
.modal-overlay.active { display: flex; }
.modal { background: #262626; border: 1px solid #3c3c3c; border-radius: 8px; padding: 24px; min-width: 400px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.modal h3 { margin-bottom: 16px; }
.modal .form-group { margin-bottom: 12px; }
.modal .form-group input, .modal .form-group select { width: 100%; }
.modal .modal-actions { display: flex; gap: 8px; margin-top: 16px; }

/* CHECKBOX GRID */
.player-checkbox-grid { display: flex; flex-direction: column; gap: 0; margin: 12px 0; }
.player-checkbox-grid label { display: flex; align-items: center; gap: 0; font-size: 15px; font-weight: 600; padding: 8px 12px; background: #161616; cursor: pointer; border-bottom: 1px solid #2f2f2f; }
.player-checkbox-grid label:hover { background: #2f2f2f; }
.player-checkbox-grid label .player-num { width: 36px; font-size: 14px; color: #8c8c8c; font-weight: 400; flex-shrink: 0; }
.player-checkbox-grid label input[type="checkbox"] { cursor: pointer; width: 20px; height: 20px; margin-right: 14px; flex-shrink: 0; accent-color: #D4AF37; }
.player-checkbox-grid label .player-label { flex: 1; }

/* PRINT */
@media print {
  body { background: #fff; }
  nav, .view:not(#view-preview), .preview-controls, .no-print { display: none !important; }
  #view-preview { display: block !important; padding: 0; }
  .sub-sheet-output { page-break-after: always; margin: 0; max-width: none; width: 100%;
    border: none; border-radius: 0; box-shadow: none; }
  .sub-sheet-output:last-child { page-break-after: avoid; }
  .rotation-table thead th:first-child, .rotation-table thead th:last-child { border-radius: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 landscape; margin: 8mm; }
}

/* SCROLLABLE */
.builder-sidebar { max-height: calc(100vh - 100px); overflow-y: auto; position: sticky; top: 80px; }
</style>
</head>
<body>

<nav>
  <span class="logo">🏑 HOCKEY ROTATION GENERATOR</span>
  <button class="active" onclick="switchView('roster')">Squad Roster</button>
  <button onclick="switchView('games')">Game Manager</button>
  <button onclick="switchView('builder')">Sub Sheet Builder</button>
  <button onclick="switchView('preview')">Preview / Print</button>
</nav>

<div id="view-roster" class="view active">
  <h2>Squad Roster</h2>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="addPlayer()">+ Add Player</button>
    <button class="btn btn-secondary" onclick="exportSquad()">Export JSON</button>
    <button class="btn btn-secondary" onclick="importSquad()">Import JSON</button>
  </div>
  <table class="roster-table">
    <thead><tr><th>#</th><th>Player Name</th><th>Primary Pos</th><th>Alt Pos</th><th></th></tr></thead>
    <tbody id="roster-body"></tbody>
  </table>
</div>

<div id="view-games" class="view">
  <h2>Game Manager</h2>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="showNewGameModal()">+ New Game</button>
  </div>
  <div class="row">
    <div style="width:300px;">
      <h3>Games</h3>
      <div id="game-list"></div>
    </div>
    <div style="flex:1; min-width:0;">
      <div id="game-detail"></div>
    </div>
  </div>
</div>

<div id="view-builder" class="view">
  <div id="builder-content"></div>
</div>

<div id="view-preview" class="view">
  <div class="preview-controls no-print">
    <select id="preview-game-select" onchange="renderPreview()">
      <option value="">Select a game...</option>
    </select>
    <label style="display:inline; margin: 0;"><input type="checkbox" id="preview-all" checked onchange="renderPreview()"> Show all sheets</label>
    <select id="preview-sheet-select" onchange="renderPreview()">
      <option value="">All sheets</option>
    </select>
    <button class="btn btn-primary" onclick="shareImage()">📷 Share Image</button>
    <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
  </div>
  <div id="preview-output"></div>
</div>

<!-- NEW GAME MODAL -->
<div class="modal-overlay" id="modal-new-game">
  <div class="modal">
    <h3>New Game</h3>
    <div class="form-group">
      <label>Game Name</label>
      <input type="text" id="new-game-name" placeholder="vs Australia - Match 1">
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="new-game-date">
    </div>
    <div class="form-group">
      <label>Select Squad</label>
      <div id="new-game-players" class="player-checkbox-grid"></div>
    </div>
    <div class="form-group">
      <label>GK Option 1</label>
      <select id="new-game-gk1"></select>
    </div>
    <div class="form-group">
      <label>GK Option 2</label>
      <select id="new-game-gk2"></select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="createGame()">Create Game</button>
      <button class="btn btn-secondary" onclick="closeModal('modal-new-game')">Cancel</button>
    </div>
  </div>
</div>

<script>
// =============================================
// POSITIONS
// =============================================
const POSITIONS = ['RS','CS','LS','CM','RM','LM','LH','RH','CB','FM','FD','WH','GK'];

// =============================================
// DEFAULT FORMATION PRESETS
// =============================================
const DEFAULT_PRESETS = [
  {
    id: 'p1', name: '6 @ BACK - 5 MF - 5 STR',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'LS / CS', section: 'STR', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'CM', section: 'MF', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'RM / LM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'LH / RH', section: 'DEF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'CB / FD', section: 'DEF', starterCount: 2, rotationType: '3-player-cycle' },
    ]
  },
  {
    id: 'p2', name: '5 DEF - 5 MF - 6 STR',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'LS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'RM', section: 'MF', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CM / LM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'FM / CB / WH', section: 'DEF', starterCount: 4, rotationType: '5-player-cycle' },
    ]
  },
  {
    id: 'p3', name: '3 @ BACK (5) - 6 MF - 5 STR',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'LS / CS', section: 'STR', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'RM / LM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'FM / CM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'LH / CB', section: 'DEF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'RH', section: 'DEF', starterCount: 1, rotationType: '1-for-1' },
    ]
  },
  {
    id: 'p4', name: '6 DEF - 4 MF - 6 STR',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'LS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CM / LM / RM', section: 'MF', starterCount: 3, rotationType: '4-player-cycle' },
      { posLabel: 'LH / RH', section: 'DEF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'CB / FD', section: 'DEF', starterCount: 2, rotationType: '3-player-cycle' },
    ]
  },
  {
    id: 'p5', name: '3 @ BACK - 2+2 MF - 6 STR',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'LS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'RM / LM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'FM / CM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'LH / CB / RH', section: 'DEF', starterCount: 3, rotationType: '4-player-cycle' },
    ]
  },
  {
    id: 'p8', name: '3 DEF - 2 DEEP MF - 2 HIGH MF - 3 STR',
    groups: [
      { posLabel: 'RS / CS', section: 'STR', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'LS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'AM1', section: 'MF', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'AM2', section: 'MF', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'DM1 / DM2', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'CB / LH / RH', section: 'DEF', starterCount: 3, rotationType: '4-player-cycle' },
    ]
  },
  {
    id: 'p9', name: '3 DEF - 2 DEEP MF - 2 HIGH MF - 3 STR (LOSE A PLAYER)',
    groups: [
      { posLabel: 'RS / CS', section: 'STR', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'LS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'AM1 / AM2', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'DM1 / DM2', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'CB / LH / RH', section: 'DEF', starterCount: 3, rotationType: '4-player-cycle' },
    ]
  },
  {
    id: 'p6', name: '5 DEF - 5 MF - 5 STR (LOSE A PLAYER)',
    groups: [
      { posLabel: 'RS', section: 'STR', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CS / LS', section: 'STR', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'RM', section: 'MF', starterCount: 1, rotationType: '1-for-1' },
      { posLabel: 'CM / LM', section: 'MF', starterCount: 2, rotationType: '3-player-cycle' },
      { posLabel: 'FM / CB / WH', section: 'DEF', starterCount: 4, rotationType: '5-player-cycle' },
    ]
  },
];

// =============================================
// STATE
// =============================================
const STORAGE_KEY = 'hockeyRotationApp';

let state = {
  squad: [],
  formationPresets: [...DEFAULT_PRESETS],
  games: [],
  ui: {
    currentView: 'roster',
    currentGameId: null,
    currentSheetId: null,
  }
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    squad: state.squad,
    formationPresets: state.formationPresets,
    games: state.games,
    ui: state.ui,
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      state.squad = data.squad || [];
      const savedPresets = data.formationPresets || [];
      const defaultIds = new Set(DEFAULT_PRESETS.map(p => p.id));
      const customPresets = savedPresets.filter(p => !defaultIds.has(p.id));
      state.formationPresets = [...DEFAULT_PRESETS, ...customPresets];
      state.games = data.games || [];
      if (data.ui) state.ui = { ...state.ui, ...data.ui };
    } catch(e) { console.error('Failed to load state', e); }
  }
  if (state.squad.length === 0) loadDefaultSquad();
}

function loadDefaultSquad() {
  const players = [
    ['HIHA','RS',''],['HICKSON','RS',''],['LANE','CS','LS'],['THOMAS','LS','CS'],
    ['BAKER','LS','CS'],['WOODS','CM','FM'],['BUSCHL','CM','RH'],['J.MORRISON','LM','RM'],
    ['HOULBROOKE','RM',''],['SARIKAYA','RM','LM'],['C.MORRISON','LH','RH'],['CULHANE','RH','LH'],
    ['NEILD','RH','CM'],['RUSSELL','CB',''],['YORSTON','FM','CB'],['READ','CB','FM'],
    ['DIXON','GK',''],['RUETSCH','GK',''],['LETT','LH',''],['ELMES','RS','CS'],
    ['NELSON','RM',''],
  ];
  state.squad = players.map((p, i) => ({ id: i+1, name: p[0], primaryPos: p[1], altPos: p[2] }));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

// =============================================
// VIEW SWITCHING
// =============================================
function switchView(view) {
  state.ui.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => {
    if (b.textContent.toLowerCase().includes(view === 'roster' ? 'squad' : view === 'games' ? 'game' : view === 'builder' ? 'sub sheet' : 'preview')) b.classList.add('active');
  });
  if (view === 'roster') renderRoster();
  if (view === 'games') renderGames();
  if (view === 'builder') renderBuilder();
  if (view === 'preview') renderPreviewControls();
  saveState();
}

// =============================================
// ROSTER VIEW
// =============================================
function renderRoster() {
  const tbody = document.getElementById('roster-body');
  tbody.innerHTML = state.squad.map((p, i) => `
    <tr>
      <td style="width:40px; color:#8c8c8c;">${i+1}</td>
      <td><input type="text" value="${p.name}" onchange="updatePlayer(${p.id},'name',this.value.toUpperCase())" style="font-weight:700;"></td>
      <td><select onchange="updatePlayer(${p.id},'primaryPos',this.value)">${POSITIONS.map(pos => `<option value="${pos}" ${p.primaryPos===pos?'selected':''}>${pos}</option>`).join('')}</select></td>
      <td><select onchange="updatePlayer(${p.id},'altPos',this.value)"><option value="">-</option>${POSITIONS.map(pos => `<option value="${pos}" ${p.altPos===pos?'selected':''}>${pos}</option>`).join('')}</select></td>
      <td style="width:40px;"><button class="btn btn-danger btn-sm" onclick="removePlayer(${p.id})">×</button></td>
    </tr>
  `).join('');
}

function updatePlayer(id, field, value) {
  const p = state.squad.find(p => p.id === id);
  if (p) { p[field] = value; saveState(); }
}

function addPlayer() {
  const maxId = state.squad.reduce((m, p) => Math.max(m, p.id), 0);
  state.squad.push({ id: maxId + 1, name: '', primaryPos: 'RS', altPos: '' });
  saveState(); renderRoster();
}

function removePlayer(id) {
  state.squad = state.squad.filter(p => p.id !== id);
  saveState(); renderRoster();
}

function exportSquad() {
  const blob = new Blob([JSON.stringify(state.squad, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'squad-roster.json'; a.click();
}

function importSquad() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try { state.squad = JSON.parse(ev.target.result); saveState(); renderRoster(); }
      catch(e) { alert('Invalid JSON file'); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

// =============================================
// GAMES VIEW
// =============================================
function renderGames() {
  const list = document.getElementById('game-list');
  list.innerHTML = state.games.map(g => `
    <div class="game-card ${state.ui.currentGameId === g.id ? 'active' : ''}" onclick="selectGame('${g.id}')">
      <h4>${g.name}</h4>
      <small>${g.date || ''} · ${g.subSheets.length} sub sheet${g.subSheets.length !== 1 ? 's' : ''}</small>
    </div>
  `).join('') || '<p style="color:#8c8c8c;font-size:13px;">No games yet. Create one to get started.</p>';
  renderGameDetail();
}

function selectGame(id) {
  state.ui.currentGameId = id;
  state.ui.currentSheetId = null;
  saveState(); renderGames();
}

function renderGameDetail() {
  const detail = document.getElementById('game-detail');
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) { detail.innerHTML = '<p style="color:#8c8c8c;">Select a game to manage sub sheets.</p>'; return; }

  let html = `<h3>${game.name}</h3>
    <p style="color:#8c8c8c;font-size:13px;margin-bottom:12px;">${game.date || 'No date'} · GK: ${game.gk1} / ${game.gk2}</p>
    <div class="toolbar">
      <button class="btn btn-primary btn-sm" onclick="addSubSheet('${game.id}')">+ Add Sub Sheet</button>
      <button class="btn btn-danger btn-sm" onclick="deleteGame('${game.id}')">Delete Game</button>
    </div>
    <div>`;

  game.subSheets.forEach((s, i) => {
    html += `<div class="sheet-card" onclick="editSheet('${game.id}','${s.id}')">
      <div class="info">
        <span>${s.quarterLabel}</span>
        <span>${s.formationName || 'No formation selected'}</span>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();duplicateSheet('${game.id}','${s.id}')">Dup</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteSheet('${game.id}','${s.id}')">×</button>
      </div>
    </div>`;
  });

  html += '</div>';
  detail.innerHTML = html;
}

function showNewGameModal() {
  document.getElementById('new-game-name').value = '';
  document.getElementById('new-game-date').value = '';
  const playersDiv = document.getElementById('new-game-players');
  playersDiv.innerHTML = state.squad.filter(p => p.primaryPos !== 'GK').map((p, i) => `
    <label><span class="player-num">${i + 1}</span><input type="checkbox" value="${p.id}" checked><span class="player-label">${p.name} - ${p.primaryPos}</span></label>
  `).join('');
  const gkPlayers = state.squad.filter(p => p.primaryPos === 'GK');
  document.getElementById('new-game-gk1').innerHTML = gkPlayers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  document.getElementById('new-game-gk2').innerHTML = gkPlayers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  if (gkPlayers.length > 1) document.getElementById('new-game-gk2').value = gkPlayers[1].name;
  document.getElementById('modal-new-game').classList.add('active');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function createGame() {
  const name = document.getElementById('new-game-name').value || 'New Game';
  const date = document.getElementById('new-game-date').value;
  const checked = [...document.querySelectorAll('#new-game-players input:checked')].map(c => parseInt(c.value));
  const gk1 = document.getElementById('new-game-gk1').value;
  const gk2 = document.getElementById('new-game-gk2').value;
  const game = {
    id: uid(), name, date, gk1, gk2,
    selectedSquad: checked,
    subSheets: [],
  };
  state.games.push(game);
  state.ui.currentGameId = game.id;
  closeModal('modal-new-game');
  saveState(); renderGames();
}

function deleteGame(id) {
  if (!confirm('Delete this game?')) return;
  state.games = state.games.filter(g => g.id !== id);
  if (state.ui.currentGameId === id) state.ui.currentGameId = null;
  saveState(); renderGames();
}

function addSubSheet(gameId) {
  const game = state.games.find(g => g.id === gameId);
  if (!game) return;
  const qNum = game.subSheets.length + 1;
  const sheet = {
    id: uid(),
    quarterLabel: 'QUARTER ' + (qNum <= 4 ? qNum : qNum),
    formationPresetId: '',
    formationName: '',
    groups: [],
  };
  game.subSheets.push(sheet);
  saveState();
  editSheet(gameId, sheet.id);
}

function duplicateSheet(gameId, sheetId) {
  const game = state.games.find(g => g.id === gameId);
  if (!game) return;
  const original = game.subSheets.find(s => s.id === sheetId);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = uid();
  copy.quarterLabel = original.quarterLabel + ' (copy)';
  game.subSheets.push(copy);
  saveState(); renderGames();
}

function deleteSheet(gameId, sheetId) {
  const game = state.games.find(g => g.id === gameId);
  if (!game) return;
  game.subSheets = game.subSheets.filter(s => s.id !== sheetId);
  saveState(); renderGames();
}

function editSheet(gameId, sheetId) {
  state.ui.currentGameId = gameId;
  state.ui.currentSheetId = sheetId;
  saveState();
  switchView('builder');
}

// =============================================
// BUILDER VIEW
// =============================================
function renderBuilder() {
  const container = document.getElementById('builder-content');
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) { container.innerHTML = '<p style="color:#8c8c8c;">Select a game and sub sheet from Game Manager first.</p>'; return; }
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet) { container.innerHTML = '<p style="color:#8c8c8c;">Select a sub sheet to edit.</p>'; return; }

  const availablePlayers = state.squad.filter(p => game.selectedSquad.includes(p.id) && p.primaryPos !== 'GK');
  const assignedIds = new Set();
  sheet.groups.forEach(g => {
    (g.starters || []).forEach(s => { if (s.playerId) assignedIds.add(s.playerId); });
    if (g.interchange && g.interchange.playerId) assignedIds.add(g.interchange.playerId);
  });

  let html = `
    <div class="toolbar">
      <button class="btn btn-secondary btn-sm" onclick="switchView('games')">← Back to Game</button>
      <span style="color:#8c8c8c;font-size:13px;">${game.name} → ${sheet.quarterLabel}</span>
    </div>
    <div class="builder-layout">
      <div class="builder-main">
        <div class="row mb-16">
          <div>
            <label>Quarter Label</label>
            <input type="text" value="${sheet.quarterLabel}" onchange="updateSheet('quarterLabel', this.value)" style="width:160px;">
          </div>
          <div>
            <label>Formation</label>
            <select onchange="applyFormationPreset(this.value)" style="width:280px;">
              <option value="">Select formation...</option>
              ${state.formationPresets.map(fp => `<option value="${fp.id}" ${sheet.formationPresetId === fp.id ? 'selected' : ''}>${fp.name}</option>`).join('')}
            </select>
          </div>
        </div>`;

  // Group panels
  let lastSection = '';
  sheet.groups.forEach((group, gi) => {
    if (group.section !== lastSection) {
      const sectionLabels = { STR: 'STRIKERS', MF: 'MIDFIELD', DEF: 'DEFENDERS' };
      html += `<div class="section-divider">${sectionLabels[group.section] || group.section}</div>`;
      lastSection = group.section;
    }
    html += renderGroupPanel(group, gi, availablePlayers, sheet);
  });

  html += `</div>
      <div class="builder-sidebar">
        <div class="usage-panel">
          <h3>Player Usage</h3>
          ${availablePlayers.map(p => {
            const assigned = assignedIds.has(p.id);
            return `<span class="player-chip ${assigned ? 'assigned' : 'unassigned'}">${p.name}</span>`;
          }).join('')}
        </div>
        <div class="mt-16">
          <button class="btn btn-success" onclick="switchView('preview')" style="width:100%;">Preview Output →</button>
        </div>
      </div>
    </div>`;

  container.innerHTML = html;
}

function renderGroupPanel(group, gi, availablePlayers, sheet) {
  const rotTypes = ['1-for-1','3-player-cycle','4-player-cycle','5-player-cycle'];
  const sections = ['STR','MF','DEF'];
  const starterCount = group.starters ? group.starters.length : 0;

  // Determine assigned player IDs in OTHER groups
  const otherAssigned = new Set();
  sheet.groups.forEach((g, i) => {
    if (i === gi) return;
    (g.starters || []).forEach(s => { if (s.playerId) otherAssigned.add(s.playerId); });
    if (g.interchange && g.interchange.playerId) otherAssigned.add(g.interchange.playerId);
  });
  // Also exclude this group's own assignments from each other dropdown
  const thisStarters = (group.starters || []).map(s => s.playerId).filter(Boolean);
  const thisInterchange = group.interchange?.playerId || null;
  const allThisGroup = [...thisStarters, thisInterchange].filter(Boolean);

  function playerOptions(currentId, excludeIds) {
    const excl = new Set([...otherAssigned, ...excludeIds]);
    if (currentId) excl.delete(currentId);
    let opts = '<option value="">-</option>';
    availablePlayers.forEach(p => {
      if (excl.has(p.id) && p.id !== currentId) return;
      opts += `<option value="${p.id}" ${p.id === currentId ? 'selected' : ''}>${p.name}</option>`;
    });
    return opts;
  }

  let starters = group.starters || [];
  let html = `<div class="group-panel">
    <div class="group-header">
      <input type="text" value="${group.posLabel}" onchange="updateGroup(${gi},'posLabel',this.value)" placeholder="POS">
      <select onchange="updateGroup(${gi},'section',this.value)">${sections.map(s => `<option value="${s}" ${group.section===s?'selected':''}>${s}</option>`).join('')}</select>
      <select onchange="changeRotationType(${gi},this.value)">
        ${rotTypes.map(rt => `<option value="${rt}" ${group.rotationType===rt?'selected':''}>${rt}</option>`).join('')}
      </select>
      <span style="color:#8c8c8c;font-size:11px;">1st Rot:</span>
      <input type="number" value="${group.firstRotationMin || ''}" onchange="updateGroup(${gi},'firstRotationMin',parseInt(this.value)||0)" min="0" max="15" style="width:50px;">
      <span style="color:#8c8c8c;font-size:11px;">Timing:</span>
      <input type="text" value="${group.timing || ''}" onchange="updateGroup(${gi},'timing',this.value)" placeholder="e.g. 4 on 4 off" style="width:130px;">
    </div>
    <div class="players-row">
      <span style="color:#2a9d3a;font-size:11px;width:60px;">STARTERS:</span>`;

  for (let si = 0; si < starters.length; si++) {
    const s = starters[si];
    const excl = allThisGroup.filter(id => id !== s.playerId);
    html += `<select onchange="updateStarter(${gi},${si},'playerId',parseInt(this.value)||0)">${playerOptions(s.playerId, excl)}</select>`;
    html += `<input type="text" value="${s.posTag || ''}" onchange="updateStarter(${gi},${si},'posTag',this.value.toUpperCase())" placeholder="POS" style="width:45px;">`;
  }

  html += `</div><div class="players-row">
    <span style="color:#f4a259;font-size:11px;width:60px;">INTER:</span>`;
  const intExcl = allThisGroup.filter(id => id !== thisInterchange);
  html += `<select onchange="updateInterchange(${gi},parseInt(this.value)||0)">${playerOptions(thisInterchange, intExcl)}</select>`;
  html += `</div>
    <div class="config-row">
      <span style="color:#8c8c8c;font-size:11px;">Notes:</span>
      <input type="text" value="${group.positionNotes || ''}" onchange="updateGroup(${gi},'positionNotes',this.value)" placeholder="Position notes..." style="width:300px;">
    </div>
    <div class="rotation-desc">${generateRotationDesc(group)}</div>
  </div>`;

  return html;
}

function updateSheet(field, value) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet) return;
  sheet[field] = value;
  saveState();
}

function updateGroup(gi, field, value) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet || !sheet.groups[gi]) return;
  sheet.groups[gi][field] = value;
  saveState(); renderBuilder();
}

function updateStarter(gi, si, field, value) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet || !sheet.groups[gi]) return;
  if (!sheet.groups[gi].starters[si]) return;
  sheet.groups[gi].starters[si][field] = value;
  saveState(); renderBuilder();
}

function updateInterchange(gi, playerId) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet || !sheet.groups[gi]) return;
  if (!sheet.groups[gi].interchange) sheet.groups[gi].interchange = {};
  sheet.groups[gi].interchange.playerId = playerId;
  saveState(); renderBuilder();
}

function changeRotationType(gi, rotType) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet || !sheet.groups[gi]) return;
  const group = sheet.groups[gi];
  group.rotationType = rotType;
  const needed = rotType === '1-for-1' ? 1 : rotType === '3-player-cycle' ? 2 : rotType === '4-player-cycle' ? 3 : 4;
  while (group.starters.length < needed) group.starters.push({ playerId: 0, posTag: '' });
  while (group.starters.length > needed) group.starters.pop();
  saveState(); renderBuilder();
}

function applyFormationPreset(presetId) {
  const game = state.games.find(g => g.id === state.ui.currentGameId);
  if (!game) return;
  const sheet = game.subSheets.find(s => s.id === state.ui.currentSheetId);
  if (!sheet) return;
  const preset = state.formationPresets.find(fp => fp.id === presetId);
  if (!preset) return;

  sheet.formationPresetId = presetId;
  sheet.formationName = preset.name;
  sheet.groups = preset.groups.map(pg => {
    const starterCount = pg.rotationType === '1-for-1' ? 1 : pg.rotationType === '3-player-cycle' ? 2 : pg.rotationType === '4-player-cycle' ? 3 : 4;
    return {
      posLabel: pg.posLabel,
      section: pg.section,
      rotationType: pg.rotationType,
      starters: Array.from({ length: starterCount }, () => ({ playerId: 0, posTag: '' })),
      interchange: { playerId: 0 },
      firstRotationMin: 4,
      timing: '',
      positionNotes: '',
    };
  });
  saveState(); renderBuilder();
}

// =============================================
// ROTATION DESCRIPTION GENERATOR
// =============================================
function generateRotationDesc(group) {
  if (!group.starters || !group.interchange) return '';
  const getPlayerName = (id) => {
    const p = state.squad.find(p => p.id === id);
    return p ? p.name : '?';
  };

  const starters = group.starters.filter(s => s.playerId);
  const inter = group.interchange.playerId;
  if (starters.length === 0 || !inter) return '<span style="color:#8c8c8c;">Assign players to generate rotation</span>';

  const intName = getPlayerName(inter);

  if (group.rotationType === '1-for-1') {
    return `1 for 1 ${intName} - ${getPlayerName(starters[0].playerId)}`;
  }

  // N-player cycle
  const starterNames = starters.map(s => getPlayerName(s.playerId));
  const parts = [];
  parts.push(`${intName} for ${starterNames[starterNames.length - 1]}`);
  for (let i = starterNames.length - 1; i > 0; i--) {
    parts.push(`${starterNames[i]} for ${starterNames[i - 1]}`);
  }
  parts.push(`${starterNames[0]} for ${intName}`);
  return parts.join(' / ');
}

// =============================================
// PREVIEW / OUTPUT
// =============================================
function renderPreviewControls() {
  const gameSel = document.getElementById('preview-game-select');
  gameSel.innerHTML = '<option value="">Select a game...</option>' +
    state.games.map(g => `<option value="${g.id}" ${state.ui.currentGameId === g.id ? 'selected' : ''}>${g.name}</option>`).join('');
  renderPreview();
}

function renderPreview() {
  const gameId = document.getElementById('preview-game-select').value;
  const game = state.games.find(g => g.id === gameId);
  const output = document.getElementById('preview-output');
  const sheetSel = document.getElementById('preview-sheet-select');

  if (!game) { output.innerHTML = '<p style="color:#8c8c8c;">Select a game to preview.</p>'; return; }

  sheetSel.innerHTML = '<option value="">All sheets</option>' +
    game.subSheets.map(s => `<option value="${s.id}">${s.quarterLabel} - ${s.formationName || 'No formation'}</option>`).join('');

  const showAll = document.getElementById('preview-all').checked;
  const selectedSheetId = document.getElementById('preview-sheet-select').value;

  let sheets = game.subSheets;
  if (!showAll && selectedSheetId) {
    sheets = sheets.filter(s => s.id === selectedSheetId);
  }

  output.innerHTML = sheets.map(s => renderSubSheetOutput(s, game)).join('');
  // Equalize row heights within each sheet
  requestAnimationFrame(() => equalizeRowHeights());
}

function ensureHtml2Canvas(cb) {
  if (window.html2canvas) return cb();
  const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  sc.onload = () => cb();
  sc.onerror = () => alert('Could not load the image tool — it needs an internet connection. Use Print instead.');
  document.head.appendChild(sc);
}
function shareImage() {
  const node = document.querySelector('#preview-output');
  if (!node) { alert('Build the rotation first.'); return; }
  ensureHtml2Canvas(() => {
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      .then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'rotation-sheet.png'; a.click(); })
      .catch(e => alert('Image export failed: ' + e.message));
  });
}

function equalizeRowHeights() {
  document.querySelectorAll('.rotation-table').forEach(table => {
    const dataRows = table.querySelectorAll('tr.data-row');
    if (dataRows.length === 0) return;
    // Reset heights first
    dataRows.forEach(row => row.style.height = 'auto');
    // Find the tallest row
    let maxHeight = 0;
    dataRows.forEach(row => {
      const h = row.getBoundingClientRect().height;
      if (h > maxHeight) maxHeight = h;
    });
    // Apply uniform height
    dataRows.forEach(row => row.style.height = maxHeight + 'px');
  });
}

function fmtNZDate(dateStr) {
  try {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return ''; }
}

function renderSubSheetOutput(sheet, game) {
  const getPlayerName = (id) => {
    const p = state.squad.find(p => p.id === id);
    return p ? p.name : '';
  };

  const maxStarters = 4; // Always 4 columns for starters
  const colSpanAll = maxStarters + 5;
  const sectionLabels = { STR: 'STRIKERS', MF: 'MIDFIELD', DEF: 'DEFENDERS' };

  // Derive masthead / meta context
  const matchTitle = game.name || 'ROTATION SHEET';
  const dateLabel = fmtNZDate(game.date);
  const formation = sheet.formationName || 'NO FORMATION';
  const gkPair = `${game.gk1 || 'DIXON'} / ${game.gk2 || 'RUETSCH'}`;

  let html = `<div class="sub-sheet-output">
    <div class="doc-masthead">
      <div class="mh-left">
        <span class="mh-kicker">Rotation Sheet</span>
        <span class="mh-title">${matchTitle}</span>
      </div>
      <div class="mh-right">
        <div class="mh-item"><span class="mh-eyebrow">Quarter</span><span class="mh-value">${sheet.quarterLabel || '—'}</span></div>
        <div class="mh-item"><span class="mh-eyebrow">Date</span><span class="mh-value">${dateLabel || '—'}</span></div>
        <div class="mh-item"><span class="mh-eyebrow">Formation</span><span class="mh-value">${formation}</span></div>
      </div>
    </div>

    <div class="doc-meta">
      <div class="meta-cell"><span class="meta-label">Formation</span><span class="meta-value">${formation}</span></div>
      <div class="meta-cell"><span class="meta-label">Goalkeepers</span><span class="meta-value">${gkPair}</span></div>
      <div class="meta-cell"><span class="meta-label">Quarter</span><span class="meta-value">${sheet.quarterLabel || '—'}</span></div>
      <div class="meta-cell"><span class="meta-label">Key Rule</span><span class="meta-value">Take the same person off each time</span></div>
    </div>

    <div class="doc-tablewrap">
    <table class="rotation-table">
      <colgroup>
        <col style="width:90px;">
        <col style="width:128px;">
        <col style="width:128px;">
        <col style="width:128px;">
        <col style="width:128px;">
        <col style="width:120px;">
        <col style="width:80px;">
        <col>
        <col style="width:120px;">
      </colgroup>
      <thead><tr>
        <th class="col-pos">POS</th>
        <th class="col-start" colspan="${maxStarters}">Start</th>
        <th class="col-interchange">Interchange</th>
        <th class="col-1st-rot">1st Rot</th>
        <th class="col-rotation">Rotation</th>
        <th class="col-timing">Timing</th>
      </tr></thead>
      <tbody>`;

  let lastSection = '';

  sheet.groups.forEach((group, gi) => {
    // Section header row
    if (group.section !== lastSection) {
      html += `<tr class="section-head"><td colspan="${colSpanAll}"><span class="sec-label">${sectionLabels[group.section] || group.section}</span></td></tr>`;
      lastSection = group.section;
    }

    const zebra = gi % 2 === 1 ? ' zebra' : '';

    // Main row
    html += `<tr class="data-row${zebra}">`;
    html += `<td class="cell-pos">${group.posLabel}</td>`;

    // Starter cells
    const starters = group.starters || [];
    for (let i = 0; i < maxStarters; i++) {
      if (i < starters.length && starters[i].playerId) {
        const name = getPlayerName(starters[i].playerId);
        const tag = starters[i].posTag ? `<span class="pos-tag">${starters[i].posTag}</span>` : '';
        html += `<td class="cell-starter"><span class="starter-name">${name}</span>${tag}</td>`;
      } else {
        html += `<td class="cell-starter-empty">—</td>`;
      }
    }

    // Interchange
    const interName = group.interchange?.playerId ? getPlayerName(group.interchange.playerId) : '';
    html += `<td class="cell-interchange">${interName ? `<span class="inter-pill">${interName}</span>` : ''}</td>`;

    // 1st rotation
    html += `<td class="cell-1st-rot">${group.firstRotationMin ? `<span class="min-chip">${group.firstRotationMin}'</span>` : ''}</td>`;

    // Rotation description
    html += `<td class="cell-rotation">${generateRotationDesc(group)}</td>`;

    // Timing
    html += `<td class="cell-timing">${group.timing || ''}</td>`;
    html += `</tr>`;

    // Position notes row
    if (group.positionNotes) {
      html += `<tr class="pos-notes-row${zebra}">
        <td></td>
        <td colspan="${maxStarters + 4}" class="notes-text">${group.positionNotes}</td>
      </tr>`;
    }
  });

  // GK section
  const gkName = `${game.gk1 || 'DIXON'} or ${game.gk2 || 'RUETSCH'}`;
  html += `<tr class="section-head"><td colspan="${colSpanAll}"><span class="sec-label">Goalkeeper</span></td></tr>`;
  html += `<tr class="data-row gk-row">
    <td class="cell-pos">GK</td>
    <td class="cell-gk-start" colspan="${maxStarters}"><span class="starter-name">${gkName}</span></td>
    <td class="cell-interchange"></td>
    <td class="cell-1st-rot"><span class="min-chip">15'</span></td>
    <td class="cell-rotation">${gkName} — full quarter</td>
    <td class="cell-timing">15 on</td>
  </tr>`;

  html += `</tbody></table>`;
  html += `</div>`;

  // FOOTER
  const teamName = game.teamName || 'Performance Programme';
  html += `<div class="doc-footer">
    <div class="ft-left">${teamName} <span class="ft-accent">· Rotation Sheet</span></div>
    <div class="ft-right">Generated ${fmtNZDate()} · Private &amp; Confidential</div>
  </div>`;
  html += `</div>`;
  return html;
}

// =============================================
// INIT
// =============================================
loadState();
renderRoster();
if (state.ui.currentView) switchView(state.ui.currentView);
</script>
</body>
</html>

```
