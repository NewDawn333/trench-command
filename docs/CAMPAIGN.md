# Trench Command — Campaign design & build plan

**Status:** Design agreed (BEF / Amiens 1918 framing, fictional OOB for v1).  
**Tactical engine:** v0.6 (platoon-level, 8-sector trench map).  
**Platform target:** Single-player, **offline-first** — web prototype now, **Android** via Capacitor later.

---

## Design pillars (locked)

| Topic | Decision |
|-------|----------|
| **Historical frame** | British Expeditionary Force, **Amiens sector, 1918** (Hundred Days). Fictional division/company names until systems prove out. |
| **Layers** | Army (10 divisions, 3 playable) → Division (3 subsectors) → Company (1 tactical map) → Platoon (in-mission). |
| **Enemy on campaign map** | **Static** — each company/subsector has defined enemy strength; no background probing every turn. |
| **Enemy pressure** | **Event-driven** — overextension / weak garrison triggers counter-push; map updates to show enemy control. |
| **Tactical variety** | Each company map differs in **enemy OOB, terrain, defenses, trench arc** — not one recycled skirmish. |
| **Mission commit** | Player may **back out before engaging**; downside = **redeploy delay** before that company can fight elsewhere. |
| **Casualties** | Company **strength persists** across missions. **Total loss** destroys the company; rebuild from **recruits over time**. Weakened subsectors until backfilled. |
| **Reinforcements** | **Division commander** requests men → **Army general** (player at army layer) allocates recruit pool to subsectors/companies. |
| **Victory** | **Objective-based** (e.g. reach Somme / Péronne corridor) — exact historical wording TBD; one clear primary goal for v1. |
| **Multiplayer** | None — single-player only. |

---

## Terminology

```
Army          ~10 divisions on strategic map (3 fully playable at first)
 └── Division     player picks one to zoom into
      └── Subsector   3 per division (= brigade-sized front slice)
           └── Company    1 tactical mission (current 8-sector game)
                └── Platoon   in-mission unit (36 men)
```

**Suggested UI labels:** *Army map* → *Division front* → *Subsector* → *Company action*.

**Default OOB (game abstraction):**

- 1 division = **3 subsectors × 3 companies** = **9 companies**
- ~**6–7 companies deployed** on the line, **2–3 in division reserve** at campaign start
- 1 company ≈ one tactical map (8 platoons / sectors as today)

---

## Architecture notes (Android-safe)

Build campaign as **separate scenes/screens** sharing one save blob:

| Screen | Responsibility |
|--------|----------------|
| `ArmyScreen` | Strategic map, recruit pool, objective tracker, division selection |
| `DivisionScreen` | 3 subsectors, company counters, transfer queue, reinforcement requests |
| `TacticalScreen` | Existing canvas game (`Game.ts` loop) |
| `MissionBriefing` | Enemy intel, terrain summary, Commit / Back out |

**Persistence:** one `CampaignSave` JSON in `localStorage` (Capacitor → same API on device).  
**No server.** Autosave on: return from tactical, company transfer, recruit allocation, overextension event.

**Code layout (target):**

```
src/campaign/     CampaignState, tick, overextension, recruits
src/campaign/ui/  Army + Division screens (DOM or canvas — match menu style)
src/game/         Tactical sim (unchanged contract: seed + OOB in → outcome out)
src/mission/      Map templates, generator hooks, briefing copy
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

### Phase 1 — Campaign state (v0.7.0) · foundation

**Goal:** Serializable war state, no new UI yet.

- [ ] `CampaignState`: army, 1 playable division (9 companies), recruit pool, turn counter
- [ ] `Company`, `Subsector`, `Division` types with strength, status, deployed slot
- [ ] Save/load to `localStorage`; version field for migrations
- [ ] Static enemy OOB table per company id (JSON)
- [ ] Unit tests: strength aggregation, destroyed → rebuilding transition

**Exit:** Can load/save a fake campaign in dev console.

---

### Phase 2 — Division map UI (v0.7.1)

**Goal:** Player sees the front and picks a fight.

- [ ] **Division screen** after Campaign → New: stylized 3-subsector map (fictional names)
- [ ] Company counters per subsector (strength bar, status icon)
- [ ] Tap company → **briefing panel** (enemy strength estimate, terrain tags)
- [ ] **Back out** from briefing (no tactical load) — starts redeploy cooldown on that company
- [ ] **Commit** → load tactical with `MissionSetup` from company + template
- [ ] Return from tactical → apply `MissionOutcome` to company + subsector control tint

**Exit:** Full loop: division → one tactical map → division with updated strength.

---

### Phase 3 — Tactical bridge & retreat (v0.7.2)

**Goal:** Mission results feel fair; back-out costs time.

- [ ] Pass company strength into tactical: depleted companies spawn fewer/res weaker platoons
- [ ] **In-mission retreat** (menu) before enemy trench crossed → `retreat`, smaller strength loss than defeat
- [ ] **Redeploy cooldown** (e.g. 2 strategic steps) after back-out or retreat
- [ ] Company transfer UI: move company between subsectors with **1-step delay** queue
- [ ] Minimum garrison rule: subsector with < 2 companies “Undermanned” flag (no auto-loss yet)

**Exit:** Player can shuffle companies; backing out hurts tempo.

---

### Phase 4 — Map templates (v0.7.3)

**Goal:** Missions feel distinct.

- [ ] 6–9 mission templates (arc, wire, pillbox, hill)
- [ ] `templateId` + `seed` drive trench layout offsets, emplacement counts, enemy platoon map
- [ ] Briefing shows template name + 2–3 intel lines
- [ ] Skirmish mode can pick template for testing

**Exit:** Same company replayed on different neighbor still feels different.

---

### Phase 5 — Overextension & static enemy pressure (v0.8.0)

**Goal:** Strategic consequences without always-on AI.

- [ ] After tactical **victory**, evaluate adjacency: salient without shoulder support → **Vulnerable** flag
- [ ] **Undermanned** subsector + vulnerable neighbor → trigger **Enemy Counter-push** event
- [ ] Event updates division map (enemy control fill, company forced to Critical or Destroyed)
- [ ] Toast / log entry explaining why (“Left flank exposed — 2nd Subsector overrun”)
- [ ] Optional: one **crisis tactical mission** if player taps event (stretch)

**Exit:** Winning one map in isolation can lose ground elsewhere — player learns linked advances.

---

### Phase 6 — Recruits & rebuild (v0.8.1)

**Goal:** Division ↔ army resource loop.

- [ ] Recruit pool trickle (+ bonus on subsector victories)
- [ ] Division screen: **Request reinforcements** (queue per company)
- [ ] Army screen (minimal): approve requests, split pool across divisions (1 playable div for now)
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
v0.8.1  Phase 6   Recruits & rebuild
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

*Last updated: campaign design session — BEF Amiens 1918, fictional OOB, offline Android target.*
