# Trench Command — Campaign design & build plan

**Status:** Design agreed (BEF / Amiens 1918 framing, fictional OOB for v1).  
**Tactical engine:** v0.6 (platoon-level, 8-sector trench map).  
**Platform target:** Single-player, **offline-first** — web prototype now, **Android** via Capacitor later.

---

## Design pillars (locked)

| Topic | Decision |
|-------|----------|
| **Historical frame** | British Expeditionary Force, **Amiens sector, 1918** (Hundred Days). Fictional unit names until systems prove out. |
| **Layers** | Army (future) → Corps (future) → **Division** (3 brigades) → **Brigade** (4 battalions) → **Battalion** (1 tactical map) → **Company** → **Platoon** (30 men). |
| **Enemy on campaign map** | **Static** — each battalion has defined enemy OOB; no background probing every turn. |
| **Enemy pressure** | **Event-driven** — overextension / weak garrison triggers counter-push; map updates to show enemy control. |
| **Tactical variety** | Each battalion map differs in **enemy OOB, terrain, defenses, trench arc**. |
| **Mission commit** | Player may **back out before engaging**; downside = **redeploy delay** before that battalion can fight again. |
| **Casualties** | Company **strength persists** across missions. **Total loss** destroys the company; rebuild from **recruits over time**. |
| **Reinforcements** | Division commander requests men → **Army** layer allocates recruit pool (Phase 6). |
| **Victory** | **Objective-based** (River Line placeholder) — one clear primary goal for v1. |
| **Multiplayer** | None — single-player only. |

---

## Terminology

```
Army (future)
 └── Corps (future, 2–4 divisions)
      └── Division     3 brigades — division map
           └── Brigade     4 battalions — brigade map (often 3 on front, 1 in reserve)
                └── Battalion    1 tactical mission (line + assault companies on map)
                     └── Company    8 platoons × 30 riflemen
                          └── Platoon
```

**UI labels:** full words only — *Division*, *Brigade*, *Battalion*, *Company*, *No Man's Land* (no Bn/Bde/Coy/NML in player copy).

**Default OOB (BEF v3):**

- 1 division = **3 brigades × 4 battalions** = **12 battalion fronts** (max)
- Each battalion = **4 companies**; **1 line + 1 assault** on tactical map; **2 battalion reserve** on brigade map
- 30 riflemen per platoon · 240 per company · ~480 engaged per battalion assault at full strength

See [`docs/OOB.md`](./OOB.md) for full table.

---

## Architecture notes (Android-safe)

| Screen | Responsibility |
|--------|----------------|
| `ArmyScreen` | Strategic map, recruit pool, objective tracker, division selection (Phase 7) |
| `DivisionScreen` | 3 brigade sectors — tap to zoom in |
| `BrigadeScreen` | 4 battalion counters, briefing, company transfer between battalions |
| `TacticalScreen` | Existing canvas game (`Game.ts` loop) |
| `MissionBriefing` | Enemy intel, terrain summary, Commit / Back out |

**Persistence:** `CampaignSave` v3 in `localStorage`. v2 subsector saves reset on load.

**Code layout:**

```
src/campaign/     CampaignState, OOB factory, overextension, recruits (Phase 6)
src/campaign/ui/  Division + Brigade screens
src/game/         Tactical sim
src/mission/      Map templates, briefing copy
```

Tactical mission API (contract to implement in Phase C):

```ts
interface MissionSetup {
  seed: number;
  templateId: string;       // trench arc + terrain profile
  playerCompany: CompanySnapshot;
  enemyOob: EnemyCompanyOob;
}

interface MissionOutcome {
  result: "victory" | "defeat" | "retreat";  // retreat = back out before commit
  companyStrengthAfter: number;
  platoonsLost: number;
  sectorsCaptured: number;
  durationSec: number;
}
```

---

## Campaign tick model

**Not** a continuous real-time war while the player is in tactical mode.

1. **Strategic advances** happen when the player **returns to the division or army map** and confirms end of turn / continues — or automatically when leaving a resolved tactical mission.
2. **No** passive enemy nibbling each turn.
3. **Overextension check** runs when:
   - Player wins a tactical fight that creates a **salient** (won flank/center without adjacent friendly control), or
   - A subsector drops **below minimum garrison** (too many companies moved away / destroyed), or
   - Player stacks too many wins without securing **shoulders**.

When triggered: resolve a **counter-attack event** — enemy fills map tiles / subsector tint / company routed — no full tactical sim required for v1 (narrative + state update first; optional “crisis mission” later).

---

## Reinforcement pipeline

```
Tactical losses → Company.strength ↓
       ↓
Division screen: "Request reinforcements" (per subsector or company)
       ↓
Army screen: allocate from RecruitPool (slow trickle + objective bonuses)
       ↓
Company.strength ↑ over N strategic steps (not instant full strength)
```

