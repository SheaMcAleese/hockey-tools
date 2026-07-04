# Match Lineup — Design & Build Reference
> Reload this file to re-engage Claude for work on this app. Canonical source: `ELV8 Suite/match-lineup.html` (mirrored to `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`). Preview staging: `/tmp/elv8preview/`.

## 1. Purpose
A match-day lineup tool. You lay out a hockey lineup on one full pitch, drag-and-drop player tokens ("chips") into position, and produce a clean printable / shareable lineup graphic.

Two modes:
- **Two-team (vs) mode** — Home team (attacks right, occupies left half) vs Away team (attacks left, occupies right half) on the same pitch. Each team gets its own position bar (home top, away bottom).
- **Single-team mode** — one team spread across the full pitch, one position bar on top, no away team.

Supports ~20 real nation/country colour presets (kit identity colours), a manual roster with country tagging that auto-filters players into the team you are building against, four formation presets, position bars that double as a sub/bench strip, and PNG share + browser print output. Fully offline, single HTML file, localStorage-backed.

## 2. Architecture
- **Single file:** `match-lineup.html` — HTML + inline `<style>` + inline vanilla `<script>`. No build step, no framework, no dependencies bundled.
- **Font:** Montserrat (Google Fonts, weights 400/600/700/800/900) with system fallbacks.
- **Offline:** Registers a service worker (`navigator.serviceWorker.register('sw.js')`) and references `manifest.json` (PWA). The one runtime CDN dependency is **html2canvas** (loaded lazily, only when "Share Image" is used — see §8).
- **Persistence key (exact constant):** `const STORE_KEY = 'hockeyMatchup';` — single localStorage entry, JSON-serialized `state`.
- **Rendering model:** views are rendered by building HTML strings and assigning `el.innerHTML`. No virtual DOM. Every mutation calls `save()` then re-renders the active view (usually `renderEditor()`).

## 3. Data Model

### Top-level `state`
```js
let state = { matchups: [], roster: [], ui: { view: 'list', currentId: null } };
```
Also gains migration flags at runtime: `state._migratedLR` (boolean).

### Matchup object (one lineup)
Created by `createMatchup()` / `createSingleTeam()`:
```js
{
  id: uid(),                 // Date.now()-base36 + random suffix
  title: 'Match Lineup',     // editable heading
  singleTeam: false,         // true => single-team full-pitch mode
  home: { name:'NZ',        players: [...], ...DEFAULT_HOME }, // team config (see below)
  away: { name:'Opposition', players: [...], ...DEFAULT_AWAY },
  homePosBar: [ {label:'GK', name:''}, {label:'D', name:''}, ... ], // 11 segments
  awayPosBar: [ {label:'S', name:''}, ... ]   // reversed order; [] in single mode
}
```

### Team config (the `home` / `away` object)
```js
{ name:'NZ', players:[], chipBg, chipText, chipBorder, barBg, barText }
```
The five colour keys are spread in from `DEFAULT_HOME` / `DEFAULT_AWAY` at creation and overwritten by `applyTeamColor()` / individual colour inputs.

### Player / token shape (an entry in `team.players`)
```js
{ id: uid(), pos: 'CM', name: 'SMITH', x: 23.4, y: 50.0 }
```
- `pos` — uppercase position code (one of `POSITIONS`, or free text).
- `name` — uppercased display name (may be `''`).
- `x` / `y` — **percentage** coordinates (0–100) of the token centre on the pitch, one decimal. Tokens use CSS `left:{x}%; top:{y}%; transform: translate(-50%,-50%)`.

### Position-bar segment
```js
{ label: 'GK'|'D'|'MF'|'S' (or any string), name: '' }   // name = optional sub/player name
```
Legacy string segments are auto-migrated to objects (see §4). `seg()` / `ensurePosBar()` normalize.

### Roster player (global, shared across matchups)
```js
{ id: uid(), pos: 'CM', name: 'SMITH', country: 'New Zealand' }   // country may be ''
```

### Position constants
```js
POSITIONS = ['GK','LB','RB','LH','RH','CB','CM','LM','RM','LS','CS','RS'];
POS_CATS  = ['GK','D','MF','S'];
POS_CAT_POSITIONS = { GK:['GK'], D:['LB','RB','LH','RH','CB'], MF:['CM','LM','RM'], S:['LS','CS','RS'] };
POS_TO_CAT = { GK:'GK', LB:'D', ... CM:'MF', ... LS:'S', CS:'S', RS:'S' };
LR_SWAP    = { LH:'RH', RH:'LH', LB:'RB', RB:'LB', LM:'RM', RM:'LM', LS:'RS', RS:'LS' };   // left/right mirror for away team
```

### TEAM_COLORS — nation presets (REAL team identity — do NOT rebrand)
`COUNTRY_NAMES` lists **20** countries; `TEAM_COLORS` maps each to a 5-key colour object:
```js
'New Zealand': { chipBg:'#000000', chipText:'#ffffff', chipBorder:'#333333', barBg:'#000000', barText:'#ffffff' }
```
The 20 nations: New Zealand, Australia, Netherlands, Belgium, India, Germany, England, Argentina, Spain, South Korea, Malaysia, France, Japan, Ireland, South Africa, Pakistan, Great Britain, Canada, Chile, USA.
**These are real national-team kit identity colours (black NZ, orange Netherlands, green/gold Australia, etc.). They must NEVER be changed to ELV8 gold or otherwise rebranded.** Only app chrome uses the ELV8 palette.

### Defaults (used when no preset applied)
```js
DEFAULT_HOME = { chipBg:'#ffffff', chipText:'#111111', chipBorder:'#cccccc', barBg:'#c9a94e', barText:'#000000' };  // pale chip + gold bar
DEFAULT_AWAY = { chipBg:'#c87533', chipText:'#ffffff', chipBorder:'#a05a20', barBg:'#111111', barText:'#ffffff' };  // orange chip + dark bar
```
Match-day colour distinction for the default away/home uses **orange** (`#c87533`), not gold, so the two teams read apart.

### FORMATION_PRESETS
Four presets keyed by name: `1-4-3-3`, `1-3-4-3`, `1-4-4-2`, `1-3-3-3-1`. Each is an array of `{pos, x, y}` laid out for the home team on the left half (x ~5–55, y 0–100). `applyPreset()` mirrors x and swaps L/R for the away team, and spreads x for single mode.

## 4. State & Persistence
- `save()` → `localStorage.setItem(STORE_KEY, JSON.stringify(state))`.
- `load()` → parse the stored JSON and `Object.assign(state, d)`; guarantees `state.roster` exists.
- `uid()` → `Date.now().toString(36) + Math.random().toString(36).substr(2,5)`.
- `esc()` → HTML-escapes `&"<>` for safe innerHTML injection.
- **Migrations run once at init (after `load()`):**
  1. `_migratedLR` — one-time pass swapping away players' positions through `LR_SWAP` (historical fix so away positions mirror correctly), then sets the flag.
  2. Pos-bar string→object migration: any `homePosBar`/`awayPosBar` whose first element is a string is mapped to `{label, name:''}`.
  3. Ensures every roster player has a `country` field.
- `ui.view` and `ui.currentId` persist, so a reload restores the last view and selected matchup.

## 5. Views & Navigation
Four views, four nav buttons. Containers: `#view-list`, `#view-editor`, `#view-roster`, `#view-preview`. Active view gets `.active` (CSS `display:block`).

- **`showView(v)`** is the single navigation entry point. It toggles `.active` classes, highlights the matching nav button (index map `{list:0, editor:1, roster:2, preview:3}`), calls the matching render function (`renderList` / `renderEditor` / `renderRoster` / `renderPreview`), and `save()`s `ui.view`. (There is no separate `switchView`; `showView` is it.)
- **Matchups (list)** — `renderList()`. Cards for each matchup with Dup / delete (×). `createMatchup()` (two-team) and `createSingleTeam()` (single) buttons.
- **Editor** — `renderEditor()`. Team config panels + the live drag pitch + roster sidebar.
- **Roster** — `renderRoster()`. Global player roster grouped by category, with country tagging and a country filter.
- **Preview / Print** — `renderPreview()` + `renderPreviewContent()`. Selectable matchup → builds the printable `.output-wrap`. Share Image / Print buttons.

