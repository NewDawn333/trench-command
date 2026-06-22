import type { GameState } from "./Game";
import { mgAvailableForSector, reservesAvailableForSector } from "./Game";
import { countMgsInSector } from "./emplacements";
import { CONFIG, LAYOUT } from "../types";
import type { MissionLayout } from "../mission/MissionLayout";
import { trenchLineY } from "../mission/MissionLayout";
import { CALL_UP_REGEN_SEC } from "./ResourceConfig";
import { callUpButtonRect, mgButtonRect, sectorCenterX, sectorWidth, sectorX } from "./battlefield";
import {
  drawEmplacementSprite,
  drawPlatoonSprite,
  drawShellImpact,
  drawTracerLine,
} from "../render/sprites";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(canvas.parentElement);
    }
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    let w = parent?.getBoundingClientRect().width ?? 0;

    // Parent is display:none on load — fall back to app width so canvas isn't 0px tall.
    if (w < 64) {
      const app = document.getElementById("app");
      w = app?.getBoundingClientRect().width ?? CONFIG.mapWidth;
    }

    w = Math.max(64, Math.min(w, CONFIG.mapWidth));
    this.scale = w / CONFIG.mapWidth;
    this.canvas.width = CONFIG.mapWidth;
    this.canvas.height = CONFIG.mapHeight;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${CONFIG.mapHeight * this.scale}px`;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((sx - rect.left) / rect.width) * CONFIG.mapWidth,
      y: ((sy - rect.top) / rect.height) * CONFIG.mapHeight,
    };
  }

  render(game: GameState): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.mapWidth, CONFIG.mapHeight);

    this.drawTerrain(ctx, game.missionLayout);
    this.drawSectors(ctx, game);
    this.drawArtilleryZones(ctx, game);
    this.drawTrenches(ctx, game.missionLayout);
    this.drawEmplacements(ctx, game);
    this.drawPlatoons(ctx, game);
    this.drawEffects(ctx, game);
    this.drawCallUpButtons(ctx, game);
    this.drawMgButtons(ctx, game);
    this.drawLabels(ctx);
  }

  private terrainColor(kind: MissionLayout["terrain"][number]): string {
    switch (kind) {
      case "ridge":
        return "#524a38";
      case "mud":
        return "#3a3428";
      default:
        return "#4a3d28";
    }
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, layout: MissionLayout): void {
    ctx.fillStyle = "#3d4a32";
    ctx.fillRect(0, 0, CONFIG.mapWidth, layout.nmlTop);
    const w = sectorWidth();
    for (let s = 0; s < CONFIG.sectorCount; s++) {
      ctx.fillStyle = this.terrainColor(layout.terrain[s] ?? "flat");
      ctx.fillRect(sectorX(s), layout.nmlTop, w, layout.nmlBottom - layout.nmlTop);
      if (layout.wireSectors.includes(s)) {
        ctx.strokeStyle = "rgba(180,160,120,0.45)";
        ctx.lineWidth = 1;
        for (let row = 0; row < 3; row++) {
          const y = layout.nmlTop + 24 + row * 36;
          ctx.beginPath();
          ctx.moveTo(sectorX(s) + 8, y);
          ctx.lineTo(sectorX(s) + w - 8, y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = "#2f3828";
    ctx.fillRect(0, layout.nmlBottom, CONFIG.mapWidth, CONFIG.mapHeight - layout.nmlBottom);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % CONFIG.mapWidth;
      const y = layout.nmlTop + ((i * 53) % Math.max(1, layout.nmlBottom - layout.nmlTop));
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawArcTrench(
    ctx: CanvasRenderingContext2D,
    side: "player" | "enemy",
    color: string,
    parapet: string,
  ): void {
    const w = sectorWidth();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let s = 0; s < CONFIG.sectorCount; s++) {
      const x0 = sectorX(s);
      const x1 = x0 + w;
      const y0 = trenchLineY(side, s);
      const y1 = trenchLineY(side, s + 1 >= CONFIG.sectorCount ? s : s + 1);
      if (s === 0) ctx.moveTo(x0, y0);
      ctx.lineTo(x1, (y0 + y1) / 2);
    }
    ctx.stroke();
    for (let s = 0; s < CONFIG.sectorCount; s++) {
      const x0 = sectorX(s);
      const y = trenchLineY(side, s);
      ctx.fillStyle = parapet;
      for (let x = x0; x < x0 + w; x += 24) {
        const h = 6 + Math.sin(x * 0.08) * 2;
        ctx.fillRect(x, y - h, 20, h);
      }
    }
  }

  private drawTrenches(ctx: CanvasRenderingContext2D, layout: MissionLayout): void {
    this.drawArcTrench(ctx, "enemy", "#6b4a4a", "#5a4038");
    this.drawArcTrench(ctx, "player", "#4a5a6b", "#3a4858");

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px system-ui";
    ctx.fillText("Enemy trench", 8, trenchLineY("enemy", 0) - 6);
    ctx.fillText("Your trench", 8, trenchLineY("player", 0) + 14);
    ctx.fillStyle = "rgba(200,180,140,0.25)";
    ctx.font = "12px system-ui";
    ctx.fillText("NO MAN'S LAND", CONFIG.mapWidth / 2 - 52, (layout.nmlTop + layout.nmlBottom) / 2);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px system-ui";
    ctx.fillText(layout.displayName, CONFIG.mapWidth - 120, 16);
  }

  private drawSectors(ctx: CanvasRenderingContext2D, game: GameState): void {
    const w = sectorWidth();
    for (const s of game.sectors) {
      const enemyY = trenchLineY("enemy", s.index);
      const playerY = trenchLineY("player", s.index);
      if (s.controller === "player") ctx.fillStyle = "rgba(70,120,180,0.15)";
      else if (s.controller === "contested") ctx.fillStyle = "rgba(180,140,60,0.12)";
      else ctx.fillStyle = "transparent";
      ctx.fillRect(s.x, enemyY - 20, w, playerY - enemyY + 40);

      if (game.selectedSector === s.index) {
        ctx.strokeStyle = "rgba(255,220,100,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x + 2, LAYOUT.enemyReserveY, w - 4, LAYOUT.callUpY - LAYOUT.enemyReserveY - 4);
      }

      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "10px system-ui";
      ctx.fillText(`${s.index + 1}`, s.x + 4, LAYOUT.enemyReserveY + 12);
    }
  }

  private drawArtilleryZones(ctx: CanvasRenderingContext2D, game: GameState): void {
    const zones = [
      ...game.playerBatteries.filter((b) => b.targetZone).map((b) => ({ zone: b.targetZone!, side: b.side })),
      ...game.enemyBatteries.filter((b) => b.targetZone).map((b) => ({ zone: b.targetZone!, side: b.side })),
    ];
    for (const { zone, side } of zones) {
      ctx.fillStyle = side === "player" ? "rgba(255,180,60,0.12)" : "rgba(255,80,60,0.12)";
      ctx.strokeStyle = side === "player" ? "rgba(255,180,60,0.5)" : "rgba(255,80,60,0.5)";
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    }
    if (game.artyPreview) {
      const z = game.artyPreview;
      ctx.fillStyle = "rgba(255,220,100,0.15)";
      ctx.strokeStyle = "rgba(255,220,100,0.7)";
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([]);
    }
  }

  private drawEmplacements(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (const e of game.emplacements) {
      const justFired = e.fireCooldown > 0.04;
      const selected = e.id === game.selectedEmplacementId;
      drawEmplacementSprite(ctx, e, justFired);

      if (selected) {
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.side === "player" && e.type === "mg" && e.moveCooldown > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "8px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(e.moveCooldown)}s`, e.x, e.y - 20);
        ctx.textAlign = "left";
      }

      ctx.strokeStyle = e.side === "player" ? "rgba(138,180,212,0.35)" : "rgba(212,138,138,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cx = sectorCenterX(e.sector);
      const r = 80;
      const a1 = (e.arcStart * Math.PI) / 180;
      const a2 = (e.arcEnd * Math.PI) / 180;
      ctx.arc(cx, e.y, r, a1, a2);
      ctx.stroke();
    }
  }

  private drawPlatoons(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (const p of game.platoons) {
      if (p.strength <= 0 || p.state === "reserve") continue;
      drawPlatoonSprite(ctx, p, game.selectedPlatoons.includes(p.id), game.showEffectivenessBadge);
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (const t of game.events.tracers) {
      drawTracerLine(ctx, t.x1, t.y1, t.x2, t.y2, t.side);
    }

    for (const i of game.events.impacts) {
      drawShellImpact(ctx, i);
    }

    for (const c of game.events.casualties) {
      const alpha = c.timer / 1.2;
      ctx.fillStyle = c.side === "player" ? `rgba(100,160,255,${alpha * 0.6})` : `rgba(255,100,100,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3 + (1 - alpha) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCallUpButtons(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (let i = 0; i < CONFIG.sectorCount; i++) {
      const r = callUpButtonRect(i);
      const available = reservesAvailableForSector(game, i);
      const selected = game.selectedSector === i;
      const progress = game.unlimitedResources ? 1 : game.callUpRegen[i];

      ctx.fillStyle = "#252820";
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.fill();

      if (progress > 0 && progress < 1) {
        ctx.fillStyle = "#3a5038";
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w * progress, r.h, 3);
        ctx.fill();
      }

      const ready = available;
      ctx.fillStyle = ready ? (selected ? "#5a6848" : "#3a4434") : "#2a3028";
      if (ready) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = ready ? (selected ? "#b8d888" : "#6dff6d") : "#3a4034";
      ctx.lineWidth = ready ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.stroke();

      ctx.fillStyle = ready ? "#e8e4dc" : "#666860";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(ready ? "+ Call Up" : `${Math.ceil((1 - progress) * CALL_UP_REGEN_SEC)}s`, r.x + r.w / 2, r.y + r.h / 2 + 3);
      ctx.textAlign = "left";
    }
  }

  private drawMgButtons(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (let i = 0; i < CONFIG.sectorCount; i++) {
      const r = mgButtonRect(i);
      const mgCount = countMgsInSector(game.emplacements, "player", i);
      const available = mgAvailableForSector(game, i);

      ctx.fillStyle = available ? "#2e3848" : "#252830";
      ctx.strokeStyle = available ? "#5a7898" : "#3a4048";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = available ? "#a8c4e0" : "#666870";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      let label = "+ MG";
      if (mgCount >= 3) label = "MG full";
      else if (mgCount > 0) label = available ? `+ MG (${mgCount}/3)` : `MG ${mgCount}/3`;
      else if (!available && !game.unlimitedResources) {
        label = game.mgPool <= 0 ? "No MGs" : "MG";
      } else if (!game.unlimitedResources && game.mgPool > 0) {
        label = `+ MG (${game.mgPool})`;
      }
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 3);
      ctx.textAlign = "left";
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px system-ui";
    ctx.fillText("Enemy rear", 8, 24);
    ctx.fillText("Your staging / reserves", 8, LAYOUT.playerStagingY + 16);
  }
}