| State | Meaning |
|-------|---------|
| `Full` | ≥ 85% max — normal tactical map |
| `Depleted` | 40–84% — fewer platoons / slower call-up regen in mission |
| `Critical` | 1–39% — minimal platoons; high rout risk |
| `Destroyed` | 0 — company slot empty; rebuild timer running |
| `Rebuilding` | Recruits assigned; returns to Critical when timer completes |

**Total tactical defeat** → `Destroyed`. Rebuild costs recruits + time; subsector **combat power** uses sum of company strengths for overextension math.

---

## Map variety (per company)

Each `MissionSetup` picks from templates:

| Axis | Examples |
|------|----------|
| **Trench arc** | Straight, bulge toward NML, re-entrant, staggered sector heights |
| **Terrain** | Flat, ridge (arty dead ground), muddy sector (slow crossing) |
| **Defenses** | MG count, pillbox sectors, wire bands in NML |
| **Enemy OOB** | Static platoon count per sector, emplacement layout, difficulty tier |

Templates are **data files** (`missions/templates/*.json`) so Android build ships them as assets without code changes.

---

## Victory objective (v1 placeholder)

**Primary:** Advance the division front until **Objective Marker B** (stand-in: *River Line* / historical Somme bend east of Amiens) is **connected** to player-controlled subsectors for **2 adjacent subsectors**.

**Fail:** Division HQ subsector lost, or **3 companies destroyed** without rebuild capacity.

Exact hex/line art and historical label deferred — mechanics first.

---

## Phased build plan

Work top-to-bottom: each phase is shippable and playtestable.

### Phase 0 — Prep (v0.6.1) · ~1 session ✅

**Goal:** Clean handoff from skirmish to campaign code.

- [x] Extract `MissionOutcome` reporting from existing win/loss/retreat paths
- [x] Add `CampaignSave` type stub + empty save slot in main menu
- [x] Rename menu **Skirmish** vs **Campaign** (Campaign disabled until Phase B)
- [x] In-mission **Withdraw** (retreat, no skirmish penalty)
- [x] Headless `npm run build` stays green

**Design locked this phase:**
- In-mission retreat after crossing NML: **allowed, no cost** in skirmish; campaign redeploy delay in Phase 3
- Recruit trickle: **8 per strategic turn** (slow start — tune in playtest)
- v1 objective placeholder: **River Line**

**Exit:** Skirmish unchanged except Withdraw; campaign types compile.

---

### Phase 1 — Campaign state (v0.7.0) · foundation ✅

**Goal:** Serializable war state, no new UI yet.

- [x] `CampaignState`: army, 1 playable division (9 companies), recruit pool, turn counter
- [x] `Company`, `Subsector`, `Division` types with strength, status, deployed slot
- [x] Save/load to `localStorage`; version **2** with v1 migration
- [x] Static enemy OOB table per company id (`src/campaign/data/enemy-oob.json`)
- [x] Unit tests: strength aggregation, destroyed → rebuilding transition

**Exit:** Campaign button writes save; dev console: `__campaign.loadCampaignState()`.

---

### Phase 2 — Division map UI (v0.7.1) ✅

**Goal:** Player sees the front and picks a fight.

- [x] **Division screen** after Campaign → New: stylized 3-subsector map (fictional names)
- [x] Company counters per subsector (strength bar, status icon)
- [x] Tap company → **briefing panel** (enemy strength estimate, terrain tags)
- [x] **Back out** from briefing — **2-turn redeploy cooldown**
- [x] **Commit** → load tactical with `MissionSetup` from company + template
- [x] Return from tactical → apply `MissionOutcome` to company + subsector control tint

**Exit:** Full loop: division → one tactical map → division with updated strength.

---

### Phase 3 — Tactical bridge & retreat (v0.7.2) ✅

**Goal:** Mission results feel fair; back-out costs time.

- [x] Pass company strength into tactical: depleted companies spawn fewer/res weaker platoons
- [x] **In-mission retreat** before enemy trench → early pull-back (5% penalty + redeploy)
- [x] **Redeploy cooldown** (2 turns) after back-out or late retreat
- [x] Company transfer UI: relocate between subsectors with **1-turn** delay
- [x] Minimum garrison rule: subsector with < 2 line companies → **Undermanned** flag

**Exit:** Player can shuffle companies; backing out hurts tempo.

---

### Phase 4 — Map templates (v0.7.3) ✅

**Goal:** Missions feel distinct.

- [x] 9 mission templates (arc, wire, pillbox, hill, mud)
- [x] `templateId` + `seed` drive trench arc, NML depth, wire sectors, enemy platoon weights
- [x] Briefing shows template name + intel lines (layout-aware wire/terrain)
- [x] Skirmish mode picks template in Settings for testing

**Exit:** Same company replayed on different neighbor still feels different.

---

### Phase 5 — Overextension & static enemy pressure (v0.8.0) ✅

**Goal:** Strategic consequences without always-on AI.