## 6. Key Functions
| Function | Purpose |
|---|---|
| `createMatchup()` | New two-team matchup; default 11-segment home/away pos bars (home GK→S, away reversed); opens editor. |
| `createSingleTeam()` | New single-team matchup; `singleTeam:true`, `awayPosBar:[]`; opens editor. |
| `openMatchup(id)` / `dupMatchup(id)` / `delMatchup(id)` | Open / deep-clone / delete a matchup. |
| `tc(m, team)` | Returns the resolved team colours, falling back key-by-key to `DEFAULT_HOME`/`DEFAULT_AWAY`. Used everywhere colours are needed. |
| `fieldSVG()` | Returns the SVG string of pitch markings (see §7). Reused by editor and output. |
| `renderEditor()` | Builds the whole editor: toolbar, single-team toggle, home (and away) config panels with preset buttons + colour pickers + roster picker + formation buttons, then `.editor-layout` with pos bars, `.field-wrap` pitch with absolutely-positioned `.mu-player` tokens, and the sidebar player lists. Calls `setupTouchDrag()` at the end. |
| `renderRosterPicker(team, teamName)` | Manual add-player row + per-category roster dropdowns filtered to the team's country. |
| `renderPosBarHtml(bar, team, colors)` | Renders editor pos-bar segments (clickable → `pickPosBarPlayer`). |
| `pickPosBarPlayer(team, index)` | Opens a native `<select>` overlay (or `prompt`) to assign a sub/player name to a pos-bar segment. |
| `applyTeamColor(team, name)` | Applies a `TEAM_COLORS` preset to a team and sets `team.name`. |
| `applyPreset(team, presetName)` | Lays players out per a formation preset; mirrors for away, spreads for single; preserves existing names by matching pos; rebuilds the pos bar from resulting categories. |
| `addPlayer` / `addFromRoster` / `removePlayer` / `renamePlayer` | Token CRUD. Away adds get x in right half and L/R-swapped pos. |
| `toggleSingleTeam()` | Flips mode; rescales home x (×1.8 spread / ÷1.8 compress) and restores away pos bar. |
| `renderRoster` / `addRosterPlayer` / `removeRosterPlayer` | Global roster management with `country-list` datalist. |
| `renderPreview()` | Builds the no-print toolbar (matchup `<select>`, Share Image, Print) + `#preview-content`. |
| `renderPreviewContent()` | Builds one `.output-wrap` (see §7) for the selected matchup. |
| `startDrag` / `dropOnField` | HTML5 drag: records `dragState`, computes %-coords on drop, clamps x to the team's half (single: full width). |
| `setupTouchDrag()` | Touch fallback: a cloned "ghost" follows the finger; on touchend over the pitch it calls `dropOnField` with synthetic coords. |
| `ensureHtml2Canvas(cb)` | Lazy-loads html2canvas from cdnjs; alerts + falls back to Print on failure. |
| `shareImage()` | Renders `.output-wrap` to a 2× PNG via html2canvas and triggers a download (`match-lineup.png`). |

## 7. The Pitch & Output

### Pitch surface (mowing stripes)
Both `.field-wrap` (editor) and `.output-field` (print) use:
```css
aspect-ratio: 1.5 / 1;
background: repeating-linear-gradient(90deg, #38782f 0 8.333%, #3f8236 8.333% 16.666%);
box-shadow: inset 0 0 90px rgba(0,0,0,.30);
```
`.field-wrap` additionally has 3px side rails (`border-left/right: 3px solid #2d6627`). The stripes create six vertical mowing bands across the pitch.

### `fieldSVG()` — markings (`viewBox="0 0 1000 690"`, `preserveAspectRatio="none"`)
- **Boundary:** `<rect x="10" y="8" width="980" height="674">` at ~88% white.
- **Centre line:** vertical `x=500`, full height.
- **Two 23m lines:** vertical at `x=255` and `x=745`, stroke-opacity .7.
- **The two shooting circles (D)** as flat-topped domes (white, stroke-width 3.2):
  - Left: `M 10 139 A 160 183 0 0 1 170 322 L 170 368 A 160 183 0 0 1 10 551`
  - Right (mirror): `M 990 139 A 160 183 0 0 0 830 322 L 830 368 A 160 183 0 0 0 990 551`
- **Dashed 5m broken lines** (white .5, `stroke-dasharray="9,9"`, radii 215/246):
  - Left: `M 10 76 A 215 246 0 0 1 225 322 L 225 368 A 215 246 0 0 1 10 614`
  - Right mirror at x=775/990.
- **Goals:** white rects `x=2,y=320,w=9,h=50` (left) and `x=989,...` (right), rx 1.
- **Spots:** penalty spots `circle cx=80 cy=345` and `cx=920 cy=345`; centre spot `cx=500 cy=345`; r=4.

### Output container (`renderPreviewContent`)
One `.output-wrap` (white card, `max-width:1000px`) per preview, structured top→bottom:
1. `.output-title` (dark bar, gold title — note: this is app-chrome gold, fine to keep).
2. **Home position bar** `.out-pos-bar` (one `.pos-seg` per segment, home `barBg`/`barText`).
3. **`.output-field`** pitch (same gradient/markings; absolutely-positioned `.out-player` tokens for home, plus away tokens in two-team mode).
4. **Away position bar** (two-team mode only; away colours).

`shareImage()` targets `.output-wrap` → a single PNG. Print CSS shows only `#view-preview`, forces colour-exact printing, and page-breaks after each `.output-wrap` in landscape.

## 8. ELV8 Premium Design System (VERBATIM)
Font Montserrat. App chrome bg #1c1c1c, panel #262626, panel2 #2f2f2f, inset #161616, borders #3c3c3c/#4a4a4a, gold #D4AF37 (hover #b8952e; DARK #1c1c1c text on gold), text #fff, muted #c4c4c4, dim #8c8c8c; functional good #2a9d3a, bad #e23b2e, blue #3aa7e0, orange #f4a259, yellow #f3c012, gk-green #7bc47f. NO "ELV8" wordmark.

CRITICAL: the ~20 nation/country colour presets and team kit colours are REAL team identity and must NOT be changed to gold/rebranded — only app chrome uses the palette.

Share Image: `ensureHtml2Canvas(cb)` loads html2canvas from cdnjs; `shareImage()` targets `.output-wrap` → one PNG; needs internet, falls back to Print.

(In-file note: the nav logo reads "MATCH LINEUP" — the app title, not an "ELV8" wordmark. The default away/home colours use orange `#c87533` for team distinction.)

## 9. Conventions & Gotchas
- **Preserve the nation presets and the pitch SVG when editing.** The `TEAM_COLORS` map and `fieldSVG()` geometry are load-bearing identity/accuracy; do not casually restyle them.
- **One `.output-wrap` per preview.** `shareImage()` and print logic assume `document.querySelector('.output-wrap')` finds the single current preview card.
- **Drag uses both touch and mouse handlers.** HTML5 drag (`startDrag`/`dropOnField`) for desktop; `setupTouchDrag()` clones a ghost for touch. `setupTouchDrag()` must be re-run after every `renderEditor()` (it is, at the end of the function) because the DOM is rebuilt.
- **Coordinates are percentages, not pixels.** All token positions are 0–100 % of the pitch box; x is clamped per team half (home ≤50 in vs mode, away ≥50, single full width).
- **Away positions are L/R-mirrored** via `LR_SWAP` when added/preset-applied, so an away "LH" displays as "RH" etc. The `_migratedLR` migration backfilled this.
- **Pos bars are objects** `{label, name}`; legacy string bars are migrated at init. Always pass through `ensurePosBar()`/`seg()` before reading.
- **Everything is innerHTML string-built**; user input is `esc()`-escaped. Keep using `esc()` for any new injected values.
- Title gold (`#D4AF37`) in `.output-title` is intentional app chrome and is fine.

## 10. How to Extend / Common Tasks
- **Add a nation preset:** append the country name to `COUNTRY_NAMES` AND add a matching entry to `TEAM_COLORS` with the 5 keys (`chipBg, chipText, chipBorder, barBg, barText`) using that nation's REAL kit colours. Both the preset buttons and the roster datalist pick it up automatically.
- **Adjust pitch markings:** edit `fieldSVG()` only. Keep the `viewBox="0 0 1000 690"` and `preserveAspectRatio="none"` so it stretches to the 1.5:1 box. Mirror any left-side path change to the right side.
- **Add a formation preset:** add a key to `FORMATION_PRESETS` with an array of `{pos, x, y}` for the home/left layout (x ~5–55). `applyPreset()` handles away mirroring and single-team spreading and the pos-bar rebuild automatically; the button list is generated from `Object.keys(FORMATION_PRESETS)`.
- **Add a new position code:** update `POSITIONS`, `POS_TO_CAT`, the relevant `POS_CAT_POSITIONS` array, and `LR_SWAP` if it has a mirror.
- **Change default team colours:** edit `DEFAULT_HOME` / `DEFAULT_AWAY` (keep the orange-vs-dark distinction so teams read apart).

