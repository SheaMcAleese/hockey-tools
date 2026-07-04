# ELV8 Rotation Builder — Design + Full Code

**What this file is:** a self-contained design doc for Shea McAleese's simple, SELLABLE hockey rotation app. The complete app source is embedded at the bottom. Drop this whole file into a fresh Claude conversation to resume work on this app without re-reading old chats.

**How to use in a new conversation:** "Read this DESIGN.md. The live file is `~/Library/CloudStorage/Dropbox/NZ Hockey/07 - Hockey Tools (Web Apps)/ELV8 Rotation Builder.html` — make [change] there." Claude should edit the live file on disk, not the copy in this doc. The embedded code is the reference snapshot as of 2026-06-25; if the live file has changed, trust the live file.

**Owner / style:** Shea McAleese, HP coach, NZ Hockey, founder of ELV8 Performance. This is the product he intends to SELL. Warm-but-direct, no flattery, no dashes (commas), no emojis unless he uses them. Tight confirm-then-build rhythm, sharp clarifying questions.

---

## What the app is
A single-file, offline HTML + localStorage tool that builds and prints hockey rotation sheets. The SIMPLE, sellable counterpart to the powerful Black Sticks Sub Sheet v2 — keep it simple; don't pile on the heavy engine. Scope is build-and-print rotation sheets, plus an optional light timer.

- localStorage key: `elv8_rotation_v1`.
- Rebuilt from (do NOT edit) `hockey-rotation.html` — Shea keeps the original.
- 3-step flow Squad → Build → Print, plus a 4th optional Time step.

## Brand / aesthetic (ELV8)
From `~/.claude/skills/elv8-video/SKILL.md`: charcoal `#222`, gold `#D4AF37`, white, font **Montserrat** (loaded via Google Fonts CDN with system fallback), uppercase emphasis, red `#FF4444` negation.
- Product brand stays "ELV8 Rotation Builder". Each buyer sets their own **team name + accent colour** (editable in-app via the ⋯ menu → Brand & colour; persisted; accent recolours the chrome).
- Chrome is ELV8 dark/gold; the printable SHEET is a clean light card with bright readable colours (START green, INTERCHANGE red, GK blue, line position tags) so it prints and reads well.
- CSS vars hold the line colours: `--str/--mid/--def/--gk`, `--start`, `--inter`.

## How to preview / verify (CloudStorage is sandbox-blocked for the server)
1. `cp "ELV8 Rotation Builder.html" /tmp/elv8preview/index.html`
2. Serve `/tmp/elv8preview` (launch.json `hockey-tools` → port 8781). Open `http://localhost:8781/index.html`.
3. Drive with preview_eval, screenshot. Clear `elv8_rotation_v1` to reset. Edit the REAL Dropbox file; re-copy to verify.

## Data model (state, persisted under elv8_rotation_v1)
`store = { team, accent, squad:[], games:[], ui:{view,gameId,q} }`.
- `squad[]`: `{id,name,line('Strikers'|'Midfield'|'Defence'|'GK'),pos}`.
- `games[]`: `{id,name,date,quarters:[4],gk}`. Each quarter: `{formId,formName,groups:[],edits:{}}`.
- `group`: `{pos(label),line,n,starters:[playerId...],inter:playerId,first(1st sub min),timing}`.
- `quarter.edits{}`: override store for the editable print sheet — keys like `pos{gi}`, `start{gi}_{i}`, `inter{gi}`, `first{gi}`, `rot{gi}`, `time{gi}`, `plays_{line}`, `formName`, `qlabel`, `gk`. Cleared when a new formation is applied.

## Key functions (search these in the code)
- `renderSquad` — squad grouped by line with colour dots.
- `renderBuild` / `applyFormation` / `updGroup` / `updStarter` — per-quarter shape + starters + interchange.
- `rotDesc(gr)` — writes the "X for Y / Y for Z" rotation text.
- `sheetHTML(g,q)` / `renderSheets` — the printable sheet. **Every cell is contenteditable** via `editCell(q,key,text)` (saves to `quarter.edits`); `edVal` reads overrides. PLAYS band per line under each block.
- `renderTime` + `timer*` (`timeStart/timeStop/timeReset/timeNudge/timeTick`) — light per-quarter countdown + sub-reminder list (the 4th step).
- `setTeam` / `applyAccent` / settings modal — branding.
- `exportData` / `importData` — backup.

## Feature map
- **Step nav:** 1 Squad → 2 Build → 3 Print → 4 Time (optional). Numbers go green when done.
- **Squad:** add players (name, line, position), grouped by line.
- **Build:** quarter tabs, pick a formation shape, set starters + interchange per line, 1st-sub + timing, rotation text auto-writes, "copy from previous quarter", usage strip.
- **Print:** bench sheet, one quarter per A4 landscape page; START green / INTERCHANGE red / GK blue; horizontal scroll on narrow screens; **fully editable cells that save back into the game**; editable PLAYS band under each block (e.g. "Lane CS / Ward RS / Thomas CS/LS").
- **Time:** optional light countdown clock per quarter + sub reminders pulled from Build.
- **Header:** ELV8 wordmark, editable team name, game switcher, Print, `⋯` menu (New/Duplicate/Delete game, Brand & colour, Export/Import).
- Formation presets carried from the original generator.

## Known limitations / open items
- PNG/screenshot export not added here (it's in the Black Sticks app). ELV8 Montserrat may not embed in any future PNG export.
- Timer is a clock + reminder list only (no auto-firing alerts yet).
- Selling decision (price, target buyer) still open — Shea decides after living with it.

## World-class backlog ideas (shared with the Black Sticks app)
Sub buzzer; live minutes-so-far; a clear "ready to play" gate; one-tap share of sheets as images; a short in-app "how to use" panel + name/price for the sellable version.

---

## FULL APP CODE (snapshot 2026-06-25)
Below is the complete `ELV8 Rotation Builder.html`. To work on it, edit the live file on disk (same name) — this block is the reference copy.

````html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ELV8 Rotation Builder</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#1c1c1c; --panel:#262626; --panel2:#2f2f2f; --line:#3c3c3c; --line2:#4a4a4a;
  --gold:#D4AF37; --accent:#D4AF37; --accent-ink:#1c1c1c;
  --text:#ffffff; --muted:#c4c4c4; --dim:#8c8c8c;
  --str:#f4a259; --mid:#3aa7e0; --def:#f3c012; --gk:#7bc47f;
  --start:#2a9d3a; --inter:#e23b2e; --bad:#e23b2e; --good:#2a9d3a;
  --font:'Montserrat',-apple-system,'Segoe UI',Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;}

