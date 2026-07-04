# Opposition Scout — Design & Build Reference
> Reload this file to re-engage Claude for work on this app. Canonical source: `ELV8 Suite/opposition-scout.html` (mirrored to `Desktop/Black Sticks/Hockey Tools/ELV8 Suite/`). Preview staging: `/tmp/elv8preview/`.

## 1. Purpose
Standalone single-file opposition scouting tool with NO login and NO cloud — it replaced an older Supabase-backed version. Builds a per-opponent scouting dossier holding a full tactical breakdown, threat assessment, and key-player profiles (with player photos and notes). It is a coach-facing tool (used by the coaching staff, not players) that produces a clean, printable/shareable "Opposition Dossier" document for game prep.

## 2. Architecture
- **Single-file HTML** — all markup, CSS, and JS live in one `opposition-scout.html`. No build step, no dependencies bundled.
- **Vanilla JS** — no framework. Plain DOM string-templating via `innerHTML`.
- **Font:** Montserrat loaded from Google Fonts (weights 400/600/700/800/900), with `-apple-system,'Segoe UI',Arial,sans-serif` fallback.
- **Offline:** fully offline-capable. The only external runtime dependency is html2canvas, lazy-loaded from cdnjs ONLY when "Share Image" is used (Print works offline).
- **Persistence:** browser `localStorage`. Exact key constant: `const STORAGE_KEY = 'elv8OppositionScout';`
- `<meta name="apple-mobile-web-app-capable" content="yes">` for iOS home-screen use.

## 3. Data Model
The full team object shape, taken verbatim from `createTeam()`:

```js
{
  id: uid(),            // unique id, base36 timestamp + random
  name: 'New Opponent',
  colour: '#3aa7e0',    // per-opponent accent colour (default blue)
  ranking: '',          // world ranking, string (e.g. "3")
  coach: '',            // head coach
  lastResult: '',       // last result vs NZ (e.g. "L 2-3, Pro League")
  style: '',            // playing identity / style (free text)
  tactical: {
    attack: '',         // In Possession / Attack
    defend: '',         // Out of Possession / Defend
    press: '',          // Press / Transition
    outlet: '',         // Outlet / Restart
    pcAttack: '',       // PC Attack
    pcDefend: ''        // PC Defence
  },
  threats: [            // seeded with THREE empty rows
    { title:'', desc:'' },
    { title:'', desc:'' },
    { title:'', desc:'' }
  ],
  gamePlan: '',         // our game plan (free text)
  players: []           // array of player objects (see below)
}
```

Player object shape (from `addPlayer()`):

```js
{
  id: uid(),
  number: '',           // shirt number (string)
  name: '',
  position: '',
  danger: 0,            // 0 = unrated; 1–5 danger rating
  strengths: '',        // strengths / threat
  stop: '',             // how we stop them
  photo: ''             // data-URL (base64) of uploaded image, or ''
}
```

Notes:
- `danger` is 0–5. `DANGER_LABELS = ['', 'Low', 'Moderate', 'High', 'Serious', 'Elite']` (index 0 unused).
- A threat "counts" (in card stats and dossier) only if `title` is non-empty.
- Player photos are stored inline as base64 data-URLs inside the JSON in localStorage (this can grow large).

## 4. State & Persistence
- Global: `let state = { teams: [], ui: { view:'teams', currentTeamId:null } };`
- `save()` → writes whole `state` to localStorage under `STORAGE_KEY`.
- `load()` → reads/parses; restores `state.teams` and merges `state.ui`. Wrapped in try/catch (corrupt JSON is logged, not fatal).
- `uid()` → `Date.now().toString(36)+Math.random().toString(36).substr(2,5)`.
- `esc(s)` → escapes `&`, `"`, `<` for safe interpolation into HTML (note: does NOT escape `>`).
- `getTeam()` → returns the team matching `state.ui.currentTeamId`.
- Almost every edit handler calls `save()` immediately — persistence is effectively autosave on every `onchange`.

## 5. Views & Navigation
Three views, toggled by `switchView(view)`:
1. **Teams** (`#view-teams`) — grid of opponent cards; create/import/export entry point.
2. **Scout / Editor** (`#view-editor`) — the data-entry form for the currently selected team.
3. **Dossier / Print** (`#view-dossier`) — team selector + rendered printable document + Share Image / Print buttons.

`switchView()` toggles `.active` on `.view` elements and nav buttons (matched by `data-view`), then calls the matching render function (`renderTeams` / `renderEditor` / `renderDossierControls`) and `save()`s the current view to `state.ui.view`. On load, the app restores the last view via `switchView(state.ui.view||'teams')`.