## 11. Driving It in the Preview Harness
Serve from `/tmp/elv8preview/` (copy the file in). State and all functions are reachable via lexical scope in `preview_eval` (everything is a top-level `const`/`function` in the inline script).
- Create test data: `createMatchup()` (two-team) or `createSingleTeam()`.
- Switch views: `showView('list'|'editor'|'roster'|'preview')`.
- The live editor pitch is `.field-wrap` (id `#field-drop`); tokens are `.mu-player`.
- The print/share output is `.output-wrap` inside `#view-preview` (built by `renderPreviewContent()`); tokens are `.out-player`.
- To inspect persisted state: `JSON.parse(localStorage.getItem('hockeyMatchup'))`.
- Apply colours/formations programmatically: `applyTeamColor('home','Netherlands')`, `applyPreset('home','1-4-3-3')`.

## 12. Full Source Code
The complete source is appended below this line verbatim.

<!--FULL_SOURCE_BELOW-->


```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#D4AF37">
<link rel="manifest" href="manifest.json">
<title>Match Lineup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif; background: #1c1c1c; color: #fff; min-height: 100vh; }

nav { background: #262626; display: flex; align-items: center; padding: 0 20px; border-bottom: 2px solid #3c3c3c; flex-wrap: wrap; }
nav .logo { font-weight: 900; font-size: 18px; padding: 14px 0; margin-right: 30px; color: #D4AF37; letter-spacing: 1px; }
nav button { background: none; border: none; color: #8c8c8c; font-size: 14px; padding: 14px 18px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; }
nav button:hover { color: #fff; }
nav button.active { color: #fff; border-bottom-color: #D4AF37; }

.view { display: none; padding: 24px; max-width: 1400px; margin: 0 auto; }
.view.active { display: block; }

h2 { font-size: 22px; margin-bottom: 16px; color: #D4AF37; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .2s; }
.btn-primary { background: #D4AF37; color: #1c1c1c; }
.btn-primary:hover { background: #b8952e; }
.btn-secondary { background: #2f2f2f; color: #fff; }
.btn-secondary:hover { background: #3c3c3c; }
.btn-danger { background: #e23b2e; color: #fff; }
.btn-danger:hover { background: #b8311f; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
input, select { padding: 6px 10px; border: 1px solid #3c3c3c; border-radius: 4px; background: #161616; color: #fff; font-size: 13px; }
input:focus, select:focus { outline: none; border-color: #D4AF37; }
input[type="color"] { padding: 2px; width: 36px; height: 32px; cursor: pointer; }
label { font-size: 13px; color: #c4c4c4; display: block; margin-bottom: 4px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.section { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 16px; margin-bottom: 16px; }

.match-card { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 14px; margin-bottom: 8px; cursor: pointer; transition: all .2s; display: flex; justify-content: space-between; align-items: center; }
.match-card:hover { border-color: #D4AF37; }
.match-card .info h4 { color: #fff; font-size: 14px; margin-bottom: 2px; }
.match-card .info small { color: #8c8c8c; font-size: 12px; }

.editor-layout { display: flex; gap: 16px; align-items: flex-start; }
.editor-main { flex: 1; min-width: 0; }
.editor-sidebar { width: 220px; flex-shrink: 0; }

.pos-bar { display: flex; min-height: 36px; border-radius: 4px; overflow: hidden; }
.pos-bar.top { margin-bottom: 0; border-radius: 4px 4px 0 0; }
.pos-bar.bottom { margin-top: 0; border-radius: 0 0 4px 4px; }
.pos-bar .pos-seg { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; letter-spacing: 1px; border-right: 1px solid rgba(0,0,0,.2); cursor: pointer; transition: opacity .15s; padding: 3px 2px; line-height: 1.2; }
.pos-bar .pos-seg:hover { opacity: .7; }
.pos-bar .pos-seg:last-child { border-right: none; }
.pos-bar .pos-seg .seg-name { font-size: 8px; font-weight: 600; opacity: .8; margin-top: 1px; }

.field-wrap { position: relative; width: 100%; aspect-ratio: 1.5 / 1; overflow: hidden; background: repeating-linear-gradient(90deg, #38782f 0 8.333%, #3f8236 8.333% 16.666%); box-shadow: inset 0 0 90px rgba(0,0,0,.30); border-left: 3px solid #2d6627; border-right: 3px solid #2d6627; }
.field-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

.mu-player { position: absolute; transform: translate(-50%, -50%); cursor: grab; user-select: none; z-index: 10; transition: box-shadow .15s; }
.mu-player:active { cursor: grabbing; z-index: 100; }
.mu-player:hover { z-index: 50; }
.mu-player .mu-label { font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 3px; white-space: nowrap; text-align: center; min-width: 60px; box-shadow: 0 2px 6px rgba(0,0,0,.3); border: 2px solid; line-height: 1.3; }
.mu-player .mu-label .mu-name { font-size: 9px; font-weight: 600; opacity: .75; display: block; }

.sidebar-section { margin-bottom: 16px; }
.sidebar-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #D4AF37; text-transform: uppercase; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #3c3c3c; }
.sidebar-player { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 4px; user-select: none; font-size: 12px; margin-bottom: 2px; }
.sidebar-player:hover { background: #2f2f2f; }
.sidebar-player .sp-pos { font-weight: 700; color: #8c8c8c; width: 28px; font-size: 10px; }

.team-config { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-end; flex-wrap: wrap; }
.team-config .tc-group { display: flex; flex-direction: column; }
.team-config .tc-group label { font-size: 11px; }
.team-config .tc-group input:not([type="color"]) { width: 140px; }

.formation-presets { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.formation-presets button { padding: 3px 8px; font-size: 11px; background: #161616; border: 1px solid #3c3c3c; color: #c4c4c4; border-radius: 3px; cursor: pointer; }
.formation-presets button:hover { border-color: #D4AF37; color: #fff; }

.country-presets { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.country-presets button { padding: 3px 8px; font-size: 10px; border: 1px solid #3c3c3c; border-radius: 3px; cursor: pointer; font-weight: 600; transition: all .15s; }
.country-presets button:hover { transform: scale(1.05); }

.roster-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.roster-cat { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 14px; }
.roster-cat h3 { font-size: 14px; color: #D4AF37; margin-bottom: 10px; }
.roster-item { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; border-radius: 4px; font-size: 13px; margin-bottom: 3px; }
.roster-item:hover { background: #2f2f2f; }
.roster-item .ri-pos { font-size: 10px; font-weight: 700; color: #8c8c8c; margin-right: 6px; }
.roster-item .ri-country { font-size: 9px; color: #8c8c8c; margin-left: 4px; }
.roster-add { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
.roster-add input { flex: 1; min-width: 80px; }
.roster-add select { width: 60px; }

.roster-picker { margin-top: 6px; }

.color-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 8px; }
.color-row .cg { display: flex; flex-direction: column; }
.color-row .cg label { font-size: 10px; color: #8c8c8c; }

/* Toggle switch */
.toggle-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.toggle-row label { margin: 0; font-size: 13px; cursor: pointer; }
.toggle { position: relative; width: 42px; height: 22px; background: #3c3c3c; border-radius: 11px; cursor: pointer; transition: background .2s; flex-shrink: 0; }
.toggle.on { background: #D4AF37; }
.toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: left .2s; }
.toggle.on::after { left: 22px; }

.output-wrap { background: #fff; max-width: 1000px; margin: 0 auto 30px; overflow: hidden; }
.output-field { position: relative; width: 100%; aspect-ratio: 1.5 / 1; overflow: hidden; background: repeating-linear-gradient(90deg, #38782f 0 8.333%, #3f8236 8.333% 16.666%); box-shadow: inset 0 0 90px rgba(0,0,0,.30); }
.output-field .field-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.out-player { position: absolute; transform: translate(-50%, -50%); }
.out-player .out-label { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 3px; white-space: nowrap; text-align: center; min-width: 55px; border: 2px solid; box-shadow: 0 1px 4px rgba(0,0,0,.3); line-height: 1.3; }
.out-player .out-label .out-name { font-size: 8px; font-weight: 600; opacity: .75; display: block; }
.out-pos-bar { display: flex; min-height: 32px; }
.out-pos-bar .pos-seg { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; letter-spacing: 1px; border-right: 1px solid rgba(0,0,0,.2); padding: 2px; line-height: 1.2; }
.out-pos-bar .pos-seg:last-child { border-right: none; }
.out-pos-bar .pos-seg .seg-name { font-size: 7px; font-weight: 600; opacity: .8; margin-top: 1px; }
.output-title { text-align: center; padding: 10px; background: #1c1c1c; }
.output-title h3 { font-size: 16px; font-weight: 900; color: #D4AF37 !important; letter-spacing: 2px; }

/* Roster country filter */
.roster-filter { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.roster-filter select { width: 180px; }

@media print {
  body { background: #fff; }
  nav, .view:not(#view-preview), .no-print { display: none !important; }
  #view-preview { display: block !important; padding: 0; }
  .output-wrap { page-break-after: always; margin: 0; }
  .output-wrap:last-child { page-break-after: avoid; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: landscape; margin: 8mm; }
}
</style>
</head>
<body>

<nav>
  <span class="logo">MATCH LINEUP</span>
  <button class="active" onclick="showView('list')">Matchups</button>
  <button onclick="showView('editor')">Editor</button>
  <button onclick="showView('roster')">Roster</button>
  <button onclick="showView('preview')">Preview / Print</button>
</nav>

<div id="view-list" class="view active"></div>
<div id="view-editor" class="view"></div>
<div id="view-roster" class="view"></div>
<div id="view-preview" class="view"></div>

<script>
const STORE_KEY = 'hockeyMatchup';
const POSITIONS = ['GK','LB','RB','LH','RH','CB','CM','LM','RM','LS','CS','RS'];
const POS_CATS = ['GK','D','MF','S'];
const POS_CAT_POSITIONS = { GK:['GK'], D:['LB','RB','LH','RH','CB'], MF:['CM','LM','RM'], S:['LS','CS','RS'] };
const POS_TO_CAT = { GK:'GK', LB:'D', RB:'D', LH:'D', RH:'D', CB:'D', CM:'MF', LM:'MF', RM:'MF', LS:'S', CS:'S', RS:'S' };
const LR_SWAP = { LH:'RH', RH:'LH', LB:'RB', RB:'LB', LM:'RM', RM:'LM', LS:'RS', RS:'LS' };
const COUNTRY_NAMES = ['New Zealand','Australia','Netherlands','Belgium','India','Germany','England','Argentina','Spain','South Korea','Malaysia','France','Japan','Ireland','South Africa','Pakistan','Great Britain','Canada','Chile','USA'];

const TEAM_COLORS = {
  'New Zealand':   { chipBg:'#000000', chipText:'#ffffff', chipBorder:'#333333', barBg:'#000000', barText:'#ffffff' },
  'Australia':     { chipBg:'#FFD700', chipText:'#004225', chipBorder:'#C9A800', barBg:'#004225', barText:'#FFD700' },
  'Netherlands':   { chipBg:'#FF6600', chipText:'#ffffff', chipBorder:'#CC5200', barBg:'#FF6600', barText:'#ffffff' },
  'Belgium':       { chipBg:'#E30613', chipText:'#FFD700', chipBorder:'#B0040F', barBg:'#E30613', barText:'#FFD700' },
  'India':         { chipBg:'#0066CC', chipText:'#ffffff', chipBorder:'#004C99', barBg:'#0066CC', barText:'#ffffff' },
  'Germany':       { chipBg:'#ffffff', chipText:'#000000', chipBorder:'#cccccc', barBg:'#000000', barText:'#ffffff' },
  'England':       { chipBg:'#ffffff', chipText:'#002B5C', chipBorder:'#cccccc', barBg:'#002B5C', barText:'#ffffff' },
  'Argentina':     { chipBg:'#75AADB', chipText:'#ffffff', chipBorder:'#5A8BB8', barBg:'#75AADB', barText:'#ffffff' },
  'Spain':         { chipBg:'#AA151B', chipText:'#F1BF00', chipBorder:'#880E13', barBg:'#AA151B', barText:'#F1BF00' },
  'South Korea':   { chipBg:'#ffffff', chipText:'#003478', chipBorder:'#cccccc', barBg:'#003478', barText:'#ffffff' },
  'Malaysia':      { chipBg:'#010066', chipText:'#FFD700', chipBorder:'#000044', barBg:'#FFD700', barText:'#010066' },
  'France':        { chipBg:'#002395', chipText:'#ffffff', chipBorder:'#001A6E', barBg:'#002395', barText:'#ffffff' },
  'Japan':         { chipBg:'#ffffff', chipText:'#BC002D', chipBorder:'#cccccc', barBg:'#BC002D', barText:'#ffffff' },
  'Ireland':       { chipBg:'#009A49', chipText:'#ffffff', chipBorder:'#007A3A', barBg:'#009A49', barText:'#ffffff' },
  'South Africa':  { chipBg:'#007749', chipText:'#FFB612', chipBorder:'#005C38', barBg:'#007749', barText:'#FFB612' },
  'Pakistan':      { chipBg:'#01411C', chipText:'#ffffff', chipBorder:'#002E13', barBg:'#01411C', barText:'#ffffff' },
  'Great Britain':  { chipBg:'#012169', chipText:'#ffffff', chipBorder:'#001244', barBg:'#012169', barText:'#ffffff' },
  'Canada':        { chipBg:'#FF0000', chipText:'#ffffff', chipBorder:'#CC0000', barBg:'#FF0000', barText:'#ffffff' },
  'Chile':         { chipBg:'#D52B1E', chipText:'#ffffff', chipBorder:'#A82218', barBg:'#D52B1E', barText:'#ffffff' },
  'USA':           { chipBg:'#002868', chipText:'#ffffff', chipBorder:'#001A44', barBg:'#002868', barText:'#ffffff' }
};

const DEFAULT_HOME = { chipBg:'#ffffff', chipText:'#111111', chipBorder:'#cccccc', barBg:'#c9a94e', barText:'#000000' };
const DEFAULT_AWAY = { chipBg:'#c87533', chipText:'#ffffff', chipBorder:'#a05a20', barBg:'#111111', barText:'#ffffff' };

const FORMATION_PRESETS = {
  '1-4-3-3': [
    { pos:'GK', x:5, y:50 },
    { pos:'LH', x:22, y:18 }, { pos:'LB', x:16, y:38 }, { pos:'RB', x:16, y:62 }, { pos:'RH', x:22, y:82 },
    { pos:'LM', x:38, y:30 }, { pos:'CM', x:35, y:50 }, { pos:'RM', x:38, y:70 },
    { pos:'LS', x:52, y:20 }, { pos:'CS', x:48, y:50 }, { pos:'RS', x:52, y:80 }
  ],
  '1-3-4-3': [
    { pos:'GK', x:5, y:50 },
    { pos:'LH', x:18, y:25 }, { pos:'CB', x:14, y:50 }, { pos:'RH', x:18, y:75 },
    { pos:'LM', x:34, y:18 }, { pos:'CM', x:30, y:40 }, { pos:'CM', x:30, y:60 }, { pos:'RM', x:34, y:82 },
    { pos:'LS', x:50, y:20 }, { pos:'CS', x:46, y:50 }, { pos:'RS', x:50, y:80 }
  ],
  '1-4-4-2': [
    { pos:'GK', x:5, y:50 },
    { pos:'LH', x:20, y:15 }, { pos:'LB', x:16, y:38 }, { pos:'RB', x:16, y:62 }, { pos:'RH', x:20, y:85 },
    { pos:'LM', x:36, y:18 }, { pos:'CM', x:33, y:40 }, { pos:'CM', x:33, y:60 }, { pos:'RM', x:36, y:82 },
    { pos:'LS', x:50, y:35 }, { pos:'RS', x:50, y:65 }
  ],
  '1-3-3-3-1': [
    { pos:'GK', x:5, y:50 },
    { pos:'LH', x:18, y:25 }, { pos:'CB', x:14, y:50 }, { pos:'RH', x:18, y:75 },
    { pos:'LM', x:32, y:25 }, { pos:'CM', x:28, y:50 }, { pos:'RM', x:32, y:75 },
    { pos:'LS', x:44, y:20 }, { pos:'CS', x:42, y:50 }, { pos:'RS', x:44, y:80 },
    { pos:'CS', x:55, y:50 }
  ]
};

let state = { matchups: [], roster: [], ui: { view: 'list', currentId: null } };
let dragState = { team: null, index: undefined };

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function load() { try { const r = localStorage.getItem(STORE_KEY); if (r) { const d = JSON.parse(r); Object.assign(state, d); if (!state.roster) state.roster = []; } } catch(e) {} }
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Ensure pos bar segment is object format
function seg(s) { return typeof s === 'string' ? { label: s, name: '' } : s; }
function ensurePosBar(bar) { return (bar || []).map(seg); }

function tc(m, team) {
  const t = m[team], d = team === 'home' ? DEFAULT_HOME : DEFAULT_AWAY;
  return { chipBg: t.chipBg||d.chipBg, chipText: t.chipText||d.chipText, chipBorder: t.chipBorder||d.chipBorder, barBg: t.barBg||d.barBg, barText: t.barText||d.barText };
}

function fieldSVG() {
  return `<svg class="field-svg" viewBox="0 0 1000 690" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="rgba(255,255,255,.88)" stroke-width="2.5">
      <rect x="10" y="8" width="980" height="674"/>
      <line x1="500" y1="8" x2="500" y2="682"/>
      <line x1="255" y1="8" x2="255" y2="682" stroke-opacity=".7"/>
      <line x1="745" y1="8" x2="745" y2="682" stroke-opacity=".7"/>
      <path d="M 10 139 A 160 183 0 0 1 170 322 L 170 368 A 160 183 0 0 1 10 551" stroke-width="3.2"/>
      <path d="M 990 139 A 160 183 0 0 0 830 322 L 830 368 A 160 183 0 0 0 990 551" stroke-width="3.2"/>
    </g>
    <g fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-dasharray="9,9">
      <path d="M 10 76 A 215 246 0 0 1 225 322 L 225 368 A 215 246 0 0 1 10 614"/>
      <path d="M 990 76 A 215 246 0 0 0 775 322 L 775 368 A 215 246 0 0 0 990 614"/>
    </g>
    <g fill="rgba(255,255,255,.9)">
      <rect x="2" y="320" width="9" height="50" rx="1"/>
      <rect x="989" y="320" width="9" height="50" rx="1"/>
    </g>
    <g fill="rgba(255,255,255,.7)">
      <circle cx="80" cy="345" r="4"/>
      <circle cx="920" cy="345" r="4"/>
      <circle cx="500" cy="345" r="4"/>
    </g>
  </svg>`;
}

// Get roster players filtered by country (case-insensitive partial match)
function rosterForTeam(teamName) {
  if (!teamName) return state.roster;
  const tn = teamName.toLowerCase();
  const matched = state.roster.filter(p => p.country && p.country.toLowerCase() === tn);
  return matched.length > 0 ? matched : state.roster;
}

function showView(v) {
  state.ui.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  const views = { list:0, editor:1, roster:2, preview:3 };
  const viewEl = document.getElementById('view-' + v);
  if (viewEl) viewEl.classList.add('active');
  const navBtns = document.querySelectorAll('nav button');
  if (navBtns[views[v]]) navBtns[views[v]].classList.add('active');
  if (v === 'list') renderList();
  else if (v === 'editor') renderEditor();
  else if (v === 'roster') renderRoster();
  else if (v === 'preview') renderPreview();
  save();
}

// =============================================
// LIST VIEW
// =============================================
function renderList() {
  const el = document.getElementById('view-list');
  let html = `<h2>Match Lineups</h2>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="createMatchup()">+ New Matchup</button>
      <button class="btn btn-secondary" onclick="createSingleTeam()">+ Single Team</button>
    </div>`;
  if (state.matchups.length === 0) {
    html += `<p style="color:#8c8c8c; text-align:center; padding:40px;">No matchups yet.</p>`;
  }
  state.matchups.forEach(m => {
    const label = m.singleTeam ? esc(m.home.name) + ' (single)' : esc(m.home.name) + ' vs ' + esc(m.away.name);
    html += `<div class="match-card" onclick="openMatchup('${m.id}')">
      <div class="info"><h4>${esc(m.title)}</h4><small>${label}</small></div>
      <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="dupMatchup('${m.id}')">Dup</button>
        <button class="btn btn-danger btn-sm" onclick="delMatchup('${m.id}')">×</button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function createMatchup() {
  const m = {
    id: uid(), title: 'Match Lineup', singleTeam: false,
    home: { name: 'NZ', players: [], ...DEFAULT_HOME },
    away: { name: 'Opposition', players: [], ...DEFAULT_AWAY },
    homePosBar: ['GK','D','D','D','D','MF','MF','MF','S','S','S'].map(l => ({label:l, name:''})),
    awayPosBar: ['S','S','S','MF','MF','MF','D','D','D','D','GK'].map(l => ({label:l, name:''}))
  };
  state.matchups.push(m); state.ui.currentId = m.id; save(); showView('editor');
}

