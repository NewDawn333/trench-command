# Trench Command — Roadmap

**Current:** v0.2 — audio, canvas sprites, mobile-ready architecture. v0.1 was greybox prototype.

---

## v0.2 — Feel & feedback ✅ (in progress / shipped baseline)

Goal: the game *sounds* and *reads* like a battle, not a diagram.

### Audio
- [x] Looping background music (procedural ambient; replace with OGG in `public/audio/`)
- [x] MG burst SFX
- [x] Rifle volleys (rate-limited from combat events)
- [x] Assault whistle (sector advance)
- [x] Sector captured — cheers / horn
- [x] Sector lost — alarm
- [x] Artillery: aim tone + impact burst
- [x] Volume sliders + mute toggles (HUD)
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
- [ ] Brief tutorial overlay (first launch)
- [ ] Assault / artillery status toasts on map

---

## v0.3 — Main menu & game flow

- [ ] Landing page: title, **New Game**, **Continue** (later), settings, credits
- [ ] Settings: music/SFX volume, control hints toggle
- [ ] End-of-mission screen (win/loss stats: sectors taken, casualties, shells fired)
- [ ] Save best times / scores locally (`localStorage`)

---

## v0.4 — Procedural levels

Each playthrough differs in layout and obstacles; same core rules.

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

## v0.5 — AI personalities & difficulty

- [ ] **Difficulty select** on New Game: Defensive / Balanced / Aggressive
- [ ] Aggressive: earlier assaults, more arty, lateral spread in your trench sooner
- [ ] Defensive: masses longer, fewer cross-sector assaults, preserves MGs
- [ ] Per-level AI intensity ramp (+5–10% aggression per campaign level)
- [ ] AI artillery targeting (weak sectors, massing staging)
- [ ] AI reinforcement timing tied to difficulty

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