/* ===== HEADER ===== */
header{background:#161616;border-bottom:1px solid var(--line);padding:0 22px;display:flex;align-items:center;gap:18px;height:62px;position:sticky;top:0;z-index:30;}
.brand{display:flex;align-items:baseline;gap:9px;flex-shrink:0;}
.brand .mark{font-weight:900;font-size:23px;letter-spacing:1px;color:var(--accent);line-height:1;}
.brand .sub{font-weight:600;font-size:11px;letter-spacing:2.5px;color:var(--dim);text-transform:uppercase;}
.team-wrap{display:flex;align-items:center;gap:8px;margin-left:6px;padding-left:18px;border-left:1px solid var(--line);}
.team-wrap .tlabel{font-size:10px;letter-spacing:1.5px;color:var(--dim);text-transform:uppercase;}
#teamName{background:transparent;border:none;color:var(--text);font-family:var(--font);font-weight:800;font-size:16px;letter-spacing:.5px;padding:4px 6px;border-radius:6px;min-width:120px;max-width:230px;}
#teamName:hover{background:var(--panel);}
#teamName:focus{outline:none;background:var(--panel);box-shadow:0 0 0 1px var(--accent);}
.head-right{margin-left:auto;display:flex;align-items:center;gap:8px;}

/* ===== GAME PICKER ===== */
.gamepick{display:flex;align-items:center;gap:6px;}
.gamepick select{background:var(--panel);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:600;font-size:13px;padding:7px 10px;border-radius:8px;cursor:pointer;}
.gamepick select:focus{outline:none;border-color:var(--accent);}

/* ===== BUTTONS ===== */
.btn{font-family:var(--font);font-weight:700;font-size:13px;padding:8px 15px;border-radius:8px;border:1px solid var(--line2);background:var(--panel);color:var(--text);cursor:pointer;transition:.13s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.btn:hover{background:var(--panel2);border-color:var(--dim);}
.btn.gold{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);}
.btn.gold:hover{filter:brightness(1.08);}
.btn.ghost{background:transparent;}
.btn.sm{padding:6px 11px;font-size:12px;}
.btn.icon{padding:8px 11px;}
.btn.danger{color:#ff8d82;border-color:#5e3330;}
.btn.danger:hover{background:#3a201e;}

/* kebab menu */
.menu-wrap{position:relative;}
.menu{position:absolute;right:0;top:46px;background:var(--panel);border:1px solid var(--line2);border-radius:10px;padding:6px;min-width:190px;box-shadow:0 14px 40px rgba(0,0,0,.5);z-index:50;display:none;}
.menu.open{display:block;}
.menu button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:none;color:var(--text);font-family:var(--font);font-weight:600;font-size:13px;padding:9px 11px;border-radius:7px;cursor:pointer;}
.menu button:hover{background:var(--panel2);}
.menu button.warn{color:#ff8d82;}
.menu .sep{height:1px;background:var(--line);margin:5px 4px;}
.menu .mlabel{font-size:10px;letter-spacing:1.5px;color:var(--dim);text-transform:uppercase;padding:8px 11px 4px;}

/* ===== STEP NAV ===== */
.steps{display:flex;gap:0;background:#161616;padding:0 22px;border-bottom:1px solid var(--line);overflow-x:auto;}
.step{display:flex;align-items:center;gap:11px;padding:15px 26px 13px;cursor:pointer;border-bottom:3px solid transparent;color:var(--dim);font-weight:700;font-size:14px;white-space:nowrap;transition:.13s;}
.step:hover{color:var(--muted);}
.step.active{color:var(--text);border-bottom-color:var(--accent);}
.step .num{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;background:var(--panel2);color:var(--dim);flex-shrink:0;}
.step.active .num{background:var(--accent);color:var(--accent-ink);}
.step.done .num{background:var(--good);color:#fff;}
.step .stitle{letter-spacing:.3px;}
.step .shint{font-size:11px;color:var(--dim);font-weight:500;letter-spacing:.2px;}
@media(max-width:760px){.step .shint{display:none;}.step{padding:14px 16px 11px;}}

/* ===== LAYOUT ===== */
main{max-width:1320px;margin:0 auto;padding:26px 22px 80px;}
.view{display:none;}
.view.active{display:block;}
.vhead{display:flex;align-items:flex-end;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.vhead h1{font-size:25px;font-weight:800;letter-spacing:.3px;}
.vhead p{color:var(--muted);font-size:13.5px;font-weight:500;margin-top:3px;max-width:560px;line-height:1.5;}
.vhead .spacer{flex:1;}

/* ===== SQUAD ===== */
.squad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;}
.pcard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px;display:flex;align-items:center;gap:11px;transition:.13s;}
.pcard:hover{border-color:var(--line2);}
.pcard .dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;}
.pcard.l-Strikers .dot{background:var(--str);} .pcard.l-Midfield .dot{background:var(--mid);}
.pcard.l-Defence .dot{background:var(--def);} .pcard.l-GK .dot{background:var(--gk);}
.pcard input.pname{flex:1;min-width:0;background:transparent;border:none;color:var(--text);font-family:var(--font);font-weight:700;font-size:15px;padding:4px;border-radius:6px;}
.pcard input.pname:hover{background:var(--panel2);}
.pcard input.pname:focus{outline:none;background:var(--panel2);box-shadow:0 0 0 1px var(--accent);}
.pcard select{background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:600;font-size:12px;padding:5px 6px;border-radius:7px;cursor:pointer;}
.pcard select:focus{outline:none;border-color:var(--accent);}
.pcard .rm{background:none;border:none;color:var(--dim);font-size:18px;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;}
.pcard .rm:hover{color:#ff8d82;background:#3a201e;}
.line-head{grid-column:1/-1;display:flex;align-items:center;gap:9px;margin:14px 2px 2px;}
.line-head:first-child{margin-top:0;}
.line-head .lh-dot{width:13px;height:13px;border-radius:50%;}
.line-head.l-Strikers .lh-dot{background:var(--str);} .line-head.l-Midfield .lh-dot{background:var(--mid);}
.line-head.l-Defence .lh-dot{background:var(--def);} .line-head.l-GK .lh-dot{background:var(--gk);}
.line-head span{font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}
.line-head small{color:var(--dim);font-weight:600;font-size:11px;}

/* ===== BUILD ===== */
.qtabs{display:flex;gap:7px;margin-bottom:18px;flex-wrap:wrap;align-items:center;}
.qtab{background:var(--panel);border:1px solid var(--line2);color:var(--muted);font-weight:800;font-size:14px;padding:9px 20px;border-radius:9px;cursor:pointer;transition:.13s;}
.qtab:hover{background:var(--panel2);}
.qtab.active{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);}
.qtab .qmini{display:block;font-size:9px;font-weight:600;letter-spacing:.5px;opacity:.7;margin-top:1px;}
.qtab.active .qmini{opacity:.85;}

.formrow{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:13px 16px;margin-bottom:16px;flex-wrap:wrap;}
.formrow label{font-size:11px;letter-spacing:1px;color:var(--dim);text-transform:uppercase;font-weight:700;}
.formrow select{background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:700;font-size:14px;padding:9px 12px;border-radius:8px;cursor:pointer;min-width:280px;}
.formrow select:focus{outline:none;border-color:var(--accent);}
.formrow .copyq{margin-left:auto;}

.unit{background:var(--panel);border:1px solid var(--line);border-radius:12px;margin-bottom:11px;overflow:hidden;}
.unit-top{display:flex;align-items:center;gap:10px;padding:11px 15px;border-left:5px solid var(--line2);}
.unit.l-Strikers .unit-top{border-left-color:var(--str);} .unit.l-Midfield .unit-top{border-left-color:var(--mid);}
.unit.l-Defence .unit-top{border-left-color:var(--def);} .unit.l-GK .unit-top{border-left-color:var(--gk);}
.unit-pos{font-weight:800;font-size:15px;letter-spacing:.5px;min-width:74px;}
.unit-slots{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;}
.slot{display:flex;flex-direction:column;gap:3px;}
.slot small{font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700;}
.slot.start small{color:var(--start);} .slot.inter small{color:var(--inter);}
.slot select{background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:700;font-size:13px;padding:7px 9px;border-radius:7px;cursor:pointer;min-width:130px;}
.slot.start select{border-bottom:2px solid var(--start);}
.slot.inter select{border-bottom:2px solid var(--inter);}
.slot select:focus{outline:none;border-color:var(--accent);}
.unit-time{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.unit-time .tg{display:flex;flex-direction:column;gap:3px;}
.unit-time small{font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:var(--dim);}
.unit-time input{width:60px;background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:700;font-size:13px;padding:7px 8px;border-radius:7px;text-align:center;}
.unit-time input.wide{width:120px;text-align:left;}
.unit-time input:focus{outline:none;border-color:var(--accent);}
.unit-desc{padding:9px 15px;background:var(--panel2);border-top:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--gold);}
.unit-desc.empty{color:var(--dim);font-weight:500;}

/* usage strip */
.usage{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:12px 15px;margin-top:18px;}
.usage .ulabel{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:var(--dim);margin-right:4px;}
.chip{font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;}
.chip.in{background:rgba(42,157,58,.18);color:#7fe095;border:1px solid rgba(42,157,58,.5);}
.chip.out{background:#2e2e2e;color:var(--dim);border:1px solid var(--line2);}

/* ===== PRINT / SHEET ===== */
.print-bar{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.print-bar select{background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:700;font-size:13px;padding:8px 11px;border-radius:8px;cursor:pointer;}
.sheet{background:#fff;color:#111;border-radius:12px;overflow:hidden;margin-bottom:26px;box-shadow:0 10px 36px rgba(0,0,0,.4);}
.sheet-top{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#1c1c1c;color:#fff;gap:14px;}
.sheet-top .st-l{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
.sheet-top .st-team{font-weight:900;font-size:17px;letter-spacing:.5px;}
.sheet-top .st-form{font-weight:800;font-size:15px;color:var(--accent);letter-spacing:.3px;}
.sheet-top .st-r{font-weight:700;font-size:11px;letter-spacing:1.5px;color:#cfcfcf;text-transform:uppercase;}
.sheet-scroll{overflow-x:auto;}
.rtable{width:100%;min-width:800px;border-collapse:collapse;table-layout:fixed;}
.rtable th,.rtable td{border:1px solid #d6d6d6;padding:7px 8px;font-size:13px;text-align:center;vertical-align:middle;overflow:hidden;}
.rtable thead th{background:#33415c;color:#fff;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:8px 6px;}
.rtable thead th.c-pos{width:78px;}
.rtable thead th.c-int{width:118px;color:#ffb3ad;}
.rtable thead th.c-rot{width:78px;color:#bcd3ff;}
.rtable thead th.c-time{width:104px;color:#ffe08a;}
.rtable thead th.c-start{color:#a7f3b4;}
.rtable td.pos{background:#33415c;color:#fff;font-weight:800;font-size:13px;}
.rtable td.start{background:#2a9d3a;color:#fff;font-weight:800;}
.rtable td.start .ptag{display:block;font-size:9px;font-weight:700;opacity:.85;letter-spacing:.5px;margin-top:1px;}
.rtable td.empty{background:#fafafa;}
.rtable td.inter{background:#e23b2e;color:#fff;font-weight:800;}
.rtable td.firstrot{background:#33415c;color:#fff;font-weight:800;font-size:15px;}
.rtable td.rot{font-size:11.5px;color:#222;white-space:normal;line-height:1.4;background:#fff;}
.rtable td.time{font-weight:800;font-size:12px;background:#fff;color:#222;}
.rtable td.gk{background:#9bc2e6;font-weight:800;}
.rtable tr.sectspace td{border:none;height:9px;background:#fff;padding:0;}
.qlabel{text-align:center;font-weight:900;font-size:20px;letter-spacing:2px;padding:11px;background:#1c1c1c;color:var(--accent);}

.empty-state{text-align:center;padding:70px 20px;color:var(--dim);}
.empty-state .big{font-size:18px;font-weight:800;color:var(--muted);margin-bottom:8px;}

/* editable print cells */
.rtable td.ce,.st-team.ce,.st-form.ce,.qlabel.ce{outline:none;}
.rtable td.ce:hover{box-shadow:inset 0 0 0 2px rgba(212,175,55,.55);cursor:text;}
.rtable td.ce:focus{box-shadow:inset 0 0 0 2px var(--accent);background:#fffceb;}
.st-team.ce:focus,.st-form.ce:focus,.qlabel.ce:focus{outline:1px dashed var(--accent);border-radius:4px;}
.edit-note{color:var(--dim);font-size:12px;font-weight:600;}
/* positions band under each block */
.rtable tr.playsrow td{border:1px solid #d6d6d6;padding:0;}
.rtable td.plays-lbl{background:#33415c;color:#fff;font-size:9px;font-weight:800;letter-spacing:.5px;text-align:center;}
.rtable td.plays-cell{background:#fbfbf4;color:#222;font-size:11.5px;font-weight:700;text-align:left;padding:6px 10px;white-space:normal;}
.rtable td.plays-cell:empty::before{content:attr(data-ph);color:#b3b3b3;font-weight:500;}
.rtable td.plays-cell:hover{box-shadow:inset 0 0 0 2px rgba(212,175,55,.55);cursor:text;}
.rtable td.plays-cell:focus{box-shadow:inset 0 0 0 2px var(--accent);background:#fffceb;}

/* match timer (Time step) */
.clockwrap{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;text-align:center;margin-bottom:18px;}
.clockwrap.running{border-color:var(--good);box-shadow:0 0 0 1px var(--good);}
.clock{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:64px;font-weight:800;letter-spacing:3px;line-height:1;}
.clockwrap.running .clock{color:#7fe095;}
.clockbtns{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:16px;}
.clockhint{color:var(--dim);font-size:12px;font-weight:500;margin-top:12px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.5;}
.trem-head{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;color:var(--dim);margin:6px 2px 10px;}
.trem{display:flex;flex-direction:column;gap:9px;}
.trow{display:flex;gap:14px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:12px 15px;}
.trow-pos{font-weight:800;font-size:15px;min-width:78px;color:var(--accent);}
.trow-body{flex:1;min-width:0;}
.trow-first{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:2px;}
.trow-rot{font-size:13px;font-weight:600;color:var(--text);}

/* settings modal */
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:90;align-items:center;justify-content:center;padding:20px;}
.overlay.open{display:flex;}
.modal{background:var(--panel);border:1px solid var(--line2);border-radius:16px;padding:24px;width:100%;max-width:440px;box-shadow:0 24px 70px rgba(0,0,0,.6);}
.modal h2{font-size:18px;font-weight:800;margin-bottom:4px;}
.modal p.sub{color:var(--muted);font-size:13px;margin-bottom:18px;}
.modal .field{margin-bottom:18px;}
.modal .field label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);font-weight:700;margin-bottom:7px;}
.modal .field input[type=text]{width:100%;background:var(--panel2);border:1px solid var(--line2);color:var(--text);font-family:var(--font);font-weight:700;font-size:15px;padding:11px 13px;border-radius:9px;}
.modal .field input:focus{outline:none;border-color:var(--accent);}
.swatches{display:flex;gap:10px;flex-wrap:wrap;}
.sw{width:42px;height:42px;border-radius:10px;cursor:pointer;border:3px solid transparent;transition:.12s;}
.sw:hover{transform:scale(1.06);}
.sw.sel{border-color:#fff;box-shadow:0 0 0 2px var(--bg),0 0 0 4px currentColor;}
.modal .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:8px;}

/* ===== PRINT ===== */
@page{size:A4 landscape;margin:9mm;}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  header,.steps,.print-bar,.no-print{display:none!important;}
  body{background:#fff;}
  main{padding:0;max-width:none;}
  .view{display:none!important;}
  .view#v-print{display:block!important;}
  .sheet{box-shadow:none;border-radius:0;margin:0 0 4mm;page-break-after:always;}
  .sheet:last-child{page-break-after:auto;}
  .rtable td.rot{font-size:11px;}
  .rtable td.ce:hover,.rtable td.ce:focus,.rtable td.plays-cell:hover,.rtable td.plays-cell:focus{box-shadow:none!important;background:inherit!important;}
  .rtable td.plays-cell:empty::before{content:""!important;}
  .rtable tr.playsrow:has(td.plays-cell:empty){display:none;}
}
</style>
</head>
<body>

<header>
  <div class="brand"><span class="mark">ELV8</span><span class="sub">Rotation Builder</span></div>
  <div class="team-wrap">
    <span class="tlabel">Team</span>
    <input type="text" id="teamName" placeholder="Your team" maxlength="34" onchange="app.setTeam(this.value)">
  </div>
  <div class="head-right">
    <div class="gamepick">
      <select id="gameSel" onchange="app.loadGame(this.value)" title="Switch game"></select>
    </div>
    <button class="btn gold sm" onclick="app.go('print')">🖨 Print</button>
    <div class="menu-wrap">
      <button class="btn icon ghost" onclick="app.toggleMenu(event)" title="More">⋯</button>
      <div class="menu" id="mainMenu">
        <div class="mlabel">Games</div>
        <button onclick="app.newGame()">＋ New game</button>
        <button onclick="app.duplicateGame()">⧉ Duplicate this game</button>
        <button class="warn" onclick="app.deleteGame()">🗑 Delete this game</button>
        <div class="sep"></div>
        <div class="mlabel">Data</div>
        <button onclick="app.openSettings()">⚙ Brand &amp; colour</button>
        <button onclick="app.exportData()">⬇ Export backup</button>
        <button onclick="document.getElementById('importFile').click()">⬆ Import backup</button>
        <input type="file" id="importFile" accept=".json" style="display:none" onchange="app.importData(this)">
      </div>
    </div>
  </div>
</header>

<div class="steps">
  <div class="step" data-s="squad" onclick="app.go('squad')">
    <span class="num">1</span><span><span class="stitle">Squad</span><br><span class="shint">Add your players</span></span>
  </div>
  <div class="step" data-s="build" onclick="app.go('build')">
    <span class="num">2</span><span><span class="stitle">Build</span><br><span class="shint">Set your rotations</span></span>
  </div>
  <div class="step" data-s="print" onclick="app.go('print')">
    <span class="num">3</span><span><span class="stitle">Print</span><br><span class="shint">Your bench sheet</span></span>
  </div>
  <div class="step" data-s="time" onclick="app.go('time')">
    <span class="num">4</span><span><span class="stitle">Time</span><br><span class="shint">Match timer · optional</span></span>
  </div>
</div>

<main>
  <!-- SQUAD -->
  <section class="view" id="v-squad">
    <div class="vhead">
      <div><h1>Squad</h1><p>Add every player once. Set their line and main position. You build rotations from this list in the next step.</p></div>
      <div class="spacer"></div>
      <button class="btn gold" onclick="app.addPlayer()">＋ Add player</button>
    </div>
    <div class="squad-grid" id="squadGrid"></div>
  </section>

  <!-- BUILD -->
  <section class="view" id="v-build">
    <div class="vhead">
      <div><h1>Build rotations</h1><p>Pick a shape for the quarter, then set who starts and who interchanges in each line. The rotation writes itself underneath.</p></div>
    </div>
    <div class="qtabs" id="qtabs"></div>
    <div class="formrow">
      <label>Shape</label>
      <select id="formSel" onchange="app.applyFormation(this.value)"></select>
      <button class="btn sm copyq" id="copyBtn" onclick="app.copyPrev()">⧉ Copy from previous quarter</button>
    </div>
    <div id="units"></div>
    <div class="usage" id="usage"></div>
  </section>

  <!-- PRINT -->
  <section class="view" id="v-print">
    <div class="print-bar no-print">
      <button class="btn gold" onclick="window.print()">🖨 Print / Save PDF</button>
      <select id="printScope" onchange="app.renderSheets()">
        <option value="all">All four quarters</option>
        <option value="0">Quarter 1 only</option>
        <option value="1">Quarter 2 only</option>
        <option value="2">Quarter 3 only</option>
        <option value="3">Quarter 4 only</option>
      </select>
      <span class="edit-note">✎ Tap any cell to edit it — changes save automatically. Print in landscape, one quarter per page.</span>
    </div>
    <div id="sheets"></div>
  </section>

  <!-- TIME -->
  <section class="view" id="v-time">
    <div class="vhead">
      <div><h1>Match timer</h1><p>Optional. A simple per-quarter countdown with your sub reminders pulled from the Build step. Use it on the bench, or ignore it.</p></div>
    </div>
    <div id="timePanel"></div>
  </section>
</main>

<!-- SETTINGS -->
<div class="overlay" id="settingsOverlay">
  <div class="modal">
    <h2>Brand &amp; colour</h2>
    <p class="sub">Make it yours. Set your team name and pick an accent colour for the app.</p>
    <div class="field">
      <label>Team name</label>
      <input type="text" id="setTeam" maxlength="34" placeholder="e.g. Hawke's Bay U18">
    </div>
    <div class="field">
      <label>Accent colour</label>
      <div class="swatches" id="swatches"></div>
    </div>
    <div class="actions">
      <button class="btn ghost" onclick="app.closeSettings()">Cancel</button>
      <button class="btn gold" onclick="app.saveSettings()">Save</button>
    </div>
  </div>
</div>

<script>
// =========================================================
// ELV8 ROTATION BUILDER  —  single-file, offline, localStorage
// =========================================================
const LINES = ["Strikers","Midfield","Defence","GK"];
const POSITIONS = {
  Strikers:["LS","CS","RS"],
  Midfield:["LM","CM","RM","FM"],
  Defence:["LH","CB","RH","FM","WH"],
  GK:["GK"]
};
const ALL_POS = ["LS","CS","RS","LM","CM","RM","FM","LH","CB","RH","WH","GK"];

const ACCENTS = ["#D4AF37","#3aa7e0","#e23b2e","#2a9d3a","#9b59b6","#e67e22","#ec407a","#26c6da"];

// rotationType: 1 = 1-for-1 (1 starter + 1 inter), or cycle of N starters + 1 inter
const FORMATIONS = [
  { id:"f1", name:"6 @ BACK – 5 MF – 5 STR", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"LS / CS",line:"Strikers",starters:2},
    {pos:"CM",line:"Midfield",starters:1}, {pos:"RM / LM",line:"Midfield",starters:2},
    {pos:"LH / RH",line:"Defence",starters:2}, {pos:"CB / FD",line:"Defence",starters:2} ]},
  { id:"f2", name:"5 DEF – 5 MF – 6 STR", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"CS",line:"Strikers",starters:1}, {pos:"LS",line:"Strikers",starters:1},
    {pos:"RM",line:"Midfield",starters:1}, {pos:"CM / LM",line:"Midfield",starters:2},
    {pos:"FM / CB / WH",line:"Defence",starters:4} ]},
  { id:"f3", name:"3 @ BACK (5) – 6 MF – 5 STR", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"LS / CS",line:"Strikers",starters:2},
    {pos:"RM / LM",line:"Midfield",starters:2}, {pos:"FM / CM",line:"Midfield",starters:2},
    {pos:"LH / CB",line:"Defence",starters:2}, {pos:"RH",line:"Defence",starters:1} ]},
  { id:"f4", name:"6 DEF – 4 MF – 6 STR", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"CS",line:"Strikers",starters:1}, {pos:"LS",line:"Strikers",starters:1},
    {pos:"CM / LM / RM",line:"Midfield",starters:3},
    {pos:"LH / RH",line:"Defence",starters:2}, {pos:"CB / FD",line:"Defence",starters:2} ]},
  { id:"f5", name:"3 @ BACK – 2+2 MF – 6 STR", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"CS",line:"Strikers",starters:1}, {pos:"LS",line:"Strikers",starters:1},
    {pos:"RM / LM",line:"Midfield",starters:2}, {pos:"FM / CM",line:"Midfield",starters:2},
    {pos:"LH / CB / RH",line:"Defence",starters:3} ]},
  { id:"f6", name:"Even lines – 1 for 1 (simple)", groups:[
    {pos:"RS",line:"Strikers",starters:1}, {pos:"CS",line:"Strikers",starters:1}, {pos:"LS",line:"Strikers",starters:1},
    {pos:"RM",line:"Midfield",starters:1}, {pos:"CM",line:"Midfield",starters:1}, {pos:"LM",line:"Midfield",starters:1},
    {pos:"RH",line:"Defence",starters:1}, {pos:"CB",line:"Defence",starters:1}, {pos:"LH",line:"Defence",starters:1}, {pos:"FM",line:"Defence",starters:1} ]},
];

const STORE = "elv8_rotation_v1";
function uid(){ return Math.random().toString(36).slice(2,9); }

const app = {
  store:{ team:"Your Team", accent:"#D4AF37", squad:[], games:[], ui:{view:"squad",gameId:null,q:0} },

  // ---------- persistence ----------
  load(){
    try{ const r=localStorage.getItem(STORE); if(r) this.store=Object.assign(this.store,JSON.parse(r)); }catch(e){}
    if(!this.store.squad || !this.store.squad.length) this.store.squad = this.defaultSquad();
    if(!this.store.games || !this.store.games.length) this.newGame("Game 1", true);
    if(!this.store.ui) this.store.ui={view:"squad",gameId:this.store.games[0].id,q:0};
    if(!this.store.ui.gameId || !this.store.games.find(g=>g.id===this.store.ui.gameId)) this.store.ui.gameId=this.store.games[0].id;
  },
  save(){ localStorage.setItem(STORE, JSON.stringify(this.store)); },

  defaultSquad(){
    const mk=(n,l,p)=>({id:uid(),name:n,line:l,pos:p});
    return [
      mk("Player 1","Strikers","RS"), mk("Player 2","Strikers","CS"), mk("Player 3","Strikers","LS"), mk("Player 4","Strikers","CS"),
      mk("Player 5","Midfield","CM"), mk("Player 6","Midfield","RM"), mk("Player 7","Midfield","LM"), mk("Player 8","Midfield","CM"),
      mk("Player 9","Defence","RH"), mk("Player 10","Defence","CB"), mk("Player 11","Defence","LH"), mk("Player 12","Defence","FM"), mk("Player 13","Defence","CB"),
      mk("Keeper 1","GK","GK"), mk("Keeper 2","GK","GK"),
    ];
  },

  // ---------- games ----------
  curGame(){ return this.store.games.find(g=>g.id===this.store.ui.gameId); },
  blankQuarters(){ return [0,1,2,3].map(()=>({ formId:"", formName:"", groups:[] })); },
  newGame(name, silent){
    const nm = name || prompt("Name for the new game:", "Game "+(this.store.games.length+1));
    if(!nm) return;
    const g={ id:uid(), name:nm.trim(), date:"", quarters:this.blankQuarters(), gk:["",""] };
    this.store.games.push(g);
    this.store.ui.gameId=g.id; this.store.ui.q=0;
    if(!silent){ this.save(); this.renderAll(); }
  },
  duplicateGame(){
    const g=this.curGame(); if(!g) return;
    const copy=JSON.parse(JSON.stringify(g)); copy.id=uid(); copy.name=g.name+" copy";
    this.store.games.push(copy); this.store.ui.gameId=copy.id;
    this.save(); this.renderAll(); this.closeMenu();
  },
  deleteGame(){
    if(this.store.games.length<=1){ alert("This is your only game — make a new one first."); return; }
    const g=this.curGame();
    if(!confirm('Delete "'+g.name+'"? This cannot be undone.')) return;
    this.store.games=this.store.games.filter(x=>x.id!==g.id);
    this.store.ui.gameId=this.store.games[0].id;
    this.save(); this.renderAll(); this.closeMenu();
  },
  loadGame(id){ this.store.ui.gameId=id; this.store.ui.q=0; this.save(); this.renderAll(); },

  // ---------- nav ----------
  go(view){ this.store.ui.view=view; this.save(); this.renderAll(); window.scrollTo(0,0); },
  setQ(q){ this.store.ui.q=q; this.save(); this.renderBuild(); },

  // ---------- team / settings ----------
  setTeam(v){ this.store.team=(v||"").trim()||"Your Team"; this.save(); this.renderSheetsIfActive(); },
  applyAccent(){ document.documentElement.style.setProperty("--accent", this.store.accent||"#D4AF37");
    // pick readable ink for buttons
    const ink = this.contrastInk(this.store.accent||"#D4AF37");
    document.documentElement.style.setProperty("--accent-ink", ink); },
  contrastInk(hex){ const c=hex.replace("#",""); const r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
    return (r*299+g*587+b*114)/1000 > 150 ? "#1c1c1c" : "#ffffff"; },
  openSettings(){ this.closeMenu();
    document.getElementById("setTeam").value=this.store.team;
    const sw=document.getElementById("swatches");
    sw.innerHTML=ACCENTS.map(c=>`<div class="sw ${c===this.store.accent?'sel':''}" style="background:${c};color:${c}" onclick="app._pickAccent('${c}',this)"></div>`).join("");
    this._pendingAccent=this.store.accent;
    document.getElementById("settingsOverlay").classList.add("open");
  },
  _pickAccent(c,el){ this._pendingAccent=c; document.querySelectorAll(".sw").forEach(s=>s.classList.remove("sel")); el.classList.add("sel"); },
  closeSettings(){ document.getElementById("settingsOverlay").classList.remove("open"); },
  saveSettings(){
    this.store.team=document.getElementById("setTeam").value.trim()||"Your Team";
    this.store.accent=this._pendingAccent||this.store.accent;
    this.applyAccent(); this.save(); this.closeSettings(); this.renderAll();
  },

  // ---------- menu ----------
  toggleMenu(e){ e.stopPropagation(); document.getElementById("mainMenu").classList.toggle("open"); },
  closeMenu(){ document.getElementById("mainMenu").classList.remove("open"); },

  // ---------- squad ----------
  addPlayer(){ this.store.squad.push({id:uid(),name:"New player",line:"Strikers",pos:"RS"}); this.save(); this.renderSquad(); },
  removePlayer(id){ const p=this.store.squad.find(x=>x.id===id); if(!confirm("Remove "+p.name+"?")) return;
    this.store.squad=this.store.squad.filter(x=>x.id!==id);
    // also clear from any assignments
    this.store.games.forEach(g=>g.quarters.forEach(q=>q.groups.forEach(gr=>{
      gr.starters=(gr.starters||[]).map(s=>s===id?"":s); if(gr.inter===id)gr.inter="";
    })));
    this.save(); this.renderSquad();
  },
  updatePlayer(id,f,v){ const p=this.store.squad.find(x=>x.id===id); if(!p) return;
    p[f]=v; if(f==="line"){ p.pos = (POSITIONS[v]&&POSITIONS[v][0])||p.pos; if(v==="GK")p.pos="GK"; }
    this.save(); this.renderSquad();
  },

  // ---------- formations ----------
  applyFormation(fid){
    const g=this.curGame(); const q=this.store.ui.q;
    const f=FORMATIONS.find(x=>x.id===fid); if(!f){ return; }
    g.quarters[q].formId=fid; g.quarters[q].formName=f.name;
    g.quarters[q].groups=f.groups.map(gr=>({
      pos:gr.pos, line:gr.line, n:gr.starters,
      starters:Array.from({length:gr.starters},()=>""), inter:"",
      first:4, timing:gr.starters>1?"3 off":"4 on 4 off"
    }));
    g.quarters[q].edits={}; // new shape — clear any hand edits from the old one
    this.save(); this.renderBuild();
  },
  copyPrev(){
    const g=this.curGame(); const q=this.store.ui.q; if(q===0) return;
    g.quarters[q]=JSON.parse(JSON.stringify(g.quarters[q-1]));
    this.save(); this.renderBuild();
  },
  updGroup(gi,f,v){ const g=this.curGame(); const q=this.store.ui.q; const gr=g.quarters[q].groups[gi]; if(!gr)return;
    if(f==="first"){ let n=parseInt(v,10); gr.first=isNaN(n)?"":Math.max(0,Math.min(15,n)); } else gr[f]=v;
    this.save(); this.renderBuild();
  },
  updStarter(gi,si,v){ const g=this.curGame(); const q=this.store.ui.q; const gr=g.quarters[q].groups[gi]; if(!gr)return;
    gr.starters[si]=v; this.save(); this.renderBuild();
  },

  // ---------- rotation text ----------
  pName(id){ const p=this.store.squad.find(x=>x.id===id); return p?p.name:""; },
  rotDesc(gr){
    const st=(gr.starters||[]).filter(Boolean).map(id=>this.pName(id));
    const inter=gr.inter?this.pName(gr.inter):"";
    if(!st.length || !inter) return "";
    if(st.length===1) return `1 for 1 ${inter.toUpperCase()} – ${st[0].toUpperCase()}`;
    const parts=[`${inter} for ${st[st.length-1]}`];
    for(let i=st.length-1;i>0;i--) parts.push(`${st[i]} for ${st[i-1]}`);
    parts.push(`${st[0]} for ${inter}`);
    return parts.join(" / ");
  },

  // =======================================================
  // RENDER
  // =======================================================
  renderAll(){
    this.renderHeader();
    this.renderSteps();
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    const v=this.store.ui.view;
    document.getElementById("v-"+v).classList.add("active");
    if(v==="squad") this.renderSquad();
    if(v==="build") this.renderBuild();
    if(v==="print") this.renderSheets();
    if(v==="time") this.renderTime();
  },
  renderHeader(){
    document.getElementById("teamName").value=this.store.team;
    const sel=document.getElementById("gameSel");
    sel.innerHTML=this.store.games.map(g=>`<option value="${g.id}" ${g.id===this.store.ui.gameId?"selected":""}>${this.esc(g.name)}</option>`).join("");
  },
  renderSteps(){
    const v=this.store.ui.view;
    const squadDone=this.store.squad.length>0;
    const buildDone=this.curGame()&&this.curGame().quarters.some(q=>q.groups.length&&q.groups.some(gr=>gr.starters.some(Boolean)&&gr.inter));
    document.querySelectorAll(".step").forEach(s=>{
      const k=s.dataset.s;
      s.classList.toggle("active", k===v);
      s.classList.toggle("done", (k==="squad"&&squadDone&&v!=="squad") || (k==="build"&&buildDone&&v==="print"));
    });
  },

  renderSquad(){
    const grid=document.getElementById("squadGrid");
    let html="";
    LINES.forEach(line=>{
      const mem=this.store.squad.filter(p=>p.line===line);
      if(!mem.length) return;
      const cls="l-"+line;
      const cnt={Strikers:"Forwards",Midfield:"Midfielders",Defence:"Defenders",GK:"Goalkeepers"}[line];
      html+=`<div class="line-head ${cls}"><span class="lh-dot"></span><span>${line}</span><small>${mem.length} ${cnt.toLowerCase()}</small></div>`;
      mem.forEach(p=>{
        const posOpts=(POSITIONS[line]||ALL_POS).map(x=>`<option ${x===p.pos?"selected":""}>${x}</option>`).join("");
        html+=`<div class="pcard ${cls}">
          <span class="dot"></span>
          <input class="pname" value="${this.esc(p.name)}" onchange="app.updatePlayer('${p.id}','name',this.value)">
          <select onchange="app.updatePlayer('${p.id}','line',this.value)" title="Line">${LINES.map(l=>`<option ${l===p.line?"selected":""}>${l}</option>`).join("")}</select>
          <select onchange="app.updatePlayer('${p.id}','pos',this.value)" title="Position">${posOpts}</select>
          <button class="rm" onclick="app.removePlayer('${p.id}')" title="Remove">×</button>
        </div>`;
      });
    });
    grid.innerHTML=html || `<div class="empty-state"><div class="big">No players yet</div>Add your squad to get started.</div>`;
  },

  renderBuild(){
    const g=this.curGame(); const q=this.store.ui.q;
    // q tabs
    document.getElementById("qtabs").innerHTML=[0,1,2,3].map(i=>{
      const qq=g.quarters[i];
      const set=qq.groups.length?(qq.formName||"Set"):"Not set";
      return `<button class="qtab ${i===q?"active":""}" onclick="app.setQ(${i})">Q${i+1}<span class="qmini">${this.esc(set)}</span></button>`;
    }).join("");
    // formation select
    document.getElementById("formSel").innerHTML=`<option value="">Choose a shape…</option>`+
      FORMATIONS.map(f=>`<option value="${f.id}" ${g.quarters[q].formId===f.id?"selected":""}>${f.name}</option>`).join("");
    document.getElementById("copyBtn").style.display = q===0 ? "none":"inline-flex";

    const groups=g.quarters[q].groups;
    const wrap=document.getElementById("units");
    if(!groups.length){
      wrap.innerHTML=`<div class="empty-state"><div class="big">Pick a shape above</div>Choose how many sit in each line, then set your starters and interchange.</div>`;
      document.getElementById("usage").innerHTML=""; return;
    }
    // assigned ids in THIS quarter (to grey out duplicates)
    const used=new Set();
    groups.forEach(gr=>{ (gr.starters||[]).forEach(s=>s&&used.add(s)); if(gr.inter)used.add(gr.inter); });

    const opt=(line,cur,exclude)=>{
      let o=`<option value="">—</option>`;
      // players of this line first, then the rest
      const pool=this.store.squad.slice().sort((a,b)=>(a.line===line?0:1)-(b.line===line?0:1));
      pool.forEach(p=>{
        if(used.has(p.id)&&p.id!==cur&&!exclude) return; // hide already-used unless it's the current value
        const tag=p.line!==line?` · ${p.pos}`:"";
        o+=`<option value="${p.id}" ${p.id===cur?"selected":""}>${this.esc(p.name)}${tag}</option>`;
      });
      return o;
    };

    let html="";
    groups.forEach((gr,gi)=>{
      const cls="l-"+gr.line;
      let slots="";
      gr.starters.forEach((sid,si)=>{
        slots+=`<div class="slot start"><small>Start ${gr.starters.length>1?(si+1):""}</small>
          <select onchange="app.updStarter(${gi},${si},this.value)">${opt(gr.line,sid,false)}</select></div>`;
      });
      slots+=`<div class="slot inter"><small>Interchange</small>
        <select onchange="app.updGroup(${gi},'inter',this.value)">${opt(gr.line,gr.inter,false)}</select></div>`;
      const desc=this.rotDesc(gr);
      html+=`<div class="unit ${cls}">
        <div class="unit-top">
          <div class="unit-pos">${this.esc(gr.pos)}</div>
          <div class="unit-slots">${slots}</div>
          <div class="unit-time">
            <div class="tg"><small>1st sub</small><input type="number" min="0" max="15" value="${gr.first}" onchange="app.updGroup(${gi},'first',this.value)"></div>
            <div class="tg"><small>Timing</small><input class="wide" type="text" value="${this.esc(gr.timing||'')}" placeholder="e.g. 4 on 4 off" onchange="app.updGroup(${gi},'timing',this.value)"></div>
          </div>
        </div>
        <div class="unit-desc ${desc?'':'empty'}">${desc||"Pick a starter and an interchange to see the rotation."}</div>
      </div>`;
    });
    wrap.innerHTML=html;

    // usage strip
    const assigned=new Set(used);
    const chips=this.store.squad.map(p=>`<span class="chip ${assigned.has(p.id)?'in':'out'}">${this.esc(p.name)}</span>`).join("");
    document.getElementById("usage").innerHTML=`<span class="ulabel">In this quarter</span>${chips}`;
  },

  renderSheetsIfActive(){ if(this.store.ui.view==="print") this.renderSheets(); },
  renderSheets(){
    const g=this.curGame();
    const scope=document.getElementById("printScope")?document.getElementById("printScope").value:"all";
    const qs = scope==="all" ? [0,1,2,3] : [parseInt(scope,10)];
    const out=document.getElementById("sheets");
    const any=g.quarters.some(q=>q.groups.length);
    if(!any){ out.innerHTML=`<div class="empty-state"><div class="big">Nothing to print yet</div>Go to Build and set up at least one quarter.</div>`; return; }
    out.innerHTML=qs.map(q=>this.sheetHTML(g,q)).filter(Boolean).join("");
  },
  // override store per quarter — lets the printed sheet be hand-edited and saved
  edVal(Q,key){ return (Q.edits && Q.edits[key]!==undefined) ? Q.edits[key] : null; },
  editCell(q,key,text){
    const Q=this.curGame().quarters[q]; if(!Q) return;
    if(!Q.edits) Q.edits={};
    Q.edits[key]=String(text==null?"":text).replace(/ /g," ").replace(/\s+$/,"");
    this.save();
  },
  lineLabel(l){ return {Strikers:"Strikers",Midfield:"Midfield",Defence:"Defence",GK:"Goalkeepers"}[l]||l; },
  sheetHTML(g,q){
    const Q=g.quarters[q];
    if(!Q.groups.length) return "";
    if(!Q.edits) Q.edits={};
    const maxStart=Math.max(1,...Q.groups.map(gr=>gr.starters.length));
    const cols=maxStart+5;
    // editable cell helper: ov override wins, else escaped fallback
    const cell=(cls,key,fallbackHtml)=>{
      const ov=this.edVal(Q,key);
      const inner = ov!==null ? this.esc(ov) : fallbackHtml;
      return `<td class="${cls} ce" contenteditable="true" onblur="app.editCell(${q},'${key}',this.innerText)">${inner}</td>`;
    };
    const playsBand=line=>{
      const ov=this.edVal(Q,"plays_"+line);
      const inner = ov!==null ? this.esc(ov) : "";
      return `<tr class="playsrow"><td class="plays-lbl">PLAYS</td>
        <td class="plays-cell ce" colspan="${cols-1}" contenteditable="true" data-ph="who plays where — e.g. Lane CS / Ward RS / Thomas CS/LS" onblur="app.editCell(${q},'plays_${line}',this.innerText)">${inner}</td></tr>`;
    };

    let rows=""; let lastLine="";
    Q.groups.forEach((gr,gi)=>{
      if(lastLine && gr.line!==lastLine){ rows+=playsBand(lastLine); rows+=`<tr class="sectspace"><td colspan="${cols}"></td></tr>`; }
      lastLine=gr.line;
      let cells="";
      for(let i=0;i<maxStart;i++){
        const sid=gr.starters[i];
        const key='start'+gi+'_'+i;
        const ov=this.edVal(Q,key);
        let fb="", filled=false;
        if(sid){ const p=this.store.squad.find(x=>x.id===sid); fb=this.esc(this.pName(sid))+(p&&p.pos?`<span class="ptag">${p.pos}</span>`:""); filled=true; }
        const inner = ov!==null ? this.esc(ov) : fb;
        const cls = (ov!==null && ov!=="") || filled ? "start" : "empty";
        cells+=`<td class="${cls} ce" contenteditable="true" onblur="app.editCell(${q},'${key}',this.innerText)">${inner}</td>`;
      }
      rows+=`<tr>
        ${cell("pos","pos"+gi,this.esc(gr.pos))}
        ${cells}
        ${cell("inter","inter"+gi,this.esc(this.pName(gr.inter)))}
        ${cell("firstrot","first"+gi,gr.first!==""?gr.first:"")}
        ${cell("rot","rot"+gi,this.esc(this.rotDesc(gr)))}
        ${cell("time","time"+gi,this.esc(gr.timing||""))}
      </tr>`;
    });
    if(lastLine) rows+=playsBand(lastLine);

    // GK row (editable)
    const gks=this.store.squad.filter(p=>p.line==="GK").map(p=>p.name);
    const gkTxt = gks.length?gks.join(" or "):"GK";
    rows+=`<tr class="sectspace"><td colspan="${cols}"></td></tr>`;
    rows+=`<tr>
      <td class="pos">GK</td>
      ${(()=>{const ov=this.edVal(Q,"gk");return `<td class="gk ce" colspan="${maxStart}" contenteditable="true" onblur="app.editCell(${q},'gk',this.innerText)">${ov!==null?this.esc(ov):this.esc(gkTxt)}</td>`;})()}
      <td class="gk"></td>
      ${cell("firstrot","gkfirst","15")}
      ${cell("rot","gkrot",this.esc(gkTxt)+" — full quarter")}
      ${cell("time","gktime","15 on")}
    </tr>`;

    const formOv=this.edVal(Q,"formName");
    const qlabelOv=this.edVal(Q,"qlabel");
    return `<div class="sheet">
      <div class="sheet-top">
        <div class="st-l"><span class="st-team ce" contenteditable="true" onblur="app.setTeam(this.innerText)">${this.esc(this.store.team)}</span>
        <span class="st-form ce" contenteditable="true" onblur="app.editCell(${q},'formName',this.innerText)">${formOv!==null?this.esc(formOv):this.esc(Q.formName||"")}</span></div>
        <span class="st-r">Take the same person off each time</span>
      </div>
      <div class="sheet-scroll"><table class="rtable">
        <colgroup><col style="width:78px">${Array.from({length:maxStart}).map(()=>'<col>').join("")}<col style="width:118px"><col style="width:78px"><col><col style="width:104px"></colgroup>
        <thead><tr>
          <th class="c-pos">Pos</th>
          <th class="c-start" colspan="${maxStart}">Start</th>
          <th class="c-int">Interchange</th>
          <th class="c-rot">1st rot</th>
          <th>Rotation</th>
          <th class="c-time">Timing</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="qlabel ce" contenteditable="true" onblur="app.editCell(${q},'qlabel',this.innerText)">${qlabelOv!==null?this.esc(qlabelOv):"QUARTER "+(q+1)}</div>
    </div>`;
  },

  // ---------- match timer (light, optional) ----------
  timer:{q:0, remaining:900, running:false, _iv:null, _last:0},
  fmtClock(s){ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); },
  timeSetQ(i){ this.timer.q=i; this.timeStop(); this.timer.remaining=900; this.renderTime(); },
  timeStart(){
    if(this.timer.running){ this.timeStop(); return; }
    if(this.timer.remaining<=0) this.timer.remaining=900;
    this.timer.running=true; this.timer._last=Date.now();
    this.timer._iv=setInterval(()=>this.timeTick(),250);
    this.renderTime();
  },
  timeStop(){ this.timer.running=false; if(this.timer._iv){ clearInterval(this.timer._iv); this.timer._iv=null; } },
  timeReset(){ this.timeStop(); this.timer.remaining=900; this.renderTime(); },
  timeNudge(s){ this.timer.remaining=Math.max(0,Math.min(900,this.timer.remaining+s)); this.renderTime(); },
  timeTick(){
    if(!this.timer.running) return;
    const now=Date.now(); this.timer.remaining=Math.max(0,this.timer.remaining-(now-this.timer._last)/1000); this.timer._last=now;
    const c=document.getElementById("bigClock"); if(c) c.textContent=this.fmtClock(this.timer.remaining);
    if(this.timer.remaining<=0){ this.timeStop(); this.renderTime(); }
  },
  renderTime(){
    const panel=document.getElementById("timePanel"); if(!panel) return;
    const g=this.curGame(); const q=this.timer.q; const Q=g.quarters[q];
    const qtabs=[0,1,2,3].map(i=>`<button class="qtab ${i===q?"active":""}" onclick="app.timeSetQ(${i})">Q${i+1}</button>`).join("");
    let rem="";
    if(Q && Q.groups.length){
      Q.groups.forEach(gr=>{
        const desc=this.rotDesc(gr);
        rem+=`<div class="trow"><div class="trow-pos">${this.esc(gr.pos)}</div>
          <div class="trow-body"><div class="trow-first">1st sub <b>${gr.first!==""?gr.first:0}'</b> &middot; ${this.esc(gr.timing||"")}</div>
          <div class="trow-rot">${this.esc(desc||"set starters & interchange in Build")}</div></div></div>`;
      });
    } else {
      rem=`<div class="empty-state"><div class="big">No rotation for Q${q+1} yet</div>Set this quarter up in the Build step.</div>`;
    }
    panel.innerHTML=`<div class="qtabs">${qtabs}</div>
      <div class="clockwrap ${this.timer.running?"running":""}">
        <div class="clock" id="bigClock">${this.fmtClock(this.timer.remaining)}</div>
        <div class="clockbtns">
          <button class="btn gold" onclick="app.timeStart()">${this.timer.running?"⏸ Pause":"▶ Start"}</button>
          <button class="btn" onclick="app.timeNudge(-10)">−10s</button>
          <button class="btn" onclick="app.timeNudge(10)">+10s</button>
          <button class="btn ghost" onclick="app.timeReset()">Reset 15:00</button>
        </div>
        <div class="clockhint">Press Start when the umpire starts the quarter. This is just a clock and a reminder list — it doesn't change your sheet.</div>
      </div>
      <div class="trem-head">Q${q+1} sub reminders</div>
      <div class="trem">${rem}</div>`;
  },

  // ---------- export / import ----------
  exportData(){ this.closeMenu();
    const blob=new Blob([JSON.stringify(this.store,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=(this.store.team.replace(/[^\w\- ]/g,"")||"ELV8")+" rotations.json"; a.click();
  },
  importData(input){ const f=input.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{ const d=JSON.parse(r.result);
      if(!d.squad||!d.games) throw new Error("bad");
      this.store=Object.assign({team:"Your Team",accent:"#D4AF37",ui:{view:"squad",q:0}},d);
      this.store.ui.gameId=this.store.games[0].id; this.store.ui.view="squad";
      this.applyAccent(); this.save(); this.renderAll();
    }catch(e){ alert("Couldn't read that backup file."); } };
    r.readAsText(f); input.value="";
  },

  esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); },

  init(){
    this.load();
    this.applyAccent();
    document.addEventListener("click",()=>this.closeMenu());
    document.getElementById("settingsOverlay").addEventListener("click",e=>{ if(e.target.id==="settingsOverlay") this.closeSettings(); });
    this.renderAll();
  }
};
app.init();
</script>
</body>
</html>

````