## 6. Key Functions
| Function | Purpose |
|---|---|
| `save()` / `load()` | Persist / restore full state to localStorage. |
| `uid()` / `esc()` / `getTeam()` | id generation, HTML-escape, current-team lookup. |
| `dangerClass(n)` | Maps danger int → CSS modifier: `<=2`→`'low'`, `<=3`→`'mid'`, else `''` (= high/red). |
| `switchView(view)` | View navigation + render dispatch + save. |
| `renderTeams()` | Renders the team-card grid (or empty state). |
| `createTeam()` | Pushes a new default team, selects it, jumps to editor. |
| `editTeam(id)` | Selects a team and opens editor. |
| `duplicateTeam(id)` | Deep-clones a team (new id, name + " (copy)"). |
| `deleteTeam(id)` | Confirms, removes team. |
| `exportData()` | Downloads ALL teams as `opposition-scout.json`. |
| `importData()` | File picker → parses JSON array → appends to existing teams. |
| `renderEditor()` | Renders the full scouting form for the current team. |
| `renderThreats(t)` | Builds the threat-row inputs in the editor. |
| `renderPlayers(t)` | Builds the player-card grid in the editor (photo, danger dots, notes). |
| `upd / updTac / updThreat / updPlayer` | Field-level update helpers (top-level, tactical, threat, player). |
| `addThreat / removeThreat` | Add/remove a threat row. |
| `addPlayer / removePlayer` | Add/remove a player card. |
| `setDanger(i,n)` | Toggle a player's danger dots (clicking current value clears to 0). |
| `uploadPlayerPhoto(i)` | File picker → reads image as data-URL → stores on player. |
| `goDossier()` | Jump to dossier view pre-selected on the current team. |
| `renderDossierControls()` | Populates the team `<select>` then renders. |
| `ensureHtml2Canvas(cb)` | Lazy-loads html2canvas from cdnjs, then runs callback. |
| `shareImage()` | Renders `#dossier-output .dossier` to a single PNG download. |
| `renderDossier()` | Builds the printable dossier HTML for the selected team. |

## 7. The Printable Document (renderDossier)
Container is `#dossier-output` holding one `.dossier` element. Built by string concatenation in `renderDossier()`. Structure top-to-bottom:

1. **Masthead** (`.dos-head`): left **accent bar** (`.dh-bar`) painted in the team's `colour`; `.dh-main` with kicker `Opposition Dossier` (`.dh-kicker`) + team name (`.dh-title`); right-aligned `.dh-rank` block showing `World Ranking` eyebrow + gold `#<ranking>` value (only rendered if `ranking` set). Charcoal bg, 3px gold bottom border.
2. **Meta strip** (`.dos-info`): four `.di` cells — Head Coach, World Ranking, Last Result vs NZ, Players Flagged (count). Missing values render as `—`.
3. **Playing Identity** (`.dos-section` + `.dos-body`): only if `t.style` set.
4. **Tactical Breakdown** (`.dos-section` + `.dos-tac`): 2-column grid of the six tactical fields; only fields with content appear (filtered). Each `.t` has an uppercase grey label `<b>` + body.
5. **Threat Assessment** (`.dos-section.dos-threats`): only threats with a `title`. Each `.thr` = red circular number (`.n`, `#e23b2e`) + `.thr-txt` (`<b>title</b> — desc`).
6. **Key Players** (`.dos-section` + `.dos-players`): 3-col grid of `.dos-player` cards. Each: photo (`.dp-photo`) OR initials fallback (`.dp-noimg`, charcoal bg + gold initials, derived from name); name line `.dp-n` with gold `.dp-num`; `.dp-pos`; danger **chip** `.dp-chip` (`.high`/`.mid`/`.low`) reading "`<label>` threat"; optional `.dp-note` blocks for **Threat** (strengths) and **Stop**.
7. **Game Plan** (`.dos-section` + `.dos-gameplan`): cream callout with gold left border; only if `gamePlan` set.
8. **Footer** (`.dos-foot`): left "Performance Programme · Opposition Dossier"; right "Generated `<date>` · Private & Confidential" (date via `toLocaleDateString('en-NZ', {day:'2-digit',month:'short',year:'numeric'})`).

Key `.dos-*` classes: `.dos-head`, `.dh-bar`, `.dh-main`, `.dh-kicker`, `.dh-title`, `.dh-rank`, `.r-eyebrow`, `.r-value`, `.dos-info`, `.di`, `.dos-section`, `.dos-body`, `.dos-tac`, `.dos-threats`, `.thr`, `.dos-players`, `.dos-player`, `.dp-photo`, `.dp-noimg`, `.dp-b`, `.dp-n`, `.dp-num`, `.dp-pos`, `.dp-chip` (`.high/.mid/.low`), `.dp-note`, `.dos-gameplan`, `.dos-foot` (`.f-left/.f-right`).

## 8. ELV8 Premium Design System
- Font Montserrat. App chrome: bg #1c1c1c, panel #262626, panel2 #2f2f2f, inset #161616, borders #3c3c3c/#4a4a4a, accent gold #D4AF37 (hover #b8952e; DARK #1c1c1c text on gold), text #fff, muted #c4c4c4, dim #8c8c8c. Functional good #2a9d3a, bad #e23b2e, blue #3aa7e0, orange #f4a259, yellow #f3c012, gk-green #7bc47f.
- NO "ELV8" wordmark (Black Sticks tool). Per-opponent team colour appears only as the masthead left accent bar.
- Premium document rules: white #fff body, ink #15171a; charcoal #1c1c1c masthead + 3px gold bottom border (kicker #8c8c8c + bold white title + eyebrow+gold value right); eyebrow meta strip (9px uppercase #9a9a9a labels + bold 15px values, hairlines #eef0f1/#e7e7e7); NO heavy gridlines (hairlines + whitespace); colour as signal not blocks; section headers 11px uppercase letter-spacing 2px charcoal with 2px gold underline; charcoal footer (programme · "Generated <date> · Private & Confidential"); @media print A4 portrait, ~8mm, remove shadow/radius, print-color-adjust:exact.
- Share Image: ensureHtml2Canvas(cb) loads html2canvas from cdnjs; shareImage() targets `#dossier-output .dossier` → one PNG. Needs internet; falls back to Print.

Implementation notes against the rules above:
- App-chrome nav `.logo` is `🎯 OPPOSITION SCOUT` in gold — that is the in-app nav label, NOT a printed wordmark. The dossier itself carries no ELV8 mark.
- Danger chip colours: high=`#fdecea/#c1271c`, mid=`#fdf3e6/#b3691a`, low=`#eaf6ec/#218838`. In-editor danger pills use `#ff8d82`/`#f4a259`/`#7bc47f` text.
- Print rules hide `nav`, all non-dossier views, and `.no-print`; show only `#view-dossier`; each `.dossier` is `page-break-after:always`.

