# Player Reviews — Design & Build Reference
> Reload this file to re-engage Claude for work on this app. Canonical source: `ELV8 Suite/player-reviews.html` (mirrored to `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`). Preview staging: `/tmp/elv8preview/`.

## 1. Purpose
A coach-facing builder that produces two **player-facing** feedback document types from a managed squad:

1. **Post-Match Feedback** — a single A4 page per player. Fast turnaround after a match: score, what went well, what needs work, next-game focus, data, and a personal "Over To You" message.
2. **Review Deck** — a 3-page A4 document per player. A deeper periodic review (e.g. a Pro League block): overall standing + trajectory, foundation statement, strengths, work-ons with coaching direction, role/JD alignment, improvement opportunities, and an ACA tracker.

Both are premium, printable, athlete-facing documents. The app chrome is dark/ELV8; the **documents themselves are clean white** with a charcoal+gold masthead. There is deliberately **no "ELV8" wordmark** on the documents — they read as Black Sticks programme documents.

## 2. Architecture
- **Single file**, vanilla JS, no build step, no framework. All HTML/CSS/JS inline in `player-reviews.html`.
- Font: **Montserrat** (Google Fonts, weights 400/600/700/800/900), with system fallbacks.
- **Offline-first**: the only external dependency is html2canvas, lazy-loaded from cdnjs **only** when "Share Image" is used. Everything else runs offline.
- Persistence: **localStorage**, single key — exact constant `STORAGE_KEY = 'hockeyPlayerReviews'`.
- Four top-level views, swapped by toggling an `.active` class on `.view` containers. Each view's body is re-rendered into its container element on demand (string-template `innerHTML`).

## 3. Data Model
Root state object (declared at script top):

```js
let state = {
  squad: [],            // shared player roster
  postMatchSets: [],    // Post-Match Feedback documents
  reviewDeckSets: [],   // Review Deck documents
  ui: { currentView: 'squad', currentPMId: null, currentRDId: null, currentPlayerIdx: 0 }
};
```

### Squad player
```js
{ id, name, position, photo }   // photo is a base64 data URL or ''
```

### Post-Match set (`postMatchSets[]`)
```js
{
  id, matchTitle, date,         // date defaults to en-GB locale string
  nextGame, teamName,           // teamName defaults 'BLACK STICKS MEN'
  players: [ {
    playerId, name, position, photo,   // copied from squad at creation
    score,                             // string, intended 1–10
    goingWell1, goingWell2, goingWell3,
    needsWork1, needsWork2,
    nextGameFocus,
    dataLine,                          // single metrics string
    overToYou                          // personal pull-quote message
  } ]
}
```

### Review Deck set (`reviewDeckSets[]`)
```js
{
  id, reviewTitle, reviewPeriod, teamName,   // teamName defaults 'BLACK STICKS MEN'
  players: [ {
    playerId, name, position, photo,
    // ---- Page 1 (Overview) ----
    overallRating,        // '' | 'high' | 'building' | 'attention'
    trajectory,           // '' | 'improving' | 'plateauing' | 'declining'
    trajectoryNote,
    foundationStatement,
    topStrength1, topStrength2,
    topFocus1, topFocus2,
    // ---- Page 2 (Where You Stand) ----
    strength1Title, strength1Detail,
    strength2Title, strength2Detail,
    strength3Title, strength3Detail,
    workOn1Title, workOn1Detail, workOn1Coaching,
    workOn2Title, workOn2Detail, workOn2Coaching,
    workOn3Title, workOn3Detail, workOn3Coaching,
    jdClaim1, jdVerdict1,   // verdict '' default seeds: 'yes' / 'partial' / 'no'
    jdClaim2, jdVerdict2,
    jdClaim3, jdVerdict3,
    // ---- Page 3 (Path Forward) ----
    needsWork1, needsWork2, needsWork3,
    opportunity1, opportunity2,
    acaAccountability,    // seeded prompt text
    acaConsistency,       // seeded prompt text
    acaAction,            // seeded prompt text
    dataSays              // closing pull-quote
  } ]
}
```
Seed defaults at creation: `jdVerdict1='yes'`, `jdVerdict2='partial'`, `jdVerdict3='no'`; ACA fields seeded with prompt strings (`'Closed loops? Feedback documented?'`, `'Performing to standard across the block?'`, `'Time protected for key skills? Work-ons actioned?'`).

### Fields read by `renderPMOutput(set, p)` — EVERY one
From `set`: `teamName`, `matchTitle`, `date`, `nextGame`.
From `p`: `name`, `position`, `photo`, `score`, `goingWell1`, `goingWell2`, `goingWell3`, `needsWork1`, `needsWork2`, `nextGameFocus`, `dataLine`, `overToYou`.
(`score` drives the colour ring via `scoreColors()`; `name` also derives initials for the photo placeholder.)

### Fields read by `renderRDOutput(set, p)` — EVERY one
From `set`: `teamName`, `position` source (`p.position`), `reviewPeriod`.
**Page 1:** `overallRating`, `trajectory`, `trajectoryNote`, `foundationStatement`, `topStrength1`, `topStrength2`, `topFocus1`, `topFocus2`.
**Page 2:** `strength1Title/Detail`, `strength2Title/Detail`, `strength3Title/Detail` (read via `p['strength'+n+'Title'|'Detail']`); `workOn1Title/Detail/Coaching`, `workOn2Title/Detail/Coaching`, `workOn3Title/Detail/Coaching` (via `p['workOn'+n+...]`); `jdClaim1/2/3`, `jdVerdict1/2/3`.
**Page 3:** `needsWork1/2/3` (via `p['needsWork'+n]`), `opportunity1`, `opportunity2`, `acaAccountability`, `acaConsistency`, `acaAction`, `dataSays`.
Plus `name`, `position`, `photo` in the masthead/identity.

