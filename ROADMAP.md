# Trench Command — Roadmap

**Current:** v0.5 — AI difficulty, main menu, casualty chart.

**Next release:** **v0.6** — limited mode: effectiveness, regen resources, movable MGs (see troop systems spec below).

**Deferred:** v0.4 campaign ladder (still valuable after v0.6 makes missions matter).

---

## What to build next (from v0.5)

**Priority shift:** Ship **v0.6 troop systems** before v0.4 campaign. Limited mode needs effectiveness + regen economics before procedural levels add meaning.

### v0.6 Phase 1 — Resources & `DEV_MODE` off

- [ ] Flip `DEV_MODE` → `false` (or menu toggle: Unlimited / Limited for testing)
- [ ] **Per-sector call-up regen bar** — calling up resets timer; button fills; **bright green** when ready (~40–50s)
- [ ] **Artillery regen** — idle batteries recover shells over time; show `ammo / max` + regen hint in status counter
- [ ] Defeat when no player front/staging platoons remain

### v0.6 Phase 2 — Effectiveness (replaces passive morale)

- [ ] Rename `Platoon.morale` → `effectiveness` (0–150, UI label “Eff”)
- [ ] **Combat & movement multipliers** from effectiveness (see spec below)
- [ ] **Loss drivers:** low headcount, idle time on front, arty barrage in sector
- [ ] **Gain drivers:** staging recovery, repulsed assault, successful assault (sector ±1)
- [ ] **150% surge** when already at 100% and assault succeeds nearby; decays back to 100
- [ ] **Enemy-trench invaders:** immune to effectiveness decay (still rout at 0 strength)

### v0.6 Phase 3 — MG order of battle

- [ ] **Level MG pool** — fixed count per mission (e.g. 4–6); no regen this build
- [ ] **Relocate MG** — select emplacement on map → tap destination sector trench
- [ ] MGs unaffected by effectiveness; pillboxes stay fixed

### v0.6 Phase 4 — Combat polish

- [ ] Tune rifle vs melee overlap so assaults feel lethal but not instant wipe
- [ ] Optional platoon effectiveness badge on sprite (color or small bar)
- [ ] Status toasts: “Sector 3 under barrage”, “Platoon rallied in staging”

### Then v0.4 — Campaign ladder

(Unchanged from below — unlock levels, scale enemy, procedural maps.)

### Quick wins (anytime)

- [ ] **GitHub Actions** — `npm run build` on push
- [ ] **GitHub Pages** deploy from `dist/` for shareable demos
- [ ] **Unit tests** for effectiveness curve + combat math

### Later

| Version | Focus |
|---------|--------|
| **v0.7** | Fog of war — hidden reserves, spotting, counter-battery |
| **v0.8+** | Async multiplayer / daily seed challenge |
| **Mobile** | Capacitor wrap per `docs/ANDROID.md` |

---

## v0.6 — Troop systems & limited mode (design spec)

Goal: replace unlimited dev sandbox with **meaningful limits** — troops degrade and recover, resources regen, MGs are scarce and movable.

### Effectiveness (not “morale” in UI)

Single stat **`effectiveness`** per platoon, range **0–150**. Drives **fire rate** and **movement speed**. Separate from **strength** (headcount).

#### Combat & movement multipliers

| Effectiveness | Fire rate & move speed |
|---------------|------------------------|
| **≥ 50%** | **100%** baseline (includes 50–100 and surges up to 150) |
| **100–150%** | **100% + bonus** — linear up to **150%** at 150 eff (shots/cycle & move speed) |
| **< 50%** | Linear slide from **100% at 50** down to **10% at 0** |

```ts
function effectivenessMult(eff: number): number {
  if (eff >= 100) return 1 + (Math.min(eff, 150) - 100) / 100; // 1.0 → 1.5
  if (eff >= 50) return 1;
  return 0.1 + (eff / 50) * 0.9;
}
```

Apply to: trench rifle DPS, NML encounter damage rate, melee exchange rate, `PLATOON_MOVE_SPEED`.

**Routing:** platoon routes when `strength <= 0` **or** `effectiveness <= 0` (remove old morale-only route at 15 unless we keep a panic threshold — TBD in playtest).

#### Effectiveness **loss**

| Cause | Mechanism (proposed) |
|-------|----------------------|
| **Low headcount** | Passive drain while in combat states: `-k × (1 - strength/maxStrength) × dt` |
| **Idle on front** | `timeOnFront` already tracked — after **~90s** without move/assault: `-0.3/sec` until moved or relieved |
| **Arty barrage** | Sector flagged **under barrage** while any battery `firing` on that sector — platoons in `front`/`staging` in sector: `-1.5/sec` |

