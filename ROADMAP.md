# Trench Command — Roadmap

**Current:** v0.8.1 — Phase 6 recruits & rebuild pipeline.

**Next:** Campaign **Phase 7** (v0.8.2) — army strategic map.

**Full campaign spec:** [`docs/CAMPAIGN.md`](docs/CAMPAIGN.md) · OOB detail: [`docs/OOB.md`](docs/OOB.md)

---

## Campaign build status

| Version | Phase | Deliverable | Status |
|---------|-------|-------------|--------|
| v0.6.1 | 0 | Mission outcome API, save stub, Skirmish vs Campaign menu | ✅ |
| v0.7.0 | 1 | `CampaignState`, company OOB, save/load | ✅ (superseded by v3 save) |
| v0.7.1 | 2 | Division map UI → tactical → return | ✅ |
| v0.7.2 | 3 | Depleted OOB, retreat, transfer, undermanned | ✅ |
| v0.7.3 | 4 | Per-map templates (terrain, arc, defenses) | ✅ |
| v0.8.0 | 5 | Overextension, counter-push events | ✅ |
| **v0.8.0** | **5b** | **Historical OOB v3:** 30-man platoons, brigade map, battalion = 1 tactical map, save v3, launcher | ✅ |
| **v0.8.1** | **6** | Recruit pool, reinforcement requests, army HQ, rebuild pipeline | ✅ |
| v0.8.2 | 7 | Army map (10 divisions, 3 playable) | **Next** |
| v0.9.0 | 8 | Objective win/fail, campaign polish | |
| v1.0.0 | 9 | Android APK (Capacitor, offline) | |

**Deferred:** old linear level unlock; Corps layer; French/US/German OOB variants (mechanics ready).

---

## What to build next

### v0.8.1 — Phase 6: Recruits & rebuild

- [ ] Recruit pool trickle (+ bonus on battalion victories)
- [ ] Brigade screen: request reinforcements per company
- [ ] Army screen (minimal): approve requests, split pool across divisions
- [ ] Destroyed company rebuild timer when recruits assigned
- [ ] Optional: slow strength recovery for garrisoned depleted companies

### Quick wins (anytime)

- [ ] **GitHub Actions** — `npm run build` on push
- [ ] **GitHub Pages** deploy from `dist/` for shareable demos
- [ ] Historical battalion/brigade names (swap JSON labels)
- [ ] Duty assignment UI (pick line vs assault company on brigade map)

### Later

| Version | Focus |
|---------|--------|
| **v0.8.2** | Army strategic map, 10 division markers, 3 playable |
| **v0.9.0** | River Line objective win/fail, campaign end screen |
| **v1.0.0** | Android APK per `docs/ANDROID.md` |
| **Post-v1** | Corps layer, fog of war, other national armies, async multiplayer |

---

## Tactical engine (v0.6) — complete ✅

Phases 1–4 delivered: limited resources, effectiveness, MG relocation, combat polish, AI difficulty. See git history / older sections below for design constants.

---

## v0.7+ campaign — high-level checklist

- [x] **Phase 0–2:** Division front + tactical loop with persistent strength
- [x] **Phase 3–4:** Back-out penalty, map variety, templates
- [x] **Phase 5:** Salient / overextension counter-push events
- [x] **Phase 5b:** Brigade map, battalion assault, company transfer between battalions, save v3
- [ ] **Phase 6:** Recruit backfill pipeline
- [ ] **Phase 7–8:** Army zoom + River Line objective win
- [ ] **Phase 9:** Android offline build

---

## Release history

```
v0.1  →  playable greybox
v0.2  →  audio + sprites
v0.3  →  main menu + mission end flow
v0.5  →  AI difficulty
v0.6  →  limited mode, effectiveness, MGs, combat polish
v0.7  →  campaign: division map + company tactical loop
v0.8.0 →  overextension + OOB v3 (brigade/battalion hierarchy)
v0.8.1 →  recruits & rebuild (next)
v0.9.0 →  campaign win/fail
v1.0  →  Android offline release
v1.x  →  army map, historical names, other armies
```

---

## Ideas backlog (unscheduled)

- Staging overcrowding penalty / auto-spill
- Battalion resource panel (total riflemen, ammo as one view)
- Officer / NCO sector buff
- Mortars, gas missions, tanks / creeping barrage
- Historical scenarios (Somme slice, Verdun)
- Replay / share link from seed + command log
- Controller support · i18n

---

*Last updated: OOB v3 + full unit naming — campaign Phase 6 next.*
