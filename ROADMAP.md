# Trench Command — Roadmap

**Current:** v0.5 — AI difficulty profiles, main menu, casualty chart, instant tap controls.

**Next release:** **v0.4** — procedural levels + campaign ladder (see plan below).

---

## What to build next (from v0.5)

Recommended order — each phase is shippable on its own.

### Phase A — Campaign ladder (v0.4.0)

Gets **Continue** working and gives the AI difficulty ramp a reason to exist (`campaignLevel` is already wired).

- [ ] **Level select** on main menu — Level 1–8 (or infinite index), locked/unlocked state in `localStorage`
- [ ] **Victory → unlock next level**; defeat → retry same level
- [ ] **Scale enemy** per level: starting strength, emplacement count, AI `campaignLevel` passed to `getAIProfile()`
- [ ] **Briefing line** per level (1–2 sentences before deploy)
- [ ] Enable **Continue** — resume last in-progress level + elapsed time (mid-mission save can wait for Phase C)

### Phase B — Procedural battlefield (v0.4.1)

Same rules, different maps each run.

- [ ] **Seed-based generator** — show seed on briefing; optional share code
- [ ] **Variable geometry** — NML width, trench depth, staggered sector heights
- [ ] **Barbed wire** in NML — slows crossing, extra casualties on assault
- [ ] **Dead ground / hills** — sector modifiers for arty and rifle bands
- [ ] **Pillbox placement** scales with level index

### Phase C — Save & polish (v0.4.2)

- [ ] **Mid-mission save** — full state snapshot for true Continue
- [ ] **Assault / artillery toasts** on the map (feedback without reading the status bar)
- [ ] **Brief tutorial overlay** — first launch or “How to play” from menu (still skippable)

### Quick wins (anytime)

- [ ] **GitHub Actions** — `npm run build` on push
- [ ] **GitHub Pages** deploy from `dist/` for shareable demos
- [ ] **Unit tests** for combat math (trench melee, NML range, defender edge)

### After v0.4

| Version | Focus |
|---------|--------|
| **v0.6** | Order of battle — replacement pool, redeployable MG teams, staging capacity |
| **v0.7** | Fog of war — hidden reserves, spotting, counter-battery |
| **v0.8+** | Async multiplayer / daily seed challenge (defer until campaign is solid) |
| **Mobile** | Capacitor wrap per `docs/ANDROID.md` once web UX is stable on phones |

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

## v0.6 — Order of battle (numbers & deployment)

Move from abstract platoons toward a clearer TO&E.

- [ ] Battalion view: total riflemen, MG teams, mortar/arty ammo as **resources**
- [ ] Call-up costs from a **replacement pool** (no infinite dev mode in release)
- [ ] MG teams as distinct counters (e.g. 4 MG teams per battalion, redeployable)
- [ ] **Move MG along trench line** (select MG → tap sector trench)
- [ ] MG arc rotation or fixed sector facing (design choice)
- [ ] Staging capacity per sector (overcrowding penalty or auto-spill)
- [ ] Officer / NCO abstraction (optional morale buff in sector) — stretch

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
| Remove `DEV_MODE` for release builds | Before v0.6 resource limits |
| Extract sim from render (headless tick) | When adding tests / balance sims |
| Performance: object pooling for tracers | If particle count grows |

---

## Release history

```
v0.1  →  playable greybox
v0.2  →  audio + sprites
v0.3  →  main menu + mission end flow + casualty chart
v0.5  →  AI difficulty (v0.4 skipped in numbering — campaign next)
v0.4  →  campaign ladder + procedural maps  ← NEXT
v0.6  →  MG deployment + resource limits
v0.7+ →  fog of war, then multiplayer experiments
```

---

## Ideas backlog (unscheduled)

- Mortars (shorter range, smoke)
- Gas missions (timed mask / casualty events)
- Tank / creeping barrage sync with assault
- Historical scenarios (Somme slice, Verdun) with fixed maps
- Replay / share link from seed + command log
- Controller support
- i18n

---

*Last updated: v0.5 release — next focus v0.4 campaign Phase A.*