## 9. Conventions & Gotchas
- **All rendering is `innerHTML` string templating.** User text is passed through `esc()` — note `esc()` does NOT escape `>`, so be careful if extending.
- **Autosave everywhere:** field edits call `save()` directly and usually do NOT re-render (e.g. `upd`, `updTac`, `updPlayer`). Structural changes (`addThreat`, `addPlayer`, `setDanger`, `uploadPlayerPhoto`) DO call `renderEditor()`. So typing into a text field won't repaint the form, but toggling danger dots will.
- **Photos are base64 in localStorage** — large or many photos can blow the ~5MB localStorage quota. No size guard exists.
- **Import APPENDS** (`state.teams=[...state.teams,...d]`) and expects a top-level JSON array (the shape `exportData()` produces). It does not de-dupe ids.
- **`dangerClass` returns `''` for high** (not `'high'`); the dossier chip code compensates with `${chipClass||'high'}`. Keep that fallback if you touch it.
- **Empty-value display:** dossier meta cells show `—` when blank; the editor shows placeholders.
- `renderDossier()` reads the selected team from the `#dossier-select` value, NOT from `state.ui.currentTeamId` — `goDossier()` syncs the select before rendering.
- No `>` in `esc`, no sanitising of pasted HTML in photo data-URLs — fine for a trusted single-user coach tool, but note it.

## 10. How to Extend / Common Tasks
- **Add a tactical field:** add the key to `tactical{}` in `createTeam()`; add a `<textarea>` + `updTac(...)` in `renderEditor()`'s Tactical Breakdown section; add a `[label, value]` pair to the `tac` array in `renderDossier()`.
- **Add a player attribute:** add the field to the object in `addPlayer()`; add an input/textarea with `updPlayer(i,'field',...)` in `renderPlayers()`; render it in the `.dos-player` block of `renderDossier()`.
- **Add a top-level team field:** add to `createTeam()`; add an input with `upd('field',...)` in `renderEditor()`; surface it in the meta strip or a new `.dos-section` in `renderDossier()`.
- **Add a dossier section:** append a new `if(t.field){ html += \`<div class="dos-section"><h3>Title</h3>...</div>\` }` block in `renderDossier()`, following the `.dos-section` + gold-underline `<h3>` pattern.
- **Change the danger scale:** edit `DANGER_LABELS` and `dangerClass()` thresholds together; check the dot loop in `renderPlayers()` (`[1,2,3,4,5]`) and the chip fallback.

## 11. Driving It in the Preview Harness
State lives in lexical scope (module-level `let state`), NOT on `window`. So in `preview_eval` you can reference `state`, `createTeam`, `getTeam`, `save`, `switchView`, `renderDossier`, etc. directly. A seed flow:

```js
createTeam();                 // creates + selects a team, opens editor
const t = getTeam();
t.name = 'Australia';
t.colour = '#f4a259';
t.ranking = '1';
t.coach = 'Colin Batch';
t.lastResult = 'L 2-3, Pro League';
t.style = 'High-tempo, aggressive press, fast transition.';
t.tactical.attack = 'Overloads down the right, early balls in.';
t.tactical.defend = 'Compact mid-block, springs the trap.';
t.threats = [{title:'PC battery', desc:'Two-option drag flick.'}];
t.gamePlan = 'Win the press battle, control restarts.';
t.players.push({ id:'p1', number:'7', name:'Blake Govers', position:'Striker', danger:5, strengths:'Drag flick, deflections.', stop:'Deny the top of the circle.', photo:'' });
save();
switchView('dossier');
document.getElementById('dossier-select').value = t.id;
renderDossier();
```

Then `preview_screenshot` the `#dossier-output` area. To reset, clear `localStorage.removeItem('elv8OppositionScout')` and reload.

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
<title>Opposition Scout</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg:#1c1c1c; --panel:#262626; --panel2:#2f2f2f; --inset:#161616;
  --line:#3c3c3c; --line2:#4a4a4a;
  --gold:#D4AF37; --gold-hover:#b8952e; --ink:#1c1c1c;
  --text:#ffffff; --muted:#c4c4c4; --dim:#8c8c8c;
  --good:#2a9d3a; --bad:#e23b2e; --blue:#3aa7e0; --orange:#f4a259; --yellow:#f3c012;
}
body { font-family:'Montserrat',-apple-system,'Segoe UI',Arial,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }

/* NAV */
nav { background:var(--panel); display:flex; align-items:center; padding:0 20px; border-bottom:2px solid var(--line); flex-wrap:wrap; }
nav .logo { font-weight:900; font-size:16px; padding:14px 0; margin-right:24px; color:var(--gold); white-space:nowrap; letter-spacing:.5px; }
nav button { background:none; border:none; color:var(--dim); font-size:14px; padding:14px 16px; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .2s; }
nav button:hover { color:var(--text); }
nav button.active { color:var(--text); border-bottom-color:var(--gold); }

.view { display:none; padding:24px; max-width:1400px; margin:0 auto; }
.view.active { display:block; }

h2 { font-size:22px; margin-bottom:16px; color:var(--gold); letter-spacing:.5px; }
h3 { font-size:15px; margin-bottom:10px; color:var(--gold); text-transform:uppercase; letter-spacing:.5px; }
.muted { color:var(--dim); font-size:12px; }

