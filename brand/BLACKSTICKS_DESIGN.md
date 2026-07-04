# DESIGN.md — Black Sticks (Shea's Coaching Outputs)
*Design system for all NZ Hockey / Black Sticks visual outputs from Claude*
*Grounded in: Nations Cup 2026 Player Performance Cards (branded), Black Sticks Dashboard*
*Sibling file: ELV8 brand → `ELV8 - Claude/brand/DESIGN.md` (do NOT mix the two)*
*Last updated: July 2026*

---

## BRAND IN ONE LINE

**Black Sticks coaching outputs** — dark, focused, match-night energy. Deep green and near-black with a single gold thread. Built for players and staff: fast to read on a phone, serious without being corporate. This is the inside of the programme, not a public brand.

**Not ELV8.** ELV8 is Shea's public coaching brand (near-black `#222222` + gold `#D4AF37`, Montserrat/Playfair). Black Sticks outputs are programme-internal (deep green + `#C9A24B` gold, Oswald/Inter). Different audience, different file. Never blend palettes or fonts across the two.

---

## 1. COLOUR PALETTE

### Primary Colours (locked — sourced from live Nations Cup cards)

| Name | HEX | Use For |
|------|-----|---------|
| Pitch Black-Green | `#0C3B24` | Hero backgrounds, mastheads, cover panels |
| Turf Dark | `#141608` | Page backgrounds, card bases, dark layouts |
| Near-Black Green | `#10140F` / `#161B14` | Deepest background layers, card wells |
| BS Gold | `#C9A24B` | Accent lines, position badges, key numbers, section markers |
| Light Gold | `#E7CB86` | Secondary gold — subtle highlights, hover states, fine detail |
| Off-White Green | `#EAEDE6` | Primary text on dark, headings, body copy |

### Supporting Palette

| Name | HEX | Use For |
|------|-----|---------|
| Moss Grey | `#8E978A` | Secondary text, captions, labels on dark |
| Fern Grey | `#727C6C` / `#5E675A` | Muted structure, dividers, de-emphasised data |
| Deep Moss | `#2A3327` | Panel fills, table row alternation, card borders |
| Signal Green | `#3FBF87` | Positive indicators only — trending up, on-track, green flags |
| Signal Red | `#E05650` | Warnings only — red flags, IPR ≤5, needs attention |
| Amber | `#E4A93E` | Watch-list / caution states between green and red |

### Colour Usage Rules (critical)

> **85% dark green/black — 10% muted green structure — 5% gold accent**

- Gold is a thread, not a fill. One gold anchor per design (a badge, a rule line, a key number).
- Signal colours (`#3FBF87`, `#E05650`, `#E4A93E`) mean something — status only, never decoration. A player scanning a card should read colour as information.
- Dark-first. Light backgrounds are the exception (print-heavy docs only — use `#EAEDE6` base with `#141608` text).

---

## 2. TYPOGRAPHY

**Display / Headings: Oswald** *(locked)*
- Weights: 600–700
- Uppercase, letter-spaced (`.08em–.14em` tracking)
- Use for: player names, mastheads, section headers, position badges, big numbers
- This is the match-day font — tall, condensed, scoreboard energy

**Body / Data: Inter** *(locked)*
- Weights: 400–600
- Sentence case, normal tracking
- Use for: feedback copy, table data, captions, explanatory text
- Legible at small sizes — most outputs are read on phones (WhatsApp PDFs)

### Typography Rules

- Oswald shouts the WHO and WHAT; Inter explains the detail. Never reversed.
- Player names: Oswald 600, uppercase, large — the player's name is the hero of their card.
- Key numbers (scores, stats, minutes): Oswald 600, gold or off-white — numbers earn size.
- Body copy at 14–16px minimum — phone-first.
- No Montserrat, no Playfair — those belong to ELV8.

---

## 3. LOGOS & MARKS

