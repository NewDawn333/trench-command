# Trench Command

Real-time WW1 trench sector commander — mass troops, bracket no man's land with artillery, and assault sector by sector until the enemy line is yours.

**v0.6** — Limited mode: 30s call-up regen per sector, arty regen, 4 MG pool. **v0.5** added AI difficulty.

See [ROADMAP.md](./ROADMAP.md) and [docs/ANDROID.md](./docs/ANDROID.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5174 (or the URL Vite prints).

Build for production:

```bash
npm run build
npm run preview
```

## How to play (v0.1)

- **8 sectors** across the front: your trench, staging, no man's land, enemy trench.
- **Win** by capturing the entire enemy trench line.
- **Pause** anytime to plan.

### Troops

| Action | Input |
|--------|--------|
| Select one platoon | Tap platoon |
| Select all platoons in a trench bay | Double-tap platoon in trench |
| Move laterally along trench | Select → tap trench band in target sector |
| Move to staging | Select → tap staging band in target sector |
| Advance sector | Double-tap sector (trenched troops assault; staging fills trench) |
| Call up platoon | Tap **+ Call Up** on sector strip |
| Place MG | Tap **+ MG** on sector strip |

### Artillery

1. Tap **Artillery** mode.
2. Tap a sector in **no man's land** — next free battery brackets and fires automatically.
3. Mode returns to Select / Move. Repeat to task more batteries.
4. Tap an **active bracket** (in Select or Artillery mode) to stop that battery.

### Combat (automatic)

- Trench rifle and MG fire into NML within range rules.
- Lateral trench fights: slight defender edge (~1.1×) while attackers shuffle in; even once in the same bay.
- Emplacements destroyed when their sector is overrun.

See [ROADMAP.md](./ROADMAP.md) for planned features.

## Stack

TypeScript · Vite · Canvas 2D — no game engine.

## License

MIT (or specify later)
