# Black Sticks Sub Sheet v2 — Design + Full Code

**What this file is:** a self-contained design doc for Shea McAleese's game-day bench-management web app. The complete app source is embedded at the bottom. Drop this whole file into a fresh Claude conversation to resume work on this app without re-reading old chats.

**How to use in a new conversation:** "Read this DESIGN.md. The live file is `~/Library/CloudStorage/Dropbox/NZ Hockey/07 - Hockey Tools (Web Apps)/Black Sticks Sub Sheet v2.html` — make [change] there." Claude should edit the live file on disk, not the copy in this doc. The embedded code is the reference snapshot as of 2026-06-25; if the live file has changed, trust the live file.

**Owner / style:** Shea McAleese, HP coach, NZ Hockey. Used on an iPad on the bench (Documents by Readdle, opened from Dropbox). Warm-but-direct, no flattery, no dashes (commas), no emojis unless he uses them. He likes a tight confirm-then-build rhythm and sharp clarifying questions.

---

## What the app is
A single-file, offline HTML + localStorage tool that plans and runs hockey substitutions. Per-minute on/off grid (15 columns counting down 15→1, 4 quarters), with a live match clock that drives the bench in real time. This is the POWERFUL tool. There is a separate simple/sellable app (ELV8 Rotation Builder) — keep them distinct.

- localStorage keys: `bs_subsheet_v1` (main) and `bs_timer`.
- **Do NOT edit the original `Black Sticks Sub Sheet.html`** — that's Shea's frozen game-day fallback. This `v2` file is the working copy.
- Keeps its own LIGHT, high-contrast identity (built for bench readability + printing). Only the injury panel is dark/bespoke. Do not reskin the whole app dark.

## How to preview / verify (CloudStorage is sandbox-blocked for the server)
The preview server can't serve the Dropbox path directly. Workflow:
1. `cp "Black Sticks Sub Sheet v2.html" /tmp/elv8preview/bs2.html`
2. Serve `/tmp/elv8preview` (launch.json config `hockey-tools` → `python3 -m http.server 8781`).
3. Open `http://localhost:8781/bs2.html`, drive with preview_eval, screenshot. Clear `bs_subsheet_v1` to reset to defaults.
4. Edit the REAL Dropbox file; re-copy to /tmp to re-verify.

## Data model (state, persisted under bs_subsheet_v1)
`store = { games:{ name: state }, last, customStructures }`. Each `state`:
- `players[]`: `{id,name,group('Strikers'|'Midfield'|'Back 4'|'GK'),pos,pp[](priority positions),roles[],rank,target,groupQ[4]}`. **Array order within a line = rank** (top = plays most).
- `grid{pid:[4][15]}`: cell value = position label or `BLANK('•')` (on, no label) or `''` (off).
- `requiredQ[4]{line:count}` on-field counts; `structureQ[4]` names.
- `units[]` (manual "take same person off" pods), `anchors[]`, `formations[]`, `pairs[]` (protected), `locks{}` (manual cell positions), `bands{}` (PLAYS text), `notes`, `autoPos`.
- `outPlayers[]` (injured/out), `injuryPlan{smEvery,backEvery}`.

## Key functions (search these in the code)
- `getPosMap(q)` / `posLabel` — auto-position: assigns one player per LS/CS/RS slot from priority positions; honours manual locks.
- `openCellMenu` — right-click a cell; sets a position for the WHOLE quarter by default (toggle "this minute"). Sets a lock.
- `renderGrids` / `renderGameView` / `renderCardsView` — the grid, game overview, phone cards.
- `genUnitInto` / `generateUnit` / `generateAll` — manual rotation units.
- `genAnchorInto` / `generateAnchors` — anchors (heavy-minute players, staggered rest).
- **Injury + rank pods (centrepiece):** `openInjury`/`renderInjury` (dark panel), `markOut`/`backIn`, `rebuildEvenFromNow(lp)`, `genLinePods(ids,k,q,startM,every)` (pod split rule), `genEvenLine` (even round-robin, benches from BOTTOM of rank so rank 1 plays most), `generateByRank` (paint whole game from ranks), `podSummary`, `reorderPlayer`/`injDropLine`/`injDropChip` (drag between/within lines).
- `popClean`/`snapshotPNG` — shared clean fullscreen overlay + offline PNG download (foreignObject→canvas).
- `setupDone`/`syncSetupTabs` — green step numbers on the setup tabs.

## The rank/pod system (subtle — read before touching rotation)
- **Rank = order within a line** (set in Squad by dragging the dot / arrows; shown as a numbered circle; top plays most).
- **Pod rule:** spare players (N − k, k = on-field count for that line) = number of pods, each pod has one spare. Strikers 5 over 3 → "2-for-3 + 1-for-1"; backs 5 over 4 → "4-on-1-off". Larger pods first, filled from the top of the rank.
- **Minutes follow rank:** `genEvenLine` benches the OFF seats sliding up from the BOTTOM index, so the highest-ranked sits out least / plays most. Verified: strikers 48/36/36/36/24 across a game, on-field counts hold.
- Two ways to use it: "Generate by rank" (Rotation tab, paints the whole game) and the injury rebuild (in-game).

## Feature map
- Header: clean game bar (name, switcher, + New) + `⋯` kebab (Duplicate/Export/Import/Backup all/Restore all/Delete) + Print + Guide.
- "SET UP IN ORDER" strip + numbered tabs 1 Squad → 2 Positions → 3 Anchors → 4 Rotation, then optional Formations/Protected pairs/Game notes; numbers go green when done.
- Squad grouped by line, rank circles, drag-to-reorder, roles, blank position option.
- Positions tab (priority positions), Anchors, Formations (dark dashboard, 8 presets preloaded + save-your-own), Protected pairs, Game notes.
- Rotation tab: "⚡ Generate by rank" panel + manual rotation units.
- Grid: paint cells, right-click position (whole-quarter), live timer banner (NOW/NEXT, bright/dim rows, quick-swap), drag-reorder rows.
- Sub plan + Who-takes-who behind fold boxes, each with a screenshot button (clean view + PNG).
- Phone cards (one per player) with the same screenshot overlay.
- Game overview with minute targets; print (A4 landscape).
- **Injury recovery:** red `⚠ PLAYER OUT` in the timer bar → tap player → even pod rotation rebuilt from the live clock; dark/bespoke panel; cadence pre-set in `injuryPlan`; drag between/within lines; rank drives the pods.

## Known limitations / open items
- 90-second back rotation can't be exact on a minute grid; rounded to whole minutes (`backEvery` default 2 ≈ 90s). OPEN: a separate exact-90s back-line countdown/beeper.
- PNG export best-effort (Safari foreignObject quirks); falls back to manual screenshot of the clean view.
- Pod sway maxes at the biggest pod's fraction (~2/3); for near-full minutes use Anchors.

## World-class backlog (Shea choosing; he leaned to 1 + 2 first)
1. Sub buzzer (beep/flash a few seconds before each change). 2. True 90s back-line timer. 3. Live minutes-so-far per player. 4. Single green "ready to play" gate. 5. One-tap "send all" phone cards as images.

---

## FULL APP CODE (snapshot 2026-06-25)
Below is the complete `Black Sticks Sub Sheet v2.html`. To work on it, edit the live file on disk (same name) — this block is the reference copy.