- **"BLACK STICKS" wordmark treatment:** Oswald 700, uppercase, `.14em` tracking, off-white (`#EAEDE6`) — as used in the brandline of the Nations Cup cards.
- **HNZ / Black Sticks official logos:** not currently stored in this system. If official logo files are added, place them in `09 - AI Coaching Brain/` assets and update this section with paths + usage rules.
- **Player headshots:** `09 - AI Coaching Brain/headshots/`. Circular crop with a thin gold ring (`#C9A24B`, 2px) is the house style from the performance cards.
- **Never** put the ELV8 logo on Black Sticks programme outputs. Programme material is the team's, not the brand's.

---

## 4. VISUAL STYLE PRINCIPLES

### Core Design Language

- **Match-night dark** — deep green/black backgrounds as default; feels like the tunnel before walking out
- **Information-dense but scannable** — players read these in 60 seconds on a phone
- **Status at a glance** — colour-coded signals (green/amber/red) carry meaning instantly
- **Serious, not corporate** — this is elite sport, not a board report
- **One gold thread** — a single accent anchors each layout

### Layout Rules

- Card-based structure: content lives in panels (`#2A3327` fills, subtle borders) on dark bases
- Thin gold rules as section separators — never thick borders
- Uppercase Oswald section headers with wide tracking
- Rounded corners on badges/pills (6px house style)
- Generous padding inside cards — dense information, never cramped
- Grade/status badges: gold background, dark text (`#141608` on `#C9A24B`)

---

## 5. OUTPUT FORMATS (the house templates)

### Player Feedback One-Pager (WhatsApp PDF)
- Dark base (`#141608`), player name in Oswald 600 uppercase
- Headshot with gold ring, position badge (gold pill, dark text)
- Feedback body: Inter 400–500, `#EAEDE6`, 15px+, short paragraphs
- One gold rule between sections
- Footer: "BLACK STICKS" brandline treatment, small
- Must read cleanly on a phone screen — single column, no tables

### Player Performance Card
- Follow the Nations Cup 2026 card system exactly — it is the reference implementation
- Grade badges, signal colours for trends, Oswald numbers

### Dashboard / HTML Views
- Dark theme, card grid, status colours as data
- Reference: `09 - AI Coaching Brain/Black Sticks Dashboard.html`

### Session Plans & Camp Docs (print-friendly)
- Light exception: `#EAEDE6` background, `#141608` text
- Oswald headers, Inter body, gold rules
- Keep pitch diagrams minimal — dark green pitch, gold markers

### PCD / Presentation Slides
- Dark slides (`#0C3B24` or `#141608`)
- Headline: Oswald 600 uppercase, off-white
- One idea per slide, one gold anchor
- Player photos documentary-style, never posed-stock

---

## 6. VOICE ON DESIGNS (coaching outputs)

- Direct coach language — what Shea would say in the shed, not a press release
- Specific over general: "3 turnovers in D25 in Q4", not "defensive lapses"
- Player-facing copy is warm but honest — feedback lands because it's true and fair
- No hype, no clichés, no "warrior/battle/grind" language
- Confidential by default: player data, IPR scores, and selection material never leave programme channels

---

## 7. WHAT TO AVOID (non-negotiable)

| Avoid | Instead |
|-------|---------|
| ELV8 palette/fonts creeping in | Deep greens + `#C9A24B`, Oswald/Inter only |
| Signal colours as decoration | Green/amber/red = status information only |
| Gold fills or gold-heavy layouts | One gold thread per design |
| Corporate blues/greys | The green-black family above |
| Stock sports imagery | Real player photos, documentary style |
| Cramped tables on phone PDFs | Single-column cards, generous padding |
| Multiple fonts | Oswald + Inter, nothing else |
| Motivational poster energy | Calm, factual, match-focused |

---

## 8. QUALITY CHECKLIST

Before any Black Sticks output ships:

