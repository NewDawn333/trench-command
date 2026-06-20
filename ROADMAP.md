# Trench Command — Roadmap

**Current:** v0.6 complete + post-Phase-4 fixes (call-up, AI tempo, staging select, melee range).

**Next:** Campaign **Phase 1** (v0.7.0) — see [`docs/CAMPAIGN.md`](docs/CAMPAIGN.md).

**Full campaign spec:** [`docs/CAMPAIGN.md`](docs/CAMPAIGN.md) — BEF Amiens 1918, 3-layer zoom, phased through Android v1.0.

---

## What to build next (from v0.6 Phase 1)

### v0.6 Phase 1 — Resources ✅

- [x] `DEV_MODE` off — assault thresholds & defeat active
- [x] **Per-sector call-up regen** — **30s**; bright green when ready; countdown on button
- [x] **Artillery regen** — **1 shell / 8s** when idle; `ammo/max ↗` in counter
- [x] **MG pool** — **4** total; one per sector; no regen
- [x] Settings toggle: **Unlimited resources** (testing)
- [x] Defeat when enemy **occupies every player trench sector** (not empty trench during assault)

### v0.6 Phase 2 — Effectiveness ✅

Constants from design review:

| Rule | Value |
|------|--------|
| Surge decay (150% → 100%) | **120 seconds** |
| Headcount effectiveness loss | Only when strength **< 20%** of max |
| Invader floor in enemy trench | Effectiveness cannot drop **below 50%** from decay |
| Fresh call-up starting eff | **70%** |
| Staging recovery | 8s settle, then +4/sec to 100 |

- [x] Rename `morale` → `effectiveness` (0–150)
- [x] Combat/movement multipliers (50–100 flat, 100–150 bonus, 0–50 penalty to 10%)
- [x] Loss: idle front, arty barrage, low headcount (<20%)
- [x] Gain: staging recovery, repulsed assault, successful assault (+ neighbor), surge decay 120s
- [x] Player-only tick (enemy Phase 2b)

### v0.6 Phase 2b — Enemy effectiveness (later, two steps)

1. **Apply mechanism** — enemy platoons use same effectiveness tick/gain/loss rules as player
2. **AI management** — AI rotates tired platoons to staging, avoids barrage sectors, times assaults on player low-eff sectors

Do **not** bundle 2b with Phase 2 player implementation.

### v0.6 Phase 3 — MG relocation ✅

- [x] **Tap MG** on your trench line to select
- [x] **Tap destination sector** in your trench band to relocate
- [x] **15s move cooldown** per MG (countdown on sprite)
- [x] **Up to 3 MGs per sector** — staggered slots like platoons; pool unchanged on move
- [x] **MG line forward / troop line back** — easier tap selection

### v0.6 Phase 4 — Combat polish ✅

- [x] **Combat tuning** — rifle DPS 4.5, melee DPS 9, approach defender edge 1.12×
- [x] **Status toasts** — assault, arty, MG move, sector capture/loss, barrage
- [x] **Effectiveness badge** — optional in settings (on by default)

### Campaign (v0.7 → v1.0) — see `docs/CAMPAIGN.md`

| Version | Phase | Deliverable |
|---------|-------|-------------|
| v0.6.1 | 0 | Mission outcome API, save stub, Skirmish vs Campaign menu ✅ |
| v0.7.0 | 1 | `CampaignState`, company OOB, save/load |
| v0.7.1 | 2 | Division map UI → tactical → return |
| v0.7.2 | 3 | Retreat, redeploy delay, company transfer |
| v0.7.3 | 4 | Per-map templates (terrain, arc, defenses) |
| v0.8.0 | 5 | Overextension / counter-push events (no background AI) |
| v0.8.1 | 6 | Recruit pool, rebuild destroyed companies |
| v0.8.2 | 7 | Army map (10 divs, 3 playable) |
| v0.9.0 | 8 | Objective win/fail, campaign polish |
| v1.0.0 | 9 | Android APK (Capacitor, offline) |

**Deferred:** old “v0.4 ladder” (linear level unlock) — superseded by campaign phases above.

### Quick wins (anytime)

- [ ] **GitHub Actions** — `npm run build` on push
- [ ] **GitHub Pages** deploy from `dist/` for shareable demos
- [ ] **Unit tests** for effectiveness curve + combat math

### Later

| Version | Focus |
|---------|--------|
| **v0.7** | Fog of war — hidden reserves, spotting, counter-battery |
| **v0.8+** | Async multiplayer / daily seed challenge |
| **Mobile** | Campaign v1.0 = Capacitor APK per `docs/ANDROID.md` |

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
| **Low headcount** | Passive drain only when strength **< 20%** of max |
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

- **Enemy-trench invaders** (`isInvader`): **no idle/barrage decay**; effectiveness floor **50%** from decay (headcount loss still applies below 20% strength)
- **Fresh call-ups** spawn at **~70%** effectiveness (not full); staging recovery brings them up.
- **Surge decay:** above 100% decays linearly to 100 over **120 seconds** unless renewed by another assault event.

### Call-up regen (per sector)

- Each sector has `callUpRegen: 0…1` (or seconds remaining).
- **Call up** → spawn platoon in staging → reset regen to **0**; regen duration **30s**.
- UI: button background fill left→right; at **1.0** stroke/fill **bright green** `#6dff6d`; label “+ Call Up”.
- No global infinite pool — `reservesAvailableForSector` = regen complete.
- Enemy AI uses same regen rules per sector (fair fight).

### Artillery regen

- Each battery: when `state === "idle"` and `ammo < maxAmmo`, regen **~1 shell / 8s** (player; enemy slightly slower).
- Status bar: `B1:12/40↗ · B2: idle` — arrow or tint when regen active.
- Firing/aiming/stopping pauses regen for that battery.

### MG order of battle

- Mission start: **`mgPool`** = **4** for skirmish map.
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

## v0.7+ — Campaign (detailed checklist in `docs/CAMPAIGN.md`)

High-level only — full acceptance criteria live in the campaign doc.

- [ ] **Phase 0–2:** Division front + one tactical loop with persistent company strength
- [ ] **Phase 3–4:** Back-out penalty, map variety (not same skirmish every time)
- [ ] **Phase 5–6:** Salient/overextension events; recruit backfill pipeline
- [ ] **Phase 7–8:** Army zoom + River Line objective win
- [ ] **Phase 9:** Android offline build

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

## Mission templates (campaign Phase 4 + skirmish)

- [ ] Seed + template id → trench arc, NML width, wire, hills
- [ ] Static enemy OOB per company (not procedural AI)
- [ ] Briefing intel lines from template metadata

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
v0.6  →  limited mode, effectiveness, MGs, combat polish ✅
v0.7  →  campaign: division map + tactical loop
v0.8  →  overextension, recruits, army map
v0.9  →  campaign win/fail
v1.0  →  Android offline release
v1.x  →  fog of war, other armies, historical names
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

*Last updated: v0.6 complete — campaign plan in `docs/CAMPAIGN.md`.*