````html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Black Sticks Sub Sheet</title>
<style>
  :root{
    --striker:#f4b183; --mid:#33b1e8; --mid2:#3f6fb0; --back:#ffc000; --gk:#a9d18e;
    --on-border:#222; --bad:#e74c3c; --good:#27ae60; --warn:#f39c12;
  }
  *{box-sizing:border-box;}
  body{font-family:-apple-system,"Segoe UI",Arial,sans-serif;margin:0;background:#f4f5f7;color:#111;}
  header{background:#111;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
  header h1{font-size:18px;margin:0;white-space:nowrap;font-weight:800;letter-spacing:.5px;}
  header h1 .h1-sub{font-weight:600;color:#8a93a6;font-size:12px;letter-spacing:2px;margin-left:2px;}
  /* clean game bar */
  .gamebar{display:flex;align-items:center;gap:8px;background:#1c1c24;border:1px solid #333;border-radius:9px;padding:5px 8px;}
  .gamebar .gb-label{font-size:10px;letter-spacing:1.5px;color:#7a8499;font-weight:700;}
  .gamebar input[type=text]{background:#0e0e14;border:1px solid #3a3a48;color:#fff;border-radius:6px;padding:6px 9px;font-size:14px;font-weight:700;min-width:150px;}
  .gamebar select{background:#0e0e14;border:1px solid #3a3a48;color:#fff;border-radius:6px;padding:6px 8px;font-size:13px;font-weight:600;cursor:pointer;}
  .gamebar input:focus,.gamebar select:focus{outline:none;border-color:#1769aa;}
  .gamebar .gb-new{background:#1769aa;color:#fff;border-color:#1769aa;font-weight:700;}
  .gamebar .gb-new:hover{background:#1f7dc4;}
  .hdr-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
  /* kebab menu (pure HTML details) */
  .hmenu{position:relative;}
  .hmenu summary{list-style:none;cursor:pointer;background:#fff;border:1px solid #555;border-radius:4px;padding:5px 11px;font-size:15px;line-height:1;color:#111;user-select:none;}
  .hmenu summary::-webkit-details-marker{display:none;}
  .hmenu summary:hover{background:#e8e8e8;}
  .hmenu[open] summary{background:#1769aa;color:#fff;border-color:#1769aa;}
  .hmenu-pop{position:absolute;right:0;top:calc(100% + 7px);background:#1c1c24;border:1px solid #3a3a48;border-radius:10px;padding:6px;min-width:230px;z-index:60;box-shadow:0 14px 40px rgba(0,0,0,.5);}
  .hmenu-pop button{display:block;width:100%;text-align:left;background:none;border:none;color:#eaeaf0;font-size:13px;font-weight:600;padding:9px 11px;border-radius:7px;cursor:pointer;}
  .hmenu-pop button:hover{background:#2a2a36;}
  .hmenu-pop button.danger{color:#ff8d82;}
  .hmenu-pop button.danger:hover{background:#3a201e;}
  .hmenu-h{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#7a8499;font-weight:700;padding:8px 11px 4px;}
  .hmenu-sep{height:1px;background:#33333f;margin:5px 6px;}
  .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .toolbar input[type=text],.toolbar select{padding:5px 8px;border-radius:4px;border:1px solid #888;font-size:13px;}
  button{padding:5px 10px;border-radius:4px;border:1px solid #555;background:#fff;cursor:pointer;font-size:13px;}
  button:hover{background:#e8e8e8;}
  button.primary{background:#1769aa;color:#fff;border-color:#1769aa;}
  button.danger{color:#b00;border-color:#b00;}
  main{padding:12px 16px;}
  .tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center;}
  .tabs button{font-weight:700;padding:7px 18px;}
  .tabs button.active{background:#111;color:#fff;border-color:#111;}
  .hint{font-size:12px;color:#555;margin:6px 0 10px;}
  table{border-collapse:collapse;background:#fff;width:100%;}
  th,td{border:1px solid #bbb;padding:0;text-align:center;font-size:12px;}
  th{background:#111;color:#fff;padding:5px 4px;}
  td.name{min-width:110px;text-align:left;padding:4px 8px;font-weight:700;white-space:nowrap;}
  td.cell{min-width:38px;height:30px;cursor:pointer;user-select:none;font-weight:700;font-size:11px;}
  td.cell.off{background:#fff;color:#ccc;}
  td.cell .rep{font-size:10px;color:#999;font-weight:600;font-style:italic;pointer-events:none;}
  td.cell .badges{display:flex;gap:2px;justify-content:center;margin-top:1px;pointer-events:none;}
  .badge{font-size:8px;font-weight:800;color:#fff;border-radius:3px;padding:0 3px;line-height:11px;display:inline-block;}
  td.cell{height:34px;vertical-align:middle;}
  td.cell.on{padding:2px 0;}
  .rolechk{display:inline-flex;align-items:center;gap:2px;font-size:11px;font-weight:800;border:1.5px solid;border-radius:4px;padding:1px 5px;cursor:pointer;user-select:none;}
  .rolechk input{margin:0;accent-color:currentColor;}
  tr.rolerow td.label{color:#fff;}
  .gametab{border-color:#1769aa;color:#1769aa;}
  .gametab.active{background:#1769aa!important;color:#fff!important;border-color:#1769aa!important;}
  th.minhead{cursor:pointer;}
  th.minhead:hover{background:#444;}
  th.minhead.livehead{background:#ff2d95;color:#fff;}
  td.cell.livecol{box-shadow:inset 0 0 0 2px #ff2d95;}
  .livebanner{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#1b1b2f;color:#fff;
    border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:14px;}
  .lb-clock{background:#ff2d95;font-weight:800;border-radius:4px;padding:3px 10px;letter-spacing:.5px;}
  .lb-now{font-weight:700;}
  .lb-next{color:#ffd166;font-weight:600;}
  .lb-g{color:#9aa;font-weight:600;font-size:12px;}
  .lb-x{margin-left:auto;background:none;color:#ccc;border-color:#777;}
  td.gtotal.t-ok{background:var(--good);color:#fff;}
  td.gtotal.t-under{background:var(--warn);color:#fff;}
  td.gtotal.t-over{background:var(--bad);color:#fff;}
  input.tgt{width:46px;text-align:center;border:1px solid #aaa;border-radius:3px;padding:2px;font-weight:700;}
  .gametable td.total,.gametable td.gtotal{padding:5px;}
  .pcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px;}
  .pcard{border:1px solid #aaa;border-radius:6px;overflow:hidden;background:#fff;page-break-inside:avoid;}
  .pcard-name{font-size:14px;font-weight:800;padding:5px 8px;display:flex;align-items:center;gap:4px;}
  .pcard-tot{margin-left:auto;font-size:12px;background:rgba(0,0,0,.18);border-radius:3px;padding:1px 7px;}
  .pcard-q{padding:4px 8px;font-size:12.5px;border-top:1px solid #e3e3e3;display:flex;flex-wrap:wrap;gap:4px;align-items:center;}
  .pcard-qlbl{font-weight:800;background:#111;color:#fff;border-radius:3px;padding:0 6px;}
  .pcard-min{margin-left:auto;color:#777;font-weight:700;}
  .pcard-rest{color:#aaa;}
  .pcard.group-Strikers .pcard-name{background:var(--striker);}
  .pcard.group-Midfield .pcard-name{background:var(--mid);}
  .pcard.group-Back .pcard-name{background:var(--back);}
  .pcard.group-GK .pcard-name{background:var(--gk);}
  /* match timer */
  #timerbar{position:sticky;top:0;z-index:40;}
  .timerwrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#111;color:#fff;
    border-radius:8px;padding:10px 14px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.35);}
  .timerwrap.running{background:#0d2818;box-shadow:0 2px 10px rgba(39,174,96,.5);}
  .tq{background:#444;font-weight:800;border-radius:4px;padding:4px 10px;font-size:15px;}
  .timerwrap.running .tq{background:var(--good);}
  .clock{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:34px;font-weight:800;letter-spacing:2px;min-width:118px;text-align:center;}
  .clock.ended{color:var(--bad);}
  .tbig{font-size:17px;font-weight:800;padding:10px 26px;border-radius:8px;border:none;cursor:pointer;}
  .tstart{background:var(--good);color:#fff;}
  .tstop{background:var(--bad);color:#fff;}
  .tsm{background:#333;color:#fff;border:1px solid #555;padding:8px 14px;font-size:13px;font-weight:700;border-radius:6px;}
  .thint{font-size:12px;color:#9ab;flex-basis:100%;}
  @media(min-width:1100px){.thint{flex-basis:auto;margin-left:auto;text-align:right;max-width:420px;}}
  /* live row highlight */
  tr.row-on td.name{box-shadow:inset 4px 0 0 var(--good);}
  tr.row-off td{opacity:.35;}
  tr.row-off td.name{opacity:.45;}
  /* structures */
  .structwrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fff;border:1px solid #ccc;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:13px;}
  .structwrap select{padding:5px 8px;border-radius:4px;border:1px solid #888;font-size:13px;max-width:340px;}
  .schips{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;}
  .schip{font-size:11px;background:#eef2f7;border-radius:3px;padding:2px 8px;color:#555;}
  .schip.cur{background:#111;color:#fff;font-weight:700;}
  .structeditor{background:#fff;border:1px solid #ccc;border-radius:6px;padding:10px;margin-top:6px;}
  .cs-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
  .cs-row input[type=text]{padding:5px 8px;border:1px solid #aaa;border-radius:4px;min-width:180px;font-weight:600;}
  .cs-row label{font-size:12px;font-weight:800;display:flex;align-items:center;gap:3px;color:#333;}
  .cs-row input[type=number]{width:46px;text-align:center;padding:3px;border:1px solid #aaa;border-radius:4px;font-weight:700;}
  .cs-tot{font-size:12px;font-weight:800;border-radius:4px;padding:2px 8px;}
  .cs-tot.ok{background:var(--good);color:#fff;} .cs-tot.bad{background:var(--warn);color:#fff;}
  .structname{font-size:10px;font-weight:600;color:#ffd166;display:block;letter-spacing:.3px;}
  .structmini{font-size:10px;color:#777;font-weight:600;}
  /* rotation units */
  .unitrow{border:1px solid #ccc;border-radius:6px;padding:10px;margin-bottom:10px;background:#fafbfc;}
  .unit-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;}
  .uchip{display:inline-flex;align-items:center;gap:3px;border-radius:5px;padding:4px 6px;font-weight:800;font-size:13px;color:#fff;}
  .uchip.starter{background:#2a9d3a;}
  .uchip.interchange{background:#e60000;}
  .uchip i{font-style:normal;font-size:10px;opacity:.85;font-weight:600;}
  .uchip button{background:rgba(255,255,255,.25);border:none;color:#fff;border-radius:3px;font-size:10px;padding:1px 4px;cursor:pointer;}
  .uchip button.x{font-size:12px;}
  .unit-ctl{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px;font-weight:600;}
  .unit-ctl input[type=number]{width:46px;text-align:center;padding:3px;border:1px solid #aaa;border-radius:3px;font-weight:700;}
  .uq{display:inline-flex;align-items:center;gap:2px;font-weight:700;background:#eef2f7;border-radius:4px;padding:2px 7px;}
  .unit-desc{margin-top:7px;font-size:12.5px;color:#1f3864;font-weight:700;background:#eef2f7;border-radius:4px;padding:5px 9px;}
  td.pline{text-align:left;padding:6px 10px;font-size:13px;}
  table.psheet td.name{border-left:1px solid #bbb;}
  td.cell:hover{outline:2px solid #1769aa;outline-offset:-2px;}
  tr.group-Strikers td.name{background:var(--striker);}
  tr.group-Midfield td.name{background:var(--mid);}
  tr.group-Back td.name{background:var(--back);}
  tr.group-GK td.name{background:var(--gk);}
  tr.group-Strikers td.cell.on{background:var(--striker);}
  tr.group-Midfield td.cell.on{background:var(--mid);}
  tr.group-Back td.cell.on{background:var(--back);}
  tr.group-GK td.cell.on{background:var(--gk);}
  /* 6-mid split: attacking vs defensive midfield */
  tr.sub-DM td.name{background:var(--mid2);color:#fff;}
  tr.sub-DM td.cell.on{background:var(--mid2);color:#fff;}
  tr.grouphead.gh-AM td{background:#1c84c6;}
  tr.grouphead.gh-DM td{background:#2b4f86;}
  /* manually-locked cell */
  td.cell.locked{box-shadow:inset 0 0 0 2px #111;}
  td.cell.locked::after{content:"";position:absolute;top:1px;right:1px;width:0;height:0;
    border-top:6px solid #111;border-left:6px solid transparent;}
  td.cell{position:relative;}
  /* subtle "plays" band under each line */
  tr.prefsrow td{padding:0;border-top:1px solid #ccc;}
  .prefs-wrap{display:flex;align-items:stretch;background:#fbfbf4;}
  .prefs-lbl{background:#555;color:#fff;font-weight:800;font-size:9px;padding:3px 8px;white-space:nowrap;letter-spacing:.5px;display:flex;align-items:center;}
  .prefs-edit{flex:1;padding:3px 10px;font-size:12px;font-weight:600;color:#444;text-align:left;outline:none;line-height:1.4;}
  .prefs-edit:empty::before{content:attr(data-ph);color:#aaa;font-weight:500;}
  .prefs-edit:focus{background:#fff;}
  #cellMenu .cm-locked{color:#b00;font-weight:800;}
  #cellMenu .cm-cur{background:#1769aa;color:#fff;border-color:#1769aa;}
  #cellMenu .cm-auto{color:#1769aa;border-color:#1769aa;font-weight:800;}
  #cellMenu .cm-scope{display:flex;gap:4px;margin-bottom:7px;}
  #cellMenu .cm-sc{flex:1;font-size:10px;font-weight:800;padding:5px 0;border:1px solid #bbb;background:#f4f6f9;color:#555;border-radius:4px;}
  #cellMenu .cm-sc.on{background:#1f3864;color:#fff;border-color:#1f3864;}
  #cellMenu .cm-note{font-size:10px;color:#777;margin:5px 0 0;line-height:1.3;}
  td.total{font-weight:800;background:#eef2f7;min-width:42px;padding:4px;}
  td.gtotal{font-weight:800;background:#dde6f0;min-width:46px;padding:4px;}
  tr.grouphead td{background:#222;color:#fff;font-weight:800;text-align:left;padding:4px 8px;font-size:12px;letter-spacing:.5px;}
  tr.counts td{font-weight:800;padding:4px;}
  tr.counts td.ok{background:var(--good);color:#fff;}
  tr.counts td.bad{background:var(--bad);color:#fff;}
  tr.counts td.label{background:#111;color:#fff;text-align:left;padding-left:8px;font-size:11px;white-space:nowrap;}
  tr.counts td.label input{width:34px;border:none;border-radius:3px;text-align:center;font-weight:800;padding:1px;}
  tr.counts td.ltot.ok{background:var(--good);color:#fff;}
  tr.counts td.ltot.bad{background:var(--bad);color:#fff;}
  .subplan{margin-top:14px;}
  .subplan h2{font-size:15px;margin:0 0 8px;}
  .startline{font-size:13px;margin-bottom:10px;line-height:1.6;background:#eef2f7;padding:8px;border-radius:4px;}
  table.subtable{width:auto;min-width:520px;}
  table.subtable th{padding:6px 14px;}
  table.subtable td{padding:6px 14px;font-size:13px;text-align:left;}
  table.subtable td.t{font-weight:800;white-space:nowrap;}
  table.subtable td.onn{color:#1c7a32;font-weight:700;}
  table.subtable td.offn{color:#b02a1d;font-weight:700;}
  #cellMenu{position:absolute;z-index:50;background:#fff;border:1px solid #888;border-radius:6px;
    box-shadow:0 4px 14px rgba(0,0,0,.25);padding:8px;width:180px;}
  #cellMenu .cm-title{font-size:11px;font-weight:800;margin-bottom:6px;color:#333;}
  #cellMenu .cm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px;}
  #cellMenu button{padding:5px 0;font-size:11px;font-weight:700;width:100%;}
  #cellMenu .cm-wide{margin-top:2px;}
  #cellMenu .cm-off{color:#b00;border-color:#b00;}
  #cellMenu .cm-row{display:flex;gap:4px;margin-bottom:6px;}
  #cellMenu .cm-gen{flex:1;background:#1f3864;color:#fff;border-color:#1f3864;font-weight:800;}
  /* priority positions panel */
  .pri-group{margin-bottom:8px;}
  .pri-ghead{font-weight:800;font-size:12px;padding:4px 8px;border-radius:4px 4px 0 0;color:#111;}
  .pri-ghead.group-Strikers{background:var(--striker);} .pri-ghead.group-Midfield{background:var(--mid);}
  .pri-ghead.group-Back{background:var(--back);} .pri-ghead.group-GK{background:var(--gk);}
  .pri-row{display:flex;align-items:center;gap:8px;padding:4px 8px;border:1px solid #e3e3e3;border-top:none;flex-wrap:wrap;}
  .pri-name{font-weight:800;min-width:90px;}
  .pri-now{min-width:74px;font-weight:800;color:#1f3864;background:#eef2f7;border-radius:4px;padding:2px 8px;text-align:center;}
  .pri-btns{display:flex;gap:4px;flex-wrap:wrap;}
  .ppbtn{font-size:13px;font-weight:800;padding:6px 11px;border:1.5px solid #bbb;border-radius:6px;background:#fff;color:#333;min-width:42px;}
  .ppbtn.gen{border-color:#1f3864;color:#1f3864;}
  .ppbtn.on{background:#1769aa;color:#fff;border-color:#1769aa;}
  .ppbtn.gen.on{background:#1f3864;border-color:#1f3864;}
  .ppbtn sup{font-size:8px;}
  .pri-clear{margin-left:auto;color:#b00;border-color:#b00;font-weight:800;}
  /* live quick-swap */
  .liveswap{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#10233a;color:#fff;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:13px;}
  .liveswap select{padding:5px 8px;border-radius:4px;border:1px solid #888;font-size:13px;}
  /* notes banner */
  .notesbanner{background:#fff3cd;border:1px solid #f0c674;border-left:6px solid var(--warn);color:#5b4500;
    border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:13.5px;font-weight:600;line-height:1.5;}
  /* protected-pair warning */
  .pairwarn{background:#fdecea;border:1px solid #e74c3c;border-left:6px solid var(--bad);color:#922;
    border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:13.5px;font-weight:800;}
  .pairwarn.live{background:#e74c3c;color:#fff;border-color:#922;}
  .pair-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
  .pair-row select{padding:5px 8px;border:1px solid #aaa;border-radius:4px;font-weight:600;}
  .pair-row input[type=text]{padding:5px 8px;border:1px solid #aaa;border-radius:4px;min-width:160px;}
  .pair-amp{font-weight:800;color:#555;}
  /* per-quarter line move button in the name cell */
  .linebtn{font-size:9px;font-weight:800;padding:1px 5px;border:1px solid rgba(0,0,0,.3);border-radius:4px;
    background:rgba(255,255,255,.55);color:#222;cursor:pointer;vertical-align:middle;}
  .linebtn.moved{background:#1f3864;color:#fff;border-color:#1f3864;}
  .anchorpip{color:#c79a00;font-size:11px;font-weight:900;margin:0 2px;vertical-align:middle;}
  #cellMenu .cm-ghost{background:#fff;color:#1f3864;}
  .ready{font-weight:800;font-size:13px;padding:7px 14px;border-radius:6px;letter-spacing:.3px;}
  .ready.ok{background:var(--good);color:#fff;}
  .ready.bad{background:var(--bad);color:#fff;}
  .cardstab{border-color:#7a3a9a;color:#7a3a9a;}
  .cardstab.active{background:#7a3a9a!important;color:#fff!important;border-color:#7a3a9a!important;}
  /* phone cards */
  .cards-intro{background:#eef2f7;border:1px solid #cdd6e0;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:13.5px;}
  .phonecards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,360px));gap:14px;}
  .phonecard{width:100%;border:2px solid #111;border-radius:16px;overflow:hidden;background:#fff;page-break-inside:avoid;box-shadow:0 3px 10px rgba(0,0,0,.18);}
  .pc-head{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;padding:12px 14px;}
  .phonecard.group-Strikers .pc-head{background:var(--striker);} .phonecard.group-Midfield .pc-head{background:var(--mid);}
  .phonecard.group-Back .pc-head{background:var(--back);} .phonecard.group-GK .pc-head{background:var(--gk);}
  .pc-name{font-size:24px;font-weight:900;line-height:1;}
  .pc-pos{font-size:13px;font-weight:700;opacity:.85;}
  .pc-tot{grid-row:1/3;grid-column:2;font-size:30px;font-weight:900;text-align:center;line-height:1;}
  .pc-tot small{display:block;font-size:10px;font-weight:700;opacity:.7;}
  .pc-q{display:flex;align-items:baseline;gap:6px;padding:8px 14px;border-top:1px solid #eee;font-size:14px;}
  .pc-qn{font-weight:900;background:#111;color:#fff;border-radius:5px;padding:2px 8px;font-size:13px;}
  .pc-line{font-weight:800;background:#1f3864;color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;}
  .pc-steps{flex:1;line-height:1.5;}
  .pc-on{color:#1c7a32;font-weight:800;} .pc-off{color:#b02a1d;font-weight:800;}
  .pc-sub{color:#555;font-weight:600;} .pc-arr{color:#bbb;} .pc-rest{color:#aaa;font-weight:700;}
  .pc-min{font-weight:900;color:#555;min-width:26px;text-align:right;}
  .pc-note{font-size:12px;background:#fff3cd;color:#5b4500;padding:8px 14px;font-weight:600;line-height:1.4;border-top:1px solid #f0c674;}
  .pc-foot{font-size:10px;color:#999;text-align:center;padding:6px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
  .pc-wrap{cursor:pointer;position:relative;}
  .pc-wrap:hover .phonecard{box-shadow:0 4px 16px rgba(23,105,170,.5);}
  .pc-tap{text-align:center;font-size:11px;font-weight:700;color:#1769aa;margin-top:4px;}
  /* fullscreen single card for screenshotting */
  #cardOverlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);
    align-items:center;justify-content:center;padding:16px;}
  #cardOverlay .co-inner{width:100%;max-width:430px;}
  #cardOverlay .phonecard{box-shadow:0 10px 40px rgba(0,0,0,.5);}
  #cardOverlay .pc-name{font-size:30px;} #cardOverlay .pc-tot{font-size:38px;}
  #cardOverlay .pc-q{font-size:15px;padding:10px 14px;}
  .co-hint{color:#fff;text-align:center;margin-top:12px;font-size:14px;font-weight:600;}
  @media print{ .phonecard{page-break-after:always;box-shadow:none;width:80mm;} .cards-intro,.pc-tap{display:none!important;} .phonecards{display:block!important;} #cardOverlay{display:none!important;} }
  .panel{background:#fff;border:1px solid #ccc;border-radius:6px;padding:12px;margin-bottom:12px;}
  .panel h2{margin:0 0 8px;font-size:15px;}
  /* setup tab strip — replaces the stacked accordion panels */
  .setupbar{margin-bottom:12px;}
  /* start-here guide strip */
  .setup-guide{display:flex;align-items:center;gap:7px;flex-wrap:wrap;background:#eef2f7;border:1px solid #d4dce6;
    border-radius:9px;padding:8px 13px;margin-bottom:9px;font-size:12.5px;color:#33415c;}
  .setup-guide b{font-size:10px;letter-spacing:1.2px;color:#7a8499;margin-right:4px;}
  .setup-guide .sg-step{display:inline-flex;align-items:center;gap:6px;font-weight:700;}
  .setup-guide .sg-step i{font-style:normal;width:18px;height:18px;border-radius:50%;background:#1f3864;color:#fff;
    font-size:11px;font-weight:800;display:grid;place-items:center;}
  .setup-guide .sg-arrow{color:#a7b4c8;font-weight:700;}
  .setup-guide .sg-gen{font-weight:800;color:#fff;background:#2a9d3a;border-radius:5px;padding:3px 9px;font-size:11px;letter-spacing:.5px;}
  .setup-guide .sg-tail{color:#6a7488;font-weight:600;}
  @media(max-width:720px){.setup-guide .sg-tail{display:none;}}
  .setup-tabs{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
  .stab{appearance:none;border:1px solid #cdd5e0;background:#f4f6f9;color:#33415c;font-weight:700;
    font-size:13px;letter-spacing:.2px;padding:9px 15px;border-radius:9px;cursor:pointer;line-height:1;
    display:inline-flex;align-items:center;gap:7px;transition:background .12s,border-color .12s,color .12s,box-shadow .12s;}
  .stab:hover{background:#e9eef5;border-color:#a7b4c8;}
  .stab .stepnum{width:18px;height:18px;border-radius:50%;background:#dde4ee;color:#5a6885;font-size:11px;font-weight:800;display:grid;place-items:center;flex:none;}
  .stab .dot{width:7px;height:7px;border-radius:50%;background:#9aa7bd;flex:none;transition:background .12s;}
  .stab.core .dot{display:none;}
  .stab.active{background:#1f3864;color:#fff;border-color:#1f3864;box-shadow:0 2px 6px rgba(31,56,100,.28);}
  .stab.active .stepnum{background:#ffc000;color:#1f3864;}
  .stab.active .dot{background:#ffc000;}
  .stab.done .stepnum{background:#2a9d3a;color:#fff;}
  .stab.done .dot{background:#2a9d3a;}
  .stab.warn .dot{background:#e60000;}
  .stab.warn .stepnum{background:#e60000;color:#fff;}
  .stab-div{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9aa7bd;font-weight:700;padding:0 4px 0 8px;align-self:center;}
  .setup-content{max-height:0;overflow:hidden;border:1px solid transparent;border-radius:10px;transition:max-height .18s ease;}
  .setup-content.open{max-height:none;overflow:visible;margin-top:9px;background:#fff;border-color:#ccd3dd;
    padding:15px;box-shadow:0 2px 10px rgba(31,56,100,.07);}
  .setup-body .hint{margin-top:6px;}
  .squad-intro{font-size:12.5px;color:#555;margin-bottom:9px;line-height:1.5;}
  .squad-linehdr{display:flex;align-items:center;gap:8px;margin:13px 2px 5px;}
  .squad-linehdr:first-of-type{margin-top:2px;}
  .squad-linehdr .slh-dot{width:12px;height:12px;border-radius:50%;}
  .squad-linehdr.group-Strikers .slh-dot{background:var(--striker);} .squad-linehdr.group-Midfield .slh-dot{background:var(--mid);}
  .squad-linehdr.group-Back .slh-dot{background:var(--back);} .squad-linehdr.group-GK .slh-dot{background:var(--gk);}
  .squad-linehdr span{font-size:11px;letter-spacing:1.3px;text-transform:uppercase;font-weight:800;color:#5a6885;}
  .squad-linehdr small{color:#9aa7bd;font-weight:600;font-size:11px;}
  .squad-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;background:#fff;border:1px solid #e3e7ee;border-radius:9px;padding:7px 10px;}
  .squad-row:hover{border-color:#c2ccdb;}
  .squad-row .sq-rankno{width:22px;height:22px;border-radius:50%;flex:none;background:#1f3864;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;}
  .squad-row .sq-rankno.gk{background:#7a8499;}
  .squad-row .sq-dot{width:10px;height:10px;border-radius:50%;flex:none;}
  .squad-row.group-Strikers .sq-dot{background:var(--striker);} .squad-row.group-Midfield .sq-dot{background:var(--mid);}
  .squad-row.group-Back .sq-dot{background:var(--back);} .squad-row.group-GK .sq-dot{background:var(--gk);}
  .squad-row .sq-grip{display:flex;flex-direction:column;line-height:.6;}
  .squad-row input[type=text].sq-name{flex:1;min-width:120px;font-weight:700;font-size:14px;padding:6px 9px;border:1px solid #dfe4ec;border-radius:6px;background:#fff;}
  .squad-row .sq-rank{width:44px;text-align:center;padding:6px 4px;border:1px solid #dfe4ec;border-radius:6px;}
  .squad-row select{padding:6px 7px;border:1px solid #dfe4ec;border-radius:6px;font-weight:600;background:#fff;}
  .squad-row input:focus,.squad-row select:focus{outline:none;border-color:#1769aa;}
  .squad-row .sq-roles{display:flex;gap:4px;padding-left:9px;margin-left:1px;border-left:1px solid #e7ebf1;}
  .squad-row .sq-del{color:#b00;border:1px solid #e6c8c5;background:#fff;border-radius:6px;padding:5px 9px;}
  .squad-row .sq-del:hover{background:#fbeae8;}
  .squad-row .grip{cursor:pointer;border:none;background:none;font-size:11px;padding:0 4px;color:#9aa7bd;}
  .squad-row .grip:hover{color:#1f3864;}
  .legend{font-size:12px;color:#444;margin-top:8px;}
  .statusbar{margin-top:10px;font-size:13px;font-weight:700;}
  .statusbar .ok{color:var(--good);} .statusbar .bad{color:var(--bad);}
  .qactions{margin-left:auto;display:flex;gap:6px;}
  @page{ size:A4 landscape; margin:6mm; }
  @media print{
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    header,.panel,.tabs,.hint,.qactions,.no-print,.statusbar,.legend,.livebanner,#timerbar,#structbar,#guidePanel,.notesbanner{display:none!important;}
    .panel.subplan{display:none!important;}   /* quarter print = just the grid, one page */
    body{background:#fff;}
    main{padding:0;}
    .print-title{display:block!important;font-size:12px;font-weight:800;margin:2px 0;}
    /* compact so a whole quarter fits on ONE landscape page */
    .qgrid table{font-size:8px;width:100%;table-layout:fixed;}
    .qgrid th,.qgrid td{padding:1px 2px;border-color:#999;}
    .qgrid td.cell{height:auto;}
    .qgrid td.name{font-size:8.5px;min-width:0;white-space:normal;}
    .qgrid .badge{font-size:5px;line-height:8px;padding:0 2px;}
    .qgrid .badges{gap:1px;margin-top:0;}
    .linebtn{display:none!important;}
    .anchorpip{display:none!important;}
    tr.grouphead td{padding:2px 6px;font-size:9px;}
    tr.counts td,tr.rolerow td{padding:1px 2px;font-size:8px;}
    tr.prefsrow .prefs-lbl{font-size:6px;padding:2px 5px;}
    tr.prefsrow .prefs-edit{font-size:8px;padding:2px 6px;}
    .prefs-edit:empty::before{content:"";}   /* hide placeholder on paper */
    tr{page-break-inside:avoid;}
    /* hide the manual-lock marker on paper — clean print */
    td.cell.locked{box-shadow:none!important;}
    td.cell.locked::after{display:none!important;}
    /* phone cards still print one per page when on the CARDS tab */
    .phonecard{page-break-after:always;box-shadow:none;}
  }
  .print-title{display:none;}
  /* ===== v2 additions ===== */
  /* collapsible fold boxes (sub plan / who takes who) */
  details.foldbox{margin-top:14px;border:1px solid #ccd3dd;border-radius:8px;background:#fff;overflow:hidden;}
  details.foldbox>summary{list-style:none;cursor:pointer;padding:11px 14px;font-weight:800;font-size:14px;color:#1f3864;
    background:#eef2f7;display:flex;align-items:center;gap:8px;user-select:none;}
  details.foldbox>summary::-webkit-details-marker{display:none;}
  details.foldbox>summary::before{content:"\25B8";color:#1769aa;font-size:13px;transition:transform .12s;}
  details.foldbox[open]>summary::before{transform:rotate(90deg);}
  details.foldbox>summary .fold-tag{margin-left:auto;font-size:11px;font-weight:700;color:#7a8499;}
  .foldbox-body{padding:12px 14px;}
  .snapbtn{background:#1f3864;color:#fff;border:none;border-radius:7px;padding:8px 13px;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:10px;}
  .snapbtn:hover{background:#274b86;}
  /* clean fullscreen overlay (shared: phone card, tables) */
  #cardOverlay .co-inner.co-wide{max-width:min(96vw,1100px);}
  #cardOverlay .co-inner{max-height:88vh;overflow:auto;}
  .co-bar{display:flex;gap:10px;justify-content:center;margin-top:14px;}
  .co-dl,.co-close{border:none;border-radius:8px;padding:10px 18px;font-weight:800;font-size:14px;cursor:pointer;}
  .co-dl{background:#ffc000;color:#1c1c1c;} .co-dl:hover{filter:brightness(1.06);}
  .co-close{background:#444;color:#fff;} .co-close:hover{background:#555;}
  .co-snap{background:#fff;border-radius:10px;padding:10px;}
  /* drag-to-reorder */
  .squad-row[draggable=true]{cursor:grab;}
  .squad-row.dragging{opacity:.4;}
  .squad-row.drop-target{box-shadow:inset 0 3px 0 #1769aa;}
  td.name[draggable=true]{cursor:grab;}
  tr.drag-row td.name{box-shadow:inset 4px 0 0 #1769aa,inset 0 3px 0 #1769aa;}
  .drag-hint{font-size:11px;color:#8a93a6;margin-left:6px;font-weight:600;}
  /* formations dashboard (sleek dark) */
  .fdash{background:#16181d;border:1px solid #2a2d35;border-radius:12px;padding:16px;}
  .fdash .fd-intro{color:#aeb6c4;font-size:13px;line-height:1.5;margin-bottom:14px;}
  .fdash .fd-intro b{color:#fff;}
  .fd-section{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#7a8499;font-weight:800;margin:6px 0 9px;}
  .fcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:11px;margin-bottom:8px;}
  .fcard{background:#21242b;border:1px solid #31353f;border-radius:11px;padding:13px;transition:.13s;}
  .fcard:hover{border-color:#4a505e;}
  .fcard .fc-name{font-weight:800;font-size:14px;color:#fff;margin-bottom:3px;display:flex;align-items:center;gap:7px;}
  .fcard .fc-name input{background:transparent;border:none;color:#fff;font-family:inherit;font-weight:800;font-size:14px;width:100%;padding:2px 0;}
  .fcard .fc-name input:focus{outline:none;border-bottom:1px solid #ffc000;}
  .fcard .fc-shape{font-size:12px;font-weight:700;color:#ffc000;margin-bottom:11px;}
  .fcard .fc-apply{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}
  .fcard .fc-apply .lbl{font-size:10px;color:#7a8499;font-weight:700;letter-spacing:.5px;}
  .fbtn{background:#2c303a;border:1px solid #3d424e;color:#dfe4ee;font-weight:800;font-size:12px;border-radius:7px;padding:6px 11px;cursor:pointer;}
  .fbtn:hover{background:#1769aa;border-color:#1769aa;color:#fff;}
  .fbtn.gold{background:#ffc000;color:#1c1c1c;border-color:#ffc000;}
  .fbtn.gold:hover{filter:brightness(1.07);}
  .fbtn.x{background:none;border:none;color:#9aa7bd;padding:6px 8px;margin-left:auto;}
  .fbtn.x:hover{color:#ff8d82;}
  .fdash .fd-add{margin-top:10px;display:flex;gap:9px;flex-wrap:wrap;}
  @media print{ details.foldbox{display:none!important;} }
  /* injury recovery */
  .tinj{background:#7a1410;color:#fff;border:1px solid #e23b2e;padding:8px 14px;font-size:13px;font-weight:800;border-radius:6px;cursor:pointer;letter-spacing:.3px;}
  .tinj:hover{background:#9a1a14;}
  #injuryOverlay{display:none;position:fixed;inset:0;z-index:210;background:rgba(6,7,10,.78);align-items:flex-start;justify-content:center;padding:20px 12px;}
  .inj-card{background:#13151a;border:1px solid #2a2e38;border-radius:18px;max-width:760px;width:100%;max-height:93vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.7);padding:0;color:#e7eaf0;}
  .inj-head{display:flex;align-items:center;justify-content:space-between;font-size:19px;font-weight:900;color:#fff;background:linear-gradient(90deg,#b3261e,#7a1410);padding:15px 20px;position:sticky;top:0;z-index:2;box-shadow:0 2px 14px rgba(0,0,0,.4);}
  .inj-head span{display:flex;align-items:center;gap:9px;letter-spacing:.4px;}
  .inj-x{background:rgba(255,255,255,.16);border:none;font-size:20px;color:#fff;cursor:pointer;line-height:1;width:32px;height:32px;border-radius:9px;}
  .inj-x:hover{background:rgba(255,255,255,.3);}
  .inj-sub{font-size:13.5px;color:#aeb6c4;line-height:1.55;margin:0;padding:15px 20px 6px;}
  .inj-sub b{color:#fff;}
  .inj-plan{background:#1b1e25;border:1px solid #2c313c;border-radius:12px;margin:12px 20px;overflow:hidden;}
  .inj-plan-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid #262a33;}
  .inj-plan-row:last-of-type{border-bottom:none;}
  .inj-plan-lbl{font-size:11px;letter-spacing:.8px;text-transform:uppercase;font-weight:800;color:#8089a0;width:130px;flex:none;}
  .inj-plan-val{font-size:14px;font-weight:700;color:#fff;}
  .inj-plan input{width:50px;text-align:center;font-size:15px;font-weight:800;padding:6px;border:1px solid #3a404e;border-radius:7px;margin:0 3px;background:#0e1014;color:#fff;}
  .inj-plan input:focus{outline:none;border-color:var(--back);}
  .inj-planhint{font-size:11px;font-weight:600;color:#7e8699;padding:9px 15px;background:#15171c;line-height:1.4;}
  .inj-outwrap{background:#2a1413;border:1px solid #5e2a26;border-radius:12px;margin:0 20px 12px;padding:10px 14px;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
  .inj-outlbl{font-weight:800;color:#ff8d82;letter-spacing:.5px;}
  .inj-out{font-weight:700;color:#fff;display:inline-flex;align-items:center;gap:7px;background:#1b1e25;border-radius:7px;padding:4px 5px 4px 11px;}
  .inj-out button{font-size:11px;font-weight:700;border:1px solid #3aa7e0;color:#7fc6ee;background:transparent;border-radius:6px;padding:3px 8px;cursor:pointer;}
  .inj-out button:hover{background:rgba(58,167,224,.15);}
  .inj-lanes{padding:2px 20px;}
  .inj-line{margin-bottom:13px;}
  .inj-line-top{display:flex;align-items:center;gap:9px;margin-bottom:6px;}
  .inj-line-h{font-size:11px;letter-spacing:1px;font-weight:900;color:#111;padding:4px 11px;border-radius:6px;display:inline-block;}
  .inj-line-h.group-Strikers{background:var(--striker);} .inj-line-h.group-Midfield{background:var(--mid);color:#08222e;}
  .inj-line-h.group-Back{background:var(--back);}
  .inj-pods{font-size:11px;font-weight:800;color:#ffd84d;background:rgba(255,192,0,.12);border:1px solid rgba(255,192,0,.3);border-radius:20px;padding:2px 11px;}
  .inj-lane{display:flex;flex-wrap:wrap;gap:9px;min-height:58px;align-items:center;padding:10px;border:2px dashed #333845;border-radius:12px;background:#0e1014;transition:.12s;}
  .inj-lane.drop-target{border-color:#3aa7e0;background:#10222e;border-style:solid;}
  .inj-empty{color:#5b6276;font-size:12px;font-weight:600;font-style:italic;padding:0 6px;}
  .inj-chip{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:15px;font-weight:800;padding:11px 15px 9px;border-radius:11px;border:1px solid #313641;border-left-width:4px;background:#20242c;color:#fff;cursor:grab;min-width:106px;transition:.12s;}
  .inj-chip:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.45);background:#262b34;}
  .inj-chip:active{cursor:grabbing;}
  .inj-chip.group-Strikers{border-left-color:var(--striker);} .inj-chip.group-Midfield{border-left-color:var(--mid);} .inj-chip.group-Back{border-left-color:var(--back);}
  .inj-rank{position:absolute;top:-9px;left:-9px;width:21px;height:21px;border-radius:50%;background:var(--back);color:#1c1c1c;font-size:11px;font-weight:900;display:grid;place-items:center;box-shadow:0 2px 5px rgba(0,0,0,.5);}
  .inj-chip-pod{font-size:9px;font-weight:800;letter-spacing:.3px;padding:2px 8px;border-radius:20px;}
  .inj-chip-pod.more{background:rgba(42,157,58,.22);color:#7fe095;border:1px solid rgba(42,157,58,.4);}
  .inj-chip-pod.less{background:rgba(255,255,255,.08);color:#aab3c2;border:1px solid #333845;}
  .inj-rankhint{font-size:10px;font-weight:700;color:#6b7286;letter-spacing:.3px;margin-left:auto;}
  .inj-foot{font-size:11.5px;color:#7e8699;padding:10px 20px 20px;line-height:1.5;}
  .inj-foot b{color:#ffd84d;}
  /* quick rotation by rank panel (Rotation tab) */
  .rankgen{display:flex;align-items:center;gap:14px;background:#16181d;border:1px solid #2a2e38;border-radius:12px;padding:14px 16px;margin-bottom:10px;flex-wrap:wrap;}
  .rankgen-l{flex:1;min-width:200px;}
  .rankgen-l b{display:block;font-size:14px;color:#fff;margin-bottom:2px;}
  .rankgen-l span{font-size:12px;color:#aeb6c4;line-height:1.45;}
  .rankgen .primary{background:var(--back);color:#1c1c1c;border:none;font-weight:800;padding:11px 18px;border-radius:9px;font-size:14px;}
  .units-or{text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9aa7bd;font-weight:700;margin:4px 0 12px;}
  /* out player in the grid */
  tr.row-out td.name{text-decoration:line-through;opacity:.6;}
  tr.row-out td.cell{background:#f3f3f3!important;}
  .outtag{font-size:9px;font-weight:800;color:#fff;background:#b3261e;border-radius:3px;padding:1px 5px;cursor:pointer;text-decoration:none;display:inline-block;}
  @media print{ #injuryOverlay,.tinj{display:none!important;} tr.row-out{display:none!important;} }
</style>
</head>
<body>
<header>
  <h1>BLACK STICKS <span class="h1-sub">SUB SHEET</span></h1>
  <div class="gamebar">
    <span class="gb-label">GAME</span>
    <input type="text" id="gameName" title="Game name">
    <select id="gameSelect" title="Switch saved game"></select>
    <button class="gb-new" onclick="app.newGame()" title="Start a new game — your squad carries over">+ New</button>
  </div>
  <div class="hdr-right">
    <button class="primary" onclick="window.print()" title="Print the current view">Print</button>
    <button onclick="app.toggleGuide()" title="Game-day guide">? Guide</button>
    <details class="hmenu" id="hmenu">
      <summary title="More">&#8943;</summary>
      <div class="hmenu-pop">
        <div class="hmenu-h">This game</div>
        <button onclick="app.duplicateGame();app.closeHmenu()">&#10697;&nbsp; Duplicate</button>
        <button onclick="app.exportJSON();app.closeHmenu()">&#8595;&nbsp; Export</button>
        <button onclick="document.getElementById('importFile').click()">&#8593;&nbsp; Import</button>
        <div class="hmenu-sep"></div>
        <div class="hmenu-h">All games &mdash; move Mac &harr; iPad</div>
        <button onclick="app.backupAll();app.closeHmenu()">&#128190;&nbsp; Backup all</button>
        <button onclick="document.getElementById('restoreFile').click()">&#8634;&nbsp; Restore all</button>
        <div class="hmenu-sep"></div>
        <button class="danger" onclick="app.deleteGame();app.closeHmenu()">&#128465;&nbsp; Delete this game</button>
      </div>
    </details>
    <input type="file" id="importFile" accept=".json" style="display:none;" onchange="app.importJSON(this)">
    <input type="file" id="restoreFile" accept=".json" style="display:none;" onchange="app.restoreAll(this)">
  </div>
</header>
<main>
  <div class="panel" id="guidePanel" style="display:none;">
    <h2>GAME-DAY GUIDE</h2>
    <div style="font-size:13.5px;line-height:1.7;">
      <b>1. Before the game (on the Mac or iPad)</b><br>
      &bull; Pick the game in the top bar (or <i>New</i> for a fresh one — squad carries over).<br>
      &bull; For each quarter tab, pick the <b>structure</b> (e.g. 6 @ BACK – 5 MF – 5 STR). It sets how many of each line must be on. "Apply to ALL" if you run one shape all game.<br>
      &bull; <b>Rotation units</b> (your "take the same person off" system): open the Rotation units panel, make a unit per position group — starters first, interchange last — set 1st sub &amp; cadence (e.g. 1st sub 4', every 4' = your 4-on-4-off), tick Q1–Q3, hit GENERATE ALL. The grid paints itself. Leave Q4 unticked and paint it by hand for minute control.<br>
      &bull; Fine-tune anywhere by painting: click/tap a cell = on/off, drag to paint a block (Mac). Right-click a cell to set an exact position or blank.<br>
      &bull; <b>GAME tab:</b> set target minutes for key players (Woods 50, etc.). Paint until the +/- column is all green ticks and Quarter Checks says all four quarters are legal.<br>
      &bull; Hit <b>Export</b> — that file is your backup. <b>Print</b> if you want paper as a fallback.<br><br>
      <b>2. At the game (iPad on the bench)</b><br>
      &bull; Open the quarter tab you're playing. Press <b>&#9654; START</b> on the clock when the umpire starts play.<br>
      &bull; The pink column follows the match clock. <b>Bright rows = should be ON. Dimmed rows = off.</b> The banner reads out NOW and NEXT subs — just follow the banner.<br>
      &bull; Time called off (injury, video referral)? Press <b>&#10074;&#10074; STOP</b>. Press START when play resumes.<br>
      &bull; Clock drifted from the scoreboard? Use <b>−10s / +10s</b>, or tap the right minute number in the header to jump the clock there.<br>
      &bull; Quarter over: press <b>RESET</b>, switch to the next quarter tab, START again.<br><br>
      <b>3. Controlling Q4 minutes live</b><br>
      &bull; Plan Q4 with your finishers loaded (Lane, Russell, Woods on big minutes). If the game state changes, just repaint Q4 cells on the fly — totals, banner and rows update instantly. STOP the clock while you adjust if you need a beat.<br><br>
      <b>4. Getting this onto the iPad</b><br>
      &bull; This file lives in your Dropbox — but the Dropbox/Files preview won't run it. Install the free <b>Documents by Readdle</b> app, connect Dropbox inside it (or AirDrop the file in), and open the file there — it runs fully, saves included.<br>
      &bull; Note: iPad saves live on the iPad, Mac saves on the Mac. Move plans between them with Export / Import.<br>
      &bull; On iPad: tap = toggle a cell, long-press = the position menu.
    </div>
  </div>
  <div id="timerbar"></div>
  <div class="setupbar no-print" id="setupBar">
    <div class="setup-guide">
      <b>SET UP IN ORDER</b>
      <span class="sg-step"><i>1</i> Squad</span><span class="sg-arrow">&rarr;</span>
      <span class="sg-step"><i>2</i> Positions</span><span class="sg-arrow">&rarr;</span>
      <span class="sg-step"><i>3</i> Anchors</span><span class="sg-arrow">&rarr;</span>
      <span class="sg-step"><i>4</i> Rotation</span><span class="sg-arrow">&rarr;</span>
      <span class="sg-gen">GENERATE</span>
      <span class="sg-tail">and the grid paints itself. The rest is optional.</span>
    </div>
    <div class="setup-tabs">
      <button class="stab core" data-t="squad"      onclick="app.openSetupTab('squad')"><span class="stepnum">1</span><span class="dot"></span>Squad</button>
      <button class="stab core" data-t="pri"        onclick="app.openSetupTab('pri')"><span class="stepnum">2</span><span class="dot"></span>Positions</button>
      <button class="stab core" data-t="anchors"    onclick="app.openSetupTab('anchors')"><span class="stepnum">3</span><span class="dot"></span>Anchors</button>
      <button class="stab core" data-t="units"      onclick="app.openSetupTab('units')"><span class="stepnum">4</span><span class="dot"></span>Rotation</button>
      <span class="stab-div">optional</span>
      <button class="stab" data-t="formations" onclick="app.openSetupTab('formations')"><span class="dot"></span>Formations</button>
      <button class="stab" data-t="pairs"      onclick="app.openSetupTab('pairs')"><span class="dot"></span>Protected pairs</button>
      <button class="stab" data-t="notes"      onclick="app.openSetupTab('notes')"><span class="dot"></span>Game notes</button>
    </div>
    <div class="setup-content" id="setupContent">
      <div id="squadBody"      class="setup-body" style="display:none;"></div>
      <div id="priBody"        class="setup-body" style="display:none;"></div>
      <div id="unitsBody"      class="setup-body" style="display:none;"></div>
      <div id="formationsBody" class="setup-body" style="display:none;"></div>
      <div id="anchorsBody"    class="setup-body" style="display:none;"></div>
      <div id="pairsBody"      class="setup-body" style="display:none;"></div>
      <div id="notesBody"      class="setup-body" style="display:none;">
        <textarea id="notesArea" rows="4" style="width:100%;font-size:14px;padding:8px;border:1px solid #aaa;border-radius:4px;" placeholder="e.g. PCD: Russell trapper, Lane right post, Woods left post. Opp danger #7 + #11. If chasing late — NO GK structure, Lane + Russell stay on." onchange="app.setNotes(this.value)"></textarea>
      </div>
    </div>
  </div>

  <div class="tabs" id="tabs"></div>
  <div id="structbar"></div>
  <div class="hint">
    Click a cell to put a player on/off for that minute. Click &amp; drag to paint a block.
    Brush: <select id="brush"><option value="default">Player default position</option><option value="blank">ON — no position label</option></select>
    &nbsp;|&nbsp; <b>Right-click any cell</b> to set that one box yourself (any position, blank, or off).
    &nbsp;|&nbsp; Columns count down 15 &#8594; 1 (time remaining in quarter).
    <br><label style="font-weight:700;color:#1f3864;"><input type="checkbox" id="autoPosChk" checked onchange="app.setAutoPos(this.checked)"> Auto-position — fill one player per slot (LS, CS, RS…) from their Priority Positions, so you never see two of the same.</label>
  </div>
  <div id="grids"></div>
  <div class="statusbar" id="statusbar"></div>
  <div class="legend">Rule: every line carries its number for every minute — <b>3 strikers, 3 midfield, 4 backs, 1 GK</b> (editable in the count rows if the structure changes). Each count row turns green when that minute is right, red when it isn't. The end-of-row total (e.g. 45/45) checks the line's minutes add up to full coverage. Qtr = minutes this quarter, Game = total across all four quarters. The <b>sub plan below builds itself from the grid</b> — that's the sheet the bench runs off.</div>
</main>

<script>
const POSITIONS = ["LS","CS","RS","LM","CM","RM","LH","CB","RH","FM","GK"];
const GENERIC = ["STR","MID","DEF"]; // simple line labels — use when an exact position adds noise
// position choices offered per line (generic first = the easy default)
const LINE_POS = {
  "Strikers": ["STR","LS","CS","RS"],
  "Midfield": ["MID","LM","CM","RM"],
  "Back 4":   ["DEF","LH","CB","RH","FM"],
  "GK":       ["GK"],
};
// what shows in a player's cells: their priority positions (pp) if set, else their default pos
function ppArr(p){ return (p.pp && p.pp.length) ? p.pp : (p.pos ? [p.pos] : []); }
function ppStr(p){ const a=ppArr(p); return a.length ? a.join("/") : BLANK; }
const GROUP_SHORT = {"Strikers":"STR","Midfield":"MID","Back 4":"DEF","GK":"GK"};
// the actual on-field slots each line fills — used to auto-assign one player per position
const LINE_FIELD = {
  "Strikers": ["LS","CS","RS"],
  "Midfield": ["LM","CM","RM","FM"],
  "Back 4":   ["LH","CB","RH","FM"],
  "GK":       ["GK"],
};
const ROLES = [
  {key:"1R", name:"First Runner", color:"#27ae60"},
  {key:"T",  name:"Trapper",      color:"#e74c3c"},
  {key:"DR", name:"Dragger",      color:"#8e44ad"},
  {key:"DF", name:"Drag Flicker", color:"#1769aa"},
  {key:"P",  name:"Postman",      color:"#e67e22"},
];
const ROLE_COLOR = Object.fromEntries(ROLES.map(r=>[r.key,r.color]));
const BLANK = "•"; // stored value for "on, no label" — displays as empty
function disp(v){ return (!v || v===BLANK) ? "" : v; }
function lbl(v){ const d=disp(v); return d ? " ("+d+")" : ""; }
const GROUPS = ["Strikers","Midfield","Back 4","GK"];
const REQUIRED_DEFAULT = {"Strikers":3,"Midfield":3,"Back 4":4,"GK":1};
const MINUTES = 15, QUARTERS = 4, QSEC = MINUTES*60;
// On-field structures (from hockey-rotation.html presets) — sets how many of each line must be on
const STRUCTURES = [
  {name:"6 @ BACK – 5 MF – 5 STR",            req:{"Strikers":3,"Midfield":3,"Back 4":4,"GK":1}},
  {name:"5 DEF – 5 MF – 6 STR",               req:{"Strikers":3,"Midfield":3,"Back 4":4,"GK":1}},
  {name:"6 DEF – 4 MF – 6 STR",               req:{"Strikers":3,"Midfield":3,"Back 4":4,"GK":1}},
  {name:"3 @ BACK (5) – 6 MF – 5 STR",        req:{"Strikers":3,"Midfield":4,"Back 4":3,"GK":1}},
  {name:"3 @ BACK – 2+2 MF – 6 STR",          req:{"Strikers":3,"Midfield":4,"Back 4":3,"GK":1}},
  {name:"3 DEF – 2 DEEP MF – 2 HIGH MF – 3 STR", req:{"Strikers":3,"Midfield":4,"Back 4":3,"GK":1}},
  {name:"NO GK – EXTRA STRIKER (chasing)",    req:{"Strikers":4,"Midfield":3,"Back 4":4,"GK":0}},
  {name:"CARD – ONE DOWN (9 field)",          req:{"Strikers":3,"Midfield":3,"Back 4":3,"GK":1}},
];
const STORE_KEY = "bs_subsheet_v1";

function uid(){ return Math.random().toString(36).slice(2,9); }

function defaultSquad(){
  const mk=(name,group,pos)=>({id:uid(),name,group,pos,roles:[]});
  return [
    mk("Lane","Strikers","RS"), mk("Boyde","Strikers","LS"),
    mk("Baker","Strikers","LS"), mk("Hiha","Strikers","LS"),
    mk("Inglis","Midfield","CS"), mk("Child","Midfield","RM"),
    mk("Phillips","Midfield","RM"), mk("Findlay","Midfield","LM"),
    mk("Sarikaya","Midfield","CM"), mk("Woods","Midfield","CM"),
    mk("Yorston","Back 4","FM"), mk("Tarrant","Back 4","FM"),
    mk("Lett","Back 4","CB"), mk("Morrison","Back 4","LH"),
    mk("Buschl","Back 4","RH"), mk("Russell","Back 4","RH"),
    mk("Hayward","GK","GK"), mk("Ruetsch","GK","GK"), mk("Dixon","GK","GK"),
  ];
}

function blankGrid(players){
  const g={};
  players.forEach(p=>{ g[p.id]=Array.from({length:QUARTERS},()=>Array(MINUTES).fill("")); });
  return g;
}

const app = {
  store:{games:{},last:null},
  state:null,         // {name, players:[], grid:{pid:[[..15],[..],[..],[..]]}}
  activeQ:0,          // 0-3 or "G" for game overview
  painting:false, paintValue:null,
  undoStack:[], liveMin:null,
  timer:{remaining:QSEC, running:false, lastTick:0, q:0},

  pushUndo(){
    this.undoStack.push(JSON.stringify(this.state));
    if(this.undoStack.length>60) this.undoStack.shift();
  },
  undo(){
    const snap=this.undoStack.pop();
    if(!snap) return;
    delete this.store.games[this.state.name];
    this.state=JSON.parse(snap);
    this.store.games[this.state.name]=this.state;
    this.store.last=this.state.name;
    this.save(); this.renderAll(true);
  },

  init(){
    const raw=localStorage.getItem(STORE_KEY);
    if(raw){ try{ this.store=JSON.parse(raw); }catch(e){} }
    if(!this.store.customStructures) this.store.customStructures=[];
    const names=Object.keys(this.store.games);
    if(names.length===0){ this.createGame("Game 1"); }
    else { this.loadGame(this.store.last && this.store.games[this.store.last] ? this.store.last : names[0]); }
    const brush=document.getElementById("brush");
    POSITIONS.forEach(p=>{ const o=document.createElement("option"); o.value=p; o.textContent=p; brush.appendChild(o); });
    document.getElementById("gameName").addEventListener("change",e=>this.renameGame(e.target.value.trim()));
    document.getElementById("gameSelect").addEventListener("change",e=>this.loadGame(e.target.value));
    window.addEventListener("mouseup",()=>{ if(this.painting){ this.painting=false; this.renderGrids(); this.renderTabs(); this.save(); } });
    window.addEventListener("keydown",e=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="z" && !e.shiftKey){
        const t=e.target.tagName; if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA") return;
        e.preventDefault(); this.undo();
      }
    });
    this.loadTimer();
    setInterval(()=>this.tick(),300);
    this.renderAll();
  },

  createGame(name){
    const players=defaultSquad();
    this.state={name,players,grid:blankGrid(players),required:{...REQUIRED_DEFAULT}};
    this.store.games[name]=this.state;
    this.store.last=name;
    this.save();
  },
  ensureRequired(){
    if(!this.state.required) this.state.required={...REQUIRED_DEFAULT};
    if(!this.state.requiredQ){
      const base=this.state.required;
      this.state.requiredQ=[0,1,2,3].map(()=>({...base}));
    }
    if(!this.state.structureQ) this.state.structureQ=[0,1,2,3].map(()=>STRUCTURES[0].name);
    if(!this.state.units) this.state.units=[];
    if(!this.state.anchors) this.state.anchors=[];
    if(!this.state.formations) this.state.formations=[];
    if(this.state.notes===undefined) this.state.notes="";
    if(this.state.posPrefs===undefined) this.state.posPrefs="";
    if(!this.state.bands){ this.state.bands={}; if(this.state.posPrefs) this.state.bands["Midfield"]=this.state.posPrefs; }
    if(this.state.autoPos===undefined) this.state.autoPos=true;
    if(!this.state.locks) this.state.locks={};
    if(!this.state.pairs) this.state.pairs=[];
    if(!this.state.outPlayers) this.state.outPlayers=[];
    if(!this.state.injuryPlan) this.state.injuryPlan={};
    // per-line cadence: strikers/mids share one, backs their own. Migrate old {first,every}.
    const ip=this.state.injuryPlan;
    if(ip.smEvery===undefined) ip.smEvery = ip.every || 3;   // strikers & mids pods, minutes
    if(ip.backEvery===undefined) ip.backEvery = 2;            // backs, minutes (grid is minute-based; 2 ≈ 90s)
    this.state.players.forEach(p=>{
      if(!p.roles) p.roles=[];
      if(p.target===undefined) p.target=null;
      if(p.rank===undefined) p.rank=null;
      if(!p.pp) p.pp = p.pos ? [p.pos] : [];   // priority positions default to their set position
      if(!p.groupQ) p.groupQ=[null,null,null,null];
    });
  },
  // ---------- protected pairs: two players who must never be OFF at the same minute ----------
  addPair(){ this.pushUndo(); this.state.pairs.push({id:uid(),a:"",b:"",label:""}); this.save(); this.renderPairs(true); },
  delPair(id){ this.pushUndo(); this.state.pairs=this.state.pairs.filter(x=>x.id!==id); this.save(); this.renderPairs(true); this.renderGrids(); this.renderTabs(); },
  updatePair(id,field,val){ this.pushUndo(); const p=this.state.pairs.find(x=>x.id===id); if(p){ p[field]=val; } this.save(); this.renderPairs(true); this.renderGrids(); this.renderTabs(); },
  pairName(pr){
    const a=this.state.players.find(p=>p.id===pr.a), b=this.state.players.find(p=>p.id===pr.b);
    const nm=(a?a.name:"?")+" & "+(b?b.name:"?");
    return pr.label ? `${nm} (${pr.label})` : nm;
  },
  // minutes in a quarter where BOTH of the pair are off (the danger)
  pairBreaks(q,pr){
    if(!pr.a||!pr.b||pr.a===pr.b) return [];
    const out=[];
    for(let m=0;m<MINUTES;m++){
      const aOn=this.state.grid[pr.a] && this.state.grid[pr.a][q][m];
      const bOn=this.state.grid[pr.b] && this.state.grid[pr.b][q][m];
      if(!aOn && !bOn) out.push(MINUTES-m);
    }
    return out;
  },
  togglePairs(){ const b=document.getElementById("pairsBody"); b.style.display = b.style.display==="none" ? "block":"none"; },
  renderPairs(keepOpen){
    const body=document.getElementById("pairsBody"); if(!body) return;
    const wasOpen=body.style.display!=="none";
    this.ensureRequired();
    const opts=p2=>this.state.players.map(p=>`<option value="${p.id}" ${p2===p.id?"selected":""}>${p.name}</option>`).join("");
    let html=`<div class="hint" style="margin:0 0 8px;">Two players who must <b>never be off at the same time</b> — e.g. your two drag-flickers, or two key playmakers. The app warns you the moment a plan (or a live swap) leaves both on the bench together.</div>`;
    this.state.pairs.forEach(pr=>{
      html+=`<div class="pair-row">
        <select onchange="app.updatePair('${pr.id}','a',this.value)"><option value="">— player —</option>${opts(pr.a)}</select>
        <span class="pair-amp">&amp;</span>
        <select onchange="app.updatePair('${pr.id}','b',this.value)"><option value="">— player —</option>${opts(pr.b)}</select>
        <input type="text" value="${(pr.label||'').replace(/"/g,'&quot;')}" placeholder="reason e.g. drag flick" onchange="app.updatePair('${pr.id}','label',this.value)">
        <button class="danger" onclick="app.delPair('${pr.id}')">&times;</button>
      </div>`;
    });
    html+=`<button class="primary" style="margin-top:6px;" onclick="app.addPair()">+ Add protected pair</button>`;
    body.innerHTML=html;
    if(keepOpen&&wasOpen) body.style.display="block";
  },
  // relabel every ON cell to the player's priority position — clears stale labels in one tap
  relabelToPriority(){
    if(!confirm("Relabel every player's ON minutes to their Priority Positions? (Doesn't change who's on — just the position shown.)")) return;
    this.pushUndo();
    this.state.players.forEach(p=>{
      if(p.group==="GK") return;
      for(let q=0;q<QUARTERS;q++) for(let m=0;m<MINUTES;m++){
        if(this.state.grid[p.id][q][m]) this.state.grid[p.id][q][m]=ppStr(p);
      }
    });
    this.save(); this.renderGrids();
  },
  // ---------- priority positions ----------
  togglePP(id,token){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===id);
    if(!p.pp) p.pp=[];
    const i=p.pp.indexOf(token);
    if(i>=0) p.pp.splice(i,1); else p.pp.push(token);
    this.save(); this.renderPri(true); this.renderGrids();
  },
  clearPP(id){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===id);
    p.pp=[];
    this.save(); this.renderPri(true); this.renderGrids();
  },
  togglePri(){
    const b=document.getElementById("priBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  // ---------- setup tab strip (Squad / Positions / Rotation / Formations / Anchors / Pairs / Notes) ----------
  _setupMap:{squad:"squadBody",pri:"priBody",units:"unitsBody",formations:"formationsBody",anchors:"anchorsBody",pairs:"pairsBody",notes:"notesBody"},
  openSetupTab(name){
    const map=this._setupMap;
    const same=(this._setupTab===name);
    Object.values(map).forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display="none"; });
    const sc=document.getElementById("setupContent");
    if(same){
      this._setupTab=null;
      if(sc) sc.classList.remove("open");
      this.syncSetupTabs();
      return;
    }
    this._setupTab=name;
    if(sc) sc.classList.add("open");
    const el=document.getElementById(map[name]); if(el) el.style.display="block";
    if(name==="squad") this.renderSquad(true);
    else if(name==="pri") this.renderPri(true);
    else if(name==="units") this.renderUnits(true);
    else if(name==="formations") this.renderFormations(true);
    else if(name==="anchors") this.renderAnchors(true);
    else if(name==="pairs") this.renderPairs(true);
    else if(name==="notes"){ const na=document.getElementById("notesArea"); if(na) na.value=this.state.notes||""; }
    this.syncSetupTabs();
  },
  // keep the tab strip's active state + warning dots in sync with reality
  syncSetupTabs(){
    const map=this._setupMap;
    let active=null;
    Object.keys(map).forEach(k=>{ const el=document.getElementById(map[k]); if(el && el.style.display!=="none") active=k; });
    this._setupTab=active;
    // pairs tab flags red if any protected pair is currently broken anywhere
    let pairsBroken=false;
    (this.state&&this.state.pairs||[]).forEach(pr=>{ for(let q=0;q<QUARTERS;q++){ if(this.pairBreaks(q,pr).length){ pairsBroken=true; break; } } });
    // done-state for the four core setup steps — turns the step number green when complete
    const done=this.setupDone();
    document.querySelectorAll(".stab").forEach(b=>{
      const t=b.dataset.t;
      b.classList.toggle("active", t===active);
      b.classList.toggle("warn", t==="pairs" && pairsBroken);
      b.classList.toggle("done", t!==active && !!done[t]);
    });
    const sc=document.getElementById("setupContent"); if(sc) sc.classList.toggle("open", !!active);
  },
  // which core setup steps are complete — drives the green step numbers
  setupDone(){
    const s=this.state||{};
    const players=s.players||[];
    const squad = players.length>=11;
    const pri = players.some(p=> p.pp && (p.pp.length>1 || p.pp.some(x=>GENERIC.includes(x))) );
    const anchors = (s.anchors||[]).some(a=>a.playerId);
    const units = (s.units||[]).some(u=> (u.playerIds||[]).length>=2 );
    return {squad,pri,anchors,units};
  },
  renderPri(keepOpen){
    const body=document.getElementById("priBody");
    if(!body) return;
    const wasOpen=body.style.display!=="none";
    this.ensureRequired();
    let html=`<div class="hint" style="margin:0 0 8px;">Tap the positions each player can hold. First tap = their main spot. The grid shows exactly this — so set <b>Lane = CS</b>, <b>Boyde = LS + CS</b>, and you'll never see a wall of "LS" again. Generic <b>STR / MID / DEF</b> keeps it dead simple when the exact spot doesn't matter.</div>
    <button class="primary" style="margin-bottom:10px;" onclick="app.relabelToPriority()">&#10227; Apply these to the whole grid now</button>
    <div class="hint" style="margin:-4px 0 10px;">Use this after you change positions — it relabels every quarter to match, instantly (it never changes who's on).</div>`;
    ["Strikers","Midfield","Back 4","GK"].forEach(g=>{
      const mem=this.state.players.filter(p=>p.group===g);
      if(!mem.length) return;
      const cls="group-"+(g==="Back 4"?"Back":g);
      html+=`<div class="pri-group"><div class="pri-ghead ${cls}">${g.toUpperCase()}</div>`;
      mem.forEach(p=>{
        const choices=LINE_POS[g]||POSITIONS;
        const btns=choices.map(t=>{
          const on=(p.pp||[]).includes(t);
          const ord=on?((p.pp.indexOf(t)+1)):"";
          const gen=GENERIC.includes(t)?" gen":"";
          return `<button class="ppbtn${gen}${on?" on":""}" onclick="app.togglePP('${p.id}','${t}')">${t}${on&&p.pp.length>1?`<sup>${ord}</sup>`:""}</button>`;
        }).join("");
        const cur = (p.pp&&p.pp.length)? p.pp.join(" / ") : "—";
        html+=`<div class="pri-row ${cls}">
          <span class="pri-name">${p.name}</span>
          <span class="pri-now">${cur}</span>
          <span class="pri-btns">${btns}</span>
          <button class="pri-clear" onclick="app.clearPP('${p.id}')" title="Clear">&times;</button>
        </div>`;
      });
      html+=`</div>`;
    });
    body.innerHTML=html;
    if(keepOpen&&wasOpen) body.style.display="block";
  },
  reqFor(q,g){ this.ensureRequired(); return this.state.requiredQ[q][g]??0; },
  // built-in structures + your own saved ones
  allStructures(){ return STRUCTURES.concat(this.store.customStructures||[]); },
  toggleStructEditor(){ this._structEditOpen=!this._structEditOpen; this.renderStructBar(); },
  addCustomStructure(){
    if(!this.store.customStructures) this.store.customStructures=[];
    this.store.customStructures.push({name:"My structure "+(this.store.customStructures.length+1), req:{Strikers:3,Midfield:3,"Back 4":4,GK:1}});
    this.save(); this.renderStructBar();
  },
  updateCustom(i,field,val){
    const s=(this.store.customStructures||[])[i]; if(!s) return;
    if(field==="name"){ s.name=(val||"").trim()||("Structure "+(i+1)); }
    else { let v=parseInt(val,10); if(isNaN(v)||v<0)v=0; if(v>11)v=11; s.req[field]=v; }
    this.save(); this.renderStructBar(); this.renderTabs();
  },
  delCustom(i){
    if(!confirm("Delete this structure?")) return;
    this.store.customStructures.splice(i,1);
    this.save(); this.renderStructBar();
  },
  // which line a player sits in FOR THIS QUARTER (lets a swing player — e.g. FM — move DEF<->MF by structure)
  effGroup(p,q){ return (p.groupQ && p.groupQ[q]) ? p.groupQ[q] : p.group; },

  // ---------- auto position assignment: one player per slot, every minute ----------
  setAutoPos(v){ this.state.autoPos=!!v; this._pm=null; this.save(); this.renderGrids(); },
  getPosMap(q){
    if(this.state.autoPos===false) return null;
    if(!this._pm) this._pm={};
    if(this._pm[q]) return this._pm[q];
    const map={}; this.state.players.forEach(p=>{ map[p.id]=Array(MINUTES).fill(""); });
    const lines=["Strikers","Midfield","Back 4","GK"];
    for(let m=0;m<MINUTES;m++){
      lines.forEach(g=>{
        const pool=LINE_FIELD[g]||[];
        // keep squad order so the same player keeps the same slot when possible
        const on=this.state.players.filter(p=>this.effGroup(p,q)===g && this.state.grid[p.id][q][m]);
        if(g==="GK"){ on.forEach(p=>map[p.id][m]="GK"); return; }
        const taken={}, need=[];
        // pass 0: honour manual locks exactly (even positions outside the standard set)
        on.forEach(p=>{ const lk=this.getLock(p.id,q,m); if(lk){ map[p.id][m]=lk; taken[lk]=1; } });
        on.forEach(p=>{
          if(map[p.id][m]) return; // already locked
          const prefs=ppArr(p).filter(x=>pool.includes(x)); // their preferred, in order
          let got=null;
          for(const pr of prefs){ if(!taken[pr]){ got=pr; break; } }
          if(got){ taken[got]=1; map[p.id][m]=got; } else need.push(p);
        });
        need.forEach(p=>{
          const slot=pool.find(s=>!taken[s]);   // first open slot in the line
          if(slot){ taken[slot]=1; map[p.id][m]=slot; }
          else map[p.id][m]=GROUP_SHORT[g]||"";  // overflow (more on than slots) — show line tag
        });
      });
    }
    this._pm[q]=map; return map;
  },
  posLabel(q,pid,m){
    const pm=this.getPosMap(q);
    return pm ? (pm[pid][m]||"") : disp(this.state.grid[pid][q][m]);
  },
  // manual position locks — a cell the coach has fixed by hand; auto-assign works around it
  getLock(pid,q,m){
    const L=this.state.locks;
    return (L && L[pid] && L[pid][q]) ? (L[pid][q][m]||"") : "";
  },
  setLock(pid,q,m,val){
    if(!this.state.locks) this.state.locks={};
    if(!this.state.locks[pid]) this.state.locks[pid]=[null,null,null,null];
    if(!this.state.locks[pid][q]) this.state.locks[pid][q]=Array(MINUTES).fill("");
    this.state.locks[pid][q][m]=val||"";
  },
  clearLock(pid,q,m){ if(this.state.locks && this.state.locks[pid] && this.state.locks[pid][q]) this.state.locks[pid][q][m]=""; },
  setPosPrefs(t){ this.state.posPrefs=(t||"").trim(); this.save(); },
  getBand(key){ return (this.state.bands && this.state.bands[key]) || ""; },
  setBand(key,t){ if(!this.state.bands) this.state.bands={}; this.state.bands[key]=(t||"").replace(/\s+$/,""); this.save(); },
  // visual sections for a quarter — splits a 6+ midfield into Attacking / Defensive blocks
  quarterSections(q){
    const out=[];
    ["Strikers","Midfield","Back 4","GK"].forEach(g=>{
      const mem=this.state.players.filter(p=>this.effGroup(p,q)===g);
      if(!mem.length) return;
      if(g==="Midfield" && mem.length>=6){
        out.push({group:g,label:"ATTACKING MIDFIELD",sub:"AM",members:mem.slice(0,3)});
        out.push({group:g,label:"DEFENSIVE MIDFIELD",sub:"DM",members:mem.slice(3)});
      } else {
        out.push({group:g,label:g.toUpperCase(),sub:"",members:mem});
      }
    });
    return out;
  },
  setLineQ(pid,q,group){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===pid);
    if(!p.groupQ) p.groupQ=[null,null,null,null];
    p.groupQ[q] = (group===p.group) ? null : group;
    this.closeCellMenu();
    this.save(); this.renderGrids();
  },
  openLineMenu(e,pid,q){
    e.preventDefault(); e.stopPropagation();
    this.closeCellMenu();
    const p=this.state.players.find(x=>x.id===pid);
    const menu=document.createElement("div");
    menu.id="cellMenu";
    let html=`<div class="cm-title">${p.name} — line for Q${q+1}</div><div class="cm-row">`;
    ["Strikers","Midfield","Back 4","GK"].forEach(g=>{
      const on=this.effGroup(p,q)===g;
      html+=`<button class="cm-gen ${on?"":"cm-ghost"}" data-g="${g}">${GROUP_SHORT[g]}</button>`;
    });
    html+=`</div><button class="cm-wide" data-g="__def">Reset to default (${GROUP_SHORT[p.group]})</button>`;
    menu.innerHTML=html;
    document.body.appendChild(menu);
    const x=Math.min(e.pageX, document.documentElement.scrollWidth-200);
    menu.style.left=x+"px"; menu.style.top=e.pageY+"px";
    menu.addEventListener("mousedown",ev=>ev.stopPropagation());
    menu.addEventListener("click",ev=>{
      const b=ev.target.closest("button"); if(!b) return;
      this.setLineQ(pid,q, b.dataset.g==="__def" ? p.group : b.dataset.g);
    });
    setTimeout(()=>{ document.addEventListener("mousedown",()=>this.closeCellMenu(),{once:true}); },0);
  },
  applyStructure(idx,all){
    const s=this.allStructures()[idx];
    if(!s) return;
    this.pushUndo();
    const qs = all ? [0,1,2,3] : [this.activeQ];
    qs.forEach(q=>{ this.state.requiredQ[q]={...s.req}; this.state.structureQ[q]=s.name; });
    this.save(); this.renderStructBar(); this.renderGrids(); this.renderTabs();
  },

  // ---------- formations: saved shape + line map you can drop on any quarter ----------
  addFormationFromQuarter(){
    if(this.activeQ==="G" || this.activeQ==="C"){ alert("Open a quarter (Q1–Q4) first, set it up the way you want, then save it as a formation."); return; }
    this.ensureRequired();
    if(!this.state.formations) this.state.formations=[];
    const q=this.activeQ;
    this.pushUndo();
    const lines={};
    this.state.players.forEach(p=>{ lines[p.id]=this.effGroup(p,q); });
    const req={...this.state.requiredQ[q]};
    const sn=this.state.structureQ[q];
    const name=(sn && sn!=="Custom") ? sn : ("Formation "+(this.state.formations.length+1));
    this.state.formations.push({id:uid(), name, req, lines});
    this.save(); this.renderFormations(true);
  },
  applyFormation(fid,q){
    const f=(this.state.formations||[]).find(x=>x.id===fid); if(!f) return;
    this.pushUndo();
    this.ensureRequired();
    this.state.requiredQ[q]={...f.req};
    this.state.structureQ[q]=f.name;
    this.state.players.forEach(p=>{
      if(!p.groupQ) p.groupQ=[null,null,null,null];
      const g=f.lines[p.id];
      if(g) p.groupQ[q] = (g===p.group) ? null : g;   // only move players the formation knows about
    });
    this._pm=null;
    this.save(); this.renderStructBar(); this.renderGrids(); this.renderTabs();
  },
  renameFormation(fid,val){
    const f=(this.state.formations||[]).find(x=>x.id===fid); if(!f) return;
    f.name=(val||"").trim()||f.name;
    this.save(); this.renderFormations(true);
  },
  delFormation(fid){
    if(!confirm("Delete this formation?")) return;
    this.pushUndo();
    this.state.formations=(this.state.formations||[]).filter(x=>x.id!==fid);
    this.save(); this.renderFormations(true);
  },
  toggleFormations(){
    const b=document.getElementById("formationsBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  // apply a ready shape (built-in structure) to one quarter — sets the line counts
  applyShapeToQ(name,q){
    const s=STRUCTURES.find(x=>x.name===name); if(!s) return;
    this.pushUndo(); this.ensureRequired();
    this.state.requiredQ[q]={...s.req}; this.state.structureQ[q]=s.name;
    this.save(); this.renderStructBar(); this.renderGrids(); this.renderTabs(); this.renderFormations(true);
  },
  shapeSummary(req){ const c=req||{}; return `${c.Strikers||0} STR · ${c.Midfield||0} MF · ${c["Back 4"]||0} DEF · ${c.GK||0} GK`; },
  renderFormations(keepOpen){
    const body=document.getElementById("formationsBody");
    if(!body) return;
    const wasOpen=body.style.display!=="none";
    if(!this.state.formations) this.state.formations=[];
    const qBtns=onclick=>[0,1,2,3].map(qq=>`<button class="fbtn" onclick="${onclick.replace('@Q',qq)}">Q${qq+1}</button>`).join("");

    // READY SHAPES — the built-in structures, one tap to drop on a quarter
    let ready="";
    STRUCTURES.forEach(s=>{
      ready+=`<div class="fcard">
        <div class="fc-name">${s.name}</div>
        <div class="fc-shape">${this.shapeSummary(s.req)}</div>
        <div class="fc-apply"><span class="lbl">DROP ON</span>${qBtns(`app.applyShapeToQ('${s.name.replace(/'/g,"\\'")}',@Q)`)}</div>
      </div>`;
    });

    // YOUR FORMATIONS — saved full setups (shape + who sits where)
    let mine="";
    if(!this.state.formations.length){
      mine=`<div class="fd-intro" style="margin:0;">None yet. Set a quarter up exactly how you want it — shape, plus move bodies with the line button on each name — then hit <b>Save current quarter</b>. Your saved formation also remembers which line each player sits in, so dropping it rearranges the squad for you.</div>`;
    } else {
      this.state.formations.forEach(f=>{
        mine+=`<div class="fcard">
          <div class="fc-name"><input value="${(f.name||"").replace(/"/g,"&quot;")}" onchange="app.renameFormation('${f.id}',this.value)"><button class="fbtn x" title="Delete" onclick="app.delFormation('${f.id}')">&times;</button></div>
          <div class="fc-shape">${this.shapeSummary(f.req)}</div>
          <div class="fc-apply"><span class="lbl">DROP ON</span>${qBtns(`app.applyFormation('${f.id}',@Q)`)}</div>
        </div>`;
      });
    }

    body.innerHTML=`<div class="fdash">
      <div class="fd-intro">Tap a quarter button on any card to <b>drop that shape onto that quarter</b>. Ready shapes set the line counts. Your own saved formations also move every player to the right line.</div>
      <div class="fd-section">Ready shapes</div>
      <div class="fcards">${ready}</div>
      <div class="fd-section">Your formations</div>
      <div class="fcards">${mine}</div>
      <div class="fd-add"><button class="fbtn gold" onclick="app.addFormationFromQuarter()">+ Save current quarter as a formation</button></div>
    </div>`;
    if(keepOpen&&wasOpen) body.style.display="block";
  },
  toggleGuide(){
    const g=document.getElementById("guidePanel");
    g.style.display = g.style.display==="none" ? "block" : "none";
  },
  closeHmenu(){ const m=document.getElementById("hmenu"); if(m) m.removeAttribute("open"); },
  setTarget(id,val){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===id);
    const v=parseInt(val,10);
    p.target=isNaN(v)?null:Math.max(0,Math.min(60,v));
    this.save(); this.renderGrids(); this.renderTabs();
  },
  toggleRole(id,role){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===id);
    if(!p.roles) p.roles=[];
    const i=p.roles.indexOf(role);
    if(i>=0) p.roles.splice(i,1); else p.roles.push(role);
    p.roles.sort((a,b)=>ROLES.findIndex(r=>r.key===a)-ROLES.findIndex(r=>r.key===b));
    this.save(); this.renderAll(true);
  },
  setRequired(group,val){
    this.pushUndo();
    this.ensureRequired();
    let v=parseInt(val,10); if(isNaN(v)||v<0) v=0; if(v>11) v=11;
    if(this.activeQ==="G") return;
    this.state.requiredQ[this.activeQ][group]=v;
    this.state.structureQ[this.activeQ]="Custom";
    this.save(); this.renderGrids(); this.renderStructBar();
  },
  newGame(){
    let n=prompt("Name for the new game (e.g. AUS M2):","Game "+(Object.keys(this.store.games).length+1));
    if(!n) return; n=n.trim();
    if(this.store.games[n]){ alert("A game with that name already exists."); return; }
    // carry the current squad over, blank grid
    const players=JSON.parse(JSON.stringify(this.state.players));
    this.state={name:n,players,grid:blankGrid(players)};
    this.store.games[n]=this.state; this.store.last=n;
    this.activeQ=0; this.save(); this.renderAll();
  },
  duplicateGame(){
    let n=prompt("Name for the copy:",this.state.name+" copy");
    if(!n) return; n=n.trim();
    if(this.store.games[n]){ alert("A game with that name already exists."); return; }
    const copy=JSON.parse(JSON.stringify(this.state)); copy.name=n;
    this.store.games[n]=copy; this.store.last=n; this.state=copy;
    this.save(); this.renderAll();
  },
  deleteGame(){
    if(Object.keys(this.store.games).length===1){ alert("This is the only game — make a new one first."); return; }
    if(!confirm('Delete "'+this.state.name+'"? This cannot be undone.')) return;
    delete this.store.games[this.state.name];
    const next=Object.keys(this.store.games)[0];
    this.loadGame(next);
  },
  renameGame(n){
    if(!n || n===this.state.name) { this.renderToolbar(); return; }
    if(this.store.games[n]){ alert("A game with that name already exists."); this.renderToolbar(); return; }
    delete this.store.games[this.state.name];
    this.state.name=n; this.store.games[n]=this.state; this.store.last=n;
    this.save(); this.renderToolbar();
  },
  loadGame(name){
    this.state=this.store.games[name]; this.store.last=name; this.activeQ=0;
    this.ensureRequired();
    this.save(); this.renderAll();
  },
  save(){
    this._pm=null; // position assignment may have changed
    this.store.games[this.state.name]=this.state;
    localStorage.setItem(STORE_KEY,JSON.stringify(this.store));
  },

  exportJSON(){
    const blob=new Blob([JSON.stringify(this.state,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=this.state.name.replace(/[^\w\- ]/g,"")+" sub sheet.json";
    a.click();
  },
  importJSON(input){
    const f=input.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{
      const data=JSON.parse(r.result);
      if(!data.players||!data.grid) throw new Error("bad file");
      let n=data.name||"Imported game";
      while(this.store.games[n]) n=n+" (2)";
      data.name=n; this.store.games[n]=data;
      this.loadGame(n);
    }catch(e){ alert("Couldn't read that file."); } };
    r.readAsText(f);
    input.value="";
  },

  // ---------- notes ----------
  toggleNotes(){
    const b=document.getElementById("notesBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  setNotes(v){ this.pushUndo(); this.state.notes=v; this.save(); this.renderGrids(); },

  // ---------- backup ALL games (one file, for moving Mac <-> iPad) ----------
  backupAll(){
    const blob=new Blob([JSON.stringify(this.store,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    const d=new Date().toISOString().slice(0,10);
    a.href=URL.createObjectURL(blob);
    a.download="Black Sticks sub sheets — ALL ("+d+").json";
    a.click();
  },
  restoreAll(input){
    const f=input.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{
      const data=JSON.parse(r.result);
      if(!data.games) throw new Error("not a backup-all file");
      if(!confirm("Restore ALL games from this backup? It merges into what's here (same names overwrite).")) return;
      Object.assign(this.store.games, data.games);
      if(data.customStructures && data.customStructures.length) this.store.customStructures=data.customStructures;
      this.store.last = data.last && this.store.games[data.last] ? data.last : Object.keys(this.store.games)[0];
      localStorage.setItem(STORE_KEY,JSON.stringify(this.store));
      this.loadGame(this.store.last);
    }catch(e){ alert("Couldn't read that backup file."); } };
    r.readAsText(f); input.value="";
  },

  // ---------- squad ----------
  toggleSquad(){
    const b=document.getElementById("squadBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  addPlayer(){
    this.pushUndo();
    const p={id:uid(),name:"New player",group:"Strikers",pos:"LS",roles:[],target:null};
    this.state.players.push(p);
    this.state.grid[p.id]=Array.from({length:QUARTERS},()=>Array(MINUTES).fill(""));
    this.save(); this.renderAll(true);
  },
  removePlayer(id){
    const p=this.state.players.find(x=>x.id===id);
    if(!confirm("Remove "+p.name+" from this game?")) return;
    this.pushUndo();
    this.state.players=this.state.players.filter(x=>x.id!==id);
    delete this.state.grid[id];
    this.save(); this.renderAll(true);
  },
  movePlayer(id,dir){
    const i=this.state.players.findIndex(x=>x.id===id);
    const j=i+dir;
    if(j<0||j>=this.state.players.length) return;
    const a=this.state.players;
    [a[i],a[j]]=[a[j],a[i]];
    this.save(); this.renderAll(true);
  },
  // ---------- drag-to-reorder (mouse): squad rows and grid name cells ----------
  dragStart(e,id){ this._dragId=id; if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",id);}catch(_){} }
    const host=e.target.closest("[data-pid],tr"); if(host) host.classList.add("dragging"); },
  dragOver(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect="move"; },
  dropOn(e,targetId,rerender){
    e.preventDefault();
    const fromId=this._dragId; this._dragId=null;
    if(!fromId || fromId===targetId) { (rerender||(()=>this.renderAll(true)))(); return; }
    const a=this.state.players;
    const from=a.findIndex(p=>p.id===fromId), to=a.findIndex(p=>p.id===targetId);
    if(from<0||to<0){ return; }
    const [moved]=a.splice(from,1);
    const newTo=a.findIndex(p=>p.id===targetId);
    a.splice(newTo+(from<to?1:0),0,moved);
    this.save(); (rerender||(()=>this.renderAll(true)))();
  },
  dragEnd(){ this._dragId=null; document.querySelectorAll(".dragging,.drop-target,.drag-row").forEach(n=>n.classList.remove("dragging","drop-target","drag-row")); },
  updatePlayer(id,field,value){
    this.pushUndo();
    const p=this.state.players.find(x=>x.id===id);
    p[field]=value;
    if(field==="group" && value==="GK") p.pos="GK";
    // keep priority positions sensible: blank pos = no preset (set it on the grid); first real pos seeds pp if empty
    if(field==="pos"){
      if(value==="") p.pp=[];
      else if(!p.pp || !p.pp.length) p.pp=[value];
    }
    this.save(); this.renderAll(true);
  },

  // ---------- grid actions ----------
  setCell(pid,q,m,val){
    this.state.grid[pid][q][m]=val;
    this.clearLock(pid,q,m); // repaint/erase = back to auto; the position menu re-sets a lock after
  },
  brushValue(pid){
    const brush=document.getElementById("brush").value;
    const p=this.state.players.find(x=>x.id===pid);
    if(p.group==="GK") return "GK";
    if(brush==="blank") return BLANK;
    if(brush==="default") return ppStr(p);
    return brush;
  },
  cellDown(e,pid,q,m){
    if(e.button!==0) return;
    e.preventDefault();
    this.closeCellMenu();
    this.pushUndo();
    const cur=this.state.grid[pid][q][m];
    this.paintValue = cur ? "" : this.brushValue(pid);
    this.painting=true;
    const v = cur ? "" : this.paintValue;
    this.setCell(pid,q,m,v);
    this.paintDom(e.currentTarget,v,pid);
  },
  cellOver(e,pid,q,m){
    if(!this.painting) return;
    const v = (this.paintValue==="") ? "" : this.brushValue(pid);
    this.setCell(pid,q,m,v);
    this.paintDom(e.currentTarget,v,pid);
  },
  cellHtml(p,v){
    const pos=disp(v);
    const badges=(p.roles&&p.roles.length)
      ? `<span class="badges">${p.roles.map(rk=>`<span class="badge" style="background:${ROLE_COLOR[rk]}">${rk}</span>`).join("")}</span>`
      : "";
    return `${pos}${badges}`;
  },
  paintDom(td,v,pid){
    const p=this.state.players.find(x=>x.id===pid);
    td.innerHTML=v?this.cellHtml(p,v):"";
    td.classList.toggle("on",!!v);
    td.classList.toggle("off",!v);
  },

  // ---------- per-cell right-click menu ----------
  openCellMenu(e,pid,q,m){
    e.preventDefault();
    this.closeCellMenu();
    const p=this.state.players.find(x=>x.id===pid);
    const menu=document.createElement("div");
    menu.id="cellMenu";
    const curLock=this.getLock(pid,q,m);
    if(!this._cmScope) this._cmScope="q"; // default: whole quarter
    let html=`<div class="cm-title">${p.name} — min ${MINUTES-m}${curLock?` <span class="cm-locked">&#128274; locked ${curLock}</span>`:""}</div>`;
    html+=`<div class="cm-scope">
      <button class="cm-sc ${this._cmScope==="q"?"on":""}" data-sc="q">Whole quarter</button>
      <button class="cm-sc ${this._cmScope==="m"?"on":""}" data-sc="m">This minute</button></div>`;
    html+=`<div class="cm-row">${GENERIC.map(g=>`<button class="cm-gen" data-v="${g}">${g}</button>`).join("")}</div>`;
    html+=`<div class="cm-grid">`;
    POSITIONS.forEach(pos=>{ html+=`<button class="${curLock===pos?"cm-cur":""}" data-v="${pos}">${pos}</button>`; });
    html+=`</div><button class="cm-wide cm-auto" data-v="__auto">&#10227; Auto-pick (let the app choose)</button><button class="cm-wide cm-off" data-v="">OFF</button>`;
    html+=`<div class="cm-note">Pick a position and it sticks for the whole quarter (every minute this player is on). Switch to <b>This minute</b> for single-minute control.</div>`;
    menu.innerHTML=html;
    document.body.appendChild(menu);
    const x=Math.min(e.pageX, document.documentElement.scrollWidth-190);
    menu.style.left=x+"px"; menu.style.top=e.pageY+"px";
    menu.addEventListener("mousedown",ev=>ev.stopPropagation());
    menu.addEventListener("click",ev=>{
      const sc=ev.target.closest("button[data-sc]");
      if(sc){ this._cmScope=sc.dataset.sc; menu.querySelectorAll(".cm-sc").forEach(x=>x.classList.toggle("on",x.dataset.sc===this._cmScope)); return; }
      const b=ev.target.closest("button[data-v]"); if(!b) return;
      this.pushUndo();
      const val=b.dataset.v;
      const wholeQ=(this._cmScope!=="m");
      if(val==="__auto"){
        if(wholeQ){ for(let mm=0;mm<MINUTES;mm++){ if(this.state.grid[pid][q][mm]){ this.clearLock(pid,q,mm); this.state.grid[pid][q][mm]=BLANK; } } }
        else this.setCell(pid,q,m,BLANK); // on, no lock — auto decides this minute
      } else if(val===""){
        if(wholeQ){ for(let mm=0;mm<MINUTES;mm++) this.setCell(pid,q,mm,""); }
        else this.setCell(pid,q,m,"");
      } else {
        if(wholeQ){
          if(!this.state.grid[pid][q][m]) this.state.grid[pid][q][m]=val; // include the clicked minute even if it was off
          for(let mm=0;mm<MINUTES;mm++){ if(this.state.grid[pid][q][mm]){ this.state.grid[pid][q][mm]=val; this.setLock(pid,q,mm,val); } }
        } else { this.setCell(pid,q,m,val); this.setLock(pid,q,m,val); }
      }
      this.closeCellMenu();
      this.save(); this.renderGrids();
    });
    setTimeout(()=>{ document.addEventListener("mousedown",this._closer=()=>this.closeCellMenu(),{once:true}); },0);
  },
  closeCellMenu(){
    const old=document.getElementById("cellMenu");
    if(old) old.remove();
  },
  copyPrevQuarter(){
    if(this.activeQ===0||this.activeQ==="G") return;
    this.pushUndo();
    const q=this.activeQ;
    this.state.players.forEach(p=>{
      this.state.grid[p.id][q]=this.state.grid[p.id][q-1].slice();
    });
    this.save(); this.renderGrids();
  },
  clearQuarter(){
    if(this.activeQ==="G") return;
    if(!confirm("Clear all of Q"+(this.activeQ+1)+"?")) return;
    this.pushUndo();
    const q=this.activeQ;
    this.state.players.forEach(p=>{ this.state.grid[p.id][q]=Array(MINUTES).fill("");
      if(this.state.locks&&this.state.locks[p.id]&&this.state.locks[p.id][q]) this.state.locks[p.id][q]=Array(MINUTES).fill(""); });
    this.save(); this.renderGrids();
  },

  // ---------- render ----------
  renderAll(keepSquadOpen){
    this.renderToolbar();
    this.renderSquad(keepSquadOpen);
    this.renderPri(true);
    this.renderUnits(true);
    this.renderFormations(true);
    this.renderAnchors(true);
    this.renderPairs(true);
    const na=document.getElementById("notesArea"); if(na) na.value=this.state.notes||"";
    const ap=document.getElementById("autoPosChk"); if(ap) ap.checked=this.state.autoPos!==false;
    this.renderTabs();
    this.renderTimer();
    this.renderStructBar();
    this.renderGrids();
    this.syncSetupTabs();
  },
  renderToolbar(){
    document.getElementById("gameName").value=this.state.name;
    const sel=document.getElementById("gameSelect");
    sel.innerHTML="";
    Object.keys(this.store.games).forEach(n=>{
      const o=document.createElement("option"); o.value=n; o.textContent=n;
      if(n===this.state.name) o.selected=true;
      sel.appendChild(o);
    });
  },
  renderSquad(keepOpen){
    const body=document.getElementById("squadBody");
    const wasOpen=body.style.display!=="none";
    const row=(p,rank)=>{
      const cls="group-"+(p.group==="Back 4"?"Back":p.group);
      const rankBadge = p.group!=="GK" ? `<span class="sq-rankno" title="Rank in this line — top plays most">${rank}</span>` : `<span class="sq-rankno gk">G</span>`;
      return `<div class="squad-row ${cls}" data-pid="${p.id}" ondragover="app.dragOver(event)" ondragenter="this.classList.add('drop-target')" ondragleave="this.classList.remove('drop-target')" ondrop="this.classList.remove('drop-target');app.dropOn(event,'${p.id}')">
        ${rankBadge}
        <span class="sq-dot" draggable="true" title="Drag to reorder" ondragstart="app.dragStart(event,'${p.id}')" ondragend="app.dragEnd()" style="cursor:grab;"></span>
        <span class="sq-grip"><button class="grip" title="Move up" onclick="app.movePlayer('${p.id}',-1)">&#9650;</button><button class="grip" title="Move down" onclick="app.movePlayer('${p.id}',1)">&#9660;</button></span>
        <input type="text" class="sq-name" value="${p.name.replace(/"/g,"&quot;")}" onchange="app.updatePlayer('${p.id}','name',this.value)">
        <input type="number" class="sq-rank" min="1" max="40" value="${p.rank==null?'':p.rank}" title="Rank / squad number" placeholder="#" onchange="app.updatePlayer('${p.id}','rank',this.value===''?null:parseInt(this.value,10))">
        <select onchange="app.updatePlayer('${p.id}','group',this.value)" title="Line">
          ${GROUPS.map(g=>`<option ${g===p.group?"selected":""}>${g}</option>`).join("")}
        </select>
        <select onchange="app.updatePlayer('${p.id}','pos',this.value)" title="Default position — leave blank to set it on the grid instead">
          <option value="" ${!p.pos?"selected":""}>—</option>
          ${POSITIONS.map(x=>`<option value="${x}" ${x===p.pos?"selected":""}>${x}</option>`).join("")}
        </select>
        <span class="sq-roles">${ROLES.map(r=>`<label class="rolechk" style="border-color:${r.color};color:${r.color};" title="${r.name}">
          <input type="checkbox" ${p.roles&&p.roles.includes(r.key)?"checked":""} onchange="app.toggleRole('${p.id}','${r.key}')">${r.key}</label>`).join("")}</span>
        <button class="sq-del" onclick="app.removePlayer('${p.id}')" title="Remove">&times;</button>
      </div>`;
    };
    let html=`<div class="squad-intro">Add every player once, set their line and number. <b>The number on the left is the rank</b> — drag the coloured dot (or use the arrows) to order each line, top to bottom. Rank decides minutes after an injury: top players land in the bigger pod and play more, the bottom two drop to the 1-for-1 and play less. <b>Roles</b> (1R, T, DR, DF, P) show as badges in the grid.</div>`;
    GROUPS.forEach(g=>{
      const mem=this.state.players.filter(p=>p.group===g);
      if(!mem.length) return;
      const cls="group-"+(g==="Back 4"?"Back":g);
      const lbl={"Strikers":"Strikers","Midfield":"Midfield","Back 4":"Backs","GK":"Goalkeepers"}[g]||g;
      html+=`<div class="squad-linehdr ${cls}"><span class="slh-dot"></span><span>${lbl}</span><small>${mem.length} · top plays most</small></div>`;
      mem.forEach((p,i)=>{ html+=row(p,i+1); });
    });
    html+=`<button class="primary" style="margin-top:12px;" onclick="app.addPlayer()">+ Add player</button>
    <div class="hint" style="margin-top:8px;">Roles: ${ROLES.map(r=>`<b style="color:${r.color}">${r.key}</b> = ${r.name}`).join(" &nbsp;&middot;&nbsp; ")}.</div>`;
    body.innerHTML=html;
    if(keepOpen&&wasOpen) body.style.display="block";
  },
  renderTabs(){
    const t=document.getElementById("tabs");
    let html="";
    for(let q=0;q<QUARTERS;q++){
      html+=`<button class="${q===this.activeQ?"active":""}" onclick="app.activeQ=${q};app.renderTabs();app.renderStructBar();app.renderGrids();">Q${q+1}</button>`;
    }
    html+=`<button class="gametab ${this.activeQ==='G'?"active":""}" onclick="app.activeQ='G';app.renderTabs();app.renderStructBar();app.renderGrids();">GAME</button>`;
    html+=`<button class="cardstab ${this.activeQ==='C'?"active":""}" onclick="app.activeQ='C';app.renderTabs();app.renderStructBar();app.renderGrids();">&#128241; PHONE CARDS</button>`;
    // plan-ready check across all four quarters — one glance tells you if it's safe
    let totalIssues=0; for(let q=0;q<QUARTERS;q++) totalIssues+=this.computeIssues(q).length;
    html+= totalIssues===0
      ? `<span class="ready ok" title="Every line and role is covered for all 4 quarters">&#10004; PLAN READY</span>`
      : `<span class="ready bad" title="Open the GAME tab to see what's wrong">&#9888; ${totalIssues} TO FIX</span>`;
    html+=`<div class="qactions">
      <button onclick="app.undo()" ${this.undoStack.length?"":"disabled"} title="Undo last change (Ctrl/Cmd+Z)">&#8630; Undo</button>`;
    if(this.activeQ!=="G"){
      html+=`<button onclick="app.copyPrevQuarter()" ${this.activeQ===0?"disabled":""}>Copy Q${this.activeQ||1} &#8594; Q${this.activeQ+1}</button>
      <button onclick="app.clearQuarter()">Clear Q${this.activeQ+1}</button>`;
    }
    html+=`</div>`;
    t.innerHTML=html;
    this.syncSetupTabs();
  },

  qTotal(pid,q){ return this.state.grid[pid][q].filter(v=>v).length; },
  gameTotal(pid){ let s=0; for(let q=0;q<QUARTERS;q++) s+=this.qTotal(pid,q); return s; },
  gameTotalCell(p){
    const t=this.gameTotal(p.id);
    if(p.target==null) return `<td class="gtotal">${t}</td>`;
    const cls = t===p.target ? "t-ok" : (t<p.target ? "t-under" : "t-over");
    return `<td class="gtotal ${cls}" title="Game minutes vs target">${t}/${p.target}</td>`;
  },

  // ---------- rotation units: "take the same person off each time" ----------
  addUnit(){
    this.pushUndo();
    this.state.units.push({id:uid(), playerIds:[], first:3, every:3, qs:[true,true,true,false]});
    this.save(); this.renderUnits(true);
  },
  delUnit(uid_){
    this.pushUndo();
    this.state.units=this.state.units.filter(u=>u.id!==uid_);
    this.save(); this.renderUnits(true);
  },
  unitAddPlayer(uid_,pid){
    if(!pid) return;
    this.pushUndo();
    const u=this.state.units.find(x=>x.id===uid_);
    if(!u.playerIds.includes(pid)) u.playerIds.push(pid);
    this.save(); this.renderUnits(true);
  },
  unitRemovePlayer(uid_,pid){
    this.pushUndo();
    const u=this.state.units.find(x=>x.id===uid_);
    u.playerIds=u.playerIds.filter(x=>x!==pid);
    this.save(); this.renderUnits(true);
  },
  unitMove(uid_,pid,dir){
    const u=this.state.units.find(x=>x.id===uid_);
    const i=u.playerIds.indexOf(pid), j=i+dir;
    if(j<0||j>=u.playerIds.length) return;
    this.pushUndo();
    [u.playerIds[i],u.playerIds[j]]=[u.playerIds[j],u.playerIds[i]];
    this.save(); this.renderUnits(true);
  },
  setUnitField(uid_,field,val){
    this.pushUndo();
    const u=this.state.units.find(x=>x.id===uid_);
    let v=parseInt(val,10); if(isNaN(v)) v=3;
    u[field]=Math.max(1,Math.min(14,v));
    this.save(); this.renderUnits(true);
  },
  setUnitQ(uid_,q,checked){
    const u=this.state.units.find(x=>x.id===uid_);
    u.qs[q]=checked;
    this.save();
  },
  unitPlayers(u){ return u.playerIds.map(id=>this.state.players.find(p=>p.id===id)).filter(Boolean); },
  unitDesc(u){
    const L=this.unitPlayers(u);
    if(L.length<2) return "Add at least 2 players — starters first, interchange last.";
    const n=L.length, E=u.every;
    let cyc;
    if(n===2) cyc=`1 for 1 ${L[1].name.toUpperCase()} – ${L[0].name.toUpperCase()}`;
    else{
      const bits=[];
      for(let i=n-1;i>=1;i--) bits.push(`${L[i].name} for ${L[i-1].name}`);
      bits.push(`${L[0].name} for ${L[n-1].name}`);
      cyc=bits.join(" / ");
    }
    return `${cyc} &nbsp;&bull;&nbsp; first sub ${u.first}', then every ${E}' &nbsp;&bull;&nbsp; each player ${(n-1)*E}' on / ${E}' off`;
  },
  genUnitInto(u,q){
    const L=this.unitPlayers(u);
    if(L.length<2) return;
    const n=L.length, s=n-1;
    const byId={}; L.forEach(p=>{ byId[p.id]=p; this.state.grid[p.id][q]=Array(MINUTES).fill("");
      if(this.state.locks&&this.state.locks[p.id]&&this.state.locks[p.id][q]) this.state.locks[p.id][q]=Array(MINUTES).fill(""); });
    const stamp=p=> (p.group==="GK") ? "GK" : ppStr(p); // each player shows their OWN priority position
    const onIds={}; L.slice(0,s).forEach(p=>{ onIds[p.id]=true; });
    let benchId=L[n-1].id;
    const idx={}; L.forEach((p,i)=>idx[p.id]=i);
    const subTimes=new Set();
    for(let t=u.first;t<MINUTES;t+=u.every) subTimes.add(t);
    for(let t=0;t<MINUTES;t++){
      if(subTimes.has(t)){
        const target=L[(idx[benchId]-1+n)%n];
        if(onIds[target.id]){
          delete onIds[target.id];
          onIds[benchId]=true;
          benchId=target.id;
        }
      }
      Object.keys(onIds).forEach(pid=>{ this.state.grid[pid][q][t]=stamp(byId[pid]); });
    }
  },
  generateUnit(uid_){
    const u=this.state.units.find(x=>x.id===uid_);
    if(this.unitPlayers(u).length<2){ alert("This unit needs at least 2 players."); return; }
    this.pushUndo();
    u.qs.forEach((on,q)=>{ if(on) this.genUnitInto(u,q); });
    this.save(); this.renderGrids(); this.renderTabs();
  },
  generateAll(){
    const ready=this.state.units.filter(u=>this.unitPlayers(u).length>=2);
    if(!ready.length){ alert("No units with 2+ players yet."); return; }
    if(!confirm("Generate all units into their ticked quarters? This repaints those players' rows in those quarters.")) return;
    this.pushUndo();
    ready.forEach(u=>{ u.qs.forEach((on,q)=>{ if(on) this.genUnitInto(u,q); }); });
    this.save(); this.renderGrids(); this.renderTabs();
  },
  toggleUnits(){
    const b=document.getElementById("unitsBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  renderUnits(keepOpen){
    const body=document.getElementById("unitsBody");
    if(!body) return;
    const wasOpen=body.style.display!=="none";
    this.ensureRequired();
    let html=`<div class="rankgen">
      <div class="rankgen-l"><b>⚡ Quick rotation by rank</b><span>Skip building units. Each line splits into pods from your Squad rank (top plays most), using the Injury-plan cadences. Paints all four quarters.</span></div>
      <button class="primary" onclick="app.generateByRank()">Generate by rank</button>
    </div>
    <div class="units-or">— or build your own units below —</div>`;
    this.state.units.forEach(u=>{
      const L=this.unitPlayers(u);
      const inUnit=new Set(u.playerIds);
      const avail=this.state.players.filter(p=>!inUnit.has(p.id));
      let chips=L.map((p,i)=>{
        const role = i<L.length-1 ? "starter" : "interchange";
        return `<span class="uchip ${role}" title="${role==='starter'?'Starter':'Interchange — comes on first'}">
          <button onclick="app.unitMove('${u.id}','${p.id}',-1)">&#9664;</button>
          ${p.name} <i>${p.group==="GK"?"GK":(p.pos||"")}</i>
          <button onclick="app.unitMove('${u.id}','${p.id}',1)">&#9654;</button>
          <button class="x" onclick="app.unitRemovePlayer('${u.id}','${p.id}')">&times;</button></span>`;
      }).join("");
      html+=`<div class="unitrow">
        <div class="unit-chips">${chips||'<span class="hint">no players yet</span>'}
          <select onchange="app.unitAddPlayer('${u.id}',this.value);this.value='';">
            <option value="">+ add player…</option>
            ${avail.map(p=>`<option value="${p.id}">${p.name} (${p.group})</option>`).join("")}
          </select>
        </div>
        <div class="unit-ctl">
          1st sub <input type="number" min="1" max="14" value="${u.first}" onchange="app.setUnitField('${u.id}','first',this.value)">'
          then every <input type="number" min="1" max="14" value="${u.every}" onchange="app.setUnitField('${u.id}','every',this.value)">'
          &nbsp; ${[0,1,2,3].map(q=>`<label class="uq"><input type="checkbox" ${u.qs[q]?"checked":""} onchange="app.setUnitQ('${u.id}',${q},this.checked)">Q${q+1}</label>`).join("")}
          <button class="primary" onclick="app.generateUnit('${u.id}')">Generate</button>
          <button class="danger" onclick="app.delUnit('${u.id}')">&times;</button>
        </div>
        <div class="unit-desc">${this.unitDesc(u)}</div>
      </div>`;
    });
    html+=`<div style="margin-top:8px;display:flex;gap:8px;">
      <button class="primary" onclick="app.addUnit()">+ New unit</button>
      <button class="primary" onclick="app.generateAll()">GENERATE ALL UNITS &#8594; ticked quarters</button>
    </div>
    <div class="hint" style="margin-top:6px;">Order matters: starters first (left), interchange last (right). The interchange always takes the second-listed starter off first, then the cycle rotates — same person takes the same person off, every time. Generating repaints only the unit's players in the ticked quarters; leave Q4 unticked to hand-control it.</div>`;
    body.innerHTML=html;
    if(keepOpen&&wasOpen) body.style.display="block";
  },

  // ---------- anchors: heavy-minute players, one rest block at a bookend, staggered per line ----------
  addAnchor(){
    this.pushUndo();
    if(!this.state.anchors) this.state.anchors=[];
    this.state.anchors.push({id:uid(), playerId:"", mins:12, rest:"auto", qs:[true,true,true,false]});
    this.save(); this.renderAnchors(true);
  },
  delAnchor(id){
    this.pushUndo();
    this.state.anchors=this.state.anchors.filter(a=>a.id!==id);
    this.save(); this.renderAnchors(true); this.renderGrids();
  },
  setAnchorField(id,field,val){
    this.pushUndo();
    const a=this.state.anchors.find(x=>x.id===id); if(!a) return;
    if(field==="mins"){ let v=parseInt(val,10); if(isNaN(v)) v=12; a.mins=Math.max(1,Math.min(MINUTES,v)); }
    else a[field]=val;
    this.save(); this.renderAnchors(true);
  },
  setAnchorQ(id,q,checked){
    const a=this.state.anchors.find(x=>x.id===id); if(a){ a.qs[q]=checked; this.save(); }
  },
  anchorsForQ(q){
    return (this.state.anchors||[]).filter(a=>a.playerId && a.qs[q] && this.state.players.find(p=>p.id===a.playerId));
  },
  isAnchored(pid,q){
    return (this.state.anchors||[]).some(a=>a.playerId===pid && a.qs[q]);
  },
  // resolve a non-overlapping rest-block start index per anchor, staggered within each line
  solveAnchorRests(q){
    const list=this.anchorsForQ(q);
    const center=(MINUTES-1)/2;
    const cand=L=>{
      const arr=[];
      for(let s=0;s<=MINUTES-L;s++) arr.push(s);
      // bookends (farthest from centre) first, soft middle last
      arr.sort((x,y)=> Math.abs((y+(L-1)/2)-center) - Math.abs((x+(L-1)/2)-center));
      return arr;
    };
    const byLine={};
    list.forEach(a=>{
      const p=this.state.players.find(x=>x.id===a.playerId);
      const g=this.effGroup(p,q);
      (byLine[g]=byLine[g]||[]).push(a);
    });
    const out={};
    Object.keys(byLine).forEach(g=>{
      const occupied=[]; // [start,end) blocks already taken in this line
      // place explicit (start/end) rests before autos so autos route around them
      const ordered=byLine[g].slice().sort((a,b)=> (a.rest==="auto"?1:0)-(b.rest==="auto"?1:0));
      ordered.forEach(a=>{
        const L=Math.max(0,MINUTES-a.mins);
        if(L===0){ out[a.id]=-1; return; }
        let start;
        if(a.rest==="start") start=0;
        else if(a.rest==="end") start=MINUTES-L;
        else{
          start=cand(L).find(s=>!occupied.some(b=> s<b[1] && (s+L)>b[0]));
          if(start===undefined) start=MINUTES-L;
        }
        out[a.id]=start;
        occupied.push([start,start+L]);
      });
    });
    return out;
  },
  genAnchorInto(a,q,restStart){
    const p=this.state.players.find(x=>x.id===a.playerId); if(!p) return;
    const L=Math.max(0,MINUTES-a.mins);
    const stamp = (p.group==="GK") ? "GK" : ppStr(p);
    this.state.grid[p.id][q]=Array(MINUTES).fill("");
    if(this.state.locks&&this.state.locks[p.id]&&this.state.locks[p.id][q]) this.state.locks[p.id][q]=Array(MINUTES).fill("");
    for(let t=0;t<MINUTES;t++){
      const resting = L>0 && restStart>=0 && t>=restStart && t<restStart+L;
      this.state.grid[p.id][q][t] = resting ? "" : stamp;
    }
  },
  generateAnchors(){
    const any=(this.state.anchors||[]).some(a=>a.playerId);
    if(!any){ alert("Add at least one anchor and pick a player."); return; }
    if(!confirm("Generate anchors into their ticked quarters? This repaints those players' rows. Run this BEFORE your rotation units.")) return;
    this.pushUndo();
    for(let q=0;q<QUARTERS;q++){
      const rests=this.solveAnchorRests(q);
      this.anchorsForQ(q).forEach(a=>{ this.genAnchorInto(a,q,rests[a.id]); });
    }
    this.save(); this.renderGrids(); this.renderTabs();
  },
  toggleAnchors(){
    const b=document.getElementById("anchorsBody");
    b.style.display = b.style.display==="none" ? "block" : "none";
  },
  anchorDesc(a){
    const p=this.state.players.find(x=>x.id===a.playerId);
    if(!p) return "Pick a player.";
    const L=Math.max(0,MINUTES-a.mins);
    const where = L===0 ? "no rest — full quarter"
      : (a.rest==="start"?`rest first ${L}'` : a.rest==="end"?`rest last ${L}'` : `auto — ${L}' rest at a bookend, staggered`);
    return `${p.name}: ${a.mins}' on / ${L}' off &nbsp;&bull;&nbsp; ${where}`;
  },
  renderAnchors(keepOpen){
    const body=document.getElementById("anchorsBody");
    if(!body) return;
    const wasOpen=body.style.display!=="none";
    if(!this.state.anchors) this.state.anchors=[];
    let html="";
    this.state.anchors.forEach(a=>{
      const opts=this.state.players.map(p=>`<option value="${p.id}" ${a.playerId===p.id?"selected":""}>${p.name} (${p.group})</option>`).join("");
      html+=`<div class="unitrow">
        <div class="unit-ctl">
          <select onchange="app.setAnchorField('${a.id}','playerId',this.value)"><option value="">choose player…</option>${opts}</select>
          &nbsp; on <input type="number" min="1" max="${MINUTES}" value="${a.mins}" onchange="app.setAnchorField('${a.id}','mins',this.value)">'
          rest <select onchange="app.setAnchorField('${a.id}','rest',this.value)">
            <option value="auto" ${a.rest==="auto"?"selected":""}>auto (staggered)</option>
            <option value="start" ${a.rest==="start"?"selected":""}>start</option>
            <option value="end" ${a.rest==="end"?"selected":""}>end</option>
          </select>
          &nbsp; ${[0,1,2,3].map(q=>`<label class="uq"><input type="checkbox" ${a.qs[q]?"checked":""} onchange="app.setAnchorQ('${a.id}',${q},this.checked)">Q${q+1}</label>`).join("")}
          <button class="danger" onclick="app.delAnchor('${a.id}')">&times;</button>
        </div>
        <div class="unit-desc">${this.anchorDesc(a)}</div>
      </div>`;
    });
    html+=`<div style="margin-top:8px;display:flex;gap:8px;">
      <button class="primary" onclick="app.addAnchor()">+ New anchor</button>
      <button class="primary" onclick="app.generateAnchors()">GENERATE ANCHORS &#8594; ticked quarters</button>
    </div>
    <div class="hint" style="margin-top:6px;">Anchors are your heavy-minute players — they sit OUT of the carousel. Each plays its target minutes with one rest block at a bookend (start or end), never the soft middle. <b>Auto</b> staggers anchors in the same line so one is always on. Keep anchors out of your Rotation units, generate anchors FIRST, then GENERATE ALL units for everyone else. The &#9875; marks anchored players on the grid.</div>`;
    body.innerHTML=html;
    if(keepOpen&&wasOpen) body.style.display="block";
  },

  // ---------- match timer ----------
  fmtClock(sec){
    sec=Math.max(0,Math.ceil(sec));
    return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
  },
  minuteIndex(){
    const label=Math.max(1,Math.ceil(this.timer.remaining/60));
    return Math.min(MINUTES-1, MINUTES-label);
  },
  startPause(){
    if(this.timer.running){
      this.timer.running=false;
    } else {
      if(this.timer.remaining<=0) this.timer.remaining=QSEC;
      if(this.activeQ!=="G") this.timer.q=this.activeQ;
      this.timer.running=true;
      this.timer.lastTick=Date.now();
      this.liveMin={q:this.timer.q,m:this.minuteIndex()};
    }
    this.persistTimer(); this.renderTimer(); this.renderGrids();
  },
  resetTimer(){
    this.timer.running=false; this.timer.remaining=QSEC; this.liveMin=null;
    this.persistTimer(); this.renderTimer(); this.renderGrids();
  },
  nudge(s){
    this.timer.remaining=Math.max(0,Math.min(QSEC,this.timer.remaining+s));
    if(this.liveMin&&this.liveMin.q===this.timer.q){
      this.liveMin={q:this.timer.q,m:this.minuteIndex()};
    }
    this.persistTimer(); this.renderTimer(); this.renderGrids();
  },
  tick(){
    if(!this.timer.running) return;
    const now=Date.now();
    this.timer.remaining=Math.max(0,this.timer.remaining-(now-this.timer.lastTick)/1000);
    this.timer.lastTick=now;
    if(this.timer.remaining<=0){
      this.timer.running=false;
      this.persistTimer(); this.renderTimer();
      if(this.activeQ===this.timer.q) this.renderGrids();
      return;
    }
    const m=this.minuteIndex();
    if(!this.liveMin || this.liveMin.q!==this.timer.q || this.liveMin.m!==m){
      this.liveMin={q:this.timer.q,m};
      if(this.activeQ===this.timer.q) this.renderGrids();
    }
    const d=document.getElementById("clockDisp");
    if(d) d.textContent=this.fmtClock(this.timer.remaining);
    this.persistTimer();
  },
  persistTimer(){
    try{ localStorage.setItem("bs_timer",JSON.stringify({remaining:this.timer.remaining,q:this.timer.q})); }catch(e){}
  },
  loadTimer(){
    try{
      const t=JSON.parse(localStorage.getItem("bs_timer")||"null");
      if(t && typeof t.remaining==="number"){ this.timer.remaining=t.remaining; this.timer.q=t.q||0; }
    }catch(e){}
  },
  renderTimer(){
    const el=document.getElementById("timerbar");
    if(!el) return;
    const r=this.timer.running;
    const ended=this.timer.remaining<=0;
    el.innerHTML=`<div class="timerwrap ${r?"running":""}">
      <span class="tq">Q${(this.timer.q||0)+1}</span>
      <span id="clockDisp" class="clock ${ended?"ended":""}">${ended?"END":this.fmtClock(this.timer.remaining)}</span>
      <button class="tbig ${r?"tstop":"tstart"}" onclick="app.startPause()">${r?"&#10074;&#10074; STOP":"&#9654; START"}</button>
      <button class="tsm" onclick="app.nudge(-10)">&minus;10s</button>
      <button class="tsm" onclick="app.nudge(10)">+10s</button>
      <button class="tsm" onclick="app.resetTimer()">RESET 15:00</button>
      <button class="tinj" onclick="app.openInjury()" title="A player is hurt — switch to a simple even rotation">&#9888; PLAYER OUT</button>
      <span class="thint">${r?"Clock running — bright rows are ON, dimmed are off. STOP when time is called off.":"Press START when the umpire starts play. Tap a minute number in the grid header to sync the clock."}</span>
    </div>`;
  },

  // ============================================================
  // INJURY RECOVERY — one tap to drop a player and run a simple even rotation
  // from the live clock. On-field shape stays the same.
  // ============================================================
  setInjuryPlan(field,val){
    this.ensureRequired();
    let v=parseInt(val,10); if(isNaN(v)) v=3; v=Math.max(1,Math.min(14,v));
    this.state.injuryPlan[field]=v; this.save(); this.renderInjury();
  },
  // where are we right now — quarter + minute index — so the rebuild starts from live play
  livePoint(){
    if(this.liveMin) return {q:this.liveMin.q, m:this.liveMin.m};
    if(typeof this.activeQ==="number") return {q:this.activeQ, m:0};
    return {q:0, m:0};
  },
  openInjury(){
    this.ensureRequired();
    let ov=document.getElementById("injuryOverlay");
    if(!ov){ ov=document.createElement("div"); ov.id="injuryOverlay"; document.body.appendChild(ov); ov.onclick=e=>{ if(e.target.id==="injuryOverlay") this.closeInjury(); }; }
    ov.style.display="flex";
    this.renderInjury();
  },
  closeInjury(){ const ov=document.getElementById("injuryOverlay"); if(ov) ov.style.display="none"; },
  podSummary(g){
    // describe how this line will split into pods right now (for the panel)
    const out=new Set(this.state.outPlayers||[]);
    const q=this.livePoint().q;
    const N=this.state.players.filter(p=>this.effGroup(p,q)===g && !out.has(p.id)).length;
    const k=this.reqFor(q,g);
    if(!N||!k) return "";
    if(N<=k) return `${N} on, no subs`;
    const numPods=N-k, base=Math.floor(k/numPods), extra=k%numPods;
    const pods=[];
    for(let i=0;i<numPods;i++){ const s=base+(i<extra?1:0); pods.push(s===1?"1-for-1":`${s}-for-${s+1}`); }
    return pods.join(" + ");
  },
  renderInjury(){
    const ov=document.getElementById("injuryOverlay"); if(!ov) return;
    const plan=this.state.injuryPlan;
    const lp=this.livePoint();
    const out=this.state.outPlayers||[];
    const q=lp.q;
    const lanes=["Strikers","Midfield","Back 4"].map(g=>{
      const mem=this.state.players.filter(p=>p.group===g && !out.includes(p.id));
      const cls="group-"+(g==="Back 4"?"Back":g);
      const pods=this.podSummary(g);
      // work out which pod each member (in rank order) falls into, to tag the chip
      const k=this.reqFor(q,g), N=mem.length;
      const podOf=[]; // podOf[j] = {label, more}
      if(N>k){
        const numPods=N-k, base=Math.floor(k/numPods), extra=k%numPods;
        let j=0;
        for(let i=0;i<numPods;i++){ const s=base+(i<extra?1:0); const lab=s===1?"1-for-1":`${s}-for-${s+1}`;
          for(let c=0;c<s+1 && j<N;c++){ podOf[j]= {label:lab, more:s>1}; j++; } }
      }
      const chips=mem.map((p,j)=>{
        const tag=podOf[j]?`<span class="inj-chip-pod ${podOf[j].more?'more':'less'}">${podOf[j].label}</span>`:"";
        return `<button class="inj-chip ${cls}" draggable="true" ondragstart="app.injDragStart(event,'${p.id}')" ondragend="app.dragEnd()" ondragover="app.dragOver(event)" ondrop="app.injDropChip(event,'${p.id}')" onclick="app.markOut('${p.id}')" title="Tap = mark out · drag = move line or reorder rank">
          <span class="inj-rank">${j+1}</span>${p.name}${tag}</button>`;
      }).join("");
      return `<div class="inj-line">
        <div class="inj-line-top"><span class="inj-line-h ${cls}">${g.toUpperCase()}</span>${pods?`<span class="inj-pods">${pods}</span>`:""}<span class="inj-rankhint">top = plays most</span></div>
        <div class="inj-lane ${cls}" ondragover="app.dragOver(event)" ondragenter="this.classList.add('drop-target')" ondragleave="this.classList.remove('drop-target')" ondrop="this.classList.remove('drop-target');app.injDropLine(event,'${g}')">${chips||'<span class="inj-empty">drag a player here</span>'}</div>
      </div>`;
    }).join("");
    let outList="";
    if(out.length){
      outList=`<div class="inj-outwrap"><span class="inj-outlbl">&#9888; OUT</span>`+
        out.map(id=>{const p=this.state.players.find(x=>x.id===id);return p?`<span class="inj-out">${p.name}<button onclick="app.backIn('${id}')" title="Player is back on">&#8634; back in</button></span>`:"";}).join("")+`</div>`;
    }
    ov.innerHTML=`<div class="inj-card" onclick="event.stopPropagation()">
      <div class="inj-head"><span>&#9888; Player out</span><button class="inj-x" onclick="app.closeInjury()">&times;</button></div>
      <div class="inj-sub"><b>Tap</b> the injured player to mark them out and rebuild from <b>Q${lp.q+1} ${this.fmtClock((MINUTES-lp.m)*60)}</b>. <b>Drag</b> a player to another line to reshuffle first. On-field shape stays the same.</div>
      <div class="inj-plan">
        <div class="inj-plan-row"><span class="inj-plan-lbl">Strikers &amp; mids</span><span class="inj-plan-val">pods sub every <input type="number" min="1" max="14" value="${plan.smEvery}" onchange="app.setInjuryPlan('smEvery',this.value)">'</span></div>
        <div class="inj-plan-row"><span class="inj-plan-lbl">Backs</span><span class="inj-plan-val">4-on-1-off every <input type="number" min="1" max="14" value="${plan.backEvery}" onchange="app.setInjuryPlan('backEvery',this.value)">'</span></div>
        <div class="inj-planhint">Set before the game, it's saved. The grid is minute-by-minute, so backs run on whole minutes (2 ≈ your 90s).</div>
      </div>
      ${outList}
      <div class="inj-lanes">${lanes}</div>
      <div class="inj-foot"><b>Rank = minutes.</b> The order in each line is the rank (set it in Squad before the game). Top players land in the bigger pod and play more; the bottom two drop to the 1-for-1 and play less. Drag a chip onto another to re-rank, or to a different line to move it. Tapping a player rebuilds the rest of the game — Undo if you change your mind.</div>
    </div>`;
  },
  injDragStart(e,id){ this._injDrag=id; if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",id);}catch(_){} } },
  // move a player into a line at a rank position (beforePid = drop ahead of that player; null = bottom of the line)
  reorderPlayer(pid,group,beforePid){
    const a=this.state.players;
    const p=a.find(x=>x.id===pid); if(!p) return;
    this.pushUndo();
    p.group=group; p.groupQ=[null,null,null,null]; if(group==="GK") p.pos="GK";
    a.splice(a.indexOf(p),1);
    if(beforePid && beforePid!==pid){ const ti=a.findIndex(x=>x.id===beforePid); a.splice(ti<0?a.length:ti,0,p); }
    else { let last=-1; a.forEach((x,i)=>{ if(x.group===group) last=i; }); a.splice(last+1,0,p); }
    this.save(); this.renderInjury(); this.renderGrids(); this.renderTabs();
  },
  injDropLine(e,group){ e.preventDefault(); const id=this._injDrag; this._injDrag=null; if(!id) return; this.reorderPlayer(id,group,null); },
  injDropChip(e,targetPid){ e.preventDefault(); e.stopPropagation(); const id=this._injDrag; this._injDrag=null;
    if(!id||id===targetPid){ this.renderInjury(); return; }
    const t=this.state.players.find(x=>x.id===targetPid); if(!t) return;
    this.reorderPlayer(id,t.group,targetPid);
  },
  markOut(pid){
    const p=this.state.players.find(x=>x.id===pid); if(!p) return;
    this.pushUndo();
    if(!this.state.outPlayers.includes(pid)) this.state.outPlayers.push(pid);
    const lp=this.livePoint();
    // clear the injured player from the live minute onward (this quarter + all later quarters)
    for(let q=lp.q;q<QUARTERS;q++){
      const from=(q===lp.q)?lp.m:0;
      for(let m=from;m<MINUTES;m++){ this.state.grid[pid][q][m]=""; this.clearLock(pid,q,m); }
    }
    this.rebuildEvenFromNow(lp);
    this.save(); this.closeInjury();
    if(typeof this.activeQ!=="number") this.activeQ=lp.q;
    this.renderTabs(); this.renderGrids();
  },
  backIn(pid){
    this.pushUndo();
    this.state.outPlayers=(this.state.outPlayers||[]).filter(x=>x!==pid);
    this.save(); this.renderInjury(); this.renderGrids();
  },
  // GENERATE BY RANK — paint the whole game from each line's rank order (top plays most), no injury needed
  generateByRank(){
    this.ensureRequired();
    if(!confirm("Generate the whole rotation from your player ranks?\n\nEach line splits into pods (top players play more), using the cadences in the Injury plan. This repaints all four quarters and replaces what's painted now.")) return;
    this.pushUndo();
    this.rebuildEvenFromNow({q:0,m:0});
    if(typeof this.activeQ!=="number") this.activeQ=0;
    this.save(); this.renderTabs(); this.renderGrids();
  },
  // rebuild the pod rotation for every outfield line, from the live point to the end of the game
  rebuildEvenFromNow(lp){
    const plan=this.state.injuryPlan;
    const out=new Set(this.state.outPlayers||[]);
    for(let q=lp.q;q<QUARTERS;q++){
      const startM=(q===lp.q)?lp.m:0;
      ["Strikers","Midfield","Back 4"].forEach(g=>{
        const ids=this.state.players.filter(p=>this.effGroup(p,q)===g && !out.has(p.id)).map(p=>p.id);
        const k=this.reqFor(q,g);
        if(!ids.length || !k) return;
        const every = (g==="Back 4") ? plan.backEvery : plan.smEvery;
        this.genLinePods(ids,k,q,startM,every);
      });
    }
  },
  // split a line into subbing pods (spare players = number of pods, each pod carries one spare),
  // then run an even round-robin inside each pod. Reproduces 1-for-1 + 2-for-3, 4-on-1-off, etc.
  genLinePods(ids,k,q,startM,every){
    const N=ids.length;
    if(N<=k){ this.genEvenLine(ids,k,q,startM,every,every); return; } // everyone on, no rotation
    const numPods=N-k;                       // one spare per pod
    const base=Math.floor(k/numPods), extra=k%numPods;
    let idx=0;
    for(let pIdx=0;pIdx<numPods;pIdx++){
      const spots=base+(pIdx<extra?1:0);     // bigger pods first (2-for-3 before 1-for-1)
      const players=ids.slice(idx, idx+spots+1); // spots + 1 spare
      idx+=spots+1;
      if(players.length) this.genEvenLine(players,spots,q,startM,every,every);
    }
  },
  // even round-robin for one line: k on the field, one change per cadence, everyone shares the bench
  // even rotation for one pod/line: k on the field, the (N-k) OFF seats rotate from the BOTTOM of the
  // rank order up — so the highest-ranked players sit out least and play the most. ids are in rank order.
  genEvenLine(ids,k,q,startM,first,every){
    const N=ids.length;
    const stamp=id=>{ const p=this.state.players.find(x=>x.id===id); return (p&&p.group==="GK")?"GK":ppStr(p); };
    ids.forEach(id=>{ for(let m=startM;m<MINUTES;m++){ this.state.grid[id][q][m]=""; this.clearLock(id,q,m); } });
    if(N<=k){ ids.forEach(id=>{ for(let m=startM;m<MINUTES;m++) this.state.grid[id][q][m]=stamp(id); }); return; }
    const off=N-k;
    const subTimes=new Set();
    for(let t=startM+first;t<MINUTES;t+=every) subTimes.add(t);
    let step=0;
    for(let m=startM;m<MINUTES;m++){
      if(subTimes.has(m)) step++;
      const benched=new Set();
      // bench `off` players, sliding a window up from the lowest rank (last index)
      for(let i=0;i<off;i++){ benched.add(((N-1-((step*off+i)%N))+N)%N); }
      for(let idx=0;idx<N;idx++){ if(!benched.has(idx)) this.state.grid[ids[idx]][q][m]=stamp(ids[idx]); }
    }
  },

  // ---------- structures ----------
  renderStructBar(){
    const el=document.getElementById("structbar");
    if(!el) return;
    if(this.activeQ==="G"||this.activeQ==="C"){ el.innerHTML=""; return; }
    this.ensureRequired();
    const q=this.activeQ;
    const cur=this.state.structureQ[q];
    const all=this.allStructures();
    const builtinCount=STRUCTURES.length;
    const opts=all.map((s,i)=>{
      const field=["Strikers","Midfield","Back 4"].reduce((a,g)=>a+(s.req[g]||0),0);
      const star=i>=builtinCount?"★ ":""; // your own marked with a star
      return `<option value="${i}" ${s.name===cur?"selected":""}>${star}${s.name} &mdash; ${field} on field + ${s.req.GK||0} GK</option>`;
    }).join("")+(cur==="Custom"?`<option selected>Custom (hand-edited)</option>`:"");
    const chips=[0,1,2,3].map(i=>`<span class="schip ${i===q?"cur":""}">Q${i+1}: ${this.state.structureQ[i]}</span>`).join(" ");
    let editor="";
    if(this._structEditOpen){
      const cs=this.store.customStructures||[];
      const rows=cs.map((s,i)=>{
        const tot=(s.req.Strikers||0)+(s.req.Midfield||0)+(s.req["Back 4"]||0);
        const okTot=(tot+(s.req.GK||0))===11;
        return `<div class="cs-row">
          <input type="text" value="${(s.name||'').replace(/"/g,'&quot;')}" onchange="app.updateCustom(${i},'name',this.value)" placeholder="name e.g. Q2 chase">
          <label>STR<input type="number" min="0" max="11" value="${s.req.Strikers||0}" onchange="app.updateCustom(${i},'Strikers',this.value)"></label>
          <label>MID<input type="number" min="0" max="11" value="${s.req.Midfield||0}" onchange="app.updateCustom(${i},'Midfield',this.value)"></label>
          <label>DEF<input type="number" min="0" max="11" value="${s.req['Back 4']||0}" onchange="app.updateCustom(${i},'Back 4',this.value)"></label>
          <label>GK<input type="number" min="0" max="1" value="${s.req.GK||0}" onchange="app.updateCustom(${i},'GK',this.value)"></label>
          <span class="cs-tot ${okTot?'ok':'bad'}">${tot} on field + ${s.req.GK||0} GK</span>
          <button class="danger" onclick="app.delCustom(${i})">&times;</button>
        </div>`;
      }).join("");
      editor=`<div class="structeditor">
        <div class="hint">Build your own shapes. The numbers are how many of each line are <b>on the field at once</b> — they should total <b>11</b> (10 outfield + 1 GK). Saved here and reusable in any game. Then just pick one from the dropdown for any quarter — or don't.</div>
        ${rows||'<div class="hint">No custom structures yet — add one below.</div>'}
        <button class="primary" onclick="app.addCustomStructure()">+ New structure</button>
      </div>`;
    }
    el.innerHTML=`<div class="structwrap">
      <b>Q${q+1} structure:</b>
      <select onchange="if(this.value!=='')app.applyStructure(parseInt(this.value),false)">${opts}</select>
      <button onclick="const s=this.previousElementSibling;if(s.value!=='')app.applyStructure(parseInt(s.value),true)">Apply to ALL</button>
      <button onclick="app.toggleStructEditor()">${this._structEditOpen?'&times; Close':'⚙ Create / edit my structures'}</button>
      <span class="schips">${chips}</span>
    </div>${editor}`;
  },

  // ---------- live mode ----------
  toggleLive(q,m){
    if(this.liveMin && this.liveMin.q===q && this.liveMin.m===m && !this.timer.running){
      this.liveMin=null;
    } else {
      this.liveMin={q,m};
      this.timer.q=q;
      this.timer.remaining=(MINUTES-m)*60; // sync clock to start of that minute
      this.persistTimer();
    }
    this.renderTimer(); this.renderGrids();
  },
  liveBanner(q,m,pairs){
    const clock=MINUTES-m;
    const fmt=pr=>`<b>${pr.on?pr.on.name+" ON":"&mdash;"}</b>${pr.off?` for ${pr.off.name}`:""} <span class="lb-g">(${pr.group})</span>`;
    const now=pairs.filter(pr=>pr.i===m);
    const future=pairs.filter(pr=>pr.i>m);
    const nextI=future.length?future[0].i:null;
    const next=nextI?future.filter(pr=>pr.i===nextI):[];
    let html=`<div class="livebanner"><span class="lb-clock">LIVE &#9654; ${clock}:00</span>`;
    html+=`<span class="lb-now">${now.length?("NOW: "+now.map(fmt).join(" &nbsp;&bull;&nbsp; ")):"No subs this minute"}</span>`;
    if(next.length) html+=`<span class="lb-next">NEXT at ${MINUTES-nextI}:00 &mdash; ${next.map(fmt).join(" &nbsp;&bull;&nbsp; ")}</span>`;
    else html+=`<span class="lb-next">No more subs this quarter</span>`;
    html+=`<button class="lb-x" onclick="app.toggleLive(${q},${m})">&times; exit live</button></div>`;
    // live protected-pair alert for THIS minute
    const nowBroken=(this.state.pairs||[]).filter(pr=>this.pairBreaks(q,pr).includes(MINUTES-m)).map(pr=>this.pairName(pr));
    if(nowBroken.length) html+=`<div class="pairwarn live">&#9940; BOTH OFF RIGHT NOW: ${nowBroken.join(" · ")} — get one back on!</div>`;
    // quick-swap: who's ON now vs who's OFF now — swap from this minute to the end of the quarter
    const onNow=this.state.players.filter(p=>this.state.grid[p.id][q][m]);
    const offNow=this.state.players.filter(p=>!this.state.grid[p.id][q][m]);
    html+=`<div class="liveswap">
      <b>Quick swap (now &#8594; end of quarter):</b>
      take OFF <select id="swapOff">${onNow.map(p=>`<option value="${p.id}">${p.name}${lbl(this.state.grid[p.id][q][m])}</option>`).join("")}</select>
      bring ON <select id="swapOn">${offNow.map(p=>`<option value="${p.id}">${p.name} (${p.group})</option>`).join("")}</select>
      <button class="primary" onclick="app.liveSwap(${q},${m})">Swap</button>
      <span class="lb-g">replaces the rest of the quarter — same line keeps its numbers</span>
    </div>`;
    return html;
  },
  liveSwap(q,m){
    const offId=document.getElementById("swapOff").value;
    const onId=document.getElementById("swapOn").value;
    if(!offId||!onId||offId===onId){ alert("Pick a player to take off and a different player to bring on."); return; }
    const offP=this.state.players.find(x=>x.id===offId);
    const onP=this.state.players.find(x=>x.id===onId);
    this.pushUndo();
    // the incoming player takes the outgoing player's exact spot for the rest of the quarter
    for(let t=m;t<MINUTES;t++){
      const wasOn=this.state.grid[offId][q][t];
      if(wasOn){
        this.state.grid[onId][q][t] = (onP.group==="GK") ? "GK" : ppStr(onP);
        this.state.grid[offId][q][t] = "";
        this.clearLock(onId,q,t); this.clearLock(offId,q,t);
      }
    }
    this.save(); this.renderTimer(); this.renderGrids();
  },

  // ---------- game overview ----------
  computeIssues(q){
    this.ensureRequired();
    const issues=[];
    ["Strikers","Midfield","Back 4","GK"].forEach(g=>{
      const req=this.reqFor(q,g);
      const mem=this.state.players.filter(p=>this.effGroup(p,q)===g);
      if(!mem.length&&!req) return;
      let bad=0;
      for(let m=0;m<MINUTES;m++){ let c=0; mem.forEach(p=>{ if(this.state.grid[p.id][q][m]) c++; }); if(c!==req) bad++; }
      if(bad) issues.push(`${g} wrong for ${bad} min`);
    });
    ROLES.forEach(r=>{
      const holders=this.state.players.filter(p=>p.roles&&p.roles.includes(r.key));
      if(!holders.length) return;
      let bad=0;
      for(let m=0;m<MINUTES;m++){ let c=0; holders.forEach(p=>{ if(this.state.grid[p.id][q][m]) c++; }); if(c<1) bad++; }
      if(bad) issues.push(`No ${r.name} for ${bad} min`);
    });
    (this.state.pairs||[]).forEach(pr=>{
      const br=this.pairBreaks(q,pr);
      if(br.length) issues.push(`${this.pairName(pr)} both off for ${br.length} min`);
    });
    return issues;
  },
  renderGameView(){
    this._pm=null;
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    const allPairs=[0,1,2,3].map(q=>this.computePairs(q));

    // minutes matrix
    let html=`<div class="qgrid"><div class="print-title">${this.state.name} — game overview</div>
      <table class="gametable"><thead><tr><th style="text-align:left;padding-left:8px;">GAME OVERVIEW</th>
      <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th><th>Target</th><th>+/-</th></tr></thead><tbody>`;
    groupsOrder.forEach(g=>{
      const members=this.state.players.filter(p=>p.group===g);
      if(!members.length) return;
      html+=`<tr class="grouphead"><td colspan="8">${g.toUpperCase()}</td></tr>`;
      const cls="group-"+(g==="Back 4"?"Back":g);
      members.forEach(p=>{
        const qs=[0,1,2,3].map(q=>this.qTotal(p.id,q));
        const tot=qs.reduce((a,b)=>a+b,0);
        let diff="&mdash;", dcls="";
        if(p.target!=null){
          const d=tot-p.target;
          diff = d===0 ? "&#10004;" : (d>0?"+"+d:""+d);
          dcls = d===0 ? "t-ok" : (d<0?"t-under":"t-over");
        }
        html+=`<tr class="${cls}"><td class="name">${p.name}${(p.roles||[]).map(rk=>` <span class="badge" style="background:${ROLE_COLOR[rk]}">${rk}</span>`).join("")}</td>
          ${qs.map(x=>`<td class="total">${x||""}</td>`).join("")}
          <td class="gtotal">${tot}</td>
          <td class="total"><input class="tgt" type="number" min="0" max="60" value="${p.target==null?"":p.target}" placeholder="&mdash;" onchange="app.setTarget('${p.id}',this.value)"></td>
          <td class="gtotal ${dcls}">${diff}</td></tr>`;
      });
    });
    html+=`</tbody></table></div>`;

    // quarter checks
    html+=`<div class="panel subplan"><div class="print-title">${this.state.name} — quarter checks</div><h2>QUARTER CHECKS</h2>
      <table class="subtable"><thead><tr><th>Quarter</th><th>Status</th></tr></thead><tbody>`;
    let allOK=true;
    for(let q=0;q<QUARTERS;q++){
      const issues=this.computeIssues(q);
      if(issues.length) allOK=false;
      html+=`<tr><td class="t">Q${q+1}<div class="structmini">${this.state.structureQ[q]}</div></td><td style="text-align:left;">${issues.length?`<span class="offn">${issues.join(" &nbsp;|&nbsp; ")}</span>`:`<span class="onn">&#10004; legal — all lines &amp; roles covered</span>`}</td></tr>`;
    }
    html+=`</tbody></table></div>`;

    // player cards — one card per player, whole game
    html+=`<div class="panel subplan"><div class="print-title">${this.state.name} — player cards</div>
      <h2>PLAYER CARDS — whole game, one card each <button class="primary no-print" style="margin-left:10px;" onclick="window.print()">&#128424; Print changing-room sheet</button></h2><div class="pcards">`;
    groupsOrder.forEach(g=>{
      const cls="group-"+(g==="Back 4"?"Back":g);
      this.state.players.filter(p=>p.group===g).forEach(p=>{
        if(this.gameTotal(p.id)===0) return;
        let lines="";
        for(let q=0;q<QUARTERS;q++){
          const evts=[];
          if(this.state.grid[p.id][q][0]) evts.push(`<b>Start ON</b>${lbl(this.posLabel(q,p.id,0))}`);
          allPairs[q].forEach(pr=>{
            if(pr.on===p)  evts.push(`<span class="onn">ON ${pr.clock}</span>${pr.off?` (for ${pr.off.name})`:""}`);
            if(pr.off===p) evts.push(`<span class="offn">OFF ${pr.clock}</span>${pr.on?` (${pr.on.name} on)`:""}`);
          });
          if(evts.length===1 && this.state.grid[p.id][q][0]) evts.push("full quarter");
          lines+=`<div class="pcard-q"><span class="pcard-qlbl">Q${q+1}</span> ${evts.length?evts.join(" &#10148; "):'<span class="pcard-rest">&mdash; not on</span>'} <span class="pcard-min">${this.qTotal(p.id,q)} min</span></div>`;
        }
        html+=`<div class="pcard ${cls}"><div class="pcard-name name">${p.name}
          ${(p.roles||[]).map(rk=>`<span class="badge" style="background:${ROLE_COLOR[rk]}">${rk}</span>`).join(" ")}
          <span class="pcard-tot">${this.gameTotal(p.id)} min</span></div>${lines}</div>`;
      });
    });
    html+=`</div><div class="hint" style="margin-top:8px;">Hand each player their card — read your line, quarter by quarter.</div></div>`;

    document.getElementById("grids").innerHTML=html;
    document.getElementById("statusbar").innerHTML = allOK
      ? `<span class="ok">&#10004; All four quarters legal.</span>`
      : `<span class="bad">&#9888; Fix the red items in Quarter Checks above.</span>`;
  },

  // ---------- phone rotation cards: one clean card per player to screenshot & send ----------
  renderCardsView(){
    this._pm=null;
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    const allPairs=[0,1,2,3].map(q=>this.computePairs(q));
    let html=`<div class="cards-intro no-print">
      <b>Phone cards</b> — one card per player. On your iPad/phone: screenshot a card and send it to the player (WhatsApp etc.), or
      <button class="primary" onclick="window.print()">&#128424; Print all (one per page)</button>
    </div><div class="phonecards">`;
    groupsOrder.forEach(g=>{
      this.state.players.forEach(p=>{
        if(p.group!==g) return;
        if(this.gameTotal(p.id)===0) return;
        html+=`<div class="pc-wrap" onclick="app.openCard('${p.id}')" title="Tap to enlarge — then screenshot &amp; send">
          ${this.cardHtml(p,allPairs)}
          <div class="pc-tap no-print">tap to enlarge &#128247;</div></div>`;
      });
    });
    html+=`</div>`;
    document.getElementById("grids").innerHTML=html;
    document.getElementById("statusbar").innerHTML="";
  },
  cardHtml(p,allPairs){
    const g=p.group;
    const cls="group-"+(g==="Back 4"?"Back":g);
    const posTxt=(p.pp&&p.pp.length)?p.pp.join(" / "):(p.pos||"");
    const roleTxt=(p.roles||[]).map(rk=>`<span class="badge" style="background:${ROLE_COLOR[rk]}">${rk}</span>`).join(" ");
    let qlines="";
    for(let q=0;q<QUARTERS;q++){
      const mins=this.qTotal(p.id,q);
      const moved=p.groupQ&&p.groupQ[q];
      const steps=[];
      if(this.state.grid[p.id][q][0]) steps.push(`<span class="pc-on">START ON</span>`);
      allPairs[q].forEach(pr=>{
        if(pr.on===p)  steps.push(`<span class="pc-on">ON ${pr.clock}</span>${pr.off?` <span class="pc-sub">for ${pr.off.name}</span>`:""}`);
        if(pr.off===p) steps.push(`<span class="pc-off">OFF ${pr.clock}</span>${pr.on?` <span class="pc-sub">${pr.on.name} on</span>`:""}`);
      });
      if(steps.length===1 && this.state.grid[p.id][q][0]) steps.push(`<span class="pc-sub">full quarter</span>`);
      const body = mins ? steps.join(' <span class="pc-arr">&#10148;</span> ') : `<span class="pc-rest">not on</span>`;
      qlines+=`<div class="pc-q"><span class="pc-qn">Q${q+1}</span>
        ${moved?`<span class="pc-line">${GROUP_SHORT[moved]}</span>`:""}
        <span class="pc-steps">${body}</span><span class="pc-min">${mins}'</span></div>`;
    }
    return `<div class="phonecard ${cls}">
      <div class="pc-head">
        <div class="pc-name">${p.name}</div>
        <div class="pc-pos">${posTxt} ${roleTxt}</div>
        <div class="pc-tot">${this.gameTotal(p.id)}<small>min</small></div>
      </div>
      ${qlines}
      ${this.state.notes?`<div class="pc-note">&#9888; ${this.state.notes.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</div>`:""}
      <div class="pc-foot">${this.state.name}</div>
    </div>`;
  },
  openCard(pid){
    const p=this.state.players.find(x=>x.id===pid); if(!p) return;
    const allPairs=[0,1,2,3].map(q=>this.computePairs(q));
    this.popClean(this.cardHtml(p,allPairs), {file:`${this.state.name} - ${p.name}`,
      hint:`Screenshot this, or hit Download image, then send it to ${p.name}.`});
  },
  closeCard(){ const ov=document.getElementById("cardOverlay"); if(ov) ov.style.display="none"; },

  // ---------- shared clean fullscreen overlay + PNG download ----------
  popClean(innerHTML, opts){
    opts=opts||{};
    let ov=document.getElementById("cardOverlay");
    if(!ov){ ov=document.createElement("div"); ov.id="cardOverlay"; document.body.appendChild(ov); }
    this._snapFile=(opts.file||"sub-sheet").replace(/[^\w\- ]/g,"");
    ov.innerHTML=`<div class="co-inner ${opts.wide?"co-wide":""}" onclick="event.stopPropagation()">
        <div class="co-snap" id="snapTarget">${innerHTML}</div>
        <div class="co-bar">
          <button class="co-dl" onclick="app.downloadSnap()">&#128247; Download image</button>
          <button class="co-close" onclick="app.closeCard()">Close</button>
        </div>
        <div class="co-hint">${opts.hint||"Screenshot this, or hit Download image. Tap outside to close."}</div>
      </div>`;
    ov.onclick=()=>this.closeCard();
    ov.style.display="flex";
  },
  // open the clean overlay from an existing on-page element (clones it)
  popCleanFrom(id, file, wide){
    const src=document.getElementById(id); if(!src) return;
    this.popClean(src.innerHTML, {file, wide:wide!==false});
  },
  downloadSnap(){
    const el=document.getElementById("snapTarget"); if(!el) return;
    this.snapshotPNG(el, (this._snapFile||"sub-sheet")+".png");
  },
  // render a DOM node to a PNG fully offline (SVG foreignObject -> canvas). Falls back gracefully.
  snapshotPNG(el, filename){
    try{
      const r=el.getBoundingClientRect();
      const w=Math.max(1,Math.ceil(r.width)), h=Math.max(1,Math.ceil(r.height)), scale=2;
      let css=""; for(const sheet of document.styleSheets){ try{ for(const rule of sheet.cssRules) css+=rule.cssText+"\n"; }catch(e){} }
      const clone=el.cloneNode(true);
      clone.querySelectorAll(".no-print,.co-bar,.co-hint,.pc-tap,.snapbtn").forEach(n=>n.remove());
      clone.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
      const xml=new XMLSerializer().serializeToString(clone);
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;background:#fff;"><style>${css}</style>${xml}</div></foreignObject></svg>`;
      const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement("canvas"); c.width=w*scale; c.height=h*scale;
        const ctx=c.getContext("2d"); ctx.scale(scale,scale); ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
        try{ ctx.drawImage(img,0,0); URL.revokeObjectURL(url);
          c.toBlob(b=>{ if(!b){ this._snapFail(); return; } const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=filename; a.click(); });
        }catch(e){ URL.revokeObjectURL(url); this._snapFail(); }
      };
      img.onerror=()=>{ URL.revokeObjectURL(url); this._snapFail(); };
      img.src=url;
    }catch(e){ this._snapFail(); }
  },
  _snapFail(){ alert("Couldn't build the image file on this device — but the clean view is on screen, so just take a normal screenshot (on iPad: top button + volume up)."); },

  renderGrids(){
    if(this.activeQ==="G"){ this.renderGameView(); return; }
    if(this.activeQ==="C"){ this.renderCardsView(); return; }
    const q=this.activeQ;
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    // who-you-take-off labels: shown in the empty cell just before a player comes on
    const pairsForAnn=this.computePairs(q);
    const ann={};
    pairsForAnn.forEach(pr=>{
      if(pr.on && pr.off){ (ann[pr.on.id]=ann[pr.on.id]||{})[pr.i-1]=pr.off.name; }
    });
    this.ensureRequired();
    this._pm=null; // recompute position assignment for this render
    const posMap=this.getPosMap(q);
    const live=(this.liveMin&&this.liveMin.q===q)?this.liveMin:null;
    const structName=this.state.structureQ[q];
    let html=`<div class="qgrid"><div class="print-title">${this.state.name} — Quarter ${q+1} — ${structName}</div>`;
    if(this.state.notes) html+=`<div class="notesbanner">&#9888; ${this.state.notes.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</div>`;
    // protected-pair warnings for this quarter
    const pairWarn=(this.state.pairs||[]).map(pr=>{const b=this.pairBreaks(q,pr);return b.length?`${this.pairName(pr)} — both off at ${b.map(x=>x+":00").join(", ")}`:"";}).filter(Boolean);
    if(pairWarn.length) html+=`<div class="pairwarn">&#9940; PROTECTED PAIR BROKEN: ${pairWarn.join(" &nbsp;|&nbsp; ")}</div>`;
    if(live) html+=this.liveBanner(q,live.m,pairsForAnn);
    html+=`<table><thead><tr><th style="text-align:left;padding-left:8px;">Q${q+1} <span class="structname">${structName}</span></th>`;
    for(let m=0;m<MINUTES;m++) html+=`<th class="minhead ${live&&live.m===m?"livehead":""}" title="Click = live mode: highlight this minute &amp; show now/next subs" onclick="app.toggleLive(${q},${m})">${MINUTES-m}</th>`;
    html+=`<th>Qtr</th><th>Game</th></tr></thead><tbody>`;

    const sections=this.quarterSections(q);
    const bandKey=sec=> sec.sub ? sec.sub : sec.group;
    const bandRow=(key)=>{
      const t=this.getBand(key)||"";
      return `<tr class="prefsrow"><td colspan="${MINUTES+3}"><div class="prefs-wrap">
        <span class="prefs-lbl">PLAYS</span>
        <div class="prefs-edit" contenteditable="true" onblur="app.setBand('${key}',this.innerText)" data-ph="who plays where — e.g. Woods = free man · Neild = CM/FM · Buschl = CM">${t.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</div>
        </div></td></tr>`;
    };
    sections.forEach((sec,si)=>{
      const g=sec.group;
      const baseCls="group-"+(g==="Back 4"?"Back":g);
      const subCls=sec.sub?(" sub-"+sec.sub):"";
      const ghSub=sec.sub?(" gh-"+sec.sub):"";
      html+=`<tr class="grouphead${ghSub}"><td colspan="${MINUTES+3}">${sec.label}</td></tr>`;
      sec.members.forEach(p=>{
        let cls=baseCls+subCls;
        if(live) cls += this.state.grid[p.id][q][live.m] ? " row-on" : " row-off";
        const moved = p.groupQ && p.groupQ[q];
        const lineBtn=`<button class="linebtn ${moved?"moved":""}" title="Move ${p.name} to another line for this quarter" onclick="app.openLineMenu(event,'${p.id}',${q})">${GROUP_SHORT[g]}</button>`;
        const anchorPip = this.isAnchored(p.id,q) ? `<span class="anchorpip" title="Anchor — heavy minutes, staggered rest">&#9875;</span>` : "";
        const isOut=(this.state.outPlayers||[]).includes(p.id);
        if(isOut) cls+=" row-out";
        const outTag = isOut ? ` <span class="outtag" title="Injured / out — tap to bring back" onclick="app.backIn('${p.id}')">OUT &#8634;</span>` : "";
        html+=`<tr class="${cls}"><td class="name" draggable="true" title="Drag to reorder this line (starters up top)" ondragstart="app.dragStart(event,'${p.id}')" ondragend="app.dragEnd()" ondragover="app.dragOver(event)" ondrop="app.dropOn(event,'${p.id}',()=>app.renderGrids())">${p.name}${outTag}${anchorPip} ${lineBtn}</td>`;
        for(let m=0;m<MINUTES;m++){
          const v=this.state.grid[p.id][q][m];
          const label = v ? (posMap ? (posMap[p.id][m]||"") : disp(v)) : "";
          const locked = v && this.getLock(p.id,q,m);
          const rep=(!v && ann[p.id] && ann[p.id][m]) ? `<span class="rep">${ann[p.id][m]}</span>` : "";
          html+=`<td class="cell ${v?"on":"off"}${locked?" locked":""}${live&&live.m===m?" livecol":""}" onmousedown="app.cellDown(event,'${p.id}',${q},${m})" onmouseover="app.cellOver(event,'${p.id}',${q},${m})" oncontextmenu="app.openCellMenu(event,'${p.id}',${q},${m})">${v?this.cellHtml(p,label):rep}</td>`;
        }
        html+=`<td class="total">${this.qTotal(p.id,q)}</td>${this.gameTotalCell(p)}</tr>`;
      });
      // subtle "plays" band under each line (not GK) so each group states who plays where
      if(g!=="GK") html+=bandRow(bandKey(sec));
    });

    // per-line count rows: each line must have exactly its required number on, every minute
    const lineCounts={}, lineBad={};
    groupsOrder.forEach(g=>{
      const req=this.reqFor(q,g);
      const mem=this.state.players.filter(p=>this.effGroup(p,q)===g);
      if(!mem.length && !req) return;
      const counts=[];
      for(let m=0;m<MINUTES;m++){
        let c=0; mem.forEach(p=>{ if(this.state.grid[p.id][q][m]) c++; });
        counts.push(c);
      }
      lineCounts[g]=counts;
      lineBad[g]=counts.filter(c=>c!==req).length;
      const lineTotal=counts.reduce((a,b)=>a+b,0);
      const needTotal=req*MINUTES;
      html+=`<tr class="counts"><td class="label">${g.toUpperCase()} ON (need
        <input type="number" min="0" max="11" value="${req}" onchange="app.setRequired('${g}',this.value)">)</td>`;
      counts.forEach(c=>{ html+=`<td class="${c===req?"ok":"bad"}">${c}</td>`; });
      html+=`<td class="ltot ${lineTotal===needTotal?"ok":"bad"}" title="Line minutes this quarter — must total ${needTotal}">${lineTotal}/${needTotal}</td><td></td></tr>`;
    });
    // role coverage rows: at least one of each tagged role on, every minute
    const roleBad={};
    ROLES.forEach(r=>{
      const holders=this.state.players.filter(p=>p.roles&&p.roles.includes(r.key));
      if(!holders.length) return; // role not assigned to anyone — no row
      const counts=[];
      for(let m=0;m<MINUTES;m++){
        let c=0; holders.forEach(p=>{ if(this.state.grid[p.id][q][m]) c++; });
        counts.push(c);
      }
      roleBad[r.name]=counts.filter(c=>c<1).length;
      html+=`<tr class="counts rolerow"><td class="label" style="background:${r.color};">${r.name.toUpperCase()} (${r.key}) ON</td>`;
      counts.forEach(c=>{ html+=`<td class="${c>=1?"ok":"bad"}">${c}</td>`; });
      html+=`<td colspan="2"></td></tr>`;
    });
    html+=`</tbody></table></div>`;
    html+=this.renderSubPlan(q);
    html+=this.renderPlayerSheet(q);
    document.getElementById("grids").innerHTML=html;
    this.renderStatus(lineBad,roleBad);
  },

  renderStatus(lineBad,roleBad){
    const el=document.getElementById("statusbar");
    const problems=Object.entries(lineBad).filter(([g,n])=>n>0);
    const roleProblems=Object.entries(roleBad||{}).filter(([g,n])=>n>0);
    if(problems.length===0 && roleProblems.length===0){
      el.innerHTML=`<span class="ok">&#10004; Q${this.activeQ+1} is legal — every line has the right numbers and all roles are covered for 15 minutes.</span>`;
    } else {
      const bits=problems.map(([g,n])=>`${g}: ${n} minute${n>1?"s":""} wrong`)
        .concat(roleProblems.map(([g,n])=>`No ${g} on for ${n} minute${n>1?"s":""}`));
      el.innerHTML=`<span class="bad">&#9888; Q${this.activeQ+1} — ${bits.join(" &nbsp;|&nbsp; ")}.</span>`;
    }
  },

  // ---------- swap pairing (shared by call sheet, player sheet, grid labels) ----------
  computePairs(q){
    const out=[];
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    for(let i=1;i<MINUTES;i++){
      const clock=(MINUTES-i)+":00"; // time remaining when the sub happens
      groupsOrder.forEach(g=>{
        const mem=this.state.players.filter(p=>this.effGroup(p,q)===g);
        const offs=mem.filter(p=>this.state.grid[p.id][q][i-1] && !this.state.grid[p.id][q][i]);
        const ons =mem.filter(p=>!this.state.grid[p.id][q][i-1] && this.state.grid[p.id][q][i]);
        if(!offs.length && !ons.length) return;
        // pair ON with OFF — same position first, then whoever is left
        const offsLeft=offs.slice();
        ons.forEach(on=>{
          const pos=this.posLabel(q,on.id,i);
          let idx=offsLeft.findIndex(off=>this.posLabel(q,off.id,i-1)===pos);
          if(idx<0 && offsLeft.length) idx=0;
          if(idx>=0){ out.push({i,clock,group:g,on,off:offsLeft[idx],onLabel:this.posLabel(q,on.id,i)}); offsLeft.splice(idx,1); }
          else out.push({i,clock,group:g,on,off:null,onLabel:this.posLabel(q,on.id,i)});
        });
        offsLeft.forEach(off=>out.push({i,clock,group:g,on:null,off,onLabel:""}));
      });
    }
    return out;
  },

  // ---------- sub plan (the bench call sheet) ----------
  renderSubPlan(q){
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    let inner=`<div class="print-title">${this.state.name} — Q${q+1} sub plan</div><h2 style="font-size:15px;margin:0 0 8px;">Q${q+1} SUB PLAN — bench call sheet</h2>`;

    // starting lineup
    const startBits=groupsOrder.map(g=>{
      const ms=this.state.players.filter(p=>this.effGroup(p,q)===g && this.state.grid[p.id][q][0])
        .map(p=>p.name+lbl(this.posLabel(q,p.id,0)));
      return ms.length?`<b>${g}:</b> ${ms.join(", ")}`:"";
    }).filter(Boolean);
    if(startBits.length) inner+=`<div class="startline"><b>ON AT START:</b> &nbsp;${startBits.join(" &nbsp;|&nbsp; ")}</div>`;

    const pairs=this.computePairs(q);
    if(pairs.length){
      let rows="";
      pairs.forEach(pr=>{
        rows+=`<tr><td class="t">${pr.clock}</td><td>${pr.group}</td>
          <td class="onn">${pr.on?`${pr.on.name} ON${lbl(pr.onLabel)}`:"&mdash; nobody on"}</td>
          <td class="offn">${pr.off?`${pr.off.name} OFF`:"&mdash; nobody off"}</td></tr>`;
      });
      inner+=`<table class="subtable"><thead><tr><th>Clock</th><th>Line</th><th>Coming ON</th><th>Coming OFF</th></tr></thead><tbody>${rows}</tbody></table>`;
      inner+=`<div class="hint" style="margin-top:8px;">Clock = time remaining when the sub happens. Each row is one swap: the ON player replaces the OFF player.</div>`;
    } else {
      inner+=`<div class="hint">No subs yet — paint the grid above and this call sheet builds itself.</div>`;
    }
    return `<details class="foldbox"><summary>Q${q+1} sub plan — bench call sheet<span class="fold-tag">show / hide</span></summary>
      <div class="foldbox-body">
        <button class="snapbtn no-print" onclick="app.popCleanFrom('subplan-inner-${q}','${this.state.name} - Q${q+1} sub plan')">&#128247; Full screen &amp; save image</button>
        <div id="subplan-inner-${q}" class="subplan">${inner}</div>
      </div></details>`;
  },

  // ---------- who takes who (one line per player) ----------
  renderPlayerSheet(q){
    const pairs=this.computePairs(q);
    const groupsOrder=["Strikers","Midfield","Back 4","GK"];
    let inner=`<div class="print-title">${this.state.name} — Q${q+1} who takes who</div><h2 style="font-size:15px;margin:0 0 8px;">Q${q+1} WHO TAKES WHO — one line per player</h2>`;
    let rows="";
    groupsOrder.forEach(g=>{
      this.state.players.filter(p=>this.effGroup(p,q)===g).forEach(p=>{
        if(this.qTotal(p.id,q)===0 && !pairs.some(pr=>pr.on===p||pr.off===p)) return; // not used this quarter
        const evts=[];
        if(this.state.grid[p.id][q][0]) evts.push(`<b>Start ON</b>${lbl(this.posLabel(q,p.id,0))}`);
        pairs.forEach(pr=>{
          if(pr.on===p)  evts.push(`<span class="onn">ON ${pr.clock}</span>${pr.off?` &mdash; you take <b>${pr.off.name}</b> off`:""}`);
          if(pr.off===p) evts.push(`<span class="offn">OFF ${pr.clock}</span>${pr.on?` &mdash; <b>${pr.on.name}</b> comes on for you`:""}`);
        });
        if(evts.length===1 && this.state.grid[p.id][q][0]) evts.push("full quarter &mdash; no subs");
        const cls="group-"+(g==="Back 4"?"Back":g);
        rows+=`<tr class="${cls}"><td class="name">${p.name}</td><td class="pline">${evts.join(" &nbsp;&#10148;&nbsp; ")}</td></tr>`;
      });
    });
    inner+= rows
      ? `<table class="subtable psheet"><thead><tr><th>Player</th><th>Your quarter &mdash; read left to right</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="hint">Nothing yet — paint the grid and each player gets their own line.</div>`;
    return `<details class="foldbox"><summary>Q${q+1} who takes who — one line per player<span class="fold-tag">show / hide</span></summary>
      <div class="foldbox-body">
        <button class="snapbtn no-print" onclick="app.popCleanFrom('who-inner-${q}','${this.state.name} - Q${q+1} who takes who')">&#128247; Full screen &amp; save image</button>
        <div id="who-inner-${q}" class="subplan">${inner}</div>
      </div></details>`;
  },
};
app.init();
</script>
</body>
</html>

````
