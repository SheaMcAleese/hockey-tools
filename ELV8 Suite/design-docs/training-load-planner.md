# Training + Load Planner — Design & Build Reference
> Reload this file to re-engage Claude for work on this app. Canonical source: `ELV8 Suite/training-load-planner.html` (mirrored to `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`). Preview staging dir: `/tmp/elv8preview/`.

## 1. Purpose
A single-file planning tool for a hockey HP coach (Shea, working in the NZ national environment). It does four jobs:
- **Builder** — author a training session: info, images, GK stream, conditions, a schedule table (with RPE per row), match-play teams, objective + key coaching points.
- **Week (microcycle) planner** — drop sessions/gym/match/other onto the 7 days of a week; computes weekly load, monotony, strain, daily average and acute-to-chronic ratio (ACWR) with a daily-load bar chart.
- **Block view** — rolls every week up into a table showing the ramp/taper across a block into a pinnacle event (e.g. World Cup).
- **Preview / Print** — renders a premium, printable A4 session document; can export a standalone HTML sheet, print a multi-session "week pack" with cover, or render a one-page shareable PNG.

Load science throughout is **session-RPE**: load (Arbitrary Units, "AU") = RPE × minutes.

## 2. Architecture
- Single-file HTML, vanilla JS, no build step, no framework, works fully offline (one external dependency: Montserrat from Google Fonts; html2canvas is lazy-loaded from cdnjs only when Share Image is used).
- Font: **Montserrat** (Google Fonts), fallback `-apple-system, 'Segoe UI', Arial`.
- **Dual-key localStorage split:**
  - `STORAGE_KEY = 'hockeyTrainingApp'` — holds `{ sessions, ui, brand, campaign }`. **Shared with the old v1 tool** so v1 still reads the sessions.
  - `PLAN_KEY = 'hockeyTrainingPlanV2'` — holds `state.plan` only (`{ weeks, currentWeekId }`). Kept separate so the old tool never overwrites the load plan.
- Other module constants: `DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`, `PHASES = ['Prepare','Compete','Connect']`.

## 3. Data Model
Exact shapes from `createSession()` and the `state` init.

**Session** (created by `createSession()`):
```js
{
  id: uid(),
  title: 'Training Session',
  date: '', time: '', venue: '', coaches: '', focus: '',
  loadColor: 'orange',                 // 'green' | 'orange' | 'red' (banding only, not the maths)
  heroImage: '', bannerImage: '',      // data-URLs
  fieldSessionStart: '',               // e.g. '14.00' — drives auto-calculated row times
  schedule: [ /* array of row objects, see below */ ],
  mindsetWord: 'AGGRESSION',
  objective: '',                       // "what good looks like today"
  keyPoints: [],                       // array of strings, 2-4 lines
  conditions: { surface:'', weather:'', wind:'', kit:'', gps:'' },  // gps: '' | 'On' | 'Off'
  matchPlay: {
    enabled: false,
    team1Name: 'Black',  team1Color: '#000000',
    team2Name: 'Orange', team2Color: '#f59e0b',
    team1Players: [],    team2Players: [],   // arrays of strings
    extras: []                                // floaters, array of strings
  },
  gkSession: { exerciseTime:'60mins', time:'', rpe:'5', responsibility:'SM', focusDetail:'' }
}
```

**Schedule row** (note `phase` is optional and only seeded on some default rows):
```js
{ exerciseTime:'15mins', time:'', activity:'Basics', rpe:'4',
  responsibility:'SM', focusDetail:'', drillImage:'', phase:'Prepare' }
```
- `phase` ∈ `'' | 'Prepare' | 'Compete' | 'Connect'`. Rows added via `addScheduleRow()` are created **without** a `phase` key.
- Default schedule has 7 rows: Players Arrive (no duration, no phase), Warm-Up (Prepare), Basics (Prepare), Pressured Basics (Compete), Combative (Compete), Match Play (Compete), Review & Warm Down (Connect).
- "Arrive" rows (`activity` contains "arrive") get a manual `time` and no duration; all other rows auto-calc their time from `fieldSessionStart` + cumulative durations.

**Week / plan model:**
```js
state.plan = { weeks: [], currentWeekId: null }
// week:
{ id: uid(), name: 'Week 1', entries: [ /* entry objects */ ] }
// entry — kind 'session' references a built session live:
{ id: uid(), day: 0..6, kind: 'session', sessionId: '<id>' }
// entry — kind 'gym' | 'match' | 'other' carries its own load:
{ id: uid(), day: 0..6, kind: 'gym', label: 'Gym', rpe: '6', minutes: '45' }
```

**state.brand:** `{ name: '', logo: '' }` — programme name string + crest data-URL.

**state.campaign:** `{ blockName: '', eventName: '', eventDate: '' }` — `eventDate` is an ISO date string (`<input type="date">`), drives the countdown on every sheet.

**state.ui:** `{ currentView: 'sessions', currentSessionId: null }`.

**Session object field count documented: 18 top-level fields** (id, title, date, time, venue, coaches, focus, loadColor, heroImage, bannerImage, fieldSessionStart, schedule, mindsetWord, objective, keyPoints, conditions, matchPlay, gkSession).

## 4. State & Persistence
The single `state` object (Section 3) holds everything. `saveState()` writes **two** localStorage keys:
- `localStorage['hockeyTrainingApp']` = `JSON.stringify({ sessions, ui, brand, campaign })`
- `localStorage['hockeyTrainingPlanV2']` = `JSON.stringify(state.plan)`

