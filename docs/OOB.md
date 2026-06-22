# Trench Command — Order of Battle (BEF v1)

Historical framing for the British Expeditionary Force. French, US, and German lines reuse the same **mechanical** hierarchy with national labels later.

## Chain of command (playable scope in bold)

```
Army (future)
 └── Corps (future, 2–4 divisions)
      └── **Division** (3 brigades)
           └── **Brigade** (4 battalions; often 3 on the front)
                └── **Battalion** (4 companies) → **one tactical map**
                     └── **Company** (8 platoons)
                          └── **Platoon** (30 riflemen)
```

## British scale (this build)

| Unit | Composition | Riflemen |
|------|-------------|----------|
| Platoon | — | **30** |
| Company | 8 platoons | **240** |
| Battalion | 4 companies | **960** |
| Brigade | 4 battalions | 3,840 |
| Division | 3 brigades | 11,520 (12 battalions) |

## Tactical map (one battalion)

Each playable screen is **one battalion front** (8 trench sectors = 8 platoon slots).

At assault commit:

| Role | Companies | On map |
|------|-----------|--------|
| **Line** | 1 company | 8 platoons on the trench (1 per sector) |
| **Assault reserve** | 1 company | Riflemen held for **call-up** (staging strip) |
| **Battalion reserve** | 2 companies | Strategic pool on brigade map (not spawned in v1 assault) |

So the player typically fights with **~240 on the line** and **~240 in the call-up pool** (~480 battalion riflemen engaged). The “~100” feel in older notes was before platoon size was fixed at 30; we can add **section**-sized sub-units later without changing the chain above.

## Brigade front

- **3-section brigade:** battalions 1–3 hold the brigade front; 4th battalion in **brigade reserve** (still manageable on the brigade map).
- **4-section / reinforced:** all four battalions on the line (heavier fronts, fewer reserves).

## Division (dev campaign)

- **1st Division** (placeholder): **3 brigades × 4 battalions** = **12 tactical maps** maximum attention.
- Some divisions (later content) may attach fewer active brigades or reinforce specific battalions.

## Save version

Campaign save **v3** uses this hierarchy. Older v2 saves (subsector model) reset on load with a fresh division.