.btn { padding:8px 16px; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:700; transition:all .2s; }
.btn-primary { background:var(--gold); color:var(--ink); }
.btn-primary:hover { background:var(--gold-hover); }
.btn-secondary { background:var(--panel2); color:var(--text); }
.btn-secondary:hover { background:#3a3a3a; }
.btn-danger { background:var(--bad); color:#fff; }
.btn-danger:hover { background:#c43328; }
.btn-sm { padding:5px 10px; font-size:12px; }

input, select, textarea { padding:8px 10px; border:1px solid var(--line); border-radius:4px; background:var(--inset); color:var(--text); font-size:13px; font-family:inherit; width:100%; }
input:focus, select:focus, textarea:focus { outline:none; border-color:var(--gold); }
textarea { resize:vertical; line-height:1.4; }
label { font-size:12px; color:var(--dim); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:.4px; }
.toolbar { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.form-row { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:flex-end; }
.form-group { display:flex; flex-direction:column; flex:1; min-width:120px; }
.mt-16 { margin-top:16px; }

/* TEAMS GRID */
.teams-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }
.team-card { background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; cursor:pointer; transition:all .2s; }
.team-card:hover { border-color:var(--gold); transform:translateY(-2px); }
.team-card .tc-top { height:8px; }
.team-card .tc-body { padding:16px; }
.team-card h4 { font-size:18px; font-weight:800; margin-bottom:4px; }
.team-card .tc-meta { color:var(--dim); font-size:12px; margin-bottom:12px; }
.team-card .tc-stats { display:flex; gap:14px; }
.team-card .tc-stat { font-size:12px; color:var(--muted); }
.team-card .tc-stat b { display:block; font-size:20px; color:var(--gold); font-weight:800; }
.team-card .tc-actions { display:flex; gap:6px; margin-top:14px; }

/* EDITOR */
.section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; margin-bottom:16px; }
.rank-pill { display:inline-block; background:var(--gold); color:var(--ink); font-weight:800; font-size:12px; padding:3px 10px; border-radius:12px; }

/* THREATS */
.threat-row { display:flex; gap:10px; margin-bottom:8px; align-items:flex-start; }
.threat-row .thr-num { background:var(--bad); color:#fff; font-weight:800; min-width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; margin-top:6px; }

/* PLAYERS */
.players-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(290px, 1fr)); gap:14px; }
.player-card { background:var(--inset); border:1px solid var(--line); border-radius:8px; overflow:hidden; position:relative; }
.player-card .pc-photo { width:100%; height:170px; background:#0e0e0e; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; overflow:hidden; border-bottom:2px solid var(--gold); }
.player-card .pc-photo img { width:100%; height:100%; object-fit:cover; }
.player-card .pc-photo .ph { color:var(--dim); font-size:12px; text-align:center; padding:10px; }
.player-card .pc-danger { position:absolute; top:8px; right:8px; background:rgba(0,0,0,.65); padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; }
.player-card .pc-body { padding:12px; }
.player-card .pc-name { display:flex; align-items:baseline; gap:8px; margin-bottom:8px; }
.player-card .pc-name .num { color:var(--gold); font-weight:800; font-size:18px; }
.player-card .pc-name .nm { font-weight:700; font-size:15px; }
.player-card .pc-pos { color:var(--dim); font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
.player-card .pc-field { margin-top:8px; }
.player-card textarea { font-size:12px; min-height:54px; }
.player-card .pc-remove { position:absolute; top:8px; left:8px; background:var(--bad); color:#fff; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:24px; z-index:2; }
.danger-dots { display:inline-flex; gap:3px; vertical-align:middle; }
.dot { width:9px; height:9px; border-radius:50%; background:var(--line2); cursor:pointer; }
.dot.on { background:var(--bad); }
.dot.on.low { background:var(--good); }
.dot.on.mid { background:var(--orange); }

/* DOSSIER (PRINT) — ELV8 PREMIUM DOCUMENT SYSTEM */
.dossier { background:#fff; color:#15171a; margin-bottom:30px; border-radius:6px; overflow:hidden; box-shadow:0 6px 28px rgba(0,0,0,.28); font-family:'Montserrat',-apple-system,'Segoe UI',Arial,sans-serif; }
.dossier * { color:#15171a; }

/* MASTHEAD */
.dos-head { display:flex; align-items:stretch; background:#1c1c1c; border-bottom:3px solid #D4AF37; }
.dos-head .dh-bar { width:8px; flex:0 0 8px; }
.dos-head .dh-main { flex:1; padding:20px 26px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
.dos-head .dh-main * { color:#fff; }
.dos-head .dh-kicker { font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:7px; }
.dos-head .dh-title { font-size:30px; font-weight:800; letter-spacing:.5px; line-height:1.05; }
.dos-head .dh-rank { text-align:right; flex:0 0 auto; }
.dos-head .dh-rank .r-eyebrow { font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8c8c8c !important; margin-bottom:3px; }
.dos-head .dh-rank .r-value { font-size:26px; font-weight:800; color:#D4AF37 !important; line-height:1; }

/* META STRIP */
.dos-info { display:flex; flex-wrap:wrap; border-bottom:1px solid #e7e7e7; }
.dos-info .di { flex:1; min-width:120px; padding:11px 18px; }
.dos-info .di + .di { border-left:1px solid #eef0f1; }
.dos-info .di b { color:#9a9a9a; text-transform:uppercase; font-size:9px; letter-spacing:1px; font-weight:700; display:block; margin-bottom:4px; }
.dos-info .di .v { font-size:15px; font-weight:700; color:#15171a; }

/* SECTIONS */
.dos-section { padding:18px 26px; }
.dos-section + .dos-section { padding-top:6px; }
.dos-section h3 { color:#1c1c1c; display:inline-block; border-bottom:2px solid #D4AF37; padding-bottom:5px; margin-bottom:12px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:2px; }
.dos-body { font-size:12.5px; line-height:1.6; color:#2a2d31; }

/* TACTICAL */
.dos-tac { display:grid; grid-template-columns:repeat(2,1fr); gap:14px 22px; }
.dos-tac .t { font-size:12.5px; line-height:1.55; color:#2a2d31; }
.dos-tac .t b { display:block; color:#8c8c8c; font-weight:700; margin-bottom:4px; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; }

/* THREATS */
.dos-threats .thr { display:flex; gap:11px; margin-bottom:10px; font-size:12.5px; line-height:1.55; align-items:flex-start; }
.dos-threats .thr:last-child { margin-bottom:0; }
.dos-threats .thr .n { background:#e23b2e; color:#fff !important; flex:0 0 22px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; }
.dos-threats .thr .thr-txt { padding-top:1px; color:#2a2d31; }
.dos-threats .thr .thr-txt b { color:#15171a; font-weight:800; }

/* PLAYERS */
.dos-players { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.dos-player { border:1px solid #e7e7e7; border-radius:6px; overflow:hidden; background:#fff; }
.dos-player .dp-photo { width:100%; height:150px; object-fit:cover; display:block; background:#f1f1f1; border-bottom:3px solid #D4AF37; }
.dos-player .dp-noimg { width:100%; height:150px; background:#1c1c1c; display:flex; align-items:center; justify-content:center; color:#D4AF37 !important; font-weight:800; font-size:28px; letter-spacing:1px; border-bottom:3px solid #D4AF37; }
.dos-player .dp-b { padding:10px 12px 12px; }
.dos-player .dp-n { font-weight:700; font-size:13.5px; color:#15171a; }
.dos-player .dp-n .dp-num { color:#D4AF37 !important; font-weight:800; }
.dos-player .dp-pos { color:#9a9a9a; font-size:9px; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-top:2px; }
.dos-player .dp-chip { display:inline-block; margin-top:6px; padding:2px 9px; border-radius:11px; font-size:8.5px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; }
.dos-player .dp-chip.high { background:#fdecea; color:#c1271c !important; }
.dos-player .dp-chip.mid { background:#fdf3e6; color:#b3691a !important; }
.dos-player .dp-chip.low { background:#eaf6ec; color:#218838 !important; }
.dos-player .dp-note { font-size:11px; line-height:1.45; margin-top:7px; color:#2a2d31; }
.dos-player .dp-note b { color:#8c8c8c; font-weight:700; font-size:9px; letter-spacing:.8px; text-transform:uppercase; display:block; margin-bottom:1px; }

/* GAME PLAN */
.dos-gameplan { background:#faf6e8; border-left:3px solid #D4AF37; padding:13px 18px; font-size:12.5px; line-height:1.6; color:#2a2d31; border-radius:0 4px 4px 0; }

/* FOOTER */
.dos-foot { display:flex; align-items:center; justify-content:space-between; gap:16px; background:#1c1c1c; padding:10px 26px; margin-top:8px; }
.dos-foot * { color:#9a9a9a !important; }
.dos-foot .f-left { font-size:9.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
.dos-foot .f-right { font-size:9.5px; font-weight:600; letter-spacing:.5px; text-align:right; }

.empty { color:var(--dim); padding:30px; text-align:center; border:1px dashed var(--line); border-radius:8px; }

@media (max-width:760px){ .dos-players{grid-template-columns:repeat(2,1fr);} .dos-tac{grid-template-columns:1fr;} .dos-info .di{flex:1 0 50%;} }

@media print {
  body { background:#fff; }
  nav, .view:not(#view-dossier), .no-print { display:none !important; }
  #view-dossier { display:block !important; padding:0; }
  .dossier { page-break-after:always; margin:0; border-radius:0; box-shadow:none; }
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  @page { size:A4 portrait; margin:8mm; }
}
</style>
</head>
<body>

<nav>
  <span class="logo">🎯 OPPOSITION SCOUT</span>
  <button data-view="teams" class="active" onclick="switchView('teams')">Teams</button>
  <button data-view="editor" onclick="switchView('editor')">Scout</button>
  <button data-view="dossier" onclick="switchView('dossier')">Dossier / Print</button>
</nav>

<div id="view-teams" class="view active">
  <h2>Opposition Teams</h2>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="createTeam()">+ New Team</button>
    <button class="btn btn-secondary" onclick="exportData()">Export All</button>
    <button class="btn btn-secondary" onclick="importData()">Import</button>
  </div>
  <div id="teams-list"></div>
</div>

<div id="view-editor" class="view">
  <div id="editor-content"><p class="muted">Select or create a team to scout.</p></div>
</div>

<div id="view-dossier" class="view">
  <div class="no-print toolbar">
    <select id="dossier-select" onchange="renderDossier()"><option value="">Select a team...</option></select>
    <button class="btn btn-primary" onclick="shareImage()">📷 Share Image</button>
    <button class="btn btn-secondary" onclick="window.print()">Print Dossier</button>
  </div>
  <div id="dossier-output"></div>
</div>

<script>
// =============================================
// STATE
// =============================================
const STORAGE_KEY = 'elv8OppositionScout';
let state = { teams: [], ui: { view:'teams', currentTeamId:null } };

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){ try{ const d=JSON.parse(raw); state.teams=d.teams||[]; if(d.ui) state.ui={...state.ui,...d.ui}; }catch(e){ console.error(e); } }
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).substr(2,5); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function getTeam(){ return state.teams.find(t=>t.id===state.ui.currentTeamId); }

const DANGER_LABELS = ['', 'Low', 'Moderate', 'High', 'Serious', 'Elite'];
function dangerClass(n){ n=parseInt(n)||0; if(n<=2) return 'low'; if(n<=3) return 'mid'; return ''; }

// =============================================
// VIEW SWITCHING
// =============================================
function switchView(view){
  state.ui.view = view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  if(view==='teams') renderTeams();
  if(view==='editor') renderEditor();
  if(view==='dossier') renderDossierControls();
  save();
}

// =============================================
// TEAMS VIEW
// =============================================
function renderTeams(){
  const el = document.getElementById('teams-list');
  if(!state.teams.length){ el.innerHTML = '<div class="empty">No teams scouted yet. Hit + New Team to start your first opposition dossier.</div>'; return; }
  el.innerHTML = '<div class="teams-grid">'+ state.teams.map(t=>`
    <div class="team-card" onclick="editTeam('${t.id}')">
      <div class="tc-top" style="background:${t.colour||'#D4AF37'};"></div>
      <div class="tc-body">
        <h4>${esc(t.name)||'Unnamed Team'}</h4>
        <div class="tc-meta">${t.ranking?('World #'+esc(t.ranking)+' · '):''}${esc(t.coach)||'Coach unknown'}</div>
        <div class="tc-stats">
          <div class="tc-stat"><b>${(t.players||[]).length}</b> players</div>
          <div class="tc-stat"><b>${(t.threats||[]).filter(x=>x.title).length}</b> threats</div>
        </div>
        <div class="tc-actions">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();duplicateTeam('${t.id}')">Dup</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteTeam('${t.id}')">×</button>
        </div>
      </div>
    </div>`).join('') +'</div>';
}

function createTeam(){
  const team = {
    id: uid(), name:'New Opponent', colour:'#3aa7e0',
    ranking:'', coach:'', lastResult:'', style:'',
    tactical:{ attack:'', defend:'', press:'', outlet:'', pcAttack:'', pcDefend:'' },
    threats:[{title:'',desc:''},{title:'',desc:''},{title:'',desc:''}],
    gamePlan:'',
    players:[]
  };
  state.teams.push(team);
  state.ui.currentTeamId = team.id;
  save(); switchView('editor');
}
function editTeam(id){ state.ui.currentTeamId=id; save(); switchView('editor'); }
function duplicateTeam(id){ const o=state.teams.find(t=>t.id===id); if(!o) return; const c=JSON.parse(JSON.stringify(o)); c.id=uid(); c.name=o.name+' (copy)'; state.teams.push(c); save(); renderTeams(); }
function deleteTeam(id){ if(!confirm('Delete this team and all its scouting?')) return; state.teams=state.teams.filter(t=>t.id!==id); if(state.ui.currentTeamId===id) state.ui.currentTeamId=null; save(); renderTeams(); }

function exportData(){ const blob=new Blob([JSON.stringify(state.teams,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='opposition-scout.json'; a.click(); }
function importData(){ const i=document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=e=>{ const r=new FileReader(); r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); state.teams=[...state.teams,...d]; save(); renderTeams(); }catch(err){ alert('Invalid file'); } }; r.readAsText(e.target.files[0]); }; i.click(); }

// =============================================
// EDITOR VIEW
// =============================================
function renderEditor(){
  const c = document.getElementById('editor-content');
  const t = getTeam();
  if(!t){ c.innerHTML='<p class="muted">Select a team from the Teams tab.</p>'; return; }

  c.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-secondary btn-sm" onclick="switchView('teams')">← Teams</button>
      <button class="btn btn-primary btn-sm" onclick="goDossier()">Dossier →</button>
      <span class="rank-pill" style="margin-left:auto;">${(t.players||[]).length} players scouted</span>
    </div>

    <div class="section">
      <h3>Team Profile</h3>
      <div class="form-row">
        <div class="form-group" style="flex:2;"><label>Team / Country</label><input value="${esc(t.name)}" onchange="upd('name',this.value)"></div>
        <div class="form-group" style="flex:0 0 80px;"><label>Colour</label><input type="color" value="${t.colour||'#3aa7e0'}" onchange="upd('colour',this.value)" style="height:36px;padding:2px;"></div>
        <div class="form-group" style="flex:0 0 110px;"><label>World Rank</label><input value="${esc(t.ranking)}" onchange="upd('ranking',this.value)" placeholder="3"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Head Coach</label><input value="${esc(t.coach)}" onchange="upd('coach',this.value)"></div>
        <div class="form-group"><label>Last Result vs NZ</label><input value="${esc(t.lastResult)}" onchange="upd('lastResult',this.value)" placeholder="L 2-3, Pro League"></div>
      </div>
      <div class="form-group"><label>Playing Identity / Style</label><textarea onchange="upd('style',this.value)" placeholder="How they want to play. Tempo, structure, what defines them.">${esc(t.style)}</textarea></div>
    </div>

    <div class="section">
      <h3>Tactical Breakdown</h3>
      <div class="form-row">
        <div class="form-group"><label>In Possession / Attack</label><textarea onchange="updTac('attack',this.value)" placeholder="Build-up, attacking shape, where they hurt you.">${esc(t.tactical.attack)}</textarea></div>
        <div class="form-group"><label>Out of Possession / Defend</label><textarea onchange="updTac('defend',this.value)" placeholder="Defensive structure, low block vs high press.">${esc(t.tactical.defend)}</textarea></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Press / Transition</label><textarea onchange="updTac('press',this.value)" placeholder="Press triggers, counter-attack threat.">${esc(t.tactical.press)}</textarea></div>
        <div class="form-group"><label>Outlet / Restart</label><textarea onchange="updTac('outlet',this.value)" placeholder="How they exit pressure, 16s, free hits.">${esc(t.tactical.outlet)}</textarea></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>PC Attack</label><textarea onchange="updTac('pcAttack',this.value)" placeholder="Penalty corner battery, variations, injector.">${esc(t.tactical.pcAttack)}</textarea></div>
        <div class="form-group"><label>PC Defence</label><textarea onchange="updTac('pcDefend',this.value)" placeholder="Runner, structure, weaknesses to exploit.">${esc(t.tactical.pcDefend)}</textarea></div>
      </div>
    </div>

    <div class="section">
      <h3>Threat Assessment</h3>
      <div id="threats">${renderThreats(t)}</div>
      <button class="btn btn-secondary btn-sm mt-16" onclick="addThreat()">+ Add Threat</button>
    </div>

    <div class="section">
      <h3>Key Players</h3>
      <p class="muted" style="margin-bottom:12px;">Tap a photo box to add a player image. Rate their danger and note their strengths and how we stop them.</p>
      <div class="players-grid" id="players">${renderPlayers(t)}</div>
      <button class="btn btn-primary btn-sm mt-16" onclick="addPlayer()">+ Add Player</button>
    </div>

    <div class="section">
      <h3>Our Game Plan</h3>
      <textarea rows="4" onchange="upd('gamePlan',this.value)" placeholder="How we beat them. The 2-3 things that win us this game.">${esc(t.gamePlan)}</textarea>
    </div>`;
}

function renderThreats(t){
  return (t.threats||[]).map((th,i)=>`
    <div class="threat-row">
      <div class="thr-num">${i+1}</div>
      <div style="flex:1;">
        <input value="${esc(th.title)}" onchange="updThreat(${i},'title',this.value)" placeholder="Threat (player, set piece, transition...)" style="margin-bottom:6px;font-weight:700;">
        <textarea onchange="updThreat(${i},'desc',this.value)" placeholder="Why it's a threat and how we neutralise it." style="min-height:46px;">${esc(th.desc)}</textarea>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeThreat(${i})" style="margin-top:6px;">×</button>
    </div>`).join('');
}

function renderPlayers(t){
  if(!(t.players||[]).length) return '<div class="empty" style="grid-column:1/-1;">No players yet. Add the danger men you need eyes on.</div>';
  return t.players.map((p,i)=>{
    const dots = [1,2,3,4,5].map(n=>`<span class="dot ${p.danger>=n?'on '+dangerClass(p.danger):''}" onclick="setDanger(${i},${n})"></span>`).join('');
    return `
    <div class="player-card">
      <button class="pc-remove" onclick="removePlayer(${i})">×</button>
      <div class="pc-photo" onclick="uploadPlayerPhoto(${i})">
        ${p.photo?`<img src="${p.photo}">`:'<span class="ph">Tap to add<br>player photo</span>'}
        ${p.danger?`<span class="pc-danger" style="color:${p.danger>=4?'#ff8d82':p.danger>=3?'#f4a259':'#7bc47f'};">${DANGER_LABELS[p.danger]}</span>`:''}
      </div>
      <div class="pc-body">
        <div class="pc-name">
          <input value="${esc(p.number)}" onchange="updPlayer(${i},'number',this.value)" placeholder="#" style="width:46px;text-align:center;">
          <input value="${esc(p.name)}" onchange="updPlayer(${i},'name',this.value)" placeholder="Name" style="flex:1;font-weight:700;">
        </div>
        <div class="form-row" style="margin-bottom:6px;">
          <div class="form-group" style="flex:1;"><input value="${esc(p.position)}" onchange="updPlayer(${i},'position',this.value)" placeholder="Position" style="font-size:12px;"></div>
          <div style="display:flex;align-items:center;"><span class="danger-dots">${dots}</span></div>
        </div>
        <div class="pc-field"><label>Strengths / Threat</label><textarea onchange="updPlayer(${i},'strengths',this.value)" placeholder="What makes them dangerous.">${esc(p.strengths)}</textarea></div>
        <div class="pc-field"><label>How We Stop Them</label><textarea onchange="updPlayer(${i},'stop',this.value)" placeholder="Our plan to nullify them.">${esc(p.stop)}</textarea></div>
      </div>
    </div>`;
  }).join('');
}

function upd(f,v){ const t=getTeam(); if(!t) return; t[f]=v; save(); }
function updTac(f,v){ const t=getTeam(); if(!t) return; t.tactical[f]=v; save(); }
function updThreat(i,f,v){ const t=getTeam(); if(!t) return; t.threats[i][f]=v; save(); }
function addThreat(){ const t=getTeam(); if(!t) return; t.threats.push({title:'',desc:''}); save(); renderEditor(); }
function removeThreat(i){ const t=getTeam(); if(!t) return; t.threats.splice(i,1); save(); renderEditor(); }

function addPlayer(){ const t=getTeam(); if(!t) return; t.players.push({id:uid(),number:'',name:'',position:'',danger:0,strengths:'',stop:'',photo:''}); save(); renderEditor(); }
function removePlayer(i){ const t=getTeam(); if(!t) return; if(!confirm('Remove this player?')) return; t.players.splice(i,1); save(); renderEditor(); }
function updPlayer(i,f,v){ const t=getTeam(); if(!t) return; t.players[i][f]=v; save(); }
function setDanger(i,n){ const t=getTeam(); if(!t) return; t.players[i].danger = (t.players[i].danger===n)?0:n; save(); renderEditor(); }
function uploadPlayerPhoto(i){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=e=>{ const r=new FileReader(); r.onload=ev=>{ const t=getTeam(); if(!t) return; t.players[i].photo=ev.target.result; save(); renderEditor(); }; r.readAsDataURL(e.target.files[0]); };
  inp.click();
}
function goDossier(){ switchView('dossier'); const sel=document.getElementById('dossier-select'); if(sel){ sel.value=state.ui.currentTeamId; renderDossier(); } }

// =============================================
// DOSSIER / PRINT
// =============================================
function renderDossierControls(){
  const sel=document.getElementById('dossier-select');
  sel.innerHTML='<option value="">Select a team...</option>'+state.teams.map(t=>`<option value="${t.id}" ${state.ui.currentTeamId===t.id?'selected':''}>${esc(t.name)}</option>`).join('');
  renderDossier();
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
  const node = document.querySelector('#dossier-output .dossier');
  if (!node) { alert('Select a team to build the dossier first.'); return; }
  ensureHtml2Canvas(() => {
    html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      .then(canvas => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'opposition-dossier.png'; a.click(); })
      .catch(e => alert('Image export failed: ' + e.message));
  });
}
function renderDossier(){
  const id=document.getElementById('dossier-select').value;
  const t=state.teams.find(x=>x.id===id);
  const out=document.getElementById('dossier-output');
  if(!t){ out.innerHTML='<p class="muted">Select a team to build its dossier.</p>'; return; }
  const colour=t.colour||'#D4AF37';

  const tac=[['In Possession',t.tactical.attack],['Out of Possession',t.tactical.defend],['Press / Transition',t.tactical.press],['Outlet / Restart',t.tactical.outlet],['PC Attack',t.tactical.pcAttack],['PC Defence',t.tactical.pcDefend]].filter(x=>x[1]);
  const threats=(t.threats||[]).filter(x=>x.title);
  const players=(t.players||[]);

  let html=`<div class="dossier">
    <div class="dos-head">
      <div class="dh-bar" style="background:${colour};"></div>
      <div class="dh-main">
        <div>
          <div class="dh-kicker">Opposition Dossier</div>
          <div class="dh-title">${esc(t.name)||'Unnamed Team'}</div>
        </div>
        ${t.ranking?`<div class="dh-rank"><div class="r-eyebrow">World Ranking</div><div class="r-value">#${esc(t.ranking)}</div></div>`:''}
      </div>
    </div>
    <div class="dos-info">
      <div class="di"><b>Head Coach</b><div class="v">${esc(t.coach)||'—'}</div></div>
      <div class="di"><b>World Ranking</b><div class="v">${esc(t.ranking)?('#'+esc(t.ranking)):'—'}</div></div>
      <div class="di"><b>Last Result vs NZ</b><div class="v">${esc(t.lastResult)||'—'}</div></div>
      <div class="di"><b>Players Flagged</b><div class="v">${players.length}</div></div>
    </div>`;

  if(t.style){ html+=`<div class="dos-section"><h3>Playing Identity</h3><div class="dos-body">${esc(t.style)}</div></div>`; }

  if(tac.length){
    html+=`<div class="dos-section"><h3>Tactical Breakdown</h3><div class="dos-tac">`;
    tac.forEach(x=>{ html+=`<div class="t"><b>${x[0]}</b>${esc(x[1])}</div>`; });
    html+=`</div></div>`;
  }

  if(threats.length){
    html+=`<div class="dos-section dos-threats"><h3>Threat Assessment</h3>`;
    threats.forEach((th,i)=>{ html+=`<div class="thr"><span class="n">${i+1}</span><div class="thr-txt"><b>${esc(th.title)}</b>${th.desc?(' — '+esc(th.desc)):''}</div></div>`; });
    html+=`</div>`;
  }

  if(players.length){
    html+=`<div class="dos-section"><h3>Key Players</h3><div class="dos-players">`;
    players.forEach(p=>{
      const initials=(p.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const chipClass=dangerClass(p.danger); // ''=high(red), 'mid'=amber, 'low'=green
      const chip=p.danger?`<span class="dp-chip ${chipClass||'high'}">${DANGER_LABELS[p.danger]} threat</span>`:'';
      html+=`<div class="dos-player">
        ${p.photo?`<img class="dp-photo" src="${p.photo}">`:`<div class="dp-noimg">${initials}</div>`}
        <div class="dp-b">
          <div class="dp-n"><span class="dp-num">${esc(p.number)?('#'+esc(p.number)+' '):''}</span>${esc(p.name)||'Unnamed'}</div>
          <div class="dp-pos">${esc(p.position)}</div>
          ${chip}
          ${p.strengths?`<div class="dp-note"><b>Threat</b>${esc(p.strengths)}</div>`:''}
          ${p.stop?`<div class="dp-note"><b>Stop</b>${esc(p.stop)}</div>`:''}
        </div>
      </div>`;
    });
    html+=`</div></div>`;
  }

  if(t.gamePlan){ html+=`<div class="dos-section"><h3>Our Game Plan</h3><div class="dos-gameplan">${esc(t.gamePlan)}</div></div>`; }

  let genDate='';
  try { genDate=new Date().toLocaleDateString('en-NZ',{day:'2-digit',month:'short',year:'numeric'}); } catch(e){ genDate=''; }
  html+=`<div class="dos-foot">
      <div class="f-left">Performance Programme · Opposition Dossier</div>
      <div class="f-right">${genDate?('Generated '+genDate+' · '):''}Private &amp; Confidential</div>
    </div>`;

  html+=`</div>`;
  out.innerHTML=html;
}

// =============================================
// INIT
// =============================================
load();
switchView(state.ui.view||'teams');
</script>
</body>
</html>

```