`loadState()` reads both, defensively spreading `brand`/`campaign`/`ui` over defaults (so missing keys don't break) and defaulting arrays to `[]`. Both reads are wrapped in try/catch. Init at end of script: `loadState(); if (state.ui.currentView) switchView(state.ui.currentView);`.

## 5. Views & Navigation
Nav tabs (each `<button data-view=...>` calls `switchView(view)`): **Sessions, Builder, Week, Block, Preview / Print**.

`switchView(view)` sets `state.ui.currentView`, toggles `.view.active` and the nav button `.active` class, then dispatches the matching render function and `saveState()`:

| view | render fn |
|---|---|
| sessions | `renderSessions()` |
| builder | `renderBuilder()` |
| week | `renderWeek()` |
| block | `renderBlock()` |
| preview | `renderPreviewControls()` (which calls `renderPreview()`) |

## 6. Key Functions

| Function | Purpose |
|---|---|
| `sessionLoad(session)` | Outfield field-session load = Σ(RPE × minutes) across schedule rows; rounded. GK excluded. |
| `sessionMinutes(session)` | Σ of all row durations (minutes). |
| `gkLoad(session)` | GK stream load = round(gk.rpe × gk.minutes), reported separately. |
| `entryLoad(e)` | Week-entry load: looks up the live session for `kind:'session'`, else round(rpe×minutes). |
| `entryLabel(e)` | Display label for an entry (session title or its own label). |
| `weekDailyLoads(week)` | 7-element array of per-day load sums. |
| `weekMetrics(week)` | Returns `{daily,total,mean,sd,monotony,strain}`. monotony = mean/sd; strain = total×monotony. |
| `weekACWR(weekIndex)` | acute = this week total; chronic = mean of trailing ≤4 weeks; `{acute,chronic,ratio,weeksUsed}`. |
| `acwrFlag(ratio)` / `monotonyFlag(m)` | Map values to colour tag + text (sweet spot 0.8–1.3, etc.). |
| `buildSessionHTML(session, opts)` | **Returns a string** of the full premium document. `opts.compact` drops teams/hero/drills. |
| `renderPreview()` | Reads the select, sets `#preview-output` innerHTML to `buildSessionHTML(session)`. |
| `renderPreviewControls()` | Populates the session dropdown + brand/campaign inputs, then calls `renderPreview()`. |
| `exportSheet()` | Bundles the page `<style>` + `buildSessionHTML` into a standalone downloadable `.html`. |
| `printWeekPack()` | Builds a `.to-cover` page + every built session in the current week, then `window.print()`. |
| `shareImage()` | One-page PNG via html2canvas of `buildSessionHTML(session,{compact:true})` (scale 2, white bg). |
| `ensureHtml2Canvas(cb)` | Lazy-loads html2canvas 1.4.1 from cdnjs; alerts + falls back to Print if offline. |
| `calcBuilderTimes(session)` | Computes per-row `HH.MM - HH.MM` strings from `fieldSessionStart` + durations. |
| `parseStartTime` / `parseDuration` / `formatTime` | Time helpers ("13.00"→780 min; "15mins"→15; 780→"13.00"). |
| `parseDotDate(s)` | Parses `DD.MM.YY` (also `/` or `-`); 2-digit years +2000. Used for campaign countdown. |
| `pullSessionStart()` | Copies the start time out of `session.time` into `fieldSessionStart`. |
| `renderSessions/renderBuilder/renderWeek/renderBlock` | The four view renderers. |
| `addEntryPrompt/editEntry/removeEntry` | Week-entry CRUD via `prompt()` dialogs. |
| `esc(str)` | Minimal HTML escaper — escapes `"` and `<` only. |

## 7. The Printable Document (`buildSessionHTML`)
Output order (all inside a single `.training-output` root; `.to-compact` added when compact):
1. **Watermark** `.to-watermark` — faint rotated programme name (only if `brand.name`).
2. **Masthead** `.to-masthead` — brand crest/wordmark + "Session Plan" kicker + title on the left; "Hockey Focus" eyebrow + gold focus value on the right; hero image (if set) applied as a darkened background; 3px gold bottom border.
3. **Meta strip** `.to-meta` — Date / Time / Venue / Coaches + a Training Load 3-segment band (`.to-load .seg`, green/orange/red lit by `loadColor`).
4. **Conditions strip** `.to-cond` — Surface/Weather/Wind/Kit/GPS, only the populated ones.
5. **Campaign / microcycle strip** `.to-micro` — block name, "Week X of N", day, "N weeks to <event>" countdown, plus a right-aligned "This Session: <load> AU · <pct>% of week" if the session is placed in a week.
6. **Objective + key points band** `.to-objective` — "Session Objective · What Good Looks Like" text + numbered key coaching points (`.ob-points .num`). Only if objective or points exist.
7. **Schedule table** `.to-sched` — columns Time / Min / Activity / RPE / Lead / Focus. GK row first (if present) with a `.gk-tag`. Optional `.phase-band` header rows per phase showing `<min> min · <load> AU` subtotals. Each activity has a left RPE-coloured `.bar`; RPE shown as a coloured `.rpe-chip`. Prep rows (warm/review/arrive) get `.t-prep` muted styling.
8. **Load footer + sparkline** `.to-loadbar` — three metric cells (Session Load AU in gold, Total Minutes, Avg RPE) + an intensity-profile sparkline `.to-spark` (one `.sb-track`/`.sb-fill` bar per non-arrive RPE row, height = rpe/10).
9. **Mindset band** `.to-mindset` — "Mindset ›››" + the mindset word.
10. **Match-play teams** `.to-teams` — two coloured team columns + extras. *(dropped when compact)*
11. **Focus hero** `.to-hero` — giant gold focus word. *(dropped when compact)*
12. **Drills** `.to-drills` — grid of drill diagram cards from rows with `drillImage`. *(dropped when compact)*
13. **Footer** `.to-footer` — `<programme> · Training Session Plan` and `Generated <date> · Private & Confidential`.

`{compact:true}` (used by the Share Image) drops **teams, hero and drills** so it fits one PNG.

Key CSS classes: `.to-masthead, .to-meta, .to-cond, .to-micro, .to-objective, .to-sched, .phase-band, .to-loadbar, .to-spark, .to-mindset, .to-teams, .to-hero, .to-footer, .to-watermark, .to-compact` (plus `.to-cover` for the week-pack cover page).

## 8. ELV8 Premium Design System
- Font: Montserrat (Google Fonts), fallback -apple-system, Segoe UI, Arial.
- App chrome: bg #1c1c1c, panel #262626, panel2 #2f2f2f, inset #161616, borders #3c3c3c/#4a4a4a, accent gold #D4AF37 (hover #b8952e; DARK text #1c1c1c on gold), text #fff, muted #c4c4c4, dim #8c8c8c. Functional: good #2a9d3a, bad #e23b2e, blue #3aa7e0, orange #f4a259, yellow #f3c012, gk-green #7bc47f.
- NO "ELV8" wordmark (these are Black Sticks tools); branding is a configurable programme name + crest upload (Shea uses the Vantage Windows & Doors sponsor logo).
- Premium printed DOCUMENT rules: white #fff body, ink #15171a; charcoal #1c1c1c masthead with 3px gold bottom border (uppercase letter-spaced kicker #8c8c8c + bold white title + right-side eyebrow + gold value); eyebrow meta strip (9px uppercase #9a9a9a labels + bold 15px values, hairline dividers #eef0f1/#e7e7e7); NO heavy gridlines (hairlines + zebra #fafbfc); colour as SIGNAL not blocks (dots/accent bars/pills, never loud filled cells); section headers 11px uppercase letter-spacing 2px charcoal with 2px gold underline; charcoal footer (programme · "Generated <date> · Private & Confidential"); @media print A4, ~8mm margins, remove shadow/radius, print-color-adjust:exact.
- Share Image: ensureHtml2Canvas(cb) loads html2canvas from cdnjs on demand; shareImage() renders the output node to one PNG. Needs internet; falls back to Print.

## 9. Conventions & Gotchas
- **`esc()` only handles strings** — it does `(str||'').replace(...)`, so passing a number (e.g. an RPE) throws. RPE is read straight into `value="${row.rpe}"` un-escaped in the builder; in the document, numbers are passed through `chip()`/template literals, not `esc()`. Watch this when adding numeric fields.
- **`buildSessionHTML(session, opts) RETURNS a string** (refactored from direct DOM writes). `renderPreview`, `exportSheet`, `printWeekPack`, and `shareImage` all reuse it. Don't make it mutate the DOM.
- **Sessions key is shared with v1** (`hockeyTrainingApp`) — the old rotation/sub tool reads the same sessions; the load plan is isolated in `hockeyTrainingPlanV2` precisely so v1 can't clobber it.
- **`phase` is optional per row** — `addScheduleRow()` creates rows with no `phase` key; phase bands and subtotals only appear when at least one row has a phase. Always guard `row.phase`.
- **Campaign countdown** parses `session.date` as `DD.MM.YY` via `parseDotDate()` and compares to `campaign.eventDate` (ISO from a date input); weeks = round((event − session)/(7×864e5)), only shown if > 0.
- **GK is a parallel stream** — `sessionLoad()`/`sessionMinutes()` deliberately exclude GK; it has its own row, its own `gkLoad()`, and is reported separately so it never inflates the squad number.
- **Auto-times vs manual time** — non-arrive rows ignore their stored `time` and recompute from `fieldSessionStart`; arrive rows keep a manual `time`. In the document, `timeDisplay = row.time || autoTimes[idx]`.
- **`loadColor` is banding only** (the 3-seg meta strip / green-orange-red) and is NOT used in the AU maths.
- **Week entry editing**: `kind:'session'` entries are read-only in the Week view (they reflect the live Builder session); only gym/match/other are editable via prompts.
- **ACWR baseline caveat** — early weeks of a block have < 4 weeks of chronic data; the UI notes this. First weeks read with caution.

## 10. How to Extend / Common Tasks
- **Add a new field to the session:** add a default in `createSession()`; add an input in `renderBuilder()` wired to `updateSession('field', this.value)` (or a dedicated `updateX` for nested objects — see `updateGK`/`updateCond`/`updateMP`); render it in `buildSessionHTML()` where appropriate, using `esc()` for strings.
- **Add a meta column:** push `['Label', esc(session.x)||'—']` into the `metaItems` array in `buildSessionHTML` (the `.to-meta` strip).
- **Add a new document section:** insert an `html += '<div class="to-...">...'` block in `buildSessionHTML` at the right point in the order (Section 7), gated by `!compact` if it should be excluded from the Share Image; add matching `.to-...` CSS in the "PREMIUM SESSION DOCUMENT" style block.
- **Add a schedule column:** add a `<th>` in the `.to-sched` thead, a `<td>` in both the GK row and the per-row loop, and a corresponding builder column in `renderBuilder()`'s schedule table + `updateScheduleRow`.
- **Where the print CSS lives:** the `@media print` block (A4 landscape, 7mm margins, `print-color-adjust:exact`) and the whole `/* PREMIUM SESSION DOCUMENT */` section are in the single `<style>` in `<head>`.

## 11. Driving It in the Preview Harness (for testing)
`state` lives in **lexical script scope**, reachable from `preview_eval` — it is **NOT on `window`**. To test:
1. Seed data directly: `state.sessions = [ ...createSession-shaped objects ]`, optionally `state.plan.weeks`, `state.brand`, `state.campaign`. (You can call `createSession()` then mutate `state.sessions[0]`.)
2. `switchView('preview')` to render the controls.
3. Set the dropdown: `document.getElementById('preview-session-select').value = '<id>'`.
4. `renderPreview()` to paint `#preview-output`.
5. Compact Share Image build (string only): `buildSessionHTML(state.sessions[0], {compact:true})`.

Useful checks: `sessionLoad(s)`, `sessionMinutes(s)`, `weekMetrics(week)`, `weekACWR(idx)`. Remember `saveState()` writes both localStorage keys.

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
<title>Training + Load Planner</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Montserrat', -apple-system, 'Segoe UI', Arial, sans-serif; background: #1c1c1c; color: #fff; min-height: 100vh; }

/* NAV */
nav { background: #262626; display: flex; align-items: center; padding: 0 20px; border-bottom: 2px solid #2f2f2f; flex-wrap: wrap; }
nav .logo { font-weight: 900; font-size: 16px; padding: 14px 0; margin-right: 24px; color: #D4AF37; white-space: nowrap; }
nav button { background: none; border: none; color: #8c8c8c; font-size: 14px; padding: 14px 16px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; }
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
.btn-secondary:hover { background: #3a3a3a; }
.btn-danger { background: #e23b2e; color: #fff; }
.btn-danger:hover { background: #c43328; }
.btn-success { background: #2a9d3a; color: #fff; }
.btn-success:hover { background: #237f30; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
input, select, textarea { padding: 6px 10px; border: 1px solid #3c3c3c; border-radius: 4px; background: #161616; color: #fff; font-size: 13px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #D4AF37; }
select { cursor: pointer; }
label { font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; }
.form-group input, .form-group select, .form-group textarea { width: 100%; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mt-16 { margin-top: 16px; }
.muted { color: #8c8c8c; font-size: 12px; }

/* SESSION LIST */
.session-card { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 14px; margin-bottom: 8px; cursor: pointer; transition: all .2s; display: flex; justify-content: space-between; align-items: center; }
.session-card:hover { border-color: #D4AF37; }
.session-card.active { border-color: #D4AF37; background: #2f2f2f; }
.session-card .info h4 { color: #fff; font-size: 14px; margin-bottom: 2px; }
.session-card .info small { color: #8c8c8c; font-size: 12px; }
.session-actions { display: flex; gap: 4px; align-items: center; }
.load-badge { background: #2f2f2f; color: #D4AF37; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }

/* BUILDER */
.builder-section { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.builder-section h3 { color: #D4AF37; margin-bottom: 12px; }

/* IMAGE UPLOAD */
.img-upload-zone { border: 2px dashed #3c3c3c; border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all .2s; position: relative; min-height: 80px; display: flex; align-items: center; justify-content: center; }
.img-upload-zone:hover { border-color: #D4AF37; background: #161616; }
.img-upload-zone img { max-width: 100%; max-height: 200px; border-radius: 4px; }
.img-upload-zone .placeholder { color: #8c8c8c; font-size: 13px; }
.img-upload-zone .remove-img { position: absolute; top: 6px; right: 6px; background: #e23b2e; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 24px; text-align: center; }

/* SCHEDULE TABLE BUILDER */
.schedule-builder table { width: 100%; border-collapse: collapse; }
.schedule-builder th { background: #2f2f2f; padding: 8px 6px; text-align: center; font-size: 12px; color: #D4AF37; }
.schedule-builder td { padding: 4px 3px; }
.schedule-builder td input, .schedule-builder td select { width: 100%; font-size: 12px; padding: 5px 4px; }
.schedule-builder td .drill-upload { width: 100%; }
.schedule-builder tr:hover { background: #2f2f2f; }
.rpe-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

/* MATCH PLAY BUILDER */
.teams-container { display: flex; gap: 16px; }
.team-column { flex: 1; }
.team-column h4 { text-align: center; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 14px; }
.player-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #161616; border-radius: 4px; margin-bottom: 4px; font-size: 13px; cursor: pointer; transition: all .2s; }
.player-item:hover { background: #2f2f2f; }
.player-pool { margin-top: 12px; }
.player-pool h4 { color: #8c8c8c; font-size: 13px; margin-bottom: 6px; }
.extras-list { margin-top: 8px; }
.extras-list input { width: 100%; margin-bottom: 4px; }

/* ======================== */
/* WEEK / MICROCYCLE VIEW    */
/* ======================== */
.week-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.week-toolbar select { min-width: 200px; }

.day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 20px; }
.day-col { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 8px; min-height: 140px; display: flex; flex-direction: column; }
.day-col.is-match { border-color: #f4a259; }
.day-col.is-rest { opacity: .75; }
.day-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.day-head .dname { font-weight: 800; font-size: 13px; color: #fff; }
.day-head .dload { font-size: 11px; font-weight: 700; color: #D4AF37; }
.entry { background: #161616; border-left: 3px solid #D4AF37; border-radius: 3px; padding: 5px 6px; margin-bottom: 5px; font-size: 11px; position: relative; cursor: pointer; }
.entry:hover { background: #2f2f2f; }
.entry .etitle { font-weight: 700; color: #fff; padding-right: 14px; line-height: 1.25; }
.entry .emeta { color: #8c8c8c; font-size: 10px; margin-top: 2px; }
.entry .ex { position: absolute; top: 3px; right: 4px; color: #c66; font-weight: 700; cursor: pointer; font-size: 12px; line-height: 1; }
.entry.k-match { border-left-color: #f4a259; }
.entry.k-gym { border-left-color: #3cc43c; }
.entry.k-other { border-left-color: #888; }
.day-add { margin-top: auto; }
.day-add button { width: 100%; background: #2f2f2f; color: #D4AF37; border: none; border-radius: 3px; padding: 5px; font-size: 11px; cursor: pointer; }
.day-add button:hover { background: #3a3a3a; color: #fff; }

/* METRIC TILES */
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.metric { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 14px; }
.metric .mlabel { font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
.metric .mval { font-size: 26px; font-weight: 900; color: #fff; line-height: 1; }
.metric .msub { font-size: 11px; margin-top: 5px; }
.metric.flag-green { border-color: #2a9d3a; }
.metric.flag-amber { border-color: #b9851b; }
.metric.flag-red { border-color: #a33; }
.metric.flag-blue { border-color: #2a5a8a; }
.tag { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.tag-green { background: #173d20; color: #5fd66f; }
.tag-amber { background: #3d2f0c; color: #e8b54a; }
.tag-red { background: #3d1414; color: #f07070; }
.tag-blue { background: #122d44; color: #6db4ee; }

/* BAR CHART */
.chart { background: #262626; border: 1px solid #3c3c3c; border-radius: 6px; padding: 16px; margin-bottom: 20px; }
.chart h3 { color: #D4AF37; }
.bars { display: flex; align-items: flex-end; gap: 10px; height: 200px; padding-top: 10px; position: relative; border-bottom: 1px solid #3c3c3c; }
.bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar { width: 70%; border-radius: 4px 4px 0 0; min-height: 2px; transition: height .3s; position: relative; }
.bar .bval { position: absolute; top: -16px; left: 0; right: 0; text-align: center; font-size: 10px; color: #8c8c8c; font-weight: 700; }
.bar-label { font-size: 11px; color: #8c8c8c; margin-top: 6px; }
.chart-ref { position: absolute; left: 0; right: 0; border-top: 1px dashed #D4AF37; }
.chart-ref .rlabel { position: absolute; right: 0; top: -14px; font-size: 10px; color: #D4AF37; }

/* BLOCK TABLE */
.block-table { width: 100%; border-collapse: collapse; background: #262626; border-radius: 6px; overflow: hidden; }
.block-table th { background: #2f2f2f; color: #D4AF37; font-size: 12px; padding: 10px 8px; text-align: left; }
.block-table td { padding: 10px 8px; font-size: 13px; border-top: 1px solid #3c3c3c; }
.block-table tr:hover td { background: #2f2f2f; }
.mini-bar { height: 10px; border-radius: 5px; background: #D4AF37; min-width: 2px; }

/* OUTPUT / PREVIEW */
.training-output { background: #fff; color: #000; margin-bottom: 30px; font-family: 'Segoe UI', Arial, sans-serif; overflow: hidden; }
.training-output * { color: #000; }
.output-header { position: relative; background: #111; padding: 0; overflow: hidden; }
.output-header .hero-img { width: 100%; height: 220px; object-fit: cover; opacity: 0.5; display: block; }
.output-header .hero-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.output-header .focus-text { font-size: 64px; font-weight: 900; color: #fff !important; text-transform: uppercase; letter-spacing: 4px; text-shadow: 3px 3px 10px rgba(0,0,0,0.8); }
.output-header .no-hero { height: 120px; background: linear-gradient(135deg, #1c1c1c 0%, #262626 100%); display: flex; align-items: center; justify-content: center; }
.output-title-bar { text-align: center; padding: 10px 16px; font-size: 18px; font-weight: 800; border-bottom: 3px solid #000; }
.output-info { display: flex; padding: 0; border-bottom: 2px solid #000; }
.output-info-left { flex: 1; }
.output-info-left table { width: 100%; border-collapse: collapse; }
.output-info-left td { padding: 4px 12px; font-size: 13px; border: 1px solid #c4c4c4; }
.output-info-left td:first-child { font-weight: 700; text-align: right; width: 180px; background: #f5f5f5; }
.output-info-left .focus-cell { font-weight: 800; font-size: 14px; padding: 4px 12px; }
.output-info-left .load-bar { height: 18px; border-radius: 2px; }
.output-schedule { width: 100%; border-collapse: collapse; }
.output-schedule th { background: #1c1c1c; color: #fff !important; padding: 8px 6px; font-size: 12px; font-weight: 700; border: 1.5px solid #000; text-align: center; }
.output-schedule td { padding: 6px 8px; font-size: 13px; border: 1.5px solid #000; text-align: center; }
.output-schedule .activity-cell { font-weight: 700; }
.output-mindset { display: flex; align-items: center; justify-content: center; gap: 30px; padding: 20px; background: #fff; }
.output-mindset .mindset-label { font-size: 28px; font-weight: 900; color: #000 !important; }
.output-mindset .mindset-arrows { font-size: 28px; font-weight: 900; }
.output-mindset .mindset-word { font-size: 28px; font-weight: 900; color: #000 !important; }
.output-teams { background: #000; padding: 20px; }
.output-teams * { color: #fff !important; }
.output-teams h3 { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 12px; border-bottom: 3px solid #fff; padding-bottom: 8px; }
.output-teams table { width: 60%; margin: 0 auto; border-collapse: collapse; }
.output-teams th { padding: 8px 16px; font-size: 16px; font-weight: 800; border: 1.5px solid #555; }
.output-teams td { padding: 6px 16px; font-size: 14px; font-weight: 600; text-align: center; border: 1.5px solid #555; }
.output-teams .extras { text-align: center; margin-top: 10px; font-size: 14px; font-weight: 700; }
.output-focus-bottom { text-align: center; padding: 20px; background: #000; }
.output-focus-bottom .focus-word { font-size: 48px; font-weight: 900; color: #D4AF37 !important; text-transform: uppercase; letter-spacing: 3px; text-shadow: 0 0 20px rgba(212,175,55,0.5); }
.output-drills { background: #fff; padding: 16px; }
.output-drills h3 { font-size: 18px; font-weight: 800; margin-bottom: 12px; text-align: center; }
.drill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.drill-card { border: 1.5px solid #000; border-radius: 4px; overflow: hidden; }
.drill-card .drill-title { background: #1c1c1c; color: #fff !important; padding: 6px 10px; font-weight: 700; font-size: 13px; text-align: center; }
.drill-card img { width: 100%; display: block; }

/* RESPONSIVE */
@media (max-width: 820px) {
  .day-grid { grid-template-columns: repeat(2, 1fr); }
  .view { padding: 14px; }
}

/* PRINT */
@media print {
  body { background: #fff; }
  nav, .view:not(#view-preview), .preview-controls, .brand-bar, .no-print { display: none !important; }
  #view-preview { display: block !important; padding: 0; }
  .training-output { page-break-after: always; margin: 0 !important; max-width: none !important; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
  .training-output:last-child { page-break-after: avoid; }
  .to-sched tbody td { padding-top: 10px; padding-bottom: 10px; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 landscape; margin: 7mm; }
}
/* ======================================== */
/* PREMIUM SESSION DOCUMENT                  */
/* ======================================== */
.training-output { background:#fff; color:#15171a; margin:0 auto 30px; max-width:1120px; font-family:'Montserrat',-apple-system,'Segoe UI',Arial,sans-serif; overflow:hidden; position:relative; border-radius:12px; box-shadow:0 14px 50px rgba(0,0,0,.4); }
.training-output * { color:#15171a; }

.to-masthead { background:#1c1c1c; padding:22px 30px; display:flex; align-items:center; justify-content:space-between; gap:20px; position:relative; }
.to-masthead::after { content:''; position:absolute; left:0; right:0; bottom:0; height:3px; background:#D4AF37; }
.to-mast-left { display:flex; align-items:center; gap:16px; }
.to-mark { font-size:22px; font-weight:900; letter-spacing:2px; color:#D4AF37 !important; }
.to-kicker { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:3px; }
.to-title { font-size:21px; font-weight:800; color:#fff !important; letter-spacing:.3px; }
.to-titlerow { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.to-type { font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; padding:4px 13px; border-radius:13px; white-space:nowrap; }
.to-mast-right { text-align:right; }
.to-focus-eyebrow { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:3px; }
.to-focus-val { font-size:19px; font-weight:900; color:#D4AF37 !important; text-transform:uppercase; letter-spacing:1px; }

.to-meta { display:flex; flex-wrap:wrap; border-bottom:1px solid #e7e7e7; }
.to-meta .m { flex:1; min-width:110px; padding:13px 20px; border-right:1px solid #f0f0f0; }
.to-meta .m:last-child { border-right:none; }
.to-meta .ml { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#9a9a9a !important; margin-bottom:5px; }
.to-meta .mv { font-size:15px; font-weight:700; }
.to-load { display:flex; gap:5px; align-items:center; margin-top:4px; }
.to-load .seg { height:8px; width:30px; border-radius:3px; background:#e3e3e3; }

.to-sched { width:100%; border-collapse:collapse; }
.to-sched thead th { background:#1c1c1c; color:#cfcfcf !important; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; padding:12px 16px; text-align:left; }
.to-sched thead th.c { text-align:center; }
.to-sched tbody td { padding:13px 16px; font-size:13px; border-bottom:1px solid #eef0f1; vertical-align:middle; }
.to-sched tbody tr:nth-child(even) { background:#fafbfc; }
.to-sched tbody tr:last-child td { border-bottom:none; }
.to-sched .t-time { color:#8a8d92 !important; font-variant-numeric:tabular-nums; font-weight:600; white-space:nowrap; }
.to-sched td.c { text-align:center; }
.to-sched .t-act { font-weight:800; font-size:14px; }
.to-sched .t-act .bar { display:inline-block; width:4px; height:17px; border-radius:2px; vertical-align:-4px; margin-right:11px; }
.to-sched .t-resp { color:#83868b !important; font-size:11px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }
.to-sched .t-focus { color:#3a3d42 !important; font-size:12.5px; line-height:1.4; }
.to-sched .t-prep .t-act { font-weight:700; color:#a2a4a8 !important; }
.rpe-chip { display:inline-flex; align-items:center; justify-content:center; width:27px; height:27px; border-radius:50%; font-size:12px; font-weight:800; color:#fff !important; }
.gk-tag { display:inline-block; font-size:9px; letter-spacing:1px; background:#1c1c1c; color:#D4AF37 !important; padding:2px 7px; border-radius:3px; margin-left:8px; vertical-align:2px; font-weight:700; }

.to-loadbar { display:flex; align-items:stretch; border-top:2px solid #1c1c1c; background:#fff; }
.to-loadbar .lb-metric { padding:15px 22px; border-right:1px solid #eef0f1; text-align:center; min-width:108px; }
.to-loadbar .lb-metric .lv { font-size:25px; font-weight:900; color:#1c1c1c !important; line-height:1; }
.to-loadbar .lb-metric .lv.gold { color:#b8952e !important; }
.to-loadbar .lb-metric .ll { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#9a9a9a !important; margin-top:6px; }
.to-loadbar .lb-profile { flex:1; padding:13px 22px; display:flex; flex-direction:column; justify-content:center; }
.to-loadbar .lb-profile .pl { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#9a9a9a !important; margin-bottom:8px; }
.to-spark { display:flex; align-items:flex-end; gap:6px; height:48px; border-bottom:1.5px solid #1c1c1c; position:relative; }
.to-spark::before { content:''; position:absolute; left:0; right:0; top:50%; border-top:1px dashed #e2e4e6; }
.to-spark .sb-track { flex:1; height:100%; display:flex; align-items:flex-end; background:#f1f2f3; border-radius:3px 3px 0 0; overflow:hidden; }
.to-spark .sb-fill { width:100%; border-radius:3px 3px 0 0; min-height:3px; }

.to-mindset { background:#161616; padding:20px; display:flex; align-items:center; justify-content:center; gap:24px; }
.to-mindset .mk { font-size:12px; letter-spacing:5px; color:#8c8c8c !important; text-transform:uppercase; }
.to-mindset .ar { color:#D4AF37 !important; font-size:22px; letter-spacing:-3px; }
.to-mindset .mw { font-size:26px; font-weight:900; color:#fff !important; letter-spacing:2px; text-transform:uppercase; }

.to-teams { background:#1c1c1c; padding:24px; }
.to-teams * { color:#fff !important; }
.to-teams h3 { text-align:center; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:16px; }
.to-teams table { width:72%; max-width:540px; margin:0 auto; border-collapse:separate; border-spacing:0 6px; }
.to-teams th { font-size:14px; font-weight:800; padding:9px 16px; border-radius:5px; letter-spacing:.5px; }
.to-teams td { padding:8px 16px; font-size:13px; font-weight:600; text-align:center; background:#262626; }
.to-teams .extras { text-align:center; margin-top:14px; font-size:12px; color:#f4a259 !important; letter-spacing:.5px; }

.to-hero { background:#1c1c1c; text-align:center; padding:28px 20px; border-top:1px solid #2a2a2a; }
.to-hero .fw { font-size:46px; font-weight:900; color:#D4AF37 !important; text-transform:uppercase; letter-spacing:7px; }

.to-drills { background:#fff; padding:22px 26px; }
.to-drills h3 { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#9a9a9a !important; margin-bottom:14px; text-align:center; }

.to-logo { height:50px; width:auto; max-width:170px; object-fit:contain; display:block; }
.to-mast-left .to-mark + div, .to-mast-left .to-logo + div { border-left:1px solid #3a3a3a; padding-left:16px; }

.to-footer { background:#1c1c1c; padding:12px 28px; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.to-footer * { color:#7d7d7d !important; }
.to-footer .ft-l { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; }
.to-footer .ft-l b { color:#c4c4c4 !important; font-weight:700; }
.to-footer .ft-r { font-size:10px; letter-spacing:1px; }

.brand-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:10px; padding:10px 12px; background:#222; border:1px solid #333; border-radius:6px; }
.brand-bar-label { font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8c8c8c; font-weight:700; }

.to-micro { background:#161616; padding:9px 26px; display:flex; align-items:center; gap:14px; }
.to-micro .mc-tag { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#8c8c8c !important; white-space:nowrap; }
.to-micro .mc-val { font-size:12px; font-weight:700; color:#D4AF37 !important; letter-spacing:.3px; }

.to-objective { padding:18px 26px 20px; border-bottom:1px solid #e7e7e7; background:#fff; display:flex; gap:32px; flex-wrap:wrap; }
.to-objective .ob-eyebrow { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#9a9a9a !important; margin-bottom:7px; }
.to-objective .ob-main { flex:2; min-width:260px; }
.to-objective .ob-text { font-size:17px; font-weight:800; color:#15171a !important; line-height:1.3; }
.to-objective .ob-points { flex:3; min-width:280px; }
.to-objective .ob-points ul { list-style:none; }
.to-objective .ob-points li { display:flex; gap:11px; align-items:flex-start; font-size:13px; line-height:1.4; margin-bottom:8px; font-weight:600; color:#2a2d31 !important; }
.to-objective .ob-points li:last-child { margin-bottom:0; }
.to-objective .ob-points .num { flex:0 0 20px; height:20px; border-radius:50%; background:#1c1c1c; color:#D4AF37 !important; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }

.to-watermark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-26deg); font-size:140px; font-weight:900; color:#1c1c1c; opacity:.04; white-space:nowrap; pointer-events:none; letter-spacing:8px; }

.to-cond { display:flex; flex-wrap:wrap; background:#fafbfc; border-bottom:1px solid #e7e7e7; }
.to-cond .cd { padding:9px 18px; border-right:1px solid #eef0f1; display:flex; flex-direction:column; gap:3px; }
.to-cond .cl { font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:#9a9a9a !important; }
.to-cond .cv { font-size:13px; font-weight:700; color:#15171a !important; }

.to-micro .mc-spacer { flex:1; }

.phase-band td { background:#1c1c1c !important; padding:7px 16px !important; border-bottom:none !important; }
.phase-band .ph-name { color:#D4AF37 !important; font-size:11px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; }
.phase-band .ph-sub { color:#8c8c8c !important; font-size:10px; letter-spacing:1px; margin-left:14px; }

.to-cover { background:#1c1c1c; min-height:720px; display:flex; flex-direction:column; padding:54px 56px; }
.to-cover * { color:#fff; }
.to-cover .cv-top { margin-bottom:auto; }
.to-cover .cv-mark { font-size:30px; font-weight:900; color:#D4AF37 !important; letter-spacing:3px; }
.to-cover .cv-mid { margin:30px 0; }
.to-cover .cv-kicker { font-size:12px; letter-spacing:4px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:8px; }
.to-cover .cv-title { font-size:54px; font-weight:900; letter-spacing:1px; line-height:1.05; }
.to-cover .cv-stats { display:flex; gap:44px; margin:16px 0 30px; }
.to-cover .cv-stats b { display:block; font-size:34px; font-weight:900; color:#D4AF37 !important; line-height:1; }
.to-cover .cv-stats span { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#8c8c8c !important; margin-top:6px; display:block; }
.to-cover .cv-list { border-top:1px solid #333; padding-top:16px; }
.to-cover .cv-row { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid #2a2a2a; font-size:14px; font-weight:600; }
.to-cover .cv-row span:last-child { color:#c4c4c4 !important; font-weight:500; }
.to-cover .cv-foot { margin-top:34px; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#7d7d7d !important; }
.to-compact { box-shadow:none !important; border-radius:0 !important; }

/* Side-banner display stage (World Cup presentation format) */
.to-stage { display:inline-flex; align-items:stretch; margin:0 auto 30px; box-shadow:0 14px 50px rgba(0,0,0,.4); border-radius:12px; overflow:hidden; vertical-align:top; }
.to-stage .training-output { flex:0 0 1120px; width:1120px; margin:0; border-radius:0; box-shadow:none; }
.to-banner { flex:0 0 auto; background-size:cover; background-position:center; background-repeat:no-repeat; background-color:#0a0a0a; }
.to-event-logo { height:30px; width:auto; max-width:92px; object-fit:contain; display:block; margin-left:auto; margin-bottom:8px; }
#preview-output { overflow-x:auto; text-align:center; }
@media print { .to-stage { display:block; box-shadow:none; border-radius:0; } .to-stage .training-output { width:auto; flex:none; } .to-banner { display:none !important; } }
</style>
</head>
<body>

<nav>
  <span class="logo">🏑 TRAINING + LOAD PLANNER</span>
  <button data-view="sessions" class="active" onclick="switchView('sessions')">Sessions</button>
  <button data-view="builder" onclick="switchView('builder')">Builder</button>
  <button data-view="week" onclick="switchView('week')">Week</button>
  <button data-view="block" onclick="switchView('block')">Block</button>
  <button data-view="preview" onclick="switchView('preview')">Preview / Print</button>
</nav>

<div id="view-sessions" class="view active">
  <h2>Training Sessions</h2>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="createSession()">+ New Session</button>
    <button class="btn btn-secondary" onclick="exportSessions()">Export All</button>
    <button class="btn btn-secondary" onclick="importSessions()">Import</button>
  </div>
  <div id="session-list"></div>
</div>

<div id="view-builder" class="view">
  <div id="builder-content"><p style="color:#8c8c8c;">Create or select a session to start building.</p></div>
</div>

<div id="view-week" class="view">
  <div id="week-content"></div>
</div>

<div id="view-block" class="view">
  <div id="block-content"></div>
</div>

<div id="view-preview" class="view">
  <div class="preview-controls no-print">
    <select id="preview-session-select" onchange="renderPreview()">
      <option value="">Select a session...</option>
    </select>
    <button class="btn btn-primary" onclick="shareImage()">📷 Share Image</button>
    <button class="btn btn-secondary" onclick="window.print()">Print / Save PDF</button>
    <button class="btn btn-secondary" onclick="exportSheet()">Export Sheet</button>
    <button class="btn btn-secondary" onclick="printWeekPack()">Print Week Pack</button>
  </div>
  <div class="brand-bar no-print">
    <span class="brand-bar-label">Document branding</span>
    <input id="brand-name-input" type="text" placeholder="Programme name (e.g. BLACK STICKS)" oninput="setBrandName(this.value)" style="width:280px;">
    <button class="btn btn-secondary btn-sm" onclick="uploadBrandLogo()">Upload crest</button>
    <button class="btn btn-secondary btn-sm" id="brand-logo-clear" onclick="removeBrandLogo()" style="display:none;">Remove crest</button>
  </div>
  <div class="brand-bar no-print">
    <span class="brand-bar-label">Campaign</span>
    <input id="camp-block" type="text" placeholder="Block (e.g. Build Block)" oninput="setCampaign('blockName',this.value)" style="width:170px;">
    <input id="camp-event" type="text" placeholder="Pinnacle event (e.g. 2026 World Cup)" oninput="setCampaign('eventName',this.value)" style="width:230px;">
    <input id="camp-date" type="date" oninput="setCampaign('eventDate',this.value)" style="width:160px;">
    <span class="muted">Drives the countdown shown on every sheet</span>
  </div>
  <div class="brand-bar no-print">
    <span class="brand-bar-label">Display</span>
    <label style="display:flex;align-items:center;gap:6px;color:#c4c4c4;font-size:12px;cursor:pointer;margin:0;"><input type="checkbox" id="banners-toggle" onchange="toggleBanners(this.checked)" style="width:16px;height:16px;"> Side banners</label>
    <button class="btn btn-secondary btn-sm" onclick="uploadBrandImage('bannerLeft')">Left banner</button>
    <button class="btn btn-secondary btn-sm" id="bannerLeft-clear" onclick="removeBrandImage('bannerLeft')" style="display:none;">✕ Left</button>
    <button class="btn btn-secondary btn-sm" onclick="uploadBrandImage('bannerRight')">Right banner</button>
    <button class="btn btn-secondary btn-sm" id="bannerRight-clear" onclick="removeBrandImage('bannerRight')" style="display:none;">✕ Right</button>
    <button class="btn btn-secondary btn-sm" onclick="uploadBrandImage('eventLogo')">Event logo (WC)</button>
    <button class="btn btn-secondary btn-sm" id="eventLogo-clear" onclick="removeBrandImage('eventLogo')" style="display:none;">✕ Logo</button>
    <span class="muted">Banners show in the preview &amp; Share Image. Print / Save PDF is always the clean plan (no banners).</span>
  </div>
  <div id="preview-output"></div>
</div>

<script>
// =============================================
// STATE
// =============================================
const STORAGE_KEY = 'hockeyTrainingApp';      // shared with v1 (sessions)
const PLAN_KEY = 'hockeyTrainingPlanV2';      // v2 only (weeks / load plan)
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

let state = {
  sessions: [],
  plan: { weeks: [], currentWeekId: null },
  brand: { name: '', logo: '', eventLogo: '', bannerLeft: '', bannerRight: '', bannerLeftAR: 0.45, bannerRightAR: 0.45, bannersOn: true },
  campaign: { blockName: '', eventName: '', eventDate: '' },
  ui: { currentView: 'sessions', currentSessionId: null }
};
const PHASES = ['Prepare', 'Compete', 'Connect'];

let _quotaWarned = false;
function saveState() {
  try {
    // Sessions written to the shared key so v1 still reads them.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: state.sessions, ui: state.ui, brand: state.brand, campaign: state.campaign }));
    // Plan kept in its own key so the old tool never overwrites it.
    localStorage.setItem(PLAN_KEY, JSON.stringify(state.plan));
  } catch (e) {
    // Never let a storage error break the UI (e.g. quota full from large images).
    if (e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''))) {
      if (!_quotaWarned) { _quotaWarned = true; alert('Browser storage is full, so this could not be saved permanently. It still works for now, but to keep it after a refresh use smaller images (the planner already shrinks them) or remove unused session/drill photos.'); }
    } else { console.error('Save failed', e); }
  }
}

// Downscale + recompress an image file so it always fits comfortably in localStorage
function compressImageFile(file, maxW, maxH, asJpeg, cb) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      let w = img.width || maxW, h = img.height || maxH;
      const scale = Math.min(1, maxW / w, maxH / h);
      w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
      try {
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (asJpeg) { ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL(asJpeg ? 'image/jpeg' : 'image/png', asJpeg ? 0.82 : undefined), w, h);
      } catch (err) { cb(ev.target.result); }
    };
    img.onerror = () => cb(ev.target.result);
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      state.sessions = data.sessions || [];
      if (data.brand) state.brand = { ...state.brand, ...data.brand };
      if (data.campaign) state.campaign = { ...state.campaign, ...data.campaign };
      if (data.ui) state.ui = { ...state.ui, ...data.ui };
    } catch(e) { console.error('Load failed', e); }
  }
  const planRaw = localStorage.getItem(PLAN_KEY);
  if (planRaw) {
    try {
      const p = JSON.parse(planRaw);
      state.plan.weeks = p.weeks || [];
      state.plan.currentWeekId = p.currentWeekId || null;
    } catch(e) { console.error('Plan load failed', e); }
  }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function getRpeColor(rpe) {
  const n = parseInt(rpe) || 0;
  if (n <= 3) return '#3cc43c';
  if (n <= 6) return '#f59e0b';
  return '#e60000';
}

// Global time helpers
function parseStartTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}
function parseDuration(durStr) {
  if (durStr === undefined || durStr === null) return 0;
  const match = String(durStr).match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
function formatTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h + '.' + (m < 10 ? '0' : '') + m;
}
function durationOptions(selected) {
  let opts = '<option value="">-</option>';
  for (let i = 5; i <= 60; i += 5) {
    opts += `<option value="${i}mins" ${selected === i+'mins' ? 'selected' : ''}>${i}mins</option>`;
  }
  return opts;
}
function parseDotDate(s) {
  const m = (s || '').match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/);
  if (!m) return null;
  let y = parseInt(m[3]); if (y < 100) y += 2000;
  const d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
  return isNaN(d.getTime()) ? null : d;
}
function isArriveRow(activity) {
  return (activity || '').toLowerCase().includes('arrive');
}
function calcBuilderTimes(session) {
  const startMin = parseStartTime(session.fieldSessionStart);
  if (startMin === null) return session.schedule.map(() => '');
  let current = startMin;
  return session.schedule.map(row => {
    if (isArriveRow(row.activity)) return '';
    const dur = parseDuration(row.exerciseTime);
    if (dur > 0) {
      const start = current;
      const end = current + dur;
      current = end;
      return formatTime(start) + ' - ' + formatTime(end);
    }
    return '';
  });
}

function getLoadColor(load) {
  if (load === 'green') return '#3cc43c';
  if (load === 'orange') return '#f59e0b';
  return '#e60000';
}

// =============================================
// LOAD MATHS  (session-RPE: load = RPE x minutes)
// =============================================
// Field-session load for the outfield group. GK runs a parallel stream,
// so it is reported separately and not summed into the squad number.
function sessionLoad(session) {
  if (!session) return 0;
  let load = 0;
  (session.schedule || []).forEach(r => {
    if (r.rpe) load += parseFloat(r.rpe) * parseDuration(r.exerciseTime);
  });
  return Math.round(load);
}
function sessionMinutes(session) {
  let m = 0;
  (session.schedule || []).forEach(r => { m += parseDuration(r.exerciseTime); });
  return m;
}
function gkLoad(session) {
  if (!session || !session.gkSession || !session.gkSession.rpe) return 0;
  return Math.round(parseFloat(session.gkSession.rpe) * parseDuration(session.gkSession.exerciseTime));
}

// =============================================
// VIEW SWITCHING
// =============================================
function switchView(view) {
  state.ui.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'sessions') renderSessions();
  if (view === 'builder') renderBuilder();
  if (view === 'week') renderWeek();
  if (view === 'block') renderBlock();
  if (view === 'preview') renderPreviewControls();
  saveState();
}

// =============================================
// SESSIONS VIEW
// =============================================
function renderSessions() {
  const list = document.getElementById('session-list');
  list.innerHTML = state.sessions.map(s => {
    const load = sessionLoad(s);
    return `
    <div class="session-card ${state.ui.currentSessionId === s.id ? 'active' : ''}" onclick="editSession('${s.id}')">
      <div class="info">
        <h4>${s.title || 'Untitled Session'}</h4>
        <small>${s.date || 'No date'} · ${s.venue || ''} · ${s.focus || ''}</small>
      </div>
      <div class="session-actions">
        ${load ? `<span class="load-badge" title="Session load = RPE x minutes">${load} AU</span>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();duplicateSession('${s.id}')">Dup</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteSession('${s.id}')">×</button>
      </div>
    </div>
  `;}).join('') || '<p style="color:#8c8c8c;">No sessions yet. Create one to get started.</p>';
}

function createSession() {
  const session = {
    id: uid(),
    title: 'Training Session',
    date: '', time: '', venue: '', coaches: '', focus: '',
    loadColor: 'orange',
    heroImage: '', bannerImage: '',
    fieldSessionStart: '',
    schedule: [
      { exerciseTime: '', time: '', activity: 'Players Arrive', rpe: '', responsibility: '', focusDetail: '', drillImage: '', phase: '' },
      { exerciseTime: '15mins', time: '', activity: 'Field Players Warm-Up', rpe: '3', responsibility: 'Player Driven', focusDetail: '', drillImage: '', phase: 'Prepare' },
      { exerciseTime: '15mins', time: '', activity: 'Basics', rpe: '4', responsibility: 'SM', focusDetail: '', drillImage: '', phase: 'Prepare' },
      { exerciseTime: '20mins', time: '', activity: 'Pressured Basics', rpe: '5', responsibility: 'SM', focusDetail: '', drillImage: '', phase: 'Compete' },
      { exerciseTime: '25mins', time: '', activity: 'Combative', rpe: '6', responsibility: 'SM', focusDetail: '', drillImage: '', phase: 'Compete' },
      { exerciseTime: '25mins', time: '', activity: 'Match Play', rpe: '7', responsibility: 'SM', focusDetail: '', drillImage: '', phase: 'Compete' },
      { exerciseTime: '10mins', time: '', activity: 'Review & Warm Down', rpe: '', responsibility: 'Player Driven', focusDetail: '', drillImage: '', phase: 'Connect' },
    ],
    mindsetWord: 'AGGRESSION',
    sessionType: 'Develop',
    objective: '',
    keyPoints: [],
    conditions: { surface: '', weather: '', wind: '', kit: '', gps: '' },
    matchPlay: { enabled: false, team1Name: 'Black', team1Color: '#000000', team2Name: 'Orange', team2Color: '#f59e0b', team1Players: [], team2Players: [], extras: [] },
    gkSession: { exerciseTime: '60mins', time: '', rpe: '5', responsibility: 'SM', focusDetail: '' },
  };
  state.sessions.push(session);
  state.ui.currentSessionId = session.id;
  saveState();
  editSession(session.id);
}

function editSession(id) {
  state.ui.currentSessionId = id;
  saveState();
  switchView('builder');
}

function duplicateSession(id) {
  const original = state.sessions.find(s => s.id === id);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = uid();
  copy.title = original.title + ' (copy)';
  state.sessions.push(copy);
  saveState(); renderSessions();
}

function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (state.ui.currentSessionId === id) state.ui.currentSessionId = null;
  saveState(); renderSessions();
}

function exportSessions() {
  const blob = new Blob([JSON.stringify(state.sessions, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'training-sessions.json'; a.click();
}

function importSessions() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        state.sessions = [...state.sessions, ...imported];
        saveState(); renderSessions();
      } catch(e) { alert('Invalid JSON'); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

// =============================================
// BUILDER VIEW
// =============================================
function getSession() {
  return state.sessions.find(s => s.id === state.ui.currentSessionId);
}

function renderBuilder() {
  const container = document.getElementById('builder-content');
  const session = getSession();
  if (!session) { container.innerHTML = '<p style="color:#8c8c8c;">Select a session from the Sessions tab.</p>'; return; }

  const load = sessionLoad(session);
  const mins = sessionMinutes(session);

  let html = `
    <div class="toolbar">
      <button class="btn btn-secondary btn-sm" onclick="switchView('sessions')">← Back</button>
      <button class="btn btn-success btn-sm" onclick="switchView('preview')">Preview →</button>
      <span class="load-badge" style="margin-left:auto;" title="Session load = sum of RPE x minutes across the schedule">Load ${load} AU · ${mins} min</span>
    </div>

    <!-- SESSION INFO -->
    <div class="builder-section">
      <h3>Session Info</h3>
      <div class="form-row">
        <div class="form-group" style="flex:2;"><label>Title</label><input type="text" value="${esc(session.title)}" onchange="updateSession('title',this.value)"></div>
        <div class="form-group" style="flex:1;"><label>Date</label><input type="text" value="${esc(session.date)}" onchange="updateSession('date',this.value)" placeholder="07.03.26"></div>
        <div class="form-group" style="flex:1;"><label>Time</label><input type="text" value="${esc(session.time)}" onchange="updateSession('time',this.value)" placeholder="13.00 - 16.00"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label>Venue</label><input type="text" value="${esc(session.venue)}" onchange="updateSession('venue',this.value)" placeholder="LEP - AKL"></div>
        <div class="form-group" style="flex:1;"><label>Coaches</label><input type="text" value="${esc(session.coaches)}" onchange="updateSession('coaches',this.value)" placeholder="SM, BT"></div>
        <div class="form-group" style="flex:1;"><label>Hockey Focus</label><input type="text" value="${esc(session.focus)}" onchange="updateSession('focus',this.value)" placeholder="PRESSURED BASICS" style="font-weight:700;"></div>
        <div class="form-group"><label>Training Load</label>
          <select onchange="updateSession('loadColor',this.value)">
            <option value="green" ${session.loadColor==='green'?'selected':''}>Green (1-3)</option>
            <option value="orange" ${session.loadColor==='orange'?'selected':''}>Orange (4-6)</option>
            <option value="red" ${session.loadColor==='red'?'selected':''}>Red (7-10)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label>Mindset Word</label><input type="text" value="${esc(session.mindsetWord)}" onchange="updateSession('mindsetWord',this.value)" placeholder="AGGRESSION"></div>
        <div class="form-group"><label>Session Type — intent of the day</label>
          <select onchange="updateSession('sessionType',this.value)">
            ${['Activate','Develop','Sharpen','Load'].map(t=>`<option value="${t}" ${(session.sessionType||'Develop')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label>Session Objective — what good looks like today</label><input type="text" value="${esc(session.objective||'')}" onchange="updateSession('objective',this.value)" placeholder="e.g. Win the ball back inside 6 seconds, every loss"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label>Key Coaching Points (one per line, 2-4)</label><textarea rows="3" onchange="updateSession('keyPoints',this.value.split('\\n').map(x=>x.trim()).filter(x=>x))" placeholder="First defender sets the trap&#10;Support angles under 5m&#10;Finish the chance we create">${(session.keyPoints||[]).join('\n')}</textarea></div>
      </div>
    </div>

    <!-- IMAGES -->
    <div class="builder-section">
      <h3>Images</h3>
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Hero Image (main banner)</label>
          <div class="img-upload-zone" onclick="uploadImage('heroImage',this)" id="hero-upload">
            ${session.heroImage ? `<img src="${session.heroImage}"><button class="remove-img" onclick="event.stopPropagation();removeImage('heroImage')">×</button>` : '<span class="placeholder">Click to upload hero image</span>'}
          </div>
        </div>
        <div class="form-group" style="flex:1;">
          <label>Side Banner Image (optional)</label>
          <div class="img-upload-zone" onclick="uploadImage('bannerImage',this)" id="banner-upload">
            ${session.bannerImage ? `<img src="${session.bannerImage}"><button class="remove-img" onclick="event.stopPropagation();removeImage('bannerImage')">×</button>` : '<span class="placeholder">Click to upload banner image</span>'}
          </div>
        </div>
      </div>
    </div>

    <!-- GK SESSION -->
    <div class="builder-section">
      <h3>GK Session</h3>
      <div class="form-row">
        <div class="form-group"><label>Duration</label><input type="text" value="${esc(session.gkSession.exerciseTime)}" onchange="updateGK('exerciseTime',this.value)" style="width:80px;"></div>
        <div class="form-group"><label>Time</label><input type="text" value="${esc(session.gkSession.time)}" onchange="updateGK('time',this.value)" style="width:120px;" placeholder="13.00 - 14.00"></div>
        <div class="form-group"><label>RPE</label><input type="number" value="${session.gkSession.rpe}" onchange="updateGK('rpe',this.value)" min="1" max="10" style="width:55px;"></div>
        <div class="form-group"><label>Responsibility</label><input type="text" value="${esc(session.gkSession.responsibility)}" onchange="updateGK('responsibility',this.value)" style="width:80px;"></div>
        <div class="form-group" style="flex:1;"><label>Focus</label><input type="text" value="${esc(session.gkSession.focusDetail)}" onchange="updateGK('focusDetail',this.value)" placeholder="Arrive 12:50 - Warm Up / Kit Up"></div>
      </div>
    </div>

    <!-- CONDITIONS & LOGISTICS -->
    <div class="builder-section">
      <h3>Conditions & Logistics</h3>
      <div class="form-row">
        <div class="form-group" style="flex:1;"><label>Surface / Turf</label><input type="text" value="${esc(session.conditions?.surface||'')}" onchange="updateCond('surface',this.value)" placeholder="Water-based"></div>
        <div class="form-group" style="flex:1;"><label>Weather</label><input type="text" value="${esc(session.conditions?.weather||'')}" onchange="updateCond('weather',this.value)" placeholder="Overcast 14°"></div>
        <div class="form-group" style="flex:1;"><label>Wind</label><input type="text" value="${esc(session.conditions?.wind||'')}" onchange="updateCond('wind',this.value)" placeholder="15kph SW"></div>
        <div class="form-group" style="flex:1;"><label>Kit</label><input type="text" value="${esc(session.conditions?.kit||'')}" onchange="updateCond('kit',this.value)" placeholder="Training / Black"></div>
        <div class="form-group" style="width:110px;"><label>GPS Units</label>
          <select onchange="updateCond('gps',this.value)">
            <option value="" ${!session.conditions?.gps?'selected':''}>—</option>
            <option value="On" ${session.conditions?.gps==='On'?'selected':''}>On</option>
            <option value="Off" ${session.conditions?.gps==='Off'?'selected':''}>Off</option>
          </select>
        </div>
      </div>
    </div>

    <!-- SCHEDULE -->
    <div class="builder-section schedule-builder">
      <h3>Schedule</h3>
      <div class="form-row mb-16" style="align-items:center;">
        <div class="form-group"><label>Field Session Start</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="text" id="field-start-input" value="${esc(session.fieldSessionStart)}" onchange="updateFieldStart(this.value)" placeholder="14.00" style="width:90px;">
            <button class="btn btn-primary btn-sm" onclick="pullSessionStart()" title="Pull start time from Session Time field">⬆ Pull Time</button>
          </div>
        </div>
        <div style="color:#8c8c8c;font-size:12px;padding-top:18px;">Sets the start time for auto-calculating all schedule times below</div>
      </div>
      <table>
        <thead><tr>
          <th style="width:100px;">Duration</th>
          <th style="width:110px;">Time</th>
          <th style="width:150px;">Activity</th>
          <th style="width:105px;">Phase</th>
          <th style="width:55px;">RPE</th>
          <th style="width:110px;">Responsibility</th>
          <th>Focus</th>
          <th style="width:100px;">Drill Image</th>
          <th style="width:40px;"></th>
        </tr></thead>
        <tbody>`;

  const autoTimes = calcBuilderTimes(session);
  session.schedule.forEach((row, i) => {
    const arrive = isArriveRow(row.activity);
    const durationCell = arrive
      ? `<td></td>`
      : `<td><select onchange="updateScheduleRow(${i},'exerciseTime',this.value)">${durationOptions(row.exerciseTime)}</select></td>`;
    const timeCell = arrive
      ? `<td><input type="text" value="${esc(row.time)}" onchange="updateScheduleRow(${i},'time',this.value)" placeholder="13.45" style="width:100%;"></td>`
      : `<td style="color:#D4AF37;font-size:12px;text-align:center;">${autoTimes[i] || ''}</td>`;
    html += `<tr>
      ${durationCell}
      ${timeCell}
      <td><input type="text" value="${esc(row.activity)}" onchange="updateScheduleRow(${i},'activity',this.value)" style="font-weight:700;"></td>
      <td><select onchange="updateScheduleRow(${i},'phase',this.value)"><option value="" ${!row.phase?'selected':''}>—</option>${PHASES.map(p=>`<option value="${p}" ${row.phase===p?'selected':''}>${p}</option>`).join('')}</select></td>
      <td><input type="number" value="${row.rpe}" onchange="updateScheduleRow(${i},'rpe',this.value)" min="1" max="10" style="width:50px;"></td>
      <td><input type="text" value="${esc(row.responsibility)}" onchange="updateScheduleRow(${i},'responsibility',this.value)"></td>
      <td><input type="text" value="${esc(row.focusDetail)}" onchange="updateScheduleRow(${i},'focusDetail',this.value)"></td>
      <td><button class="btn btn-secondary btn-sm" onclick="uploadDrillImage(${i})" style="width:100%;">${row.drillImage ? 'Change' : 'Upload'}</button></td>
      <td><button class="btn btn-danger btn-sm" onclick="removeScheduleRow(${i})">×</button></td>
    </tr>`;
  });

  html += `</tbody></table>
      <button class="btn btn-secondary btn-sm mt-16" onclick="addScheduleRow()">+ Add Row</button>
    </div>

    <!-- MATCH PLAY TEAMS -->
    <div class="builder-section">
      <h3>Match Play Teams</h3>
      <div class="form-row mb-8">
        <label style="display:flex;align-items:center;gap:8px;margin:0;">
          <input type="checkbox" ${session.matchPlay.enabled ? 'checked' : ''} onchange="updateMP('enabled',this.checked)" style="width:18px;height:18px;">
          Enable Match Play Teams
        </label>
      </div>`;

  if (session.matchPlay.enabled) {
    html += `
      <div class="form-row mb-16">
        <div class="form-group"><label>Team 1 Name</label><input type="text" value="${esc(session.matchPlay.team1Name)}" onchange="updateMP('team1Name',this.value)" style="width:120px;"></div>
        <div class="form-group"><label>Team 1 Color</label><input type="color" value="${session.matchPlay.team1Color}" onchange="updateMP('team1Color',this.value)" style="width:50px;height:32px;padding:2px;"></div>
        <div class="form-group"><label>Team 2 Name</label><input type="text" value="${esc(session.matchPlay.team2Name)}" onchange="updateMP('team2Name',this.value)" style="width:120px;"></div>
        <div class="form-group"><label>Team 2 Color</label><input type="color" value="${session.matchPlay.team2Color}" onchange="updateMP('team2Color',this.value)" style="width:50px;height:32px;padding:2px;"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Team 1 Players (one per line)</label>
          <textarea rows="8" onchange="updateMP('team1Players',this.value.split('\\n').filter(p=>p.trim()))" style="width:100%;">${(session.matchPlay.team1Players||[]).join('\n')}</textarea>
        </div>
        <div class="form-group" style="flex:1;">
          <label>Team 2 Players (one per line)</label>
          <textarea rows="8" onchange="updateMP('team2Players',this.value.split('\\n').filter(p=>p.trim()))" style="width:100%;">${(session.matchPlay.team2Players||[]).join('\n')}</textarea>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Extras / Floaters (one per line)</label>
          <textarea rows="3" onchange="updateMP('extras',this.value.split('\\n').filter(p=>p.trim()))" style="width:100%;">${(session.matchPlay.extras||[]).join('\n')}</textarea>
        </div>
      </div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function esc(str) { return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function updateSession(field, value) { const s = getSession(); if (!s) return; s[field] = value; saveState(); }
function updateGK(field, value) { const s = getSession(); if (!s) return; s.gkSession[field] = value; saveState(); }
function updateCond(field, value) { const s = getSession(); if (!s) return; if (!s.conditions) s.conditions = {}; s.conditions[field] = value; saveState(); }
function updateFieldStart(value) { const s = getSession(); if (!s) return; s.fieldSessionStart = value; saveState(); renderBuilder(); }

function pullSessionStart() {
  const s = getSession(); if (!s) return;
  if (!s.time) { alert('Set the Session Time in Session Info first.'); return; }
  const parts = s.time.split('-').map(t => t.trim());
  const startMin = parseStartTime(parts[0]);
  if (startMin === null) { alert('Could not parse time from: ' + s.time); return; }
  s.fieldSessionStart = formatTime(startMin);
  saveState(); renderBuilder();
}

function updateScheduleRow(i, field, value) {
  const s = getSession(); if (!s) return;
  s.schedule[i][field] = value;
  saveState();
  if (field === 'exerciseTime' || field === 'activity' || field === 'rpe') renderBuilder();
}
function addScheduleRow() { const s = getSession(); if (!s) return; s.schedule.push({ exerciseTime: '', time: '', activity: '', rpe: '', responsibility: '', focusDetail: '', drillImage: '' }); saveState(); renderBuilder(); }
function removeScheduleRow(i) { const s = getSession(); if (!s) return; s.schedule.splice(i, 1); saveState(); renderBuilder(); }
function updateMP(field, value) { const s = getSession(); if (!s) return; s.matchPlay[field] = value; saveState(); renderBuilder(); }

// IMAGE HANDLING
function uploadImage(field, el) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    compressImageFile(f, 1400, 800, true, (dataUrl) => { const s = getSession(); if (!s) return; s[field] = dataUrl; saveState(); renderBuilder(); });
  };
  input.click();
}
function removeImage(field) { const s = getSession(); if (!s) return; s[field] = ''; saveState(); renderBuilder(); }
function uploadDrillImage(i) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    compressImageFile(f, 1200, 1200, true, (dataUrl) => { const s = getSession(); if (!s) return; s.schedule[i].drillImage = dataUrl; saveState(); renderBuilder(); });
  };
  input.click();
}

// =============================================
// WEEK / MICROCYCLE VIEW
// =============================================
function getWeek() { return state.plan.weeks.find(w => w.id === state.plan.currentWeekId); }

function createWeek() {
  const n = state.plan.weeks.length + 1;
  const week = { id: uid(), name: 'Week ' + n, entries: [] };
  state.plan.weeks.push(week);
  state.plan.currentWeekId = week.id;
  saveState(); renderWeek();
}

function deleteWeek() {
  const w = getWeek(); if (!w) return;
  if (!confirm('Delete ' + w.name + '?')) return;
  state.plan.weeks = state.plan.weeks.filter(x => x.id !== w.id);
  state.plan.currentWeekId = state.plan.weeks.length ? state.plan.weeks[0].id : null;
  saveState(); renderWeek();
}

function selectWeek(id) { state.plan.currentWeekId = id; saveState(); renderWeek(); }
function renameWeek(v) { const w = getWeek(); if (!w) return; w.name = v; saveState(); renderBlockSilent(); }
function renderBlockSilent() { /* keep block in sync if open later */ }

function entryLoad(e) {
  if (e.kind === 'session') {
    const s = state.sessions.find(x => x.id === e.sessionId);
    return sessionLoad(s);
  }
  return Math.round((parseFloat(e.rpe) || 0) * (parseFloat(e.minutes) || 0));
}
function entryLabel(e) {
  if (e.kind === 'session') {
    const s = state.sessions.find(x => x.id === e.sessionId);
    return s ? (s.title || 'Session') : '(deleted session)';
  }
  return e.label || (e.kind === 'match' ? 'Match' : e.kind === 'gym' ? 'Gym' : 'Activity');
}

function weekDailyLoads(week) {
  const loads = [0,0,0,0,0,0,0];
  (week.entries || []).forEach(e => { loads[e.day] += entryLoad(e); });
  return loads.map(Math.round);
}
function weekHasMatch(week, day) { return (week.entries || []).some(e => e.day === day && e.kind === 'match'); }

function weekMetrics(week) {
  const daily = weekDailyLoads(week);
  const total = daily.reduce((a,b) => a+b, 0);
  const mean = total / 7;
  const variance = daily.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / 7;
  const sd = Math.sqrt(variance);
  const monotony = sd > 0 ? mean / sd : 0;
  const strain = total * monotony;
  return { daily, total, mean, sd, monotony, strain };
}

// ACWR: acute = this week total; chronic = mean of the trailing 4 weeks
// (this week + up to 3 before it), the standard rolling-average method.
function weekACWR(weekIndex) {
  const weeks = state.plan.weeks;
  const acute = weekMetrics(weeks[weekIndex]).total;
  let sum = 0, count = 0;
  for (let i = Math.max(0, weekIndex - 3); i <= weekIndex; i++) { sum += weekMetrics(weeks[i]).total; count++; }
  const chronic = count ? sum / count : 0;
  return { acute, chronic, ratio: chronic > 0 ? acute / chronic : 0, weeksUsed: count };
}

function acwrFlag(ratio) {
  if (ratio === 0) return { tag:'tag-blue', cls:'flag-blue', txt:'No data' };
  if (ratio < 0.8) return { tag:'tag-blue', cls:'flag-blue', txt:'Undertraining' };
  if (ratio <= 1.3) return { tag:'tag-green', cls:'flag-green', txt:'Sweet spot' };
  if (ratio <= 1.5) return { tag:'tag-amber', cls:'flag-amber', txt:'Watch' };
  return { tag:'tag-red', cls:'flag-red', txt:'Danger' };
}
function monotonyFlag(m) {
  if (m === 0) return { tag:'tag-blue', txt:'No data' };
  if (m < 1.5) return { tag:'tag-green', txt:'Varied' };
  if (m <= 2.0) return { tag:'tag-amber', txt:'Watch' };
  return { tag:'tag-red', txt:'Too flat' };
}

function renderWeek() {
  const c = document.getElementById('week-content');
  if (!state.plan.weeks.length) {
    c.innerHTML = `
      <h2>Weekly Load Planner</h2>
      <p class="muted mb-16" style="max-width:640px;">Build a microcycle: drop your sessions onto the days of the week, add gym and match load, and the planner tracks weekly load, monotony, strain and your acute-to-chronic ratio. Load is session-RPE: RPE times minutes.</p>
      <button class="btn btn-primary" onclick="createWeek()">+ Create First Week</button>`;
    return;
  }
  const week = getWeek() || state.plan.weeks[0];
  state.plan.currentWeekId = week.id;
  const idx = state.plan.weeks.findIndex(w => w.id === week.id);
  const m = weekMetrics(week);
  const acwr = weekACWR(idx);
  const af = acwrFlag(acwr.ratio);
  const mf = monotonyFlag(m.monotony);

  let html = `
    <h2>Weekly Load Planner</h2>
    <div class="week-toolbar">
      <select onchange="selectWeek(this.value)">
        ${state.plan.weeks.map(w => `<option value="${w.id}" ${w.id===week.id?'selected':''}>${esc(w.name)}</option>`).join('')}
      </select>
      <input type="text" value="${esc(week.name)}" onchange="renameWeek(this.value)" style="width:180px;" title="Rename week">
      <button class="btn btn-primary btn-sm" onclick="createWeek()">+ Week</button>
      <button class="btn btn-danger btn-sm" onclick="deleteWeek()">Delete Week</button>
      <span class="muted" style="margin-left:auto;">Tap a day to add load</span>
    </div>`;

  // Day grid
  html += `<div class="day-grid">`;
  DAY_NAMES.forEach((dn, day) => {
    const entries = (week.entries || []).filter(e => e.day === day);
    const dload = entries.reduce((a,e) => a + entryLoad(e), 0);
    const isMatch = weekHasMatch(week, day);
    const isRest = entries.length === 0;
    html += `<div class="day-col ${isMatch?'is-match':''} ${isRest?'is-rest':''}">
      <div class="day-head"><span class="dname">${dn}</span><span class="dload">${dload?dload+' AU':'rest'}</span></div>`;
    entries.forEach(e => {
      const eid = e.id;
      html += `<div class="entry k-${e.kind}" onclick="editEntry('${week.id}','${eid}')">
        <span class="ex" onclick="event.stopPropagation();removeEntry('${week.id}','${eid}')">×</span>
        <div class="etitle">${esc(entryLabel(e))}</div>
        <div class="emeta">${e.kind.toUpperCase()} · ${entryLoad(e)} AU</div>
      </div>`;
    });
    html += `<div class="day-add"><button onclick="addEntryPrompt('${week.id}',${day})">+ add</button></div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // Metric tiles
  const taper = idx > 0 ? (() => {
    const prev = weekMetrics(state.plan.weeks[idx-1]).total;
    if (!prev) return null;
    return Math.round(((m.total - prev) / prev) * 100);
  })() : null;

  html += `<div class="metric-grid">
    <div class="metric"><div class="mlabel">Weekly Load</div><div class="mval">${m.total}</div><div class="msub muted">AU (RPE x min)</div></div>
    <div class="metric ${af.cls}"><div class="mlabel">Acute : Chronic</div><div class="mval">${acwr.ratio ? acwr.ratio.toFixed(2) : '—'}</div><div class="msub"><span class="tag ${af.tag}">${af.txt}</span></div></div>
    <div class="metric"><div class="mlabel">Monotony</div><div class="mval">${m.monotony ? m.monotony.toFixed(2) : '—'}</div><div class="msub"><span class="tag ${mf.tag}">${mf.txt}</span></div></div>
    <div class="metric"><div class="mlabel">Strain</div><div class="mval">${Math.round(m.strain)}</div><div class="msub muted">load x monotony</div></div>
    <div class="metric"><div class="mlabel">Daily Avg</div><div class="mval">${Math.round(m.mean)}</div><div class="msub muted">across 7 days</div></div>
    ${taper !== null ? `<div class="metric"><div class="mlabel">vs Last Week</div><div class="mval" style="color:${taper>0?'#f07070':'#5fd66f'};">${taper>0?'+':''}${taper}%</div><div class="msub muted">${taper<0?'tapering down':'loading up'}</div></div>` : ''}
  </div>`;

  // Bar chart
  const maxLoad = Math.max(1, ...m.daily);
  const chronicDaily = acwr.chronic / 7;
  const refPct = Math.min(100, (chronicDaily / maxLoad) * 100);
  html += `<div class="chart">
    <h3>Daily Load Distribution</h3>
    <div class="bars">
      <div class="chart-ref" style="bottom:${refPct}%;"><span class="rlabel">chronic avg ${Math.round(chronicDaily)}</span></div>`;
  m.daily.forEach((v, day) => {
    const h = (v / maxLoad) * 100;
    const isMatch = weekHasMatch(week, day);
    const color = isMatch ? '#f4a259' : (v === 0 ? '#3a3a3a' : '#D4AF37');
    html += `<div class="bar-wrap">
      <div class="bar" style="height:${h}%; background:${color};">${v?`<span class="bval">${v}</span>`:''}</div>
      <div class="bar-label">${DAY_NAMES[day]}</div>
    </div>`;
  });
  html += `</div>
    <p class="muted mt-16">Gold bar = match day. Dashed line = your rolling chronic daily average. Aim to keep the acute-to-chronic ratio in the 0.8 to 1.3 band, and monotony under 1.5 by mixing hard and easy days.</p>
  </div>`;

  c.innerHTML = html;
}

function addEntryPrompt(weekId, day) {
  const week = state.plan.weeks.find(w => w.id === weekId); if (!week) return;
  const kind = (prompt('Add to ' + DAY_NAMES[day] + '\\n\\nType one: session / gym / match / other', 'session') || '').trim().toLowerCase();
  if (!kind) return;
  if (kind === 'session') {
    if (!state.sessions.length) { alert('No sessions built yet. Create one in the Sessions tab first.'); return; }
    const list = state.sessions.map((s,i) => `${i+1}. ${s.title} (${sessionLoad(s)} AU)`).join('\\n');
    const pick = prompt('Pick a session by number:\\n\\n' + list, '1');
    const i = parseInt(pick) - 1;
    if (isNaN(i) || !state.sessions[i]) return;
    week.entries.push({ id: uid(), day, kind: 'session', sessionId: state.sessions[i].id });
  } else if (kind === 'gym' || kind === 'match' || kind === 'other') {
    const label = prompt('Label', kind === 'match' ? 'Match' : kind === 'gym' ? 'Gym' : 'Activity');
    if (label === null) return;
    const rpe = prompt('Session RPE (1-10)', kind === 'match' ? '8' : '6');
    const minutes = prompt('Minutes', kind === 'match' ? '70' : '45');
    week.entries.push({ id: uid(), day, kind, label, rpe, minutes });
  } else {
    alert('Type one of: session, gym, match, other');
    return;
  }
  saveState(); renderWeek();
}

function editEntry(weekId, entryId) {
  const week = state.plan.weeks.find(w => w.id === weekId); if (!week) return;
  const e = week.entries.find(x => x.id === entryId); if (!e) return;
  if (e.kind === 'session') { alert('Session entries are edited in the Builder. This slot reflects that session live.'); return; }
  const label = prompt('Label', e.label); if (label === null) return;
  const rpe = prompt('Session RPE (1-10)', e.rpe);
  const minutes = prompt('Minutes', e.minutes);
  e.label = label; e.rpe = rpe; e.minutes = minutes;
  saveState(); renderWeek();
}

function removeEntry(weekId, entryId) {
  const week = state.plan.weeks.find(w => w.id === weekId); if (!week) return;
  week.entries = week.entries.filter(x => x.id !== entryId);
  saveState(); renderWeek();
}

// =============================================
// BLOCK VIEW
// =============================================
function renderBlock() {
  const c = document.getElementById('block-content');
  if (!state.plan.weeks.length) {
    c.innerHTML = `<h2>Block Overview</h2><p class="muted">No weeks yet. Build microcycles in the Week tab and they roll up here, so you can see the ramp and taper across your block into the World Cup.</p>`;
    return;
  }
  const rows = state.plan.weeks.map((w, i) => {
    const m = weekMetrics(w);
    const acwr = weekACWR(i);
    return { w, m, acwr };
  });
  const maxTotal = Math.max(1, ...rows.map(r => r.m.total));

  let html = `<h2>Block Overview</h2>
    <p class="muted mb-16" style="max-width:680px;">Each week's load, monotony, strain and acute-to-chronic ratio in sequence. Watch for ramps steeper than the 0.8 to 1.3 ratio band, and plan your taper so the final week before a pinnacle match drops clearly.</p>
    <table class="block-table">
      <thead><tr><th>Week</th><th style="width:180px;">Load</th><th>Total</th><th>Monotony</th><th>Strain</th><th>ACWR</th><th>Status</th></tr></thead>
      <tbody>`;
  rows.forEach((r, i) => {
    const af = acwrFlag(r.acwr.ratio);
    const barW = (r.m.total / maxTotal) * 100;
    html += `<tr onclick="selectWeek('${r.w.id}');switchView('week')" style="cursor:pointer;">
      <td><strong>${esc(r.w.name)}</strong></td>
      <td><div class="mini-bar" style="width:${barW}%;"></div></td>
      <td>${r.m.total} AU</td>
      <td>${r.m.monotony ? r.m.monotony.toFixed(2) : '—'}</td>
      <td>${Math.round(r.m.strain)}</td>
      <td><strong>${r.acwr.ratio ? r.acwr.ratio.toFixed(2) : '—'}</strong></td>
      <td><span class="tag ${af.tag}">${af.txt}</span></td>
    </tr>`;
  });
  html += `</tbody></table>
    <p class="muted mt-16">Tap a week to open it. ACWR uses a rolling 4-week chronic average, so the first weeks of a block are still building a baseline and should be read with that in mind.</p>`;
  c.innerHTML = html;
}

// =============================================
// PREVIEW
// =============================================
function renderPreviewControls() {
  const sel = document.getElementById('preview-session-select');
  sel.innerHTML = '<option value="">Select a session...</option>' +
    state.sessions.map(s => `<option value="${s.id}" ${state.ui.currentSessionId === s.id ? 'selected' : ''}>${s.title} - ${s.date || 'No date'}</option>`).join('');
  const bn = document.getElementById('brand-name-input'); if (bn) bn.value = state.brand.name || '';
  const bc = document.getElementById('brand-logo-clear'); if (bc) bc.style.display = state.brand.logo ? '' : 'none';
  const cb = document.getElementById('camp-block'); if (cb) cb.value = state.campaign.blockName || '';
  const ce = document.getElementById('camp-event'); if (ce) ce.value = state.campaign.eventName || '';
  const cd = document.getElementById('camp-date'); if (cd) cd.value = state.campaign.eventDate || '';
  const bt = document.getElementById('banners-toggle'); if (bt) bt.checked = !!state.brand.bannersOn;
  ['bannerLeft','bannerRight','eventLogo'].forEach(f => { const el = document.getElementById(f + '-clear'); if (el) el.style.display = state.brand[f] ? '' : 'none'; });
  renderPreview();
}

function setBrandName(v) { state.brand.name = v; saveState(); renderPreview(); }
function uploadBrandLogo() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = e => { const f = e.target.files[0]; if (!f) return; compressImageFile(f, 480, 480, false, (dataUrl) => { state.brand.logo = dataUrl; saveState(); renderPreviewControls(); }); };
  i.click();
}
function removeBrandLogo() { state.brand.logo = ''; saveState(); renderPreviewControls(); }
function uploadBrandImage(field) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const isBanner = (field === 'bannerLeft' || field === 'bannerRight');
    const maxW = isBanner ? 900 : (field === 'eventLogo' ? 280 : 480);
    const maxH = isBanner ? 1800 : (field === 'eventLogo' ? 160 : 480);
    compressImageFile(f, maxW, maxH, isBanner, (dataUrl, w, h) => {
      state.brand[field] = dataUrl;
      if (isBanner) { state.brand.bannersOn = true; state.brand[field + 'AR'] = (w && h) ? (w / h) : (state.brand[field + 'AR'] || 0.45); }
      saveState(); renderPreviewControls();
    });
  };
  i.click();
}
function removeBrandImage(field) { state.brand[field] = ''; saveState(); renderPreviewControls(); }
function toggleBanners(on) { state.brand.bannersOn = !!on; saveState(); renderPreview(); }
function setCampaign(field, v) { state.campaign[field] = v; saveState(); renderPreview(); }

// Export the current session as a standalone, self-contained HTML sheet (shareable to a player, prints to PDF)
function exportSheet() {
  const sel = document.getElementById('preview-session-select');
  const session = state.sessions.find(s => s.id === sel.value);
  if (!session) { alert('Select a session first.'); return; }
  const styleEl = document.querySelector('style');
  const css = styleEl ? styleEl.textContent : '';
  const fontLink = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">';
  const body = buildSessionHTML(session);
  const docHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(session.title)} ${esc(session.date || '')}</title>${fontLink}<style>${css}\nbody{background:#e9ebee;margin:0;padding:26px;}@media print{body{background:#fff;padding:0;}}</style></head><body>${body}</body></html>`;
  const blob = new Blob([docHtml], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `session-${(session.title || 'plan').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`; a.click();
}

// Print the current week as a multi-session pack with a cover page
function printWeekPack() {
  const week = getWeek();
  if (!week) { alert('Open a week in the Week tab first, then return here to print its pack.'); return; }
  const sessionsInWeek = (week.entries || []).filter(e => e.kind === 'session').map(e => state.sessions.find(s => s.id === e.sessionId)).filter(Boolean);
  if (!sessionsInWeek.length) { alert('This week has no built sessions assigned.'); return; }
  const wm = weekMetrics(week);
  const progName = state.brand.name ? esc(state.brand.name) : 'Performance Programme';
  const mark = state.brand.logo ? `<img src="${state.brand.logo}" style="height:70px;max-width:220px;object-fit:contain;">` : `<div class="cv-mark">${progName}</div>`;
  const cover = `<div class="training-output to-cover">
    <div class="cv-top">${mark}</div>
    <div class="cv-mid"><div class="cv-kicker">Microcycle Pack</div><div class="cv-title">${esc(week.name)}</div></div>
    <div class="cv-stats"><div><b>${wm.total}</b><span>Weekly Load AU</span></div><div><b>${sessionsInWeek.length}</b><span>Sessions</span></div><div><b>${wm.monotony ? wm.monotony.toFixed(2) : '—'}</b><span>Monotony</span></div></div>
    <div class="cv-list">${sessionsInWeek.map((s, i) => `<div class="cv-row"><span>${i + 1}. ${esc(s.title)}</span><span>${esc(s.date || '')} &nbsp;·&nbsp; ${sessionLoad(s)} AU</span></div>`).join('')}</div>
    <div class="cv-foot">${progName} &nbsp;·&nbsp; Private &amp; Confidential</div>
  </div>`;
  const out = document.getElementById('preview-output');
  out.innerHTML = cover + sessionsInWeek.map(s => buildSessionHTML(s)).join('');
  window.print();
  setTimeout(() => renderPreview(), 600);
}

// One-page shareable PNG (for WhatsApp etc.) — drops match-play teams, drills and the focus hero so it all fits one image
function ensureHtml2Canvas(cb) {
  if (window.html2canvas) return cb();
  const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  sc.onload = () => cb();
  sc.onerror = () => alert('Could not load the image tool — it needs an internet connection. Fallback: use Print / Save PDF.');
  document.head.appendChild(sc);
}
// One Share Image button — captures EXACTLY what's previewed (banners and all if they're on). WYSIWYG.
function shareImage() {
  const sel = document.getElementById('preview-session-select');
  const session = state.sessions.find(s => s.id === sel.value);
  if (!session) { alert('Select a session to preview first.'); return; }
  ensureHtml2Canvas(() => {
    // Render the exact stage offscreen at full natural size so nothing is clipped by the viewport.
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed; left:-99999px; top:0; width:4000px; background:#ffffff;';
    wrap.innerHTML = buildStageHTML(session, {});
    document.body.appendChild(wrap);
    sizeBanners(wrap);
    const node = wrap.querySelector('.to-stage') || wrap.querySelector('.training-output');
    const w = Math.max(node.scrollWidth, node.offsetWidth) || 1120;
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: w, windowWidth: w + 40 })
      .then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'session-' + (session.title || 'plan').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'; a.click(); document.body.removeChild(wrap); })
      .catch(e => { document.body.removeChild(wrap); alert('Image export failed: ' + e.message); });
  });
}

// Wrap the session document in side banners (World Cup display format) when enabled
function buildStageHTML(session, opts) {
  const doc = buildSessionHTML(session, opts);
  const b = state.brand;
  if (b.bannersOn && (b.bannerLeft || b.bannerRight)) {
    const arL = b.bannerLeftAR || 0.45, arR = b.bannerRightAR || 0.45;
    return `<div class="to-stage">` +
      (b.bannerLeft ? `<div class="to-banner left" data-ar="${arL}" style="background-image:url('${b.bannerLeft}');"></div>` : '') +
      doc +
      (b.bannerRight ? `<div class="to-banner right" data-ar="${arR}" style="background-image:url('${b.bannerRight}');"></div>` : '') +
      `</div>`;
  }
  return doc;
}

// Banners are sized in JS: width = aspect-ratio × the plan's actual height (so the whole banner shows, true shape, matched height)
function sizeBanners(container) {
  if (!container) return;
  container.querySelectorAll('.to-stage').forEach(stage => {
    const plan = stage.querySelector('.training-output');
    if (!plan) return;
    const h = plan.offsetHeight;
    stage.querySelectorAll('.to-banner').forEach(b => {
      const ar = parseFloat(b.getAttribute('data-ar')) || 0.45;
      b.style.height = h + 'px';
      b.style.width = Math.round(ar * h) + 'px';
    });
  });
}

function renderPreview() {
  const sessionId = document.getElementById('preview-session-select').value;
  const session = state.sessions.find(s => s.id === sessionId);
  const output = document.getElementById('preview-output');
  if (!session) { output.innerHTML = '<p style="color:#8c8c8c;">Select a session to preview.</p>'; return; }
  output.innerHTML = buildStageHTML(session);
  sizeBanners(output);
}

function buildSessionHTML(session, opts) {
  const compact = !!(opts && opts.compact);
  const loadColor = getLoadColor(session.loadColor);

  let html = `<div class="training-output${compact ? ' to-compact' : ''}">`;

  // Faint document watermark
  if (state.brand.name) html += `<div class="to-watermark">${esc(state.brand.name)}</div>`;

  const hero = session.heroImage ? `background-image:linear-gradient(rgba(18,18,18,.80),rgba(18,18,18,.94)),url(${session.heroImage});background-size:cover;background-position:center;` : '';

  // Masthead
  const brandMark = state.brand.logo ? `<img class="to-logo" src="${state.brand.logo}" alt="">`
    : (state.brand.name ? `<span class="to-mark">${esc(state.brand.name)}</span>` : '');
  const st = session.sessionType || 'Develop';
  const stColor = { Activate:'#7bc47f', Develop:'#D4AF37', Sharpen:'#3aa7e0', Load:'#f4a259' }[st] || '#8c8c8c';
  const typeChip = `<span class="to-type" style="background:${stColor};color:${st==='Sharpen'?'#fff':'#1c1c1c'};">${esc(st)}</span>`;
  html += `<div class="to-masthead" style="${hero}">
    <div class="to-mast-left">
      ${brandMark}
      <div>
        <div class="to-kicker">Session Plan</div>
        <div class="to-titlerow"><span class="to-title">${esc(session.title)}</span>${typeChip}</div>
      </div>
    </div>
    <div class="to-mast-right">
      ${state.brand.eventLogo ? `<img class="to-event-logo" src="${state.brand.eventLogo}" alt="">` : ''}
      <div class="to-focus-eyebrow">Hockey Focus</div>
      <div class="to-focus-val">${esc(session.focus) || '—'}</div>
    </div>
  </div>`;

  // Meta strip
  const segColors = { green:'#2a9d3a', orange:'#f4a259', red:'#e23b2e' };
  const segs = ['green','orange','red'].map(k=>`<span class="seg" style="background:${session.loadColor===k?segColors[k]:'#e3e3e3'};"></span>`).join('');
  const metaItems = [['Date',esc(session.date)||'—'],['Time',esc(session.time)||'—'],['Venue',esc(session.venue)||'—'],['Coaches',esc(session.coaches)||'—']];
  html += `<div class="to-meta">` + metaItems.map(m=>`<div class="m"><div class="ml">${m[0]}</div><div class="mv">${m[1]}</div></div>`).join('') +
    `<div class="m"><div class="ml">Training Load</div><div class="to-load">${segs}</div></div></div>`;

  // Conditions & logistics strip
  const cond = session.conditions || {};
  const condItems = [['Surface',cond.surface],['Weather',cond.weather],['Wind',cond.wind],['Kit',cond.kit],['GPS Units',cond.gps]].filter(c=>c[1]);
  if (condItems.length) html += `<div class="to-cond">` + condItems.map(c=>`<span class="cd"><span class="cl">${c[0]}</span><span class="cv">${esc(c[1])}</span></span>`).join('') + `</div>`;

  const autoTimes = calcBuilderTimes(session);
  const totalFieldMins = sessionMinutes(session);
  const load = sessionLoad(session);
  let rpeSum = 0, rpeCount = 0;
  session.schedule.forEach(row => { if (row.rpe) { rpeSum += parseFloat(row.rpe); rpeCount++; } });
  const avgRpe = rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '—';
  const chip = (rpe) => { if(!rpe) return '<span style="color:#cfcfcf;font-weight:700;">–</span>'; return `<span class="rpe-chip" style="background:${getRpeColor(rpe)};">${rpe}</span>`; };

  // Campaign + microcycle context — links the sheet to the Week planner and the road to the pinnacle event
  let placed = null, weekIdx = -1;
  state.plan.weeks.forEach((w, i) => { const e = (w.entries || []).find(x => x.kind === 'session' && x.sessionId === session.id); if (e && !placed) { placed = { w, e }; weekIdx = i; } });
  const campBits = [];
  if (state.campaign.blockName) campBits.push(esc(state.campaign.blockName));
  if (placed) campBits.push(`Week ${weekIdx + 1} of ${state.plan.weeks.length}`);
  if (placed) campBits.push(DAY_NAMES[placed.e.day]);
  const sd = parseDotDate(session.date);
  if (state.campaign.eventDate && sd) {
    const ev = new Date(state.campaign.eventDate + 'T00:00:00');
    const wks = Math.round((ev - sd) / (7 * 864e5));
    if (!isNaN(wks) && wks > 0) campBits.push(`${wks} weeks to ${esc(state.campaign.eventName || 'event')}`);
  }
  let shareStr = '';
  if (placed) { const wm = weekMetrics(placed.w); const pct = wm.total ? Math.round((load / wm.total) * 100) : 0; shareStr = `${load} AU · ${pct}% of week`; }
  if (campBits.length || shareStr) {
    html += `<div class="to-micro"><span class="mc-tag">Campaign</span><span class="mc-val">${campBits.join(' &nbsp;·&nbsp; ') || '—'}</span>` +
      (shareStr ? `<span class="mc-spacer"></span><span class="mc-tag">This Session</span><span class="mc-val">${shareStr}</span>` : '') + `</div>`;
  }

  // Session objective + key coaching points
  const kps = (session.keyPoints || []).filter(x => x);
  if ((session.objective && session.objective.trim()) || kps.length) {
    html += `<div class="to-objective">
      <div class="ob-main"><div class="ob-eyebrow">Session Objective · What Good Looks Like</div><div class="ob-text">${session.objective ? esc(session.objective) : '—'}</div></div>`;
    if (kps.length) {
      html += `<div class="ob-points"><div class="ob-eyebrow">Key Coaching Points</div><ul>` +
        kps.map((p, i) => `<li><span class="num">${i+1}</span><span>${esc(p)}</span></li>`).join('') + `</ul></div>`;
    }
    html += `</div>`;
  }

  // Phase subtotals for the labelled phase bands
  const phaseTotals = {};
  session.schedule.forEach(r => { if (r.phase) { if (!phaseTotals[r.phase]) phaseTotals[r.phase] = { min:0, load:0 }; phaseTotals[r.phase].min += parseDuration(r.exerciseTime); phaseTotals[r.phase].load += (r.rpe ? parseFloat(r.rpe) * parseDuration(r.exerciseTime) : 0); } });
  const anyPhase = Object.keys(phaseTotals).length > 0;

  html += `<table class="to-sched"><thead><tr>
      <th style="width:104px;">Time</th>
      <th class="c" style="width:50px;">Min</th>
      <th>Activity</th>
      <th class="c" style="width:54px;">RPE</th>
      <th style="width:104px;">Lead</th>
      <th>Focus</th>
    </tr></thead><tbody>`;

  if (session.gkSession && (session.gkSession.time || session.gkSession.exerciseTime)) {
    let gkTime = session.gkSession.time;
    if (!gkTime && session.time) {
      const st = parseStartTime(session.time), d = parseDuration(session.gkSession.exerciseTime);
      if (st !== null && d > 0) gkTime = formatTime(st) + ' – ' + formatTime(st + d);
    }
    const gkBar = session.gkSession.rpe ? getRpeColor(session.gkSession.rpe) : '#d8d8d8';
    html += `<tr>
      <td class="t-time">${gkTime || ''}</td>
      <td class="c t-time">${parseDuration(session.gkSession.exerciseTime) || ''}</td>
      <td class="t-act"><span class="bar" style="background:${gkBar};"></span>GK Session<span class="gk-tag">GK</span></td>
      <td class="c">${chip(session.gkSession.rpe)}</td>
      <td class="t-resp">${esc(session.gkSession.responsibility)}</td>
      <td class="t-focus">${esc(session.gkSession.focusDetail)}</td>
    </tr>`;
  }

  const isPrep = (a) => { a = (a || '').toLowerCase(); return a.includes('warm') || a.includes('review') || a.includes('arrive'); };
  let lastPhase = null;
  session.schedule.forEach((row, idx) => {
    if (anyPhase && row.phase && row.phase !== lastPhase) {
      const pt = phaseTotals[row.phase];
      html += `<tr class="phase-band"><td colspan="6"><span class="ph-name">${esc(row.phase)}</span><span class="ph-sub">${Math.round(pt.min)} min · ${Math.round(pt.load)} AU</span></td></tr>`;
      lastPhase = row.phase;
    }
    const prep = isPrep(row.activity);
    const barColor = row.rpe ? getRpeColor(row.rpe) : '#dcdee0';
    const timeDisplay = row.time || autoTimes[idx] || '';
    html += `<tr class="${prep ? 't-prep' : ''}">
      <td class="t-time">${timeDisplay}</td>
      <td class="c t-time">${parseDuration(row.exerciseTime) || ''}</td>
      <td class="t-act"><span class="bar" style="background:${barColor};"></span>${esc(row.activity)}</td>
      <td class="c">${chip(row.rpe)}</td>
      <td class="t-resp">${esc(row.responsibility)}</td>
      <td class="t-focus">${esc(row.focusDetail)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;

  // Load footer + intensity profile sparkline
  const blocks = session.schedule.filter(r => r.rpe && !isArriveRow(r.activity));
  const spark = blocks.map(r => `<div class="sb-track" title="${esc(r.activity)} · RPE ${r.rpe}"><div class="sb-fill" style="height:${(parseFloat(r.rpe)/10)*100}%;background:${getRpeColor(r.rpe)};"></div></div>`).join('');
  html += `<div class="to-loadbar">
    <div class="lb-metric"><div class="lv gold">${load}</div><div class="ll">Session Load · AU</div></div>
    <div class="lb-metric"><div class="lv">${totalFieldMins}</div><div class="ll">Total Minutes</div></div>
    <div class="lb-metric"><div class="lv">${avgRpe}</div><div class="ll">Avg RPE</div></div>
    <div class="lb-profile"><div class="pl">Intensity Profile</div><div class="to-spark">${spark}</div></div>
  </div>`;

  html += `<div class="to-mindset"><span class="mk">Mindset</span><span class="ar">&#8250;&#8250;&#8250;</span><span class="mw">${esc(session.mindsetWord)}</span></div>`;

  if (!compact && session.matchPlay.enabled) {
    const mp = session.matchPlay;
    const maxLen = Math.max(mp.team1Players.length, mp.team2Players.length);
    const t2dark = ['#f59e0b','#ffd700','#D4AF37','#f4a259','#f3c012'].includes(mp.team2Color);
    html += `<div class="to-teams"><h3>Match Play Teams</h3><table><thead><tr>
        <th style="background:${mp.team1Color}; color:#fff !important;">${esc(mp.team1Name)}</th>
        <th style="background:${mp.team2Color}; color:${t2dark ? '#1c1c1c' : '#fff'} !important;">${esc(mp.team2Name)}</th>
      </tr></thead><tbody>`;
    for (let i = 0; i < maxLen; i++) { html += `<tr><td>${esc(mp.team1Players[i] || '')}</td><td>${esc(mp.team2Players[i] || '')}</td></tr>`; }
    html += `</tbody></table>`;
    if (mp.extras && mp.extras.length > 0) { html += `<div class="extras">${mp.extras.map(e => esc(e)).join(' &nbsp;·&nbsp; ')}</div>`; }
    html += `</div>`;
  }

  if (!compact && session.focus) html += `<div class="to-hero"><span class="fw">${esc(session.focus)}</span></div>`;

  const drills = session.schedule.filter(r => r.drillImage);
  if (!compact && drills.length > 0) {
    html += `<div class="to-drills"><h3>Drill Diagrams</h3><div class="drill-grid">`;
    drills.forEach(d => { html += `<div class="drill-card"><div class="drill-title">${esc(d.activity)}</div><img src="${d.drillImage}"></div>`; });
    html += `</div></div>`;
  }

  let genDate = '';
  try { genDate = new Date().toLocaleDateString('en-NZ', { day:'2-digit', month:'short', year:'numeric' }); } catch(e) {}
  const progName = state.brand.name ? esc(state.brand.name) : 'Performance Programme';
  html += `<div class="to-footer">
    <div class="ft-l"><b>${progName}</b> &nbsp;·&nbsp; Training Session Plan</div>
    <div class="ft-r">${genDate ? 'Generated ' + genDate + ' &nbsp;·&nbsp; ' : ''}Private &amp; Confidential</div>
  </div>`;

  html += `</div>`;
  return html;
}

// =============================================
// INIT
// =============================================
loadState();
if (state.ui.currentView) switchView(state.ui.currentView);
</script>
</body>
</html>

```