**Review-deck player fields documented: 39** (`name`, `position`, `photo` [shared identity, 3] + 36 deck-specific: overallRating, trajectory, trajectoryNote, foundationStatement, topStrength1, topStrength2, topFocus1, topFocus2, strength1Title, strength1Detail, strength2Title, strength2Detail, strength3Title, strength3Detail, workOn1Title, workOn1Detail, workOn1Coaching, workOn2Title, workOn2Detail, workOn2Coaching, workOn3Title, workOn3Detail, workOn3Coaching, jdClaim1, jdVerdict1, jdClaim2, jdVerdict2, jdClaim3, jdVerdict3, needsWork1, needsWork2, needsWork3, opportunity1, opportunity2, acaAccountability, acaConsistency, acaAction, dataSays — that's 38 + `playerId` = 39 stored keys; render reads all except `playerId`).

## 4. State & Persistence
- `loadState()` reads `STORAGE_KEY` and `Object.assign`s the parsed object onto `state` (shallow merge — top-level keys overwrite). Wrapped in try/catch.
- `saveState()` writes `JSON.stringify(state)` back. Called after every mutation and on every `onchange`.
- `uid()` = `Date.now().toString(36) + Math.random().toString(36).substr(2,5)`.
- `esc(s)` escapes `& " < >` (for attributes/inline). `escHtml(s)` escapes `& < >` and converts `\n` → `<br>` (for body content; preserves line breaks).
- Photos are stored inline as base64 data URLs inside state — large rosters with photos can bloat localStorage.
- On init: `loadState()`, then `switchView(state.ui.currentView)` (falls back to `renderSquad()`).

## 5. Views & Navigation
Nav bar with logo `PLAYER REVIEW GENERATOR` and four buttons → `switchView('squad' | 'postmatch' | 'reviewdeck' | 'preview')`.

`switchView(v)` sets `state.ui.currentView`, toggles `.active` on the matching `#view-<v>` and nav button (matched by button text substring), then calls the view's render fn (`renderSquad` / `renderPMList` / `renderRDList` / `renderPreview`) and saves.

- **Squad** — roster CRUD. Add/edit/remove players, upload photo, export/import squad JSON.
- **Post-Match** — list of match-review sets; clicking one (or `createPMSet`) opens the per-player builder.
- **Review Deck** — list of review-deck sets; clicking one (or `createRDSet`) opens the per-player builder.
- **Preview / Print** — type + set + player selectors render the live documents into `#preview-content`.

`createPMSet()` / `createRDSet()` both require a non-empty squad (else `alert`), prompt for title (and period/date), then map the current squad into a fresh set's `players[]` with empty/seeded fields, set the corresponding `currentPMId`/`currentRDId`, reset `currentPlayerIdx`, and open the builder.

## 6. Key Functions
| Function | Purpose |
|---|---|
| `switchView(v)` | Activate a view + render it. |
| `renderSquad()` | Render squad grid (cards with photo/initials + actions). |
| `addPlayer / editPlayer / removePlayer / uploadPlayerPhoto` | Squad CRUD; photo via FileReader → data URL. |
| `exportSquad / importSquad` | Squad JSON download / merge-import. |
| `renderPMList()` | List post-match sets (or defer to builder if a set is open). |
| `createPMSet()` | New post-match set from squad. |
| `openPMSet / dupPMSet / delPMSet / getPMSet` | Open/duplicate/delete/lookup current PM set. |
| `renderPMBuilder()` | Per-player post-match form (match details, player tabs, fields). |
| `renderRDList()` | List review-deck sets (or defer to builder). |
| `createRDSet()` | New review-deck set from squad (seeds JD verdicts + ACA prompts). |
| `openRDSet / dupRDSet / delRDSet / getRDSet` | Open/duplicate/delete/lookup current RD set. |
| `renderRDBuilder()` | Per-player 3-page deck form. Uses local `inp()`/`ta()`/`f()` helpers to build inputs/textareas. |
| `renderPreview()` | Build preview controls, populate type/set/player dropdowns, render docs into `#preview-content`. |
| `renderPMOutput(set, p)` | Return the 1-page `.pm-output` document HTML for one player. |
| `renderRDOutput(set, p)` | Return the 3× `.doc-page` deck HTML for one player. |
| `shareImage()` | html2canvas `#preview-content` → PNG download (`player-review.png`). |
| `ensureHtml2Canvas(cb)` | Lazy-load html2canvas from cdnjs, then run `cb`; alerts + suggests Print on failure. |
| `docFooter()` | Shared charcoal footer markup. |
| `genDate()` | en-NZ `dd Mon yyyy` date for the footer. |
| `scoreColors(score)` | Map a 1–10 score to `{bg, fg, cap}` red→amber→green. |

## 7. The Printable Documents
### Post-Match — `.doc.pm-output` (1 page)
Charcoal masthead (`Post-Match Feedback · <team>` kicker + bold white player name; right-aligned Position / Match / Date eyebrow+gold values) over a 3px gold bottom border. Body: a flex identity row with player **photo** (or initials placeholder), a "Next Game" block, and a **value-scaled score ring** (`scoreColors()` tints bg/fg red→amber→green by the 1–10 value; only shown if `score` set). Hairline. Two columns: **Going Well** (green accent `.bullet good`) / **Needs Work** (red accent `.bullet warn`). Hairline. **Next Game Focus** paragraph. Optional gold **Data** strip (`.data-line`). **Over To You** gold pull-quote (`.pullquote`). Charcoal footer.

### Review Deck — `.doc-page × 3` (each wraps its own `.doc`)
Every page = a full `.doc` with its own masthead (`Player Review · <team>`, Position / Period / **Page n / 3**) and footer.
- **Page 1 — Overview:** two-col rating tags (High Confidence / Building / Needs Attention — active tag lit green/amber/red by `overallRating`) + a **trajectory chip** (Improving↑ green / Plateauing→ amber / Declining↓ red) with optional `trajectoryNote`. **Foundation Statement** (`.statement` italic). Two-col **Top Strengths** (green bullets) / **Top Focus Areas** (red bullets).
- **Page 2 — Where You Stand:** "Strengths · Work-Ons · Role Alignment". Two-col numbered **Strengths** (green ✓ dots, title+detail) / **Work-Ons** (red `0n` dots, title+detail+gold coaching line). Hairline. **JD Alignment** three-col: each claim + verdict chip — `verdictChip()`/`verdictSymbol()`/`verdictWord()` map `yes/partial/no` → green **Aligned** ✓ / amber **Partial** ~ / red **Off Track** ✗.
- **Page 3 — Path Forward:** "Needs Work · Opportunities · The Closing Message". Two-col **Needs Work** (red `0n` numbered, detail only) / **Improvement Opportunities** (gold bullets). Hairline. **ACA Tracker** three-col (A/C/A gold-ring letters + title + desc). Hairline. **The Data Says** gold pull-quote (`dataSays`).

Both render into `#preview-content` (PM via `renderPMOutput`, deck via `renderRDOutput`).

**Key classes:** `.doc`, `.doc-page`, `.doc-mast` (`.mast-left/.mast-right/.mast-kicker/.mast-name/.mast-meta/.mast-eyebrow/.mast-val`), `.pm-output`, `.doc-body`, `.eyebrow`, `.sec`, `.sec-head`, `.bullet` + `.good/.warn/.gold`, `.num-item/.num-dot(.warn)/.num-body/.ni-title/.ni-detail/.ni-coach`, `.chip` + `.on-green/.on-amber/.on-red` + `.chip-mark`, `.rating-row/.rating-tag` (+ on-green/amber/red), `.traj-note`, `.statement`, `.score-ring/.sc-num/.sc-den/.score-cap`, `.doc-photo/.doc-photo-ph`, `.data-line/.dl-label/.dl-text`, `.pullquote`, `.jd-item/.jd-claim`, `.aca-item/.aca-letter/.aca-content`, `.hair`, `.two-col`, `.three-col`, `.doc-foot/.foot-right`.

## 8. ELV8 Premium Design System
Font **Montserrat**. App chrome bg `#1c1c1c`, panel `#262626`, panel2 `#2f2f2f`, inset `#161616`, borders `#3c3c3c`/`#4a4a4a`, gold `#D4AF37` (hover `#b8952e`; **DARK `#1c1c1c` text on gold**), text `#fff`, muted `#c4c4c4`, dim `#8c8c8c`; functional good `#2a9d3a`, bad `#e23b2e`, blue `#3aa7e0`, orange `#f4a259`, yellow `#f3c012`. **NO "ELV8" wordmark** — these are athlete-facing Black Sticks docs. Premium document: white `#fff` body, ink `#15171a`; charcoal `#1c1c1c` masthead + 3px gold bottom border (kicker `#8c8c8c` + bold white player name + eyebrow+gold value right); eyebrow meta strip; NO heavy boxes (hairlines + whitespace); colour as signal not blocks; section headers 11px uppercase letter-spacing 2px charcoal + 2px gold underline; SCORE ring scales red `#e23b2e`→amber `#f4a259`→green `#2a9d3a` by value; trajectory/JD chips keep red-amber-green semantics; charcoal footer (programme · "Generated <date> · Private & Confidential"); `@media print` A4 portrait with per-page breaks (`.doc-page`/`.pm-output`), ~8mm, remove shadow/radius, print-color-adjust:exact. Share Image: `ensureHtml2Canvas(cb)` loads html2canvas from cdnjs; `shareImage()` targets `#preview-content` → PNG; needs internet, falls back to Print.

(Note: in code the score-ring tints use the chip palette — green `#eaf6ec`/`#1e7a2b`, amber `#fbf3e3`/`#a07a1a`, red `#fbeae8`/`#c0322a` — via `scoreColors()`, thresholds ≥7 / ≥5 / else. The masthead-spec palette above is the brand reference.)

## 9. Conventions & Gotchas
- Two doc types **share the `.doc` document system** — change a base class and both documents move.
- **Per-page breaks must stay**: `.doc-page` and `.pm-output` both carry `page-break-after`; the print block re-asserts this. Don't strip them or multi-player print collapses.
- Preview selectors are the access pattern: **type + set + player**. Empty set selection shows a "Select a review set" placeholder.
- All field edits are `onchange` (fires on blur), not `oninput` — a value isn't saved until the field loses focus.
- `loadState` is a shallow `Object.assign`; adding a new top-level state key needs a default in the `state` literal or it'll be undefined for returning users.
- Squad import **appends** (`[...state.squad, ...imported]`) — it does not de-dupe.
- Builder fields edit the **set's player copy**, not the squad source. Editing a name in the squad later won't propagate into existing sets.
- `escHtml` turns newlines into `<br>`; `esc` does not — use `escHtml` for body text where line breaks matter.

## 10. How to Extend / Common Tasks
- **Add a post-match field:** add the key to the player object in `createPMSet()`, add an input in `renderPMBuilder()` (wire `onchange` to `getPMSet().players[pi].<field>`), and render it in `renderPMOutput()`.
- **Add a review-deck field:** add the key in `createRDSet()`, add an `inp()`/`ta()` line under the relevant Page section in `renderRDBuilder()`, render it in the matching page block of `renderRDOutput()`. Watch the `p['prefix'+n+...]` indexed-access pattern for the repeating strength/work-on/needs-work groups.
- **New document type:** add a nav button + `#view-x` container, a render-list/builder pair, a `renderXOutput()`, and a `<option>` in the preview type dropdown + branch in `renderPreview()`.
- **Change brand colours:** masthead/footer charcoal `#1c1c1c`, gold `#D4AF37`, and the chip/rating/score palettes; keep dark text on gold and the red-amber-green semantics.
- **Re-skin without ELV8 wordmark:** documents intentionally omit it — keep masthead text as `<docType> · <teamName>`.

## 11. Driving It in the Preview Harness
`state` is reachable via lexical scope in `preview_eval` (it is a module-level `let`, **not on `window`** — reference `state` directly, not `window.state`).

Seed a review deck and render:
```js
state.reviewDeckSets.push({
  id: 'demo', reviewTitle: 'Demo Review', teamName: 'BLACK STICKS MEN', reviewPeriod: 'Pro League Block 1',
  players: [{
    playerId:'p1', name:'Sam Lane', position:'Midfielder', photo:'',
    overallRating:'building', trajectory:'improving', trajectoryNote:'Up since camp',
    foundationStatement:'Reliable engine through the middle.',
    topStrength1:'Work rate', topStrength2:'Press triggers',
    topFocus1:'First touch under pressure', topFocus2:'Decision speed',
    strength1Title:'Engine', strength1Detail:'Covers ground both ways.',
    strength2Title:'', strength2Detail:'', strength3Title:'', strength3Detail:'',
    workOn1Title:'Receiving', workOn1Detail:'Open up earlier.', workOn1Coaching:'Scan before you receive.',
    workOn2Title:'', workOn2Detail:'', workOn2Coaching:'', workOn3Title:'', workOn3Detail:'', workOn3Coaching:'',
    jdClaim1:'Controls tempo', jdVerdict1:'yes', jdClaim2:'Defends the press', jdVerdict2:'partial', jdClaim3:'Scores from D', jdVerdict3:'no',
    needsWork1:'Final-third decisions', needsWork2:'', needsWork3:'',
    opportunity1:'Lead the press unit', opportunity2:'',
    acaAccountability:'Loops closed', acaConsistency:'On standard', acaAction:'Skill time protected',
    dataSays:'Top-3 distance covered in the block.'
  }]
});
state.ui.currentRDId = 'demo';
switchView('preview');
document.getElementById('preview-type').value = 'reviewdeck';
renderPreview();
document.getElementById('preview-set').value = 'demo';
renderPreview();
```
For post-match: same pattern into `state.postMatchSets` (set shape: `id, matchTitle, date, nextGame, teamName, players:[{...PM fields}]`), set `state.ui.currentPMId`, `preview-type='postmatch'`, then `renderPreview()` and select `preview-set`.
Tip: `renderPreview()` populates dropdowns first; set the `<select>` value then call `renderPreview()` again so the selection takes effect.

## 12. Full Source Code
The complete source is appended below this line verbatim.

<!--FULL_SOURCE_BELOW-->


```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Player Review Generator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif; background: #1c1c1c; color: #fff; min-height: 100vh; }

/* NAV */
nav { background: #262626; display: flex; align-items: center; padding: 0 20px; border-bottom: 2px solid #3c3c3c; }
nav .logo { font-weight: 900; font-size: 18px; padding: 14px 0; margin-right: 30px; color: #D4AF37; letter-spacing: 1px; }
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
.btn-danger:hover { background: #c0322a; }
.btn-success { background: #2a9d3a; color: #fff; }
.btn-success:hover { background: #34b346; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
input, select, textarea { padding: 6px 10px; border: 1px solid #3c3c3c; border-radius: 4px; background: #161616; color: #fff; font-size: 13px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #D4AF37; }
label { font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; }
.form-group input, .form-group select, .form-group textarea { width: 100%; }
.section { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.section h3 { color: #D4AF37; margin-bottom: 12px; }

/* SQUAD GRID */
.squad-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.squad-card { background: #161616; border: 1px solid #3c3c3c; border-radius: 6px; padding: 10px; text-align: center; position: relative; }
.squad-card img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #D4AF37; margin-bottom: 6px; }
.squad-card .no-photo { width: 80px; height: 80px; border-radius: 50%; background: #2f2f2f; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; font-size: 28px; font-weight: 700; color: #D4AF37; border: 2px solid #D4AF37; }
.squad-card h4 { font-size: 13px; color: #fff; margin-bottom: 2px; }
.squad-card small { color: #8c8c8c; font-size: 11px; }
.squad-card .card-actions { position: absolute; top: 4px; right: 4px; display: flex; gap: 2px; }
.squad-card .card-actions button { background: none; border: none; color: #8c8c8c; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.squad-card .card-actions button:hover { color: #fff; }

/* MATCH/REVIEW LIST */
.review-card { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 14px; margin-bottom: 8px; cursor: pointer; transition: all .2s; display: flex; justify-content: space-between; align-items: center; }
.review-card:hover { border-color: #D4AF37; }
.review-card.active { border-color: #D4AF37; background: #2f2f2f; }
.review-card .info h4 { color: #fff; font-size: 14px; margin-bottom: 2px; }
.review-card .info small { color: #8c8c8c; font-size: 12px; }
.review-actions { display: flex; gap: 4px; }

/* PLAYER TABS */
.player-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
.player-tab { padding: 6px 14px; background: #161616; border: 1px solid #3c3c3c; border-radius: 4px; cursor: pointer; font-size: 12px; color: #8c8c8c; transition: all .2s; }
.player-tab:hover { border-color: #D4AF37; color: #fff; }
.player-tab.active { background: #D4AF37; color: #1c1c1c; border-color: #D4AF37; font-weight: 700; }
.player-tab.filled { border-color: #2a9d3a; }

/* ============================================================= */
/* ELV8 PREMIUM DOCUMENT SYSTEM — clean light player-facing docs  */
/* ============================================================= */
.doc { background: #fff; color: #15171a; font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif; width: 100%; max-width: 960px; margin: 0 auto 30px; box-shadow: 0 10px 40px rgba(0,0,0,.35); }

/* MASTHEAD */
.doc-mast { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; padding: 22px 30px; background: #1c1c1c; border-bottom: 3px solid #D4AF37; }
.doc-mast .mast-left { min-width: 0; }
.doc-mast .mast-kicker { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #8c8c8c; margin-bottom: 6px; }
.doc-mast .mast-name { font-size: 22px; font-weight: 800; color: #fff; line-height: 1.1; }
.doc-mast .mast-right { text-align: right; display: flex; gap: 26px; }
.doc-mast .mast-meta { line-height: 1.3; }
.doc-mast .mast-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8c8c8c; }
.doc-mast .mast-val { font-size: 12px; font-weight: 700; color: #D4AF37; }

/* SECTION HEADERS */
.sec-head { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #1c1c1c; display: inline-block; padding-bottom: 5px; border-bottom: 2px solid #D4AF37; margin-bottom: 14px; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #9a9a9a; }

/* BODY */
.doc-body { padding: 28px 30px; }
.doc-body p { font-size: 13px; line-height: 1.65; color: #2a2d31; }

/* SCORE INDICATOR */
.score-ring { width: 78px; height: 78px; min-width: 78px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.score-ring .sc-num { font-size: 30px; font-weight: 900; line-height: 1; }
.score-ring .sc-den { font-size: 11px; font-weight: 700; opacity: .8; margin-top: -2px; }
.score-cap { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #9a9a9a; text-align: center; margin-top: 6px; }

/* Photo */
.doc-photo { width: 96px; height: 96px; min-width: 96px; border-radius: 50%; object-fit: cover; border: 2px solid #D4AF37; display: block; }
.doc-photo-ph { width: 96px; height: 96px; min-width: 96px; border-radius: 50%; background: #f0ede4; border: 2px solid #D4AF37; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #b8952e; }

/* BULLET LISTS with accent markers */
.bullet { position: relative; padding: 4px 0 12px 18px; font-size: 13px; line-height: 1.55; color: #2a2d31; }
.bullet::before { content: ''; position: absolute; left: 0; top: 9px; width: 4px; height: 14px; border-radius: 2px; background: #D4AF37; }
.bullet.good::before { background: #2a9d3a; }
.bullet.warn::before { background: #e23b2e; }
.bullet.gold::before { background: #D4AF37; }

/* Numbered list (gold dot) */
.num-item { display: flex; gap: 14px; margin-bottom: 16px; }
.num-dot { width: 26px; height: 26px; min-width: 26px; border-radius: 50%; background: #1c1c1c; color: #D4AF37; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
.num-dot.warn { background: #e23b2e; color: #fff; }
.num-body { flex: 1; }
.num-body .ni-title { font-size: 13px; font-weight: 700; color: #15171a; margin-bottom: 3px; }
.num-body .ni-detail { font-size: 12px; line-height: 1.5; color: #4a4d51; }
.num-body .ni-coach { font-size: 12px; line-height: 1.45; color: #b8952e; font-weight: 600; margin-top: 4px; }

/* PULL QUOTE (coach message) */
.pullquote { border-left: 3px solid #D4AF37; padding: 4px 0 4px 18px; font-size: 14px; font-style: italic; line-height: 1.65; color: #2a2d31; }

/* CHIPS (trajectory / verdict) */
.chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; border: 1px solid #e7e7e7; color: #9a9a9a; }
.chip .chip-mark { font-size: 13px; line-height: 1; }
.chip.on-green { background: #eaf6ec; border-color: #b9e0bf; color: #1e7a2b; }
.chip.on-amber { background: #fbf3e3; border-color: #ecd9a6; color: #a07a1a; }
.chip.on-red { background: #fbeae8; border-color: #f0c5bf; color: #c0322a; }

/* HAIRLINE & GRID */
.hair { border: none; border-top: 1px solid #e7e7e7; margin: 22px 0; }
.two-col { display: flex; gap: 36px; }
.two-col > * { flex: 1; min-width: 0; }
.three-col { display: flex; gap: 28px; }
.three-col > * { flex: 1; min-width: 0; }

/* Data line */
.data-line { display: flex; align-items: baseline; gap: 14px; background: #f7f6f2; border-left: 3px solid #D4AF37; padding: 12px 16px; }
.data-line .dl-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #b8952e; flex-shrink: 0; }
.data-line .dl-text { font-size: 12px; color: #2a2d31; line-height: 1.5; }

/* RATING + TRAJECTORY (deck p1) */
.rating-row { display: flex; gap: 8px; }
.rating-tag { flex: 1; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 9px 6px; border-radius: 4px; border: 1px solid #e7e7e7; color: #b0b0b0; }
.rating-tag.on-green { background: #eaf6ec; border-color: #2a9d3a; color: #1e7a2b; }
.rating-tag.on-amber { background: #fbf3e3; border-color: #D4AF37; color: #a07a1a; }
.rating-tag.on-red { background: #fbeae8; border-color: #e23b2e; color: #c0322a; }
.traj-note { font-size: 11px; font-style: italic; color: #8c8c8c; margin-top: 8px; }

/* Foundation / closing statement block */
.statement { font-size: 15px; font-style: italic; line-height: 1.7; color: #2a2d31; }

/* JD alignment */
.jd-item .jd-claim { font-size: 13px; color: #2a2d31; line-height: 1.5; margin-bottom: 8px; }

/* ACA tracker */
.aca-item { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
.aca-letter { width: 40px; height: 40px; min-width: 40px; border-radius: 50%; border: 2px solid #D4AF37; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; color: #b8952e; }
.aca-content .aca-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #15171a; margin-bottom: 2px; }
.aca-content .aca-desc { font-size: 11px; color: #6a6d71; line-height: 1.4; }

/* FOOTER */
.doc-foot { display: flex; justify-content: space-between; align-items: center; padding: 12px 30px; background: #1c1c1c; }
.doc-foot span { font-size: 10px; letter-spacing: 1px; color: #8c8c8c; }
.doc-foot .foot-right { color: #b8952e; }

/* Page wrapper for deck pages */
.doc-page { page-break-after: always; }
.doc-page:last-child { page-break-after: avoid; }

/* Section spacing helper */
.sec { margin-bottom: 30px; }
.sec:last-child { margin-bottom: 0; }

/* PRINT */
@media print {
  body { background: #fff; }
  nav, .view:not(#view-preview), .preview-controls, .no-print { display: none !important; }
  #view-preview { display: block !important; padding: 0; }
  .doc { max-width: none; margin: 0; box-shadow: none !important; }
  .doc-page, .pm-output { page-break-after: always; }
  .doc-page:last-child, .pm-output:last-child, .doc:last-child { page-break-after: avoid; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { margin: 8mm; size: A4 portrait; }
}
</style>
</head>
<body>

<nav>
  <span class="logo">PLAYER REVIEW GENERATOR</span>
  <button class="active" onclick="switchView('squad')">Squad</button>
  <button onclick="switchView('postmatch')">Post-Match</button>
  <button onclick="switchView('reviewdeck')">Review Deck</button>
  <button onclick="switchView('preview')">Preview / Print</button>
</nav>

<div id="view-squad" class="view active"></div>
<div id="view-postmatch" class="view"></div>
<div id="view-reviewdeck" class="view"></div>
<div id="view-preview" class="view"></div>

<script>
// =============================================
// STATE
// =============================================
const STORAGE_KEY = 'hockeyPlayerReviews';
let state = {
  squad: [],
  postMatchSets: [],
  reviewDeckSets: [],
  ui: { currentView: 'squad', currentPMId: null, currentRDId: null, currentPlayerIdx: 0 }
};

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { const d = JSON.parse(raw); Object.assign(state, d); } catch(e) { console.error(e); } }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

// =============================================
// VIEW SWITCHING
// =============================================
function switchView(v) {
  state.ui.currentView = v;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => {
    const t = b.textContent.toLowerCase();
    if ((v==='squad' && t.includes('squad')) || (v==='postmatch' && t.includes('post')) || (v==='reviewdeck' && t.includes('review deck')) || (v==='preview' && t.includes('preview'))) b.classList.add('active');
  });
  if (v==='squad') renderSquad();
  else if (v==='postmatch') renderPMList();
  else if (v==='reviewdeck') renderRDList();
  else if (v==='preview') renderPreview();
  saveState();
}

// =============================================
// SQUAD MANAGEMENT
// =============================================
function renderSquad() {
  const el = document.getElementById('view-squad');
  let html = `<h2>Squad Management</h2>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="addPlayer()">+ Add Player</button>
      <button class="btn btn-secondary" onclick="exportSquad()">Export Squad</button>
      <button class="btn btn-secondary" onclick="importSquad()">Import Squad</button>
    </div>
    <div class="squad-grid">`;
  state.squad.forEach((p, i) => {
    const initials = (p.name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    html += `<div class="squad-card">
      <div class="card-actions">
        <button onclick="uploadPlayerPhoto(${i})" title="Upload photo">📷</button>
        <button onclick="editPlayer(${i})" title="Edit">✎</button>
        <button onclick="removePlayer(${i})" title="Remove">×</button>
      </div>
      ${p.photo ? `<img src="${p.photo}">` : `<div class="no-photo">${initials}</div>`}
      <h4>${esc(p.name)}</h4>
      <small>${esc(p.position)}</small>
    </div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}