- [x] After tactical **victory**, evaluate adjacency: salient without shoulder support → **Vulnerable** flag
- [x] **Understrength** battalion + vulnerable neighbor → **Enemy Counter-push** event
- [x] Event updates brigade map (enemy control, company forced to Critical or Destroyed)
- [x] Front report log explaining why

**Exit:** Winning one map in isolation can lose ground elsewhere.

---

### Phase 5b — Historical OOB v3 (v0.8.0) ✅

**Goal:** Brigade/battalion hierarchy with historically scaled British rifle companies.

- [x] **30-man platoons**, 8 platoons per company, 4 companies per battalion
- [x] **Division map** → **Brigade map** → **Battalion briefing** → tactical
- [x] One tactical map = one **battalion** (line company + assault company)
- [x] Company transfer between battalions on brigade map (1-turn delay)
- [x] Save **v3**; enemy OOB per battalion; `Launch Trench Command.command` launcher
- [x] Full unit names in UI (Battalion, Brigade, Company — no abbreviations)

**Exit:** Player manages a brigade front of up to 4 battalions; 12 maps per division at full scale.

---

### Phase 6 — Recruits & rebuild (v0.8.1) — **NEXT**

**Goal:** Division ↔ army resource loop.

- [ ] Recruit pool trickle (+ bonus on battalion victories)
- [ ] Brigade screen: **Request reinforcements** (queue per company)
- [ ] Army screen (minimal): approve requests, split pool across divisions (1 playable division for now)
- [ ] Destroyed company **rebuild timer** when recruits assigned
- [ ] Depleted companies recover strength slowly if garrisoned (no battle) — optional tune

**Exit:** Losing a company hurts for many steps; player manages pipeline.

---

### Phase 7 — Army map (v0.8.2)

**Goal:** Zoom out scale; still 1 campaign.

- [ ] Army map: **10 division markers**, **3 selectable**, rest shown as AI-held line (static color)
- [ ] Zoom division → existing division screen
- [ ] Army recruit pool + objective tracker (River Line progress bar)
- [ ] Transfer companies **within** division only (cross-division = v2)

**Exit:** Fantasy of corps-scale front; scope stays manageable.

---

### Phase 8 — Campaign victory & polish (v0.9.0)

**Goal:** One complete playable campaign arc.

- [ ] Objective win/fail conditions wired
- [ ] Campaign end screen + stats (companies lost, missions fought, time)
- [ ] **Continue** on main menu loads campaign save
- [ ] New campaign overwrites with confirm dialog
- [ ] Balance pass: redeploy delay, rebuild time, overextension thresholds

**Exit:** Shippable **BEF Amiens v1** campaign (fictional names).

---

### Phase 9 — Android packaging (v1.0.0)

**Goal:** Offline installable build.

- [ ] Capacitor init per `docs/ANDROID.md`
- [ ] Full-screen WebView, back button → division map → army map → menu
- [ ] Save on `pause` / app background
- [ ] Touch audit on division/army screens
- [ ] App icon, splash, signed debug APK
- [ ] Play Store deferred until balance stable

**Exit:** sideloadable Android APK of full campaign.

---

### Later (post v1.0)

| Item | Notes |
|------|--------|
| Real division names & OOB | Swap JSON, keep mechanics |
| French / US / German armies | Separate recruit + doctrine modifiers |
| Crisis tactical missions | Counter-push triggers playable emergency map |
| v0.6 Phase 2b | Enemy effectiveness + AI — improves tactical, not campaign AI |
| Historical scenario packs | Somme 1916, etc. |
| Fog of war | v0.7 theater ideas from ROADMAP |

---

## Recommended build order (summary)

```
v0.6.1  Phase 0   Prep / mission outcome API
v0.7.0  Phase 1   Campaign state + save
v0.7.1  Phase 2   Division map UI + tactical loop
v0.7.2  Phase 3   Retreat, redeploy, company transfer
v0.7.3  Phase 4   Map templates & variety
v0.8.0  Phase 5   Overextension events
v0.8.0  Phase 5b  OOB v3 — brigade/battalion maps, 30-man platoons ✅
v0.8.1  Phase 6   Recruits & rebuild          ← NEXT
v0.8.2  Phase 7   Army map (10 div / 3 playable)
v0.9.0  Phase 8   Win/fail + campaign polish
v1.0.0  Phase 9   Android APK
```

**Defer:** v0.6 Phase 2b (enemy effectiveness AI), procedural mega-generator, multiplayer, fog of war — until campaign loop is fun in Phase 5–8.

---

## Open items (for you later)

- [ ] Exact **v1 objective** historical label on map (mechanics use **River Line** placeholder)
- [ ] Numeric tuning: redeploy cooldown steps, rebuild days (recruit trickle **8/turn** for now)
- [x] **In-mission retreat** — allowed, no skirmish cost
- [ ] Art style for army/division maps (canvas vs DOM — recommend DOM + CSS like main menu)

---

*Last updated: OOB v3 complete — Phase 6 (recruits & rebuild) next.*
