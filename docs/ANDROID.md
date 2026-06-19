# Android path for Trench Command

## Recommendation: polish web first, wrap second

Ship **v0.2–v0.3 on the web** (audio, sprites, main menu, levels), then package the same build for Android. Do **not** rewrite in Kotlin/libGDX until the loop is fun and stable — you would rebalance twice.

**Target wrapper:** [Capacitor](https://capacitorjs.com/) — wraps the Vite build in a WebView, keeps one codebase, works with touch + Web Audio on Android.

---

## What v0.2 already does for mobile

| Area | Approach |
|------|----------|
| Input | Pointer events, no hover/shift/right-click |
| Audio | Web Audio API via `AudioManager` — same API in Capacitor WebView |
| Settings | `localStorage` for volumes — persists on device |
| Layout | `viewport-fit=cover`, safe-area insets, `touch-action: none` on canvas |
| Graphics | Canvas sprites in `src/render/sprites.ts` — swap to PNG atlas without changing game logic |
| Sim / render | Split: `Game.ts` sim, `Renderer.ts` draw, `Input.ts` input — easy to keep identical in APK |

---

## Capacitor checklist (when ready — ~v0.3)

1. `npm run build` → `dist/`
2. `npm install @capacitor/core @capacitor/cli @capacitor/android`
3. `npx cap init "Trench Command" com.newdawn333.trenchcommand`
4. `npx cap add android`
5. Point `webDir` to `dist` in `capacitor.config.ts`
6. `npx cap sync android` after each web build
7. Open Android Studio → run on device/emulator

### Android-specific tweaks

- **Immersive fullscreen** — hide status/nav bars in `MainActivity`
- **Wake lock** (optional) — keep screen on during mission
- **Back button** — map to pause menu (v0.3)
- **Asset loading** — place OGG/MP3 in `public/audio/`; load via `AudioManager.loadFile()` (extend when replacing procedural SFX)
- **Performance** — keep canvas at fixed 1200×600 internal res, scale with CSS (already done)
- **Play Store** — icon, screenshots, content rating; no special permissions needed for offline game

---

## Optional later: native modules

Only if WebView limits you (e.g. heavy particle counts, Bluetooth):

- Capacitor plugin for haptics on assault whistle
- Native audio mix (ExoPlayer) — rarely needed if Web Audio is smooth enough

---

## File layout for assets (future)

```
public/
  audio/
    music/ambient.ogg
    sfx/rifle.ogg
    sfx/mg.ogg
    ...
  sprites/
    atlas.png
    atlas.json
```

`AudioManager` and `sprites.ts` are designed so procedural/vector drawing can be replaced by file loads without touching combat code.

---

*See ROADMAP.md for feature order before Android store submission.*