function addPlayer() {
  const name = prompt('Player name:');
  if (!name) return;
  const pos = prompt('Position (e.g. Midfielder):') || '';
  state.squad.push({ id: uid(), name, position: pos, photo: '' });
  saveState(); renderSquad();
}

function editPlayer(i) {
  const p = state.squad[i];
  const name = prompt('Name:', p.name);
  if (name === null) return;
  const pos = prompt('Position:', p.position);
  if (pos === null) return;
  p.name = name; p.position = pos;
  saveState(); renderSquad();
}

function removePlayer(i) {
  if (!confirm('Remove ' + state.squad[i].name + '?')) return;
  state.squad.splice(i, 1);
  saveState(); renderSquad();
}

function uploadPlayerPhoto(i) {
  const input = document.createElement('input'); input.type='file'; input.accept='image/*';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => { state.squad[i].photo = ev.target.result; saveState(); renderSquad(); };
    reader.readAsDataURL(e.target.files[0]);
  };
  input.click();
}

function exportSquad() {
  const blob = new Blob([JSON.stringify(state.squad, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'squad.json'; a.click();
}

function importSquad() {
  const input = document.createElement('input'); input.type='file'; input.accept='.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try { const imported = JSON.parse(ev.target.result); state.squad = [...state.squad, ...imported]; saveState(); renderSquad(); }
      catch(e) { alert('Invalid JSON'); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

// =============================================
// POST-MATCH FEEDBACK
// =============================================
function renderPMList() {
  const el = document.getElementById('view-postmatch');
  if (state.ui.currentPMId) { renderPMBuilder(); return; }
  let html = `<h2>Post-Match Feedback</h2>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="createPMSet()">+ New Match Review</button>
    </div>`;
  state.postMatchSets.forEach(s => {
    const count = s.players.filter(p => p.goingWell1 || p.needsWork1).length;
    html += `<div class="review-card" onclick="openPMSet('${s.id}')">
      <div class="info"><h4>${esc(s.matchTitle)}</h4><small>${esc(s.date)} · ${count}/${s.players.length} completed</small></div>
      <div class="review-actions">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();dupPMSet('${s.id}')">Dup</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();delPMSet('${s.id}')">×</button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function createPMSet() {
  if (state.squad.length === 0) { alert('Add players to your squad first.'); return; }
  const title = prompt('Match (e.g. NZ vs Australia, 3-2):') || 'Match Review';
  const set = {
    id: uid(), matchTitle: title, date: new Date().toLocaleDateString('en-GB'),
    nextGame: '', teamName: 'BLACK STICKS MEN',
    players: state.squad.map(p => ({
      playerId: p.id, name: p.name, position: p.position, photo: p.photo,
      score: '', goingWell1: '', goingWell2: '', goingWell3: '',
      needsWork1: '', needsWork2: '',
      nextGameFocus: '', dataLine: '', overToYou: ''
    }))
  };
  state.postMatchSets.push(set);
  state.ui.currentPMId = set.id;
  state.ui.currentPlayerIdx = 0;
  saveState(); renderPMBuilder();
}

function openPMSet(id) { state.ui.currentPMId = id; state.ui.currentPlayerIdx = 0; saveState(); renderPMBuilder(); }

function dupPMSet(id) {
  const orig = state.postMatchSets.find(s=>s.id===id); if (!orig) return;
  const copy = JSON.parse(JSON.stringify(orig)); copy.id = uid(); copy.matchTitle += ' (copy)';
  state.postMatchSets.push(copy); saveState(); renderPMList();
}

function delPMSet(id) {
  if (!confirm('Delete this match review?')) return;
  state.postMatchSets = state.postMatchSets.filter(s=>s.id!==id);
  if (state.ui.currentPMId===id) state.ui.currentPMId=null;
  saveState(); renderPMList();
}

function getPMSet() { return state.postMatchSets.find(s=>s.id===state.ui.currentPMId); }

function renderPMBuilder() {
  const el = document.getElementById('view-postmatch');
  const set = getPMSet();
  if (!set) { renderPMList(); return; }
  const pi = state.ui.currentPlayerIdx;
  const player = set.players[pi];
  if (!player) { state.ui.currentPlayerIdx = 0; renderPMBuilder(); return; }

  let html = `<div class="toolbar">
    <button class="btn btn-secondary btn-sm" onclick="state.ui.currentPMId=null;saveState();renderPMList()">← Back</button>
    <button class="btn btn-success btn-sm" onclick="switchView('preview')">Preview / Print →</button>
  </div>
  <div class="section">
    <h3>Match Details</h3>
    <div class="form-row">
      <div class="form-group" style="flex:2;"><label>Match</label><input value="${esc(set.matchTitle)}" onchange="getPMSet().matchTitle=this.value;saveState();"></div>
      <div class="form-group"><label>Date</label><input value="${esc(set.date)}" onchange="getPMSet().date=this.value;saveState();"></div>
      <div class="form-group"><label>Next Game</label><input value="${esc(set.nextGame)}" onchange="getPMSet().nextGame=this.value;saveState();" placeholder="vs India, Thursday"></div>
      <div class="form-group" style="flex:1.5;"><label>Team Name</label><input value="${esc(set.teamName)}" onchange="getPMSet().teamName=this.value;saveState();"></div>
    </div>
  </div>`;

  // Player tabs
  html += `<div class="player-tabs">`;
  set.players.forEach((p, i) => {
    const filled = p.goingWell1 || p.needsWork1;
    html += `<div class="player-tab ${i===pi?'active':''} ${filled?'filled':''}" onclick="state.ui.currentPlayerIdx=${i};saveState();renderPMBuilder();">${esc(p.name.split(' ').pop())}</div>`;
  });
  html += `</div>`;

  // Player form
  html += `<div class="section">
    <h3>${esc(player.name)} — ${esc(player.position)}</h3>
    <div class="form-row">
      <div class="form-group"><label>Overall Score (1-10)</label><input type="number" min="1" max="10" value="${player.score}" onchange="getPMSet().players[${pi}].score=this.value;saveState();" style="width:70px;"></div>
      <div class="form-group"><label>Position Override</label><input value="${esc(player.position)}" onchange="getPMSet().players[${pi}].position=this.value;saveState();" style="width:140px;"></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Going Well 1</label><textarea rows="2" onchange="getPMSet().players[${pi}].goingWell1=this.value;saveState();">${esc(player.goingWell1)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Going Well 2</label><textarea rows="2" onchange="getPMSet().players[${pi}].goingWell2=this.value;saveState();">${esc(player.goingWell2)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Going Well 3</label><textarea rows="2" onchange="getPMSet().players[${pi}].goingWell3=this.value;saveState();">${esc(player.goingWell3)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Needs Work 1</label><textarea rows="2" onchange="getPMSet().players[${pi}].needsWork1=this.value;saveState();">${esc(player.needsWork1)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Needs Work 2</label><textarea rows="2" onchange="getPMSet().players[${pi}].needsWork2=this.value;saveState();">${esc(player.needsWork2)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Next Game Focus</label><textarea rows="2" onchange="getPMSet().players[${pi}].nextGameFocus=this.value;saveState();">${esc(player.nextGameFocus)}</textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Data</label><input value="${esc(player.dataLine)}" onchange="getPMSet().players[${pi}].dataLine=this.value;saveState();" placeholder="Total distance: 7.2km | Sprints: 23 | Circle entries: 12"></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>Over To You</label><textarea rows="3" onchange="getPMSet().players[${pi}].overToYou=this.value;saveState();">${esc(player.overToYou)}</textarea></div>
    </div>
    <div class="toolbar" style="margin-top:12px;">
      ${pi > 0 ? `<button class="btn btn-secondary btn-sm" onclick="state.ui.currentPlayerIdx--;saveState();renderPMBuilder();">← Prev</button>` : ''}
      ${pi < set.players.length-1 ? `<button class="btn btn-primary btn-sm" onclick="state.ui.currentPlayerIdx++;saveState();renderPMBuilder();">Next →</button>` : ''}
    </div>
  </div>`;
  el.innerHTML = html;
}

// =============================================
// REVIEW DECK
// =============================================
function renderRDList() {
  const el = document.getElementById('view-reviewdeck');
  if (state.ui.currentRDId) { renderRDBuilder(); return; }
  let html = `<h2>Player Review Decks</h2>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="createRDSet()">+ New Review</button>
    </div>`;
  state.reviewDeckSets.forEach(s => {
    const count = s.players.filter(p => p.foundationStatement).length;
    html += `<div class="review-card" onclick="openRDSet('${s.id}')">
      <div class="info"><h4>${esc(s.reviewTitle)}</h4><small>${esc(s.reviewPeriod)} · ${count}/${s.players.length} completed</small></div>
      <div class="review-actions">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();dupRDSet('${s.id}')">Dup</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();delRDSet('${s.id}')">×</button>
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

function createRDSet() {
  if (state.squad.length === 0) { alert('Add players to your squad first.'); return; }
  const title = prompt('Review Title:') || 'Player Review';
  const period = prompt('Review Period (e.g. Pro League Block 1):') || '';
  const set = {
    id: uid(), reviewTitle: title, reviewPeriod: period, teamName: 'BLACK STICKS MEN',
    players: state.squad.map(p => ({
      playerId: p.id, name: p.name, position: p.position, photo: p.photo,
      overallRating: '', trajectory: '', trajectoryNote: '', foundationStatement: '',
      topStrength1: '', topStrength2: '', topFocus1: '', topFocus2: '',
      strength1Title: '', strength1Detail: '',
      strength2Title: '', strength2Detail: '',
      strength3Title: '', strength3Detail: '',
      workOn1Title: '', workOn1Detail: '', workOn1Coaching: '',
      workOn2Title: '', workOn2Detail: '', workOn2Coaching: '',
      workOn3Title: '', workOn3Detail: '', workOn3Coaching: '',
      jdClaim1: '', jdVerdict1: 'yes',
      jdClaim2: '', jdVerdict2: 'partial',
      jdClaim3: '', jdVerdict3: 'no',
      needsWork1: '', needsWork2: '', needsWork3: '',
      opportunity1: '', opportunity2: '',
      acaAccountability: 'Closed loops? Feedback documented?',
      acaConsistency: 'Performing to standard across the block?',
      acaAction: 'Time protected for key skills? Work-ons actioned?',
      dataSays: ''
    }))
  };
  state.reviewDeckSets.push(set);
  state.ui.currentRDId = set.id;
  state.ui.currentPlayerIdx = 0;
  saveState(); renderRDBuilder();
}

function openRDSet(id) { state.ui.currentRDId = id; state.ui.currentPlayerIdx = 0; saveState(); renderRDBuilder(); }
function dupRDSet(id) {
  const orig = state.reviewDeckSets.find(s=>s.id===id); if (!orig) return;
  const copy = JSON.parse(JSON.stringify(orig)); copy.id = uid(); copy.reviewTitle += ' (copy)';
  state.reviewDeckSets.push(copy); saveState(); renderRDList();
}
function delRDSet(id) {
  if (!confirm('Delete?')) return;
  state.reviewDeckSets = state.reviewDeckSets.filter(s=>s.id!==id);
  if (state.ui.currentRDId===id) state.ui.currentRDId=null;
  saveState(); renderRDList();
}
function getRDSet() { return state.reviewDeckSets.find(s=>s.id===state.ui.currentRDId); }

function renderRDBuilder() {
  const el = document.getElementById('view-reviewdeck');
  const set = getRDSet();
  if (!set) { renderRDList(); return; }
  const pi = state.ui.currentPlayerIdx;
  const p = set.players[pi];
  if (!p) { state.ui.currentPlayerIdx = 0; renderRDBuilder(); return; }

  const f = (field) => `getRDSet().players[${pi}].${field}`;
  const inp = (label, field, val, extra='') => `<div class="form-group" ${extra}><label>${label}</label><input value="${esc(val)}" onchange="${f(field)}=this.value;saveState();"></div>`;
  const ta = (label, field, val, rows=2, extra='') => `<div class="form-group" ${extra}><label>${label}</label><textarea rows="${rows}" onchange="${f(field)}=this.value;saveState();">${esc(val)}</textarea></div>`;

  let html = `<div class="toolbar">
    <button class="btn btn-secondary btn-sm" onclick="state.ui.currentRDId=null;saveState();renderRDList();">← Back</button>
    <button class="btn btn-success btn-sm" onclick="switchView('preview')">Preview / Print →</button>
  </div>
  <div class="section">
    <h3>Review Details</h3>
    <div class="form-row">
      <div class="form-group" style="flex:2;"><label>Title</label><input value="${esc(set.reviewTitle)}" onchange="getRDSet().reviewTitle=this.value;saveState();"></div>
      <div class="form-group" style="flex:1;"><label>Review Period</label><input value="${esc(set.reviewPeriod)}" onchange="getRDSet().reviewPeriod=this.value;saveState();"></div>
      <div class="form-group" style="flex:1;"><label>Team Name</label><input value="${esc(set.teamName)}" onchange="getRDSet().teamName=this.value;saveState();"></div>
    </div>
  </div>`;

  // Player tabs
  html += `<div class="player-tabs">`;
  set.players.forEach((pl, i) => {
    const filled = pl.foundationStatement;
    html += `<div class="player-tab ${i===pi?'active':''} ${filled?'filled':''}" onclick="state.ui.currentPlayerIdx=${i};saveState();renderRDBuilder();">${esc(pl.name.split(' ').pop())}</div>`;
  });
  html += `</div>`;

  // Page 1 fields
  html += `<div class="section"><h3>Page 1 — Overview: ${esc(p.name)}</h3>
    <div class="form-row">
      <div class="form-group"><label>Overall Rating</label>
        <select onchange="${f('overallRating')}=this.value;saveState();">
          <option value="" ${!p.overallRating?'selected':''}>Select...</option>
          <option value="high" ${p.overallRating==='high'?'selected':''}>High Confidence</option>
          <option value="building" ${p.overallRating==='building'?'selected':''}>Building</option>
          <option value="attention" ${p.overallRating==='attention'?'selected':''}>Needs Attention</option>
        </select>
      </div>
      <div class="form-group"><label>Trajectory</label>
        <select onchange="${f('trajectory')}=this.value;saveState();">
          <option value="" ${!p.trajectory?'selected':''}>Select...</option>
          <option value="improving" ${p.trajectory==='improving'?'selected':''}>Improving ↑</option>
          <option value="plateauing" ${p.trajectory==='plateauing'?'selected':''}>Plateauing →</option>
          <option value="declining" ${p.trajectory==='declining'?'selected':''}>Declining ↓</option>
        </select>
      </div>
      ${inp('Trajectory Note','trajectoryNote',p.trajectoryNote,'style="flex:1;"')}
    </div>
    ${ta('Foundation Statement','foundationStatement',p.foundationStatement,3,'style="flex:1;"')}
    <div class="form-row">
      ${ta('Top Strength 1','topStrength1',p.topStrength1,2,'style="flex:1;"')}
      ${ta('Top Strength 2','topStrength2',p.topStrength2,2,'style="flex:1;"')}
    </div>
    <div class="form-row">
      ${ta('Top Focus Area 1','topFocus1',p.topFocus1,2,'style="flex:1;"')}
      ${ta('Top Focus Area 2','topFocus2',p.topFocus2,2,'style="flex:1;"')}
    </div>
  </div>`;

  // Page 2 fields
  html += `<div class="section"><h3>Page 2 — Where You Stand</h3>
    <div class="form-row">${inp('Strength 1 Title','strength1Title',p.strength1Title,'style="flex:1;"')}${ta('Detail','strength1Detail',p.strength1Detail,2,'style="flex:2;"')}</div>
    <div class="form-row">${inp('Strength 2 Title','strength2Title',p.strength2Title,'style="flex:1;"')}${ta('Detail','strength2Detail',p.strength2Detail,2,'style="flex:2;"')}</div>
    <div class="form-row">${inp('Strength 3 Title','strength3Title',p.strength3Title,'style="flex:1;"')}${ta('Detail','strength3Detail',p.strength3Detail,2,'style="flex:2;"')}</div>
    <div class="form-row">${inp('Work-On 1 Title','workOn1Title',p.workOn1Title,'style="flex:1;"')}${ta('Detail','workOn1Detail',p.workOn1Detail,2,'style="flex:2;"')}${ta('Coaching Direction','workOn1Coaching',p.workOn1Coaching,1,'style="flex:1;"')}</div>
    <div class="form-row">${inp('Work-On 2 Title','workOn2Title',p.workOn2Title,'style="flex:1;"')}${ta('Detail','workOn2Detail',p.workOn2Detail,2,'style="flex:2;"')}${ta('Coaching Direction','workOn2Coaching',p.workOn2Coaching,1,'style="flex:1;"')}</div>
    <div class="form-row">${inp('Work-On 3 Title','workOn3Title',p.workOn3Title,'style="flex:1;"')}${ta('Detail','workOn3Detail',p.workOn3Detail,2,'style="flex:2;"')}${ta('Coaching Direction','workOn3Coaching',p.workOn3Coaching,1,'style="flex:1;"')}</div>
    <h3 style="margin-top:12px;">JD Alignment</h3>
    <div class="form-row">
      ${inp('Claim 1','jdClaim1',p.jdClaim1,'style="flex:2;"')}
      <div class="form-group"><label>Verdict</label><select onchange="${f('jdVerdict1')}=this.value;saveState();"><option value="yes" ${p.jdVerdict1==='yes'?'selected':''}>✓ Yes</option><option value="partial" ${p.jdVerdict1==='partial'?'selected':''}>~ Partial</option><option value="no" ${p.jdVerdict1==='no'?'selected':''}>✗ No</option></select></div>
    </div>
    <div class="form-row">
      ${inp('Claim 2','jdClaim2',p.jdClaim2,'style="flex:2;"')}
      <div class="form-group"><label>Verdict</label><select onchange="${f('jdVerdict2')}=this.value;saveState();"><option value="yes" ${p.jdVerdict2==='yes'?'selected':''}>✓ Yes</option><option value="partial" ${p.jdVerdict2==='partial'?'selected':''}>~ Partial</option><option value="no" ${p.jdVerdict2==='no'?'selected':''}>✗ No</option></select></div>
    </div>
    <div class="form-row">
      ${inp('Claim 3','jdClaim3',p.jdClaim3,'style="flex:2;"')}
      <div class="form-group"><label>Verdict</label><select onchange="${f('jdVerdict3')}=this.value;saveState();"><option value="yes" ${p.jdVerdict3==='yes'?'selected':''}>✓ Yes</option><option value="partial" ${p.jdVerdict3==='partial'?'selected':''}>~ Partial</option><option value="no" ${p.jdVerdict3==='no'?'selected':''}>✗ No</option></select></div>
    </div>
  </div>`;

  // Page 3 fields
  html += `<div class="section"><h3>Page 3 — Path Forward</h3>
    ${ta('Needs Work 1','needsWork1',p.needsWork1,2,'style="flex:1;"')}
    ${ta('Needs Work 2','needsWork2',p.needsWork2,2,'style="flex:1;"')}
    ${ta('Needs Work 3','needsWork3',p.needsWork3,2,'style="flex:1;"')}
    <div class="form-row">${ta('Improvement Opportunity 1','opportunity1',p.opportunity1,2,'style="flex:1;"')}${ta('Improvement Opportunity 2','opportunity2',p.opportunity2,2,'style="flex:1;"')}</div>
    <h3 style="margin-top:12px;">ACA Tracker</h3>
    <div class="form-row">
      ${inp('Accountability','acaAccountability',p.acaAccountability,'style="flex:1;"')}
      ${inp('Consistency','acaConsistency',p.acaConsistency,'style="flex:1;"')}
      ${inp('Action','acaAction',p.acaAction,'style="flex:1;"')}
    </div>
    ${ta('The Data Says (Closing)','dataSays',p.dataSays,3,'style="flex:1;"')}
    <div class="toolbar" style="margin-top:12px;">
      ${pi > 0 ? `<button class="btn btn-secondary btn-sm" onclick="state.ui.currentPlayerIdx--;saveState();renderRDBuilder();">← Prev</button>` : ''}
      ${pi < set.players.length-1 ? `<button class="btn btn-primary btn-sm" onclick="state.ui.currentPlayerIdx++;saveState();renderRDBuilder();">Next →</button>` : ''}
    </div>
  </div>`;
  el.innerHTML = html;
}

// =============================================
// PREVIEW / PRINT
// =============================================
function ensureHtml2Canvas(cb) {
  if (window.html2canvas) return cb();
  const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  sc.onload = () => cb();
  sc.onerror = () => alert('Could not load the image tool — it needs an internet connection. Use Print instead.');
  document.head.appendChild(sc);
}
function shareImage() {
  const node = document.querySelector('#preview-content');
  if (!node) { alert('Select a player / build the review first.'); return; }
  ensureHtml2Canvas(() => {
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      .then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'player-review.png'; a.click(); })
      .catch(e => alert('Image export failed: ' + e.message));
  });
}
function renderPreview() {
  const el = document.getElementById('view-preview');
  let html = `<div class="preview-controls no-print" style="margin-bottom:16px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
    <select id="preview-type" onchange="renderPreview()" style="padding:6px 10px; background:#161616; color:#fff; border:1px solid #3c3c3c; border-radius:4px;">
      <option value="postmatch">Post-Match Feedback</option>
      <option value="reviewdeck">Review Deck</option>
    </select>
    <select id="preview-set" onchange="renderPreview()" style="padding:6px 10px; background:#161616; color:#fff; border:1px solid #3c3c3c; border-radius:4px;">
      <option value="">Select...</option>
    </select>
    <select id="preview-player" onchange="renderPreview()" style="padding:6px 10px; background:#161616; color:#fff; border:1px solid #3c3c3c; border-radius:4px;">
      <option value="all">All Players</option>
    </select>
    <button class="btn btn-primary" onclick="shareImage()">📷 Share Image</button>
    <button class="btn btn-secondary" onclick="window.print()">Print All</button>
  </div>
  <div id="preview-content"></div>`;
  el.innerHTML = html;

  // Restore type selection
  const typeEl = document.getElementById('preview-type');
  if (state.ui.currentRDId && !state.ui.currentPMId) typeEl.value = 'reviewdeck';

  // Populate set dropdown
  const setEl = document.getElementById('preview-set');
  const type = typeEl.value;
  const sets = type === 'postmatch' ? state.postMatchSets : state.reviewDeckSets;
  const currentId = type === 'postmatch' ? state.ui.currentPMId : state.ui.currentRDId;
  setEl.innerHTML = '<option value="">Select...</option>' + sets.map(s => {
    const label = type === 'postmatch' ? s.matchTitle : s.reviewTitle;
    return `<option value="${s.id}" ${s.id===currentId?'selected':''}>${esc(label)}</option>`;
  }).join('');

  const selectedSet = sets.find(s => s.id === setEl.value);
  if (!selectedSet) { document.getElementById('preview-content').innerHTML = '<p style="color:#8c8c8c;">Select a review set.</p>'; return; }

  // Populate player dropdown
  const playerEl = document.getElementById('preview-player');
  playerEl.innerHTML = '<option value="all">All Players</option>' + selectedSet.players.map((p,i) => `<option value="${i}">${esc(p.name)}</option>`).join('');

  // Render
  const content = document.getElementById('preview-content');
  const playerFilter = playerEl.value;
  const players = playerFilter === 'all' ? selectedSet.players : [selectedSet.players[parseInt(playerFilter)]];

  if (type === 'postmatch') {
    content.innerHTML = players.map(p => renderPMOutput(selectedSet, p)).join('');
  } else {
    content.innerHTML = players.map(p => renderRDOutput(selectedSet, p)).join('');
  }
}

// =============================================
// SHARED HELPERS
// =============================================
function genDate() {
  try { return new Date().toLocaleDateString('en-NZ', { day:'2-digit', month:'short', year:'numeric' }); }
  catch(e) { return new Date().toDateString(); }
}
function docFooter() {
  return `<div class="doc-foot">
    <span>Performance Programme · Player Review</span>
    <span class="foot-right">Generated ${genDate()} · Private &amp; Confidential</span>
  </div>`;
}
// Semantic score colour: red -> amber -> green
function scoreColors(score) {
  const n = parseInt(score) || 0;
  if (n >= 7) return { bg:'#eaf6ec', fg:'#1e7a2b', cap:'#1e7a2b' };
  if (n >= 5) return { bg:'#fbf3e3', fg:'#a07a1a', cap:'#a07a1a' };
  return { bg:'#fbeae8', fg:'#c0322a', cap:'#c0322a' };
}

// =============================================
// RENDER POST-MATCH OUTPUT
// =============================================
function renderPMOutput(set, p) {
  const initials = (p.name||'').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const sc = scoreColors(p.score);

  return `<div class="doc pm-output">
    <div class="doc-mast">
      <div class="mast-left">
        <div class="mast-kicker">Post-Match Feedback · ${esc(set.teamName)}</div>
        <div class="mast-name">${esc(p.name)}</div>
      </div>
      <div class="mast-right">
        <div class="mast-meta"><div class="mast-eyebrow">Position</div><div class="mast-val">${esc(p.position) || '—'}</div></div>
        <div class="mast-meta"><div class="mast-eyebrow">Match</div><div class="mast-val">${esc(set.matchTitle) || '—'}</div></div>
        <div class="mast-meta"><div class="mast-eyebrow">Date</div><div class="mast-val">${esc(set.date) || '—'}</div></div>
      </div>
    </div>

    <div class="doc-body">
      <div class="sec" style="display:flex; align-items:center; gap:24px;">
        ${p.photo ? `<img class="doc-photo" src="${p.photo}">` : `<div class="doc-photo-ph">${initials}</div>`}
        <div style="flex:1;">
          <div class="eyebrow">Next Game</div>
          <div style="font-size:16px; font-weight:700; color:#15171a; margin-top:3px;">${esc(set.nextGame) || 'TBC'}</div>
        </div>
        ${p.score ? `<div style="text-align:center;">
          <div class="score-ring" style="background:${sc.bg};">
            <span class="sc-num" style="color:${sc.fg};">${esc(p.score)}</span>
            <span class="sc-den" style="color:${sc.fg};">/10</span>
          </div>
          <div class="score-cap" style="color:${sc.cap};">Match Rating</div>
        </div>` : ''}
      </div>

      <hr class="hair">

      <div class="two-col">
        <div>
          <div class="sec-head">Going Well</div>
          ${p.goingWell1 ? `<div class="bullet good">${escHtml(p.goingWell1)}</div>` : ''}
          ${p.goingWell2 ? `<div class="bullet good">${escHtml(p.goingWell2)}</div>` : ''}
          ${p.goingWell3 ? `<div class="bullet good">${escHtml(p.goingWell3)}</div>` : ''}
        </div>
        <div>
          <div class="sec-head">Needs Work</div>
          ${p.needsWork1 ? `<div class="bullet warn">${escHtml(p.needsWork1)}</div>` : ''}
          ${p.needsWork2 ? `<div class="bullet warn">${escHtml(p.needsWork2)}</div>` : ''}
        </div>
      </div>

      <hr class="hair">

      <div class="sec">
        <div class="sec-head">Next Game Focus</div>
        <p>${escHtml(p.nextGameFocus)}</p>
      </div>

      ${p.dataLine ? `<div class="sec data-line">
        <span class="dl-label">Data</span>
        <span class="dl-text">${escHtml(p.dataLine)}</span>
      </div>` : ''}

      <div class="sec">
        <div class="sec-head">Over To You</div>
        <div class="pullquote">${escHtml(p.overToYou)}</div>
      </div>
    </div>

    ${docFooter()}
  </div>`;
}

// =============================================
// RENDER REVIEW DECK OUTPUT (3 pages)
// =============================================
function renderRDOutput(set, p) {
  const verdictSymbol = v => v==='yes' ? '✓' : v==='partial' ? '~' : '✗';
  const verdictChip = v => v==='yes' ? 'on-green' : v==='partial' ? 'on-amber' : 'on-red';
  const verdictWord = v => v==='yes' ? 'Aligned' : v==='partial' ? 'Partial' : 'Off Track';

  const mast = (page) => `<div class="doc-mast">
      <div class="mast-left">
        <div class="mast-kicker">Player Review · ${esc(set.teamName)}</div>
        <div class="mast-name">${esc(p.name)}</div>
      </div>
      <div class="mast-right">
        <div class="mast-meta"><div class="mast-eyebrow">Position</div><div class="mast-val">${esc(p.position) || '—'}</div></div>
        <div class="mast-meta"><div class="mast-eyebrow">Period</div><div class="mast-val">${esc(set.reviewPeriod) || '—'}</div></div>
        <div class="mast-meta"><div class="mast-eyebrow">Page</div><div class="mast-val">${page} / 3</div></div>
      </div>
    </div>`;

  // Trajectory chip (semantic)
  const trajChip = p.trajectory==='improving' ? `<span class="chip on-green"><span class="chip-mark">↑</span> Improving</span>`
    : p.trajectory==='plateauing' ? `<span class="chip on-amber"><span class="chip-mark">→</span> Plateauing</span>`
    : p.trajectory==='declining' ? `<span class="chip on-red"><span class="chip-mark">↓</span> Declining</span>`
    : '';

  // ---- PAGE 1 — Overview ----
  let html = `<div class="doc-page"><div class="doc">
    ${mast(1)}
    <div class="doc-body">
      <div class="two-col sec">
        <div>
          <div class="eyebrow" style="margin-bottom:8px;">Overall Standing</div>
          <div class="rating-row">
            <div class="rating-tag ${p.overallRating==='high'?'on-green':''}">High Confidence</div>
            <div class="rating-tag ${p.overallRating==='building'?'on-amber':''}">Building</div>
            <div class="rating-tag ${p.overallRating==='attention'?'on-red':''}">Needs Attention</div>
          </div>
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom:8px;">Trajectory</div>
          ${trajChip || '<span class="chip">Not set</span>'}
          ${p.trajectoryNote ? `<div class="traj-note">${escHtml(p.trajectoryNote)}</div>` : ''}
        </div>
      </div>

      <hr class="hair">

      <div class="sec">
        <div class="sec-head">Foundation Statement</div>
        <div class="statement">${escHtml(p.foundationStatement)}</div>
      </div>

      <hr class="hair">

      <div class="two-col">
        <div>
          <div class="sec-head">Top Strengths</div>
          ${p.topStrength1 ? `<div class="bullet good">${escHtml(p.topStrength1)}</div>` : ''}
          ${p.topStrength2 ? `<div class="bullet good">${escHtml(p.topStrength2)}</div>` : ''}
        </div>
        <div>
          <div class="sec-head">Top Focus Areas</div>
          ${p.topFocus1 ? `<div class="bullet warn">${escHtml(p.topFocus1)}</div>` : ''}
          ${p.topFocus2 ? `<div class="bullet warn">${escHtml(p.topFocus2)}</div>` : ''}
        </div>
      </div>
    </div>
    ${docFooter()}
  </div></div>`;

  // ---- PAGE 2 — Where You Stand ----
  html += `<div class="doc-page"><div class="doc">
    ${mast(2)}
    <div class="doc-body">
      <div class="eyebrow">Where You Stand</div>
      <div style="font-size:20px; font-weight:800; color:#15171a; margin:2px 0 22px;">Strengths · Work-Ons · Role Alignment</div>

      <div class="two-col sec">
        <div>
          <div class="sec-head">Strengths — Going Well</div>
          ${['1','2','3'].map(n => p['strength'+n+'Title'] ? `<div class="num-item"><div class="num-dot" style="background:#2a9d3a; color:#fff;">✓</div><div class="num-body"><div class="ni-title">${esc(p['strength'+n+'Title'])}</div><div class="ni-detail">${escHtml(p['strength'+n+'Detail'])}</div></div></div>` : '').join('')}
        </div>
        <div>
          <div class="sec-head">Work-Ons — Development</div>
          ${['1','2','3'].map((n,i) => p['workOn'+n+'Title'] ? `<div class="num-item"><div class="num-dot warn">0${i+1}</div><div class="num-body"><div class="ni-title">${esc(p['workOn'+n+'Title'])}</div><div class="ni-detail">${escHtml(p['workOn'+n+'Detail'])}</div>${p['workOn'+n+'Coaching'] ? `<div class="ni-coach">${escHtml(p['workOn'+n+'Coaching'])}</div>` : ''}</div></div>` : '').join('')}
        </div>
      </div>

      <hr class="hair">

      <div class="sec">
        <div class="sec-head">JD Alignment — Performing Against The Role</div>
        <div class="three-col">
          ${['1','2','3'].map(n => `<div class="jd-item">
            <div class="eyebrow" style="margin-bottom:6px;">Claimed</div>
            <div class="jd-claim">${esc(p['jdClaim'+n]) || '—'}</div>
            <span class="chip ${verdictChip(p['jdVerdict'+n])}"><span class="chip-mark">${verdictSymbol(p['jdVerdict'+n])}</span> ${verdictWord(p['jdVerdict'+n])}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
    ${docFooter()}
  </div></div>`;

  // ---- PAGE 3 — Path Forward ----
  html += `<div class="doc-page"><div class="doc">
    ${mast(3)}
    <div class="doc-body">
      <div class="eyebrow">Your Path Forward</div>
      <div style="font-size:20px; font-weight:800; color:#15171a; margin:2px 0 22px;">Needs Work · Opportunities · The Closing Message</div>

      <div class="two-col sec">
        <div>
          <div class="sec-head">Needs Work</div>
          ${['1','2','3'].map((n,i) => p['needsWork'+n] ? `<div class="num-item"><div class="num-dot warn">0${i+1}</div><div class="num-body"><div class="ni-detail">${escHtml(p['needsWork'+n])}</div></div></div>` : '').join('')}
        </div>
        <div>
          <div class="sec-head">Improvement Opportunities</div>
          ${p.opportunity1 ? `<div class="bullet gold">${escHtml(p.opportunity1)}</div>` : ''}
          ${p.opportunity2 ? `<div class="bullet gold">${escHtml(p.opportunity2)}</div>` : ''}
        </div>
      </div>

      <hr class="hair">

      <div class="sec">
        <div class="sec-head">ACA Tracker</div>
        <div class="three-col">
          <div class="aca-item"><div class="aca-letter">A</div><div class="aca-content"><div class="aca-title">Accountability</div><div class="aca-desc">${esc(p.acaAccountability)}</div></div></div>
          <div class="aca-item"><div class="aca-letter">C</div><div class="aca-content"><div class="aca-title">Consistency</div><div class="aca-desc">${esc(p.acaConsistency)}</div></div></div>
          <div class="aca-item"><div class="aca-letter">A</div><div class="aca-content"><div class="aca-title">Action</div><div class="aca-desc">${esc(p.acaAction)}</div></div></div>
        </div>
      </div>

      <hr class="hair">

      <div class="sec">
        <div class="sec-head">The Data Says</div>
        <div class="pullquote">${escHtml(p.dataSays)}</div>
      </div>
    </div>
    ${docFooter()}
  </div></div>`;

  return html;
}

// =============================================
// INIT
// =============================================
loadState();
if (state.ui.currentView) switchView(state.ui.currentView);
else renderSquad();
</script>
</body>
</html>

```
