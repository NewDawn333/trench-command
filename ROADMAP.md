# Trench Command — Roadmap

**Current:** v0.5 — AI difficulty profiles. v0.3 added main menu, casualty tracking, and charts.

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
- [ ] Brief tutorial overlay (deferred)
- [ ] Assault / artillery status toasts on map

---

## v0.3 — Main menu & game flow ✅

- [x] Landing page: title, **New Game**, **Continue** (disabled — v0.4), settings, credits
- [x] Settings: music/SFX volume, control hints toggle
- [x] End-of-mission screen (win/loss stats: time, sectors, casualties, shells, assaults)
- [x] Save best victory time + win/loss counts (`localStorage`)
- [x] In-game **Menu** button returns to landing page
- [ ] Continue / save mid-mission (v0.4)

---

## v0.4 — Procedural levels

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
- [x] Per-level AI intensity ramp (+8% aggression per campaign level — hook for v0.4)
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

| Item | Notes |
|------|--------|
| Remove `DEV_MODE` flag for release builds | Env-based or build flag |
| Extract sim from render (headless tick for tests) | Enables balance sims |
| Unit tests for combat math (trench melee, NML range) | Prevent balance regressions |
| GitHub Actions: `npm run build` on push | CI |
| GitHub Pages deploy | Free hosting for demos |
| Mobile viewport / safe areas | Toolbar + sector strip on phones |
| Performance: object pooling for tracers/casualties | If particle count grows |

---

## Suggested priority order

```
v0.1 (now)  →  playable greybox, GitHub release
v0.2        →  audio + sprites (biggest player-facing jump)
v0.3        →  main menu + mission end flow
v0.4        →  procedural levels + wire/hills
v0.5        →  AI difficulty selection
v0.6        →  MG deployment depth + resource limits
v0.7+       →  fog of war, then multiplayer experiments
```

---

## Ideas backlog (unscheduled)

- Mortars ( shorter range, smoke )
- Gas missions ( timed mask / casualty events )
- Tank / creeping barrage sync with assault button
- Historical scenarios ( Somme slice, Verdun ) with fixed maps
- Replay / share link from seed + command log
- Controller support
- i18n

---

*Last updated: v0.1 release.*