#### Effectiveness **gain**

| Cause | Mechanism (proposed) |
|-------|----------------------|
| **Staging recovery** | Enter staging → **8s settle** (no gain) → then **+4/sec** up to **100** max from staging alone |
| **Repulsed enemy assault** | Player front in sector survives enemy assault ending: **+15** (cap 100) |
| **Successful assault** | Invaders still in enemy trench after sector flip: **+20** if eff ≥ 100 → can reach **150**; if eff < 100, gains clamp to 100 first |
| **Neighbor assault success** | Adjacent sector capture: **+8** to platoons in `front`/`staging` in neighboring sectors (cap 100, or + toward 150 if already 100) |

#### Special rules

- **Enemy-trench invaders** (`isInvader`): **no effectiveness decay** from idle or barrage while holding opponent trench. Still lose eff from low headcount if we keep that rule — recommend **headcount-only** loss for invaders.
- **Fresh call-ups** spawn at **~70%** effectiveness (not full); staging recovery brings them up.
- **Surge decay:** above 100% decays **-2/sec** back toward 100 unless renewed by another assault event.

### Call-up regen (per sector)

- Each sector has `callUpRegen: 0…1` (or seconds remaining).
- **Call up** → spawn platoon in staging → reset regen to **0**; regen duration **~45s** (tune in playtest).
- UI: button background fill left→right; at **1.0** stroke/fill **bright green** `#6dff6d`; label “+ Call Up”.
- No global infinite pool — `reservesAvailableForSector` = regen complete.
- Enemy AI uses same regen rules per sector (fair fight).

### Artillery regen

- Each battery: when `state === "idle"` and `ammo < maxAmmo`, regen **~1 shell / 8s** (player; enemy slightly slower).
- Status bar: `B1:12/40↗ · B2: idle` — arrow or tint when regen active.
- Firing/aiming/stopping pauses regen for that battery.

### MG order of battle

- Mission start: **`mgPool`** (player) from level config — default **4** for skirmish map.
- Placing MG decrements pool; **no regen** this build.
- **Move:** tap MG emplacement → tap target sector trench band (same as lateral move UX). Cooldown **~15s** before same MG moves again.
- Enemy MGs: fixed at level setup; AI relocation deferred.
- Pillboxes: **not movable**; count scales with level later (v0.4).

### `DEV_MODE` transition

| Today (`DEV_MODE=true`) | v0.6 limited |
|-------------------------|--------------|
| Instant call-up | Per-sector regen bar |
| Infinite MGs | `mgPool` cap |
| Full arty magazines, no regen | Regen when idle |
| No defeat | Defeat at zero front/staging |
| Assault at any strength | Keep threshold or tie to effectiveness |

Keep a **debug toggle** in settings for unlimited mode during balance pass.

### Implementation checklist

- [ ] `types.ts` — `effectiveness`, `callUpRegen[]`, `mgPool`, `ArtilleryBattery.regenTimer`
- [ ] `simulation.ts` — `tickEffectiveness`, barrage sector detection, assault outcome hooks
- [ ] `combat.ts` — multiply DPS & damage by `effectivenessMult`; arty regen tick
- [ ] `Game.ts` — call-up regen gate; MG select/move mode
- [ ] `Renderer.ts` — regen bar on call-up buttons; arty counter regen state
- [ ] `MissionStats.ts` — track average effectiveness, shells regen'd (optional)

---

## v0.4 — Procedural levels & campaign (deferred)

### Phase A — Campaign ladder (v0.4.0)

- [ ] Level select, unlock on victory, scale enemy via `campaignLevel`
- [ ] Briefing per level; enable **Continue**

### Phase B — Procedural battlefield (v0.4.1)

- [ ] Seed generator, wire, hills, variable geometry

### Phase C — Save & polish (v0.4.2)

- [ ] Mid-mission save, tutorial overlay, assault/arty toasts

---

## v0.2 — Feel & feedback ✅

Goal: the game *sounds* and *reads* like a battle, not a diagram.

### Audio
- [x] Looping background music (procedural ambient; replace with OGG in `public/audio/`)
- [x] MG burst SFX
- [x] Rifle volleys (rate-limited from combat events)
- [x] Assault whistle (sector advance)
- [x] Sector captured — cheers / horn
- [x] Sector lost — alarm
- [x] Artillery: aim tone + impact burst
- [x] Volume sliders + mute toggles (main menu settings)
- [ ] Replace procedural SFX with licensed asset files
- [ ] UI tap sounds