- [ ] Palette is the green-black family — zero `#222222`/`#D4AF37` (that's ELV8)
- [ ] Fonts are Oswald + Inter only
- [ ] Gold appears as one anchor, not a theme
- [ ] Signal colours carry real status meaning
- [ ] Readable on a phone at arm's length
- [ ] Player name/number treatment is Oswald uppercase
- [ ] Copy passes the shed test — would Shea say this to the group?
- [ ] No player-confidential data in anything leaving programme channels

---

## 9. FILE REFERENCES

| Asset | Location |
|-------|----------|
| Reference implementation | `01 - Black Sticks (Senior Men)/08 - Nations Cup 2026/Nations Cup 2026 - Player Performance Cards (branded).html` |
| Dashboard | `09 - AI Coaching Brain/Black Sticks Dashboard.html` |
| Player headshots | `09 - AI Coaching Brain/headshots/` |
| Feedback engine outputs | `09 - AI Coaching Brain/feedback-out/` |
| Athlete profiles | `09 - AI Coaching Brain/athletes/` |
| ELV8 design system (sibling) | `ELV8 - Claude/brand/DESIGN.md` |

---

## 10. CSS TOKENS (for HTML / PDF / web outputs)

Use these variables verbatim in any coded output — cards, dashboards, PDF one-pagers. Matches the Nations Cup card implementation.

```css
:root {
  /* Colour — base layers (dark-first) */
  --bs-green-deep:  #0C3B24;  /* hero backgrounds, mastheads */
  --bs-dark:        #141608;  /* page/card base */
  --bs-dark-well:   #10140F;  /* deepest wells */
  --bs-panel:       #2A3327;  /* card panels, row alternation */

  /* Colour — gold thread */
  --bs-gold:        #C9A24B;  /* ONE anchor per design; badge fills */
  --bs-gold-light:  #E7CB86;  /* fine detail, hover states */

  /* Colour — text */
  --bs-text:        #EAEDE6;  /* primary on dark */
  --bs-muted:       #8E978A;  /* captions, labels */
  --bs-muted-2:     #727C6C;  /* de-emphasised data */

  /* Colour — signals (STATUS ONLY, never decoration) */
  --bs-signal-good: #3FBF87;  /* on-track, trending up */
  --bs-signal-warn: #E4A93E;  /* watch list, caution */
  --bs-signal-red:  #E05650;  /* red flag, IPR ≤5 */

  /* Type */
  --bs-font-head: 'Oswald', 'Arial Narrow', sans-serif;  /* 600–700, UPPERCASE */
  --bs-font-body: 'Inter', 'Helvetica Neue', Arial, sans-serif;

  /* Type scale (phone-first) */
  --bs-name: 600 clamp(26px, 4vw, 40px)/1 var(--bs-font-head);  /* tracking .02em */
  --bs-h2: 600 14px/1.2 var(--bs-font-head);      /* tracking .10em, uppercase */
  --bs-brandline: 700 13px/1.2 var(--bs-font-head); /* tracking .14em, uppercase */
  --bs-body: 400 15px/1.6 var(--bs-font-body);    /* never below 14px */
  --bs-number: 600 18px/1.1 var(--bs-font-head);  /* stats, scores */

  /* Structure */
  --bs-radius: 6px;                    /* badges, pills, cards */
  --bs-rule: 1px solid var(--bs-gold); /* thin gold rule, one per design */
  --bs-border: 1px solid var(--bs-panel);
  --bs-pad-card: 24px;                 /* phone-first; 40px on desktop */
  --bs-ring: 2px solid var(--bs-gold); /* headshot gold ring */
}
```

Enforcement notes: badges are gold fill with dark text (`color: var(--bs-dark)` on `background: var(--bs-gold)`). Signal colours only ever encode status. Dark-first — light layouts use `--bs-text` as background with `--bs-dark` text, print docs only.

---

## HOW TO USE THIS FILE IN CLAUDE DESIGN SESSIONS

Every Black Sticks design prompt should reference this file explicitly:

```
"Build a [format] for the Black Sticks. Match NZ Hockey/09 - AI Coaching Brain/DESIGN.md.
Goal: [what this must achieve]
Audience: [players / staff / HNZ]
Content: [actual copy, stats, player names]
Constraints: [phone-first? print? any deviations]"
```

**Example:**
> "Build a post-series feedback one-pager for [player]. Match NZ Hockey/09 - AI Coaching Brain/DESIGN.md. Audience: player, via WhatsApp. Content: [feedback text]. Constraints: single column, phone-first, headshot with gold ring."

---

*Black Sticks coaching outputs | one system, everything findable*