function createSingleTeam() {
  const m = {
    id: uid(), title: 'Team Lineup', singleTeam: true,
    home: { name: 'NZ', players: [], ...DEFAULT_HOME },
    away: { name: '', players: [], ...DEFAULT_AWAY },
    homePosBar: ['GK','D','D','D','D','MF','MF','MF','S','S','S'].map(l => ({label:l, name:''})),
    awayPosBar: []
  };
  state.matchups.push(m); state.ui.currentId = m.id; save(); showView('editor');
}

function openMatchup(id) { state.ui.currentId = id; save(); showView('editor'); }
function dupMatchup(id) { const o = state.matchups.find(m=>m.id===id); if (!o) return; const c = JSON.parse(JSON.stringify(o)); c.id = uid(); c.title += ' (copy)'; state.matchups.push(c); save(); renderList(); }
function delMatchup(id) { if (!confirm('Delete?')) return; state.matchups = state.matchups.filter(m=>m.id!==id); if (state.ui.currentId===id) state.ui.currentId = null; save(); renderList(); }

// =============================================
// ROSTER VIEW
// =============================================
let rosterCountryFilter = '';

function renderRoster() {
  const el = document.getElementById('view-roster');
  const countries = [...new Set(state.roster.map(p => p.country).filter(Boolean))].sort();

  let html = `<h2>Player Roster</h2>
    <p style="color:#8c8c8c; font-size:13px; margin-bottom:16px;">Add players with their country. They auto-filter when building lineups against that country.</p>`;

  if (countries.length > 0) {
    html += `<div class="roster-filter">
      <label style="margin:0;font-size:12px;">Filter by country:</label>
      <select onchange="rosterCountryFilter=this.value;renderRoster();">
        <option value="">All countries</option>
        ${countries.map(c => `<option value="${esc(c)}" ${rosterCountryFilter===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
      <span style="font-size:11px;color:#8c8c8c;">${state.roster.length} total players</span>
    </div>`;
  }

  html += `<datalist id="country-list">${COUNTRY_NAMES.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`;

  html += `<div class="roster-grid">`;
  POS_CATS.forEach(cat => {
    const catName = { GK:'Goalkeepers', D:'Defenders', MF:'Midfielders', S:'Strikers' }[cat];
    const positions = POS_CAT_POSITIONS[cat];
    let players = state.roster.filter(p => POS_TO_CAT[p.pos] === cat);
    if (rosterCountryFilter) players = players.filter(p => p.country === rosterCountryFilter);

    html += `<div class="roster-cat"><h3>${catName} (${players.length})</h3>`;
    players.forEach(p => {
      const ri = state.roster.indexOf(p);
      html += `<div class="roster-item">
        <span><span class="ri-pos">${esc(p.pos)}</span> ${esc(p.name)}${p.country ? `<span class="ri-country">[${esc(p.country)}]</span>` : ''}</span>
        <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:10px;" onclick="removeRosterPlayer(${ri})">×</button>
      </div>`;
    });

    html += `<div class="roster-add">
      <select id="roster-pos-${cat}">${positions.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
      <input id="roster-name-${cat}" placeholder="Name" onkeydown="if(event.key==='Enter')addRosterPlayer('${cat}')">
      <input id="roster-country-${cat}" placeholder="Country" list="country-list" style="width:100px;" value="${esc(rosterCountryFilter)}">
      <button class="btn btn-primary btn-sm" onclick="addRosterPlayer('${cat}')">+</button>
    </div></div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}

function addRosterPlayer(cat) {
  const pos = document.getElementById('roster-pos-' + cat).value;
  const nameEl = document.getElementById('roster-name-' + cat);
  const countryEl = document.getElementById('roster-country-' + cat);
  const name = nameEl.value.trim();
  if (!name) return;
  state.roster.push({ id: uid(), pos, name: name.toUpperCase(), country: countryEl.value.trim() || '' });
  nameEl.value = ''; nameEl.focus(); save(); renderRoster();
}

function removeRosterPlayer(index) { state.roster.splice(index, 1); save(); renderRoster(); }

// =============================================
// EDITOR VIEW
// =============================================
function getCurrent() { return state.matchups.find(m=>m.id===state.ui.currentId); }

function renderPosBarHtml(bar, team, colors) {
  return ensurePosBar(bar).map((s, i) => {
    const nameHtml = s.name ? `<span class="seg-name">${esc(s.name)}</span>` : '';
    return `<div class="pos-seg" style="background:${esc(colors.barBg)};color:${esc(colors.barText)};" onclick="pickPosBarPlayer('${team}',${i})">${esc(s.label)}${nameHtml}</div>`;
  }).join('');
}

function renderEditor() {
  const el = document.getElementById('view-editor');
  const m = getCurrent();
  if (!m) {
    if (state.matchups.length > 0) { state.ui.currentId = state.matchups[0].id; save(); renderEditor(); return; }
    el.innerHTML = `<p style="color:#8c8c8c;">Create a matchup first.</p>`; return;
  }
  // Ensure pos bars are object format
  m.homePosBar = ensurePosBar(m.homePosBar);
  if (!m.singleTeam) m.awayPosBar = ensurePosBar(m.awayPosBar);

  const hc = tc(m, 'home');
  const ac = tc(m, 'away');
  const single = m.singleTeam;

  let html = `<div class="toolbar">
    <button class="btn btn-secondary btn-sm" onclick="showView('list')">← Back</button>
    <input value="${esc(m.title)}" onchange="getCurrent().title=this.value;save();" style="font-weight:700; font-size:14px; width:250px;">
    <button class="btn btn-primary btn-sm" onclick="showView('preview')">Preview / Print →</button>
  </div>`;

  // Single team toggle
  html += `<div class="toggle-row">
    <div class="toggle ${single?'on':''}" onclick="toggleSingleTeam()"></div>
    <label onclick="toggleSingleTeam()">Single team mode ${single ? '(showing one team across full pitch)' : '(showing two teams)'}</label>
  </div>`;

  // ---- HOME TEAM ----
  html += `<div class="section">
    <h3 style="font-size:14px; margin-bottom:10px;"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${esc(hc.chipBg)};border:1px solid ${esc(hc.chipBorder)};vertical-align:middle;margin-right:6px;"></span> ${single ? 'Team' : 'Home Team (attacks right)'}</h3>
    <div class="team-config">
      <div class="tc-group"><label>Team Name</label><input value="${esc(m.home.name)}" onchange="getCurrent().home.name=this.value;save();renderEditor();"></div>
    </div>
    <div style="font-size:11px; color:#8c8c8c; margin-bottom:4px;">Team colour preset:</div>
    <div class="country-presets">${Object.entries(TEAM_COLORS).map(([name, c]) =>
      `<button style="background:${c.chipBg};color:${c.chipText};border-color:${c.chipBorder};" onclick="applyTeamColor('home','${esc(name)}')">${esc(name)}</button>`
    ).join('')}</div>
    <div class="color-row">
      <div class="cg"><label>Chip</label><input type="color" value="${esc(hc.chipBg)}" onchange="getCurrent().home.chipBg=this.value;save();renderEditor();"></div>
      <div class="cg"><label>Text</label><input type="color" value="${esc(hc.chipText)}" onchange="getCurrent().home.chipText=this.value;save();renderEditor();"></div>
      <div class="cg"><label>Border</label><input type="color" value="${esc(hc.chipBorder)}" onchange="getCurrent().home.chipBorder=this.value;save();renderEditor();"></div>
      <div class="cg"><label>Bar</label><input type="color" value="${esc(hc.barBg)}" onchange="getCurrent().home.barBg=this.value;save();renderEditor();"></div>
      <div class="cg"><label>Bar Text</label><input type="color" value="${esc(hc.barText)}" onchange="getCurrent().home.barText=this.value;save();renderEditor();"></div>
    </div>`;
  html += renderRosterPicker('home', m.home.name);
  html += `<div class="formation-presets" style="margin-top:8px;">
      <span style="font-size:11px;color:#8c8c8c;margin-right:4px;">Formation:</span>
      ${Object.keys(FORMATION_PRESETS).map(f => `<button onclick="applyPreset('home','${f}')">${f}</button>`).join('')}
    </div>
  </div>`;

  // ---- AWAY TEAM (hidden in single mode) ----
  if (!single) {
    html += `<div class="section">
      <h3 style="font-size:14px; margin-bottom:10px;"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${esc(ac.chipBg)};border:1px solid ${esc(ac.chipBorder)};vertical-align:middle;margin-right:6px;"></span> Away Team (attacks left)</h3>
      <div class="team-config">
        <div class="tc-group"><label>Team Name</label><input value="${esc(m.away.name)}" onchange="getCurrent().away.name=this.value;save();renderEditor();"></div>
      </div>
      <div style="font-size:11px; color:#8c8c8c; margin-bottom:4px;">Team colour preset:</div>
      <div class="country-presets">${Object.entries(TEAM_COLORS).map(([name, c]) =>
        `<button style="background:${c.chipBg};color:${c.chipText};border-color:${c.chipBorder};" onclick="applyTeamColor('away','${esc(name)}')">${esc(name)}</button>`
      ).join('')}</div>
      <div class="color-row">
        <div class="cg"><label>Chip</label><input type="color" value="${esc(ac.chipBg)}" onchange="getCurrent().away.chipBg=this.value;save();renderEditor();"></div>
        <div class="cg"><label>Text</label><input type="color" value="${esc(ac.chipText)}" onchange="getCurrent().away.chipText=this.value;save();renderEditor();"></div>
        <div class="cg"><label>Border</label><input type="color" value="${esc(ac.chipBorder)}" onchange="getCurrent().away.chipBorder=this.value;save();renderEditor();"></div>
        <div class="cg"><label>Bar</label><input type="color" value="${esc(ac.barBg)}" onchange="getCurrent().away.barBg=this.value;save();renderEditor();"></div>
        <div class="cg"><label>Bar Text</label><input type="color" value="${esc(ac.barText)}" onchange="getCurrent().away.barText=this.value;save();renderEditor();"></div>
      </div>`;
    html += renderRosterPicker('away', m.away.name);
    html += `<div class="formation-presets" style="margin-top:8px;">
        <span style="font-size:11px;color:#8c8c8c;margin-right:4px;">Formation:</span>
        ${Object.keys(FORMATION_PRESETS).map(f => `<button onclick="applyPreset('away','${f}')">${f}</button>`).join('')}
      </div>
    </div>`;
  }

  // ---- FIELD + SIDEBAR ----
  html += `<div class="editor-layout"><div class="editor-main">`;

  // Home pos bar (top)
  html += `<div class="pos-bar top">${renderPosBarHtml(m.homePosBar, 'home', hc)}</div>`;

  // Field
  html += `<div class="field-wrap" id="field-drop" ondragover="event.preventDefault()" ondrop="dropOnField(event)">${fieldSVG()}`;

  m.home.players.forEach((p, i) => {
    const nameHtml = p.name ? `<span class="mu-name">${esc(p.name)}</span>` : '';
    html += `<div class="mu-player" style="left:${p.x}%;top:${p.y}%;" draggable="true" ondragstart="startDrag(event,'home',${i})" ondblclick="renamePlayer('home',${i})">
      <div class="mu-label" style="background:${esc(hc.chipBg)};color:${esc(hc.chipText)};border-color:${esc(hc.chipBorder)};">${esc(p.pos)}${nameHtml}</div>
    </div>`;
  });

  if (!single) {
    m.away.players.forEach((p, i) => {
      const nameHtml = p.name ? `<span class="mu-name">${esc(p.name)}</span>` : '';
      html += `<div class="mu-player" style="left:${p.x}%;top:${p.y}%;" draggable="true" ondragstart="startDrag(event,'away',${i})" ondblclick="renamePlayer('away',${i})">
        <div class="mu-label" style="background:${esc(ac.chipBg)};color:${esc(ac.chipText)};border-color:${esc(ac.chipBorder)};">${esc(p.pos)}${nameHtml}</div>
      </div>`;
    });
  }

  html += `</div>`;

  // Away pos bar (bottom) — only in two-team mode
  if (!single) {
    html += `<div class="pos-bar bottom">${renderPosBarHtml(m.awayPosBar, 'away', ac)}</div>`;
  }

  html += `</div>`; // end editor-main

  // Sidebar
  html += `<div class="editor-sidebar">
    <div class="sidebar-section">
      <div class="sidebar-title">${single ? '' : 'Home - '}${esc(m.home.name)} (${m.home.players.length})</div>`;
  m.home.players.forEach((p, i) => {
    html += `<div class="sidebar-player" style="justify-content:space-between;">
      <span style="cursor:pointer;" onclick="renamePlayer('home',${i})"><span class="sp-pos">${esc(p.pos)}</span> ${esc(p.name||'(tap to name)')}</span>
      <button class="btn btn-danger btn-sm" style="padding:2px 5px;font-size:10px;" onclick="removePlayer('home',${i})">×</button>
    </div>`;
  });
  html += `</div>`;

  if (!single) {
    html += `<div class="sidebar-section">
      <div class="sidebar-title" style="color:${esc(ac.chipBg === '#ffffff' || ac.chipBg === '#FFFFFF' ? '#c87533' : ac.chipBg)};">Away - ${esc(m.away.name)} (${m.away.players.length})</div>`;
    m.away.players.forEach((p, i) => {
      html += `<div class="sidebar-player" style="justify-content:space-between;">
        <span style="cursor:pointer;" onclick="renamePlayer('away',${i})"><span class="sp-pos">${esc(p.pos)}</span> ${esc(p.name||'(tap to name)')}</span>
        <button class="btn btn-danger btn-sm" style="padding:2px 5px;font-size:10px;" onclick="removePlayer('away',${i})">×</button>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div></div>`; // end sidebar + editor-layout
  el.innerHTML = html;
  setupTouchDrag();
}

function renderRosterPicker(team, teamName) {
  const roster = rosterForTeam(teamName);
  let html = `<div class="team-config">
    <div class="tc-group"><label>Add Player (manual)</label>
      <div style="display:flex;gap:4px;">
        <input id="${team}-new-pos" placeholder="POS" style="width:50px;" value="CM">
        <input id="${team}-new-name" placeholder="Name" style="width:120px;" onkeydown="if(event.key==='Enter')addPlayer('${team}')">
        <button class="btn btn-primary btn-sm" onclick="addPlayer('${team}')">+</button>
      </div>
    </div>
  </div>`;

  if (roster.length > 0) {
    const hasCountryPlayers = state.roster.some(p => p.country && p.country.toLowerCase() === (teamName||'').toLowerCase());
    const filterLabel = hasCountryPlayers ? `Add from ${esc(teamName)} roster:` : 'Add from roster:';
    html += `<div class="roster-picker"><label style="font-size:11px;">${filterLabel}</label>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">`;
    POS_CATS.forEach(cat => {
      const players = roster.filter(p => POS_TO_CAT[p.pos] === cat);
      if (players.length === 0) return;
      html += `<select onchange="addFromRoster('${team}',this.value);this.selectedIndex=0;" style="width:auto;font-size:11px;">
        <option value="">${cat} (${players.length})</option>
        ${players.map(p => `<option value="${esc(p.id)}">${esc(p.pos)} ${esc(p.name)}</option>`).join('')}
      </select>`;
    });
    html += `</div></div>`;
  }
  return html;
}

function toggleSingleTeam() {
  const m = getCurrent(); if (!m) return;
  m.singleTeam = !m.singleTeam;
  if (m.singleTeam) {
    // Spread home players across full pitch
    m.home.players.forEach(p => { p.x = Math.min(95, p.x * 1.8); });
  } else {
    // Compress home players to left half
    m.home.players.forEach(p => { p.x = Math.min(48, p.x / 1.8); });
    if (!m.awayPosBar || m.awayPosBar.length === 0) {
      m.awayPosBar = ['S','S','S','MF','MF','MF','D','D','D','D','GK'].map(l => ({label:l, name:''}));
    }
  }
  save(); renderEditor();
}

function applyTeamColor(team, name) {
  const m = getCurrent(); if (!m) return;
  const c = TEAM_COLORS[name]; if (!c) return;
  Object.assign(m[team], c);
  m[team].name = name;
  save(); renderEditor();
}

function addFromRoster(team, rosterId) {
  if (!rosterId) return;
  const m = getCurrent(); if (!m) return;
  const rp = state.roster.find(r => r.id === rosterId);
  if (!rp) return;
  const single = m.singleTeam;
  let x, y, pos = rp.pos;
  if (team === 'home') {
    x = single ? (10 + Math.random() * 80) : (15 + Math.random() * 30);
    y = 15 + Math.random() * 70;
  } else {
    x = 55 + Math.random() * 30; y = 15 + Math.random() * 70;
    pos = LR_SWAP[pos] || pos;
  }
  m[team].players.push({ id: uid(), pos, name: rp.name, x: +x.toFixed(1), y: +y.toFixed(1) });
  save(); renderEditor();
}

function addPlayer(team) {
  const m = getCurrent(); if (!m) return;
  const pos = (document.getElementById(team+'-new-pos').value||'CM').toUpperCase().trim();
  const nameEl = document.getElementById(team+'-new-name');
  const name = nameEl.value.trim();
  const single = m.singleTeam;
  let x, y;
  if (team === 'home') { x = single ? (10+Math.random()*80) : (15+Math.random()*30); y = 15+Math.random()*70; }
  else { x = 55+Math.random()*30; y = 15+Math.random()*70; }
  m[team].players.push({ id: uid(), pos, name: name.toUpperCase(), x: +x.toFixed(1), y: +y.toFixed(1) });
  nameEl.value = ''; nameEl.focus(); save(); renderEditor();
}

function removePlayer(team, i) { const m = getCurrent(); if (!m) return; m[team].players.splice(i,1); save(); renderEditor(); }

function renamePlayer(team, i) {
  const m = getCurrent(); if (!m) return;
  const p = m[team].players[i]; if (!p) return;
  const name = prompt(`Name for ${p.pos}:`, p.name || '');
  if (name === null) return;
  p.name = name.trim().toUpperCase(); save(); renderEditor();
}

// Position bar segment picker — pick from roster or type manually
function pickPosBarPlayer(team, index) {
  const m = getCurrent(); if (!m) return;
  const bar = team === 'home' ? m.homePosBar : m.awayPosBar;
  const s = seg(bar[index]);
  const catLabel = s.label;

  // Find roster players matching this category
  const teamName = m[team].name;
  const roster = rosterForTeam(teamName);
  const catPlayers = roster.filter(p => {
    const cat = POS_TO_CAT[p.pos] || '';
    return cat === catLabel || catLabel === 'GK' && cat === 'GK' || catLabel === 'D' && cat === 'D' || catLabel === 'MF' && cat === 'MF' || catLabel === 'S' && cat === 'S';
  });

  if (catPlayers.length > 0) {
    // Build a native select picker
    const sel = document.createElement('select');
    sel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;font-size:16px;padding:10px;min-width:200px;';
    sel.innerHTML = `<option value="">-- ${catLabel}: Pick player or cancel --</option>
      <option value="__clear__">Clear name</option>
      <option value="__manual__">Type manually...</option>
      ${catPlayers.map(p => `<option value="${esc(p.id)}">${esc(p.pos)} ${esc(p.name)}</option>`).join('')}`;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;';
    overlay.onclick = () => { overlay.remove(); sel.remove(); };
    document.body.appendChild(overlay);
    document.body.appendChild(sel);
    sel.focus();
    // Open native picker on mobile
    try { sel.click(); } catch(e) {}
    sel.onchange = () => {
      const v = sel.value;
      overlay.remove(); sel.remove();
      if (!v) return;
      if (v === '__clear__') { bar[index] = { label: catLabel, name: '' }; }
      else if (v === '__manual__') {
        const name = prompt(`Name for ${catLabel} sub:`, s.name || '');
        if (name !== null) bar[index] = { label: catLabel, name: name.trim().toUpperCase() };
      } else {
        const rp = state.roster.find(r => r.id === v);
        if (rp) bar[index] = { label: catLabel, name: rp.name };
      }
      save(); renderEditor();
    };
    sel.onblur = () => { setTimeout(() => { overlay.remove(); sel.remove(); }, 200); };
  } else {
    // No roster players — just prompt
    const name = prompt(`Name for ${catLabel} sub:`, s.name || '');
    if (name === null) return;
    bar[index] = { label: catLabel, name: name.trim().toUpperCase() };
    save(); renderEditor();
  }
}

function applyPreset(team, presetName) {
  const m = getCurrent(); if (!m) return;
  const preset = FORMATION_PRESETS[presetName]; if (!preset) return;
  const single = m.singleTeam;
  const oldPlayers = [...m[team].players];

  const players = preset.map(p => {
    let x = p.x, y = p.y, pos = p.pos;
    if (team === 'away') { x = 100 - p.x; pos = LR_SWAP[pos] || pos; }
    else if (single) { x = Math.min(95, p.x * 1.7); } // spread across full pitch
    let name = '';
    const ei = oldPlayers.findIndex(op => op.pos === pos && op.name);
    if (ei >= 0) { name = oldPlayers[ei].name; oldPlayers.splice(ei, 1); }
    return { id: uid(), pos, name, x: +x.toFixed(1), y: +y.toFixed(1) };
  });

  m[team].players = players;
  const cats = players.map(p => POS_TO_CAT[p.pos] || 'MF');
  const catOrder = { GK:0, D:1, MF:2, S:3 };
  cats.sort((a,b) => (catOrder[a]||0) - (catOrder[b]||0));
  const barSegs = cats.map(l => ({label:l, name:''}));
  if (team === 'home') m.homePosBar = barSegs;
  else m.awayPosBar = [...barSegs].reverse();
  save(); renderEditor();
}

// Drag and drop
function startDrag(e, team, i) { dragState.team = team; dragState.index = i; e.dataTransfer.setData('text/plain', team+':'+i); e.dataTransfer.effectAllowed = 'move'; }

function dropOnField(e) {
  e.preventDefault();
  const m = getCurrent(); if (!m) return;
  const rect = document.getElementById('field-drop').getBoundingClientRect();
  let cx = +((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  let cy = Math.max(3, Math.min(97, +((e.clientY - rect.top) / rect.height * 100).toFixed(1)));
  const single = m.singleTeam;
  if (dragState.team === 'home') { cx = Math.max(2, Math.min(single ? 98 : 50, cx)); }
  else if (dragState.team === 'away') { cx = Math.max(50, Math.min(98, cx)); }
  if (dragState.team && dragState.index !== undefined) {
    const p = m[dragState.team].players[dragState.index];
    if (p) { p.x = cx; p.y = cy; }
  }
  dragState.team = null; dragState.index = undefined; save(); renderEditor();
}

function setupTouchDrag() {
  let ghost = null;
  document.querySelectorAll('.mu-player').forEach(el => {
    el.addEventListener('touchstart', function(e) {
      const ds = el.getAttribute('ondragstart'); if (!ds) return;
      const match = ds.match(/startDrag\(event,'(\w+)',(\d+)\)/); if (!match) return;
      dragState.team = match[1]; dragState.index = parseInt(match[2]);
      ghost = el.cloneNode(true);
      ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:10000;opacity:0.8;';
      document.body.appendChild(ghost); e.preventDefault();
    }, { passive: false });
  });
  document.addEventListener('touchmove', function(e) {
    if (!ghost) return;
    const t = e.touches[0]; ghost.style.left = (t.clientX-30)+'px'; ghost.style.top = (t.clientY-15)+'px'; e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function(e) {
    if (!ghost) return;
    const t = e.changedTouches[0]; ghost.remove(); ghost = null;
    const fieldEl = document.getElementById('field-drop');
    if (fieldEl) {
      const rect = fieldEl.getBoundingClientRect();
      if (t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom) {
        dropOnField({ preventDefault:()=>{}, clientX: t.clientX, clientY: t.clientY }); return;
      }
    }
    dragState.team = null; dragState.index = undefined;
  });
}

// =============================================
// PREVIEW
// =============================================
function renderPreview() {
  const el = document.getElementById('view-preview');
  let html = `<div class="no-print" style="margin-bottom:16px; display:flex; gap:8px; align-items:center;">
    <select id="preview-select" onchange="renderPreviewContent()">
      <option value="">Select matchup...</option>
      ${state.matchups.map(m => {
        const label = m.singleTeam ? m.home.name : m.home.name + ' vs ' + m.away.name;
        return `<option value="${m.id}" ${m.id===state.ui.currentId?'selected':''}>${esc(m.title)} - ${esc(label)}</option>`;
      }).join('')}
    </select>
    <button class="btn btn-primary" onclick="shareImage()">📷 Share Image</button>
    <button class="btn btn-secondary" onclick="window.print()">Print</button>
  </div><div id="preview-content"></div>`;
  el.innerHTML = html;
  renderPreviewContent();
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
  const node = document.querySelector('.output-wrap');
  if (!node) { alert('Build a lineup first.'); return; }
  ensureHtml2Canvas(() => {
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      .then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'match-lineup.png'; a.click(); })
      .catch(e => alert('Image export failed: ' + e.message));
  });
}
function renderPreviewContent() {
  const matchId = document.getElementById('preview-select').value;
  const m = state.matchups.find(mu => mu.id === matchId);
  const content = document.getElementById('preview-content');
  if (!m) { content.innerHTML = '<p style="color:#8c8c8c;">Select a matchup to preview.</p>'; return; }

  const hc = tc(m, 'home'); const ac = tc(m, 'away');
  const single = m.singleTeam;
  const titleText = single ? esc(m.home.name) : `${esc(m.home.name)} vs ${esc(m.away.name)}`;

  let html = `<div class="output-wrap">
    <div class="output-title"><h3>${titleText}</h3></div>`;

  // Home pos bar
  const hBar = ensurePosBar(m.homePosBar);
  html += `<div class="out-pos-bar">${hBar.map(s => {
    const nameHtml = s.name ? `<span class="seg-name">${esc(s.name)}</span>` : '';
    return `<div class="pos-seg" style="background:${esc(hc.barBg)};color:${esc(hc.barText)};">${esc(s.label)}${nameHtml}</div>`;
  }).join('')}</div>`;

  html += `<div class="output-field">${fieldSVG()}`;

  m.home.players.forEach(p => {
    const nameHtml = p.name ? `<span class="out-name">${esc(p.name)}</span>` : '';
    html += `<div class="out-player" style="left:${p.x}%;top:${p.y}%;"><div class="out-label" style="background:${esc(hc.chipBg)};color:${esc(hc.chipText)};border-color:${esc(hc.chipBorder)};">${esc(p.pos)}${nameHtml}</div></div>`;
  });

  if (!single) {
    m.away.players.forEach(p => {
      const nameHtml = p.name ? `<span class="out-name">${esc(p.name)}</span>` : '';
      html += `<div class="out-player" style="left:${p.x}%;top:${p.y}%;"><div class="out-label" style="background:${esc(ac.chipBg)};color:${esc(ac.chipText)};border-color:${esc(ac.chipBorder)};">${esc(p.pos)}${nameHtml}</div></div>`;
    });
  }

  html += `</div>`;

  if (!single) {
    const aBar = ensurePosBar(m.awayPosBar);
    html += `<div class="out-pos-bar">${aBar.map(s => {
      const nameHtml = s.name ? `<span class="seg-name">${esc(s.name)}</span>` : '';
      return `<div class="pos-seg" style="background:${esc(ac.barBg)};color:${esc(ac.barText)};">${esc(s.label)}${nameHtml}</div>`;
    }).join('')}</div>`;
  }

  html += `</div>`;
  content.innerHTML = html;
}

// =============================================
// INIT
// =============================================
load();

// Migrations
if (!state._migratedLR) {
  state.matchups.forEach(m => { m.away.players.forEach(p => { if (LR_SWAP[p.pos]) p.pos = LR_SWAP[p.pos]; }); });
  state._migratedLR = true; save();
}
// Migrate pos bars from string to object format
state.matchups.forEach(m => {
  if (m.homePosBar && m.homePosBar.length > 0 && typeof m.homePosBar[0] === 'string') {
    m.homePosBar = m.homePosBar.map(s => ({label:s, name:''}));
  }
  if (m.awayPosBar && m.awayPosBar.length > 0 && typeof m.awayPosBar[0] === 'string') {
    m.awayPosBar = m.awayPosBar.map(s => ({label:s, name:''}));
  }
});
// Ensure roster has country field
state.roster.forEach(p => { if (!p.country) p.country = ''; });
save();

if (state.ui.view) showView(state.ui.view);
else showView('list');

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
</script>
</body>
</html>

```
