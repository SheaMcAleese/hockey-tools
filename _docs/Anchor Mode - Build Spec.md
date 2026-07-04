# Black Sticks Sub Sheet — Anchor Mode Build Spec

**Purpose:** Add a second rotation driver so priority players can be skewed to high minutes (e.g. 12 of 15) without all resting in the soft middle of the quarter. Keep the existing carousel exactly as-is for everyone else.

---

## 1. The problem this solves

The current "rotation unit" generator is **cadence-driven**: cadence + order produce minutes. That model is egalitarian by design, so it fights two coaching needs:

1. **Skewing minutes** — equal carousel = equal minutes. No lever to give a priority player more.
2. **Synchronised rest** — every unit's first sub fires around the same minute, so priority players' off-windows stack in the middle third of the quarter (the momentum window).

Anchor mode adds a **minutes-driven** layer on top. Both run on the same grid at once.

---

## 2. Core concepts

### Anchors
A player tagged as an anchor for a given quarter. Anchors are pulled OUT of the carousel and their minutes are set directly:

- **Target on-minutes** per quarter (default 12 of 15).
- **Rest placement = bookend, never middle.** Their single rest block sits at the start (e.g. mins 1–3) or end (e.g. mins 13–15) of the quarter, chosen automatically or set manually.
- **Stagger constraint:** no two anchors share an overlapping rest window. The solver offsets each anchor's rest block so at least one anchor in each line is always on.

### Rotators
Everyone not tagged as an anchor. They stay on the **existing carousel** exactly as it works today, filling the non-anchor slots.

### Offset-first-sub (applies to rotators too)
Independent smaller fix: the carousel generator currently fires every unit's first rotation at the same minute. Add a per-unit `firstSubMin` offset so first-subs spread across mins 2–8 instead of stacking. This smooths bench load even without anchors.

---

## 3. Data model changes

Extend `state.players[]` and add anchor config. Current player shape:

```
{ id, name, rank, group, pos, pp:[], roles:[], target, groupQ:[4] }
```

Add:

```
anchorQ:   [false,false,false,false]   // is this player an anchor in quarter q
anchorMinQ:[12,12,12,12]               // target on-minutes per quarter when anchored
anchorRestQ:['auto','auto','auto','auto'] // 'auto' | 'start' | 'end' | explicit start-min
```

Extend each rotation unit (in `state.units[]`) with:

```
firstSubMin: 1   // minute the unit's first rotation fires (default 1, range 1–8)
```

No change to `grid` / `locks` shape — anchor mode writes into the same `grid[pid][q][min]` cells. It is a *generator*, not a new storage layer. Manual locks still override everything.

---

## 4. Generator logic (per quarter)

Run in this order so each stage respects the last:

1. **Place anchors first.**
   - For each anchored player, compute rest block length = `15 − anchorMin` (e.g. 12 → 3-min rest).
   - Assign rest block to a bookend. Default rule: alternate anchors between START and END bookends in anchor-priority order, so rest windows don't overlap. If `anchorRestQ` is explicit, honour it.
   - Stagger check: if two anchors' rest blocks overlap, push the lower-priority one inward by its block length (e.g. mins 1–3 → mins 4–6) until clear, but never into the centre minute (min 8) if avoidable. Warn if it can't be satisfied.
   - Write anchor ON minutes into the grid; lock-flag them so the carousel won't overwrite.

2. **Run the carousel on remaining slots.**
   - Existing logic, but seed each unit's start at `firstSubMin` instead of minute 1.
   - Carousel only fills slots NOT already taken by an anchor.

3. **Readiness re-check.**
   - Existing per-line count + role-coverage rows recompute as normal.
   - New warning: "Anchor rest overlap — N anchors off at min M."

---

## 5. UI changes

- **Squad editor:** add an "Anchor" toggle per player + a minutes stepper (default 12) and a rest dropdown (Auto / Start / End). Per-quarter, matching the existing `groupQ` pattern.
- **Grid:** anchor cells get a subtle marker (e.g. a thin gold left-border) so you can see at a glance who's anchored. Hidden in print, like the lock marker.
- **Generator panel:** add `firstSubMin` field per rotation unit.
- **GAME tab:** anchors flagged in the minutes matrix so their skewed target is visible against actuals.

---

## 6. Edge cases

- Anchor min set to 15 → no rest block, player on all quarter. Valid.
- More anchors than a line can hold while staggered → warn, don't silently overlap.
- Anchor + protected-pair interaction: pair rule still applies; if an anchor is in a protected pair, the staggered rest must also satisfy the pair (never both off). Solver checks pairs after staggering.
- Manual lock on an anchor's intended rest minute → lock wins, generator works around it.

---

## 7. Build / test conventions (unchanged from brief)

- One file, no external resources (offline).
- Regenerate the iPad `index.html`, bump `sw.js` cache version (next: `bs-subsheet-v4`), redeploy to Netlify, reload once on wifi.
- Test JS: extract largest `<script>` block, `node --check`; logic-test the anchor solver with a small DOM stub before deploying.

---

## 8. Build order (recommended)

1. `firstSubMin` offset on the carousel — smallest change, immediate win on the middle-gap, low risk.
2. Anchor data model + squad editor toggle.
3. Anchor placement solver + stagger.
4. Grid markers + GAME tab flags + new readiness warning.
5. Regenerate iPad copy, bump cache, deploy.