### Visual polish (still 2D)
- [x] Canvas sprites for platoons (helmet, rifle, strength badge)
- [x] MG and pillbox sprites with muzzle flash
- [x] Shell impact animation (flash, ring, debris)
- [x] Tracer lines
- [x] Trench parapet tiles
- [ ] PNG sprite atlas swap (`public/sprites/`)
- [ ] Sector strip button art pass

### UX / mobile
- [x] Safe-area / viewport-fit for phones
- [x] `docs/ANDROID.md` — Capacitor plan
- [ ] Brief tutorial overlay (Phase C above)
- [ ] Assault / artillery status toasts on map (Phase C above)

---

## v0.3 — Main menu & game flow ✅

- [x] Landing page: title, **New Game**, **Continue** (disabled until v0.4), settings, credits
- [x] Settings: music/SFX volume, control hints toggle
- [x] End-of-mission screen (win/loss stats: time, sectors, casualties, shells, assaults)
- [x] Save best victory time + win/loss counts (`localStorage`)
- [x] In-game **Menu** button returns to landing page
- [ ] Continue / save mid-mission → **v0.4 Phase A/C**

---

## v0.4 — Procedural levels & campaign

See **What to build next** above for phased checklist.

### Level generation
- [ ] Seed-based generator (display seed, optional share code)
- [ ] Variable trench depth / NML width per level
- [ ] Staggered or broken front (sector height offsets)
- [ ] **Barbed wire** bands in NML (slows crossing, extra casualties)
- [ ] **Hills / dead ground** — blocks or reduces arty / rifle bands per sector
- [ ] Pillbox count and placement scales with level index
- [ ] Enemy starting strength and emplacement density scale mildly

### Progression
- [ ] Level 1–N campaign ladder on main menu
- [ ] Unlock next level on victory; retry on defeat
- [ ] Short briefing text per level (“Sector 4–7: wire reported…”)

---

## v0.5 — AI personalities & difficulty ✅

- [x] **Difficulty select** on main menu: Defensive / Balanced / Aggressive
- [x] Aggressive: earlier assaults, more arty, faster lateral spread in your trench
- [x] Defensive: longer massing, fewer counter-assaults, avoids pillbox sectors
- [x] Per-level AI intensity ramp (+8% aggression per campaign level)
- [x] AI artillery targets weak sectors / massing staging
- [x] AI reinforcement timing tied to difficulty

---

## v0.6 — Troop systems (see design spec above)

Phased delivery: Phase 1 resources → Phase 2 effectiveness → Phase 3 MGs → Phase 4 polish.

---

## v0.7 — Fog of war & theater

- [ ] Hide enemy staging / reserve counts; show only observed trench + NML
- [ ] Spotting: contact reveals enemy strength in sector for N seconds
- [ ] Off-map artillery (counter-battery) — enemy only at first
- [ ] Night / weather modifiers (optional mission flags)

---

## v0.8 — Multiplayer / async (explore)

- [ ] Same front, take turns issuing orders per tick window — or
- [ ] Async “daily sector” challenge with fixed seed leaderboard
- [ ] Defer until single-player campaign is solid

---

## Technical debt & infrastructure

| Item | When |
|------|------|
| GitHub Actions: `npm run build` on push | Before or with v0.4.0 |
| GitHub Pages deploy | After CI |
| Unit tests for combat math | Before balance-heavy v0.4 scaling |
| Remove `DEV_MODE` for release builds | v0.6 Phase 1 |
| Extract sim from render (headless tick) | When adding tests / balance sims |
| Performance: object pooling for tracers | If particle count grows |

---

## Release history

```
v0.1  →  playable greybox
v0.2  →  audio + sprites
v0.3  →  main menu + mission end flow + casualty chart
v0.5  →  AI difficulty
v0.6  →  limited mode: effectiveness, regen, MGs  ← NEXT
v0.4  →  campaign ladder + procedural maps
v0.7+ →  fog of war, then multiplayer experiments
```

---

## Ideas backlog (unscheduled)

- Staging overcrowding penalty / auto-spill
- Battalion resource panel (total riflemen, ammo as one view)
- Officer / NCO sector buff — stretch
- Mortars (shorter range, smoke)
- Gas missions (timed mask / casualty events)
- Tank / creeping barrage sync with assault
- Historical scenarios (Somme slice, Verdun) with fixed maps
- Replay / share link from seed + command log
- Controller support
- i18n

---

*Last updated: v0.6 troop systems spec — next focus Phase 1 (regen + DEV_MODE off).*
