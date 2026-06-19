import type { GameState } from "./Game";
import { reservesAvailableForSector } from "./Game";
import type { CasualtyCause, Platoon } from "../types";
import { CONFIG, LAYOUT } from "../types";
import { callUpButtonRect, mgButtonRect, sectorCenterX, sectorWidth } from "./battlefield";

const CAUSE_LABEL: Record<CasualtyCause, string> = {
  mg: "MG",
  rifle: "Rifle",
  enemy_arty: "Enemy shell",
  friendly_arty: "Friendly shell",
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = rect?.width ?? CONFIG.mapWidth;
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

    this.drawTerrain(ctx);
    this.drawSectors(ctx, game);
    this.drawArtilleryZones(ctx, game);
    this.drawTrenches(ctx);
    this.drawEmplacements(ctx, game);
    this.drawPlatoons(ctx, game);
    this.drawEffects(ctx, game);
    this.drawCallUpButtons(ctx, game);
    this.drawMgButtons(ctx);
    this.drawLabels(ctx);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#3d4a32";
    ctx.fillRect(0, 0, CONFIG.mapWidth, LAYOUT.nmlTop);
    ctx.fillStyle = "#4a3d28";
    ctx.fillRect(0, LAYOUT.nmlTop, CONFIG.mapWidth, LAYOUT.nmlBottom - LAYOUT.nmlTop);
    ctx.fillStyle = "#2f3828";
    ctx.fillRect(0, LAYOUT.nmlBottom, CONFIG.mapWidth, CONFIG.mapHeight - LAYOUT.nmlBottom);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % CONFIG.mapWidth;
      const y = LAYOUT.nmlTop + ((i * 53) % (LAYOUT.nmlBottom - LAYOUT.nmlTop));
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTrenches(ctx: CanvasRenderingContext2D): void {
    const drawLine = (y: number, color: string, label: string, ly: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= CONFIG.mapWidth; x += 40) {
        ctx.lineTo(x, y + Math.sin(x * 0.04) * 3);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "11px system-ui";
      ctx.fillText(label, 8, ly);
    };

    drawLine(LAYOUT.enemyTrenchY, "#6b4a4a", "Enemy trench", LAYOUT.enemyTrenchY - 6);
    drawLine(LAYOUT.playerTrenchY, "#4a5a6b", "Your trench", LAYOUT.playerTrenchY + 14);
    ctx.fillStyle = "rgba(200,180,140,0.25)";
    ctx.font = "12px system-ui";
    ctx.fillText("NO MAN'S LAND", CONFIG.mapWidth / 2 - 52, (LAYOUT.nmlTop + LAYOUT.nmlBottom) / 2);
  }

  private drawSectors(ctx: CanvasRenderingContext2D, game: GameState): void {
    const w = sectorWidth();
    for (const s of game.sectors) {
      if (s.controller === "player") ctx.fillStyle = "rgba(70,120,180,0.15)";
      else if (s.controller === "contested") ctx.fillStyle = "rgba(180,140,60,0.12)";
      else ctx.fillStyle = "transparent";
      ctx.fillRect(s.x, LAYOUT.enemyTrenchY - 20, w, LAYOUT.playerTrenchY - LAYOUT.enemyTrenchY + 40);

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
      ctx.fillStyle = e.side === "player" ? "#8ab4d4" : "#d48a8a";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.type === "pillbox" ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();

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
      this.drawPlatoon(ctx, p, game.selectedPlatoons.includes(p.id));
    }
  }

  private drawPlatoon(ctx: CanvasRenderingContext2D, p: Platoon, selected: boolean): void {
    const w = 28;
    const h = 14;
    const x = p.x - w / 2;
    const y = p.y - h / 2;

    ctx.fillStyle =
      p.side === "player"
        ? p.state === "crossing"
          ? "#6ca8e8"
          : p.state === "enemy_trench"
            ? "#4a8ad4"
            : "#5a90b8"
        : p.state === "crossing"
          ? "#e89090"
          : "#c87070";

    if (p.state === "routing") ctx.globalAlpha = 0.4;
    ctx.fillRect(x, y, w, h);
    if (selected) {
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.ceil(p.strength)), p.x, p.y + 4);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  private drawEffects(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (const t of game.events.tracers) {
      ctx.strokeStyle = t.side === "player" ? "rgba(255,255,120,0.7)" : "rgba(255,120,80,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
    }

    for (const i of game.events.impacts) {
      const alpha = i.timer / 0.6;
      ctx.fillStyle = `rgba(80,50,30,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(i.x, i.y, i.radius * (1.2 - alpha * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,160,60,${alpha})`;
      ctx.stroke();
    }

    for (const c of game.events.casualties) {
      const alpha = c.timer / 1.2;
      ctx.fillStyle = c.side === "player" ? `rgba(100,160,255,${alpha})` : `rgba(255,100,100,${alpha})`;
      ctx.font = "9px system-ui";
      ctx.fillText(CAUSE_LABEL[c.cause], c.x + 8, c.y - 8 * alpha);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCallUpButtons(ctx: CanvasRenderingContext2D, game: GameState): void {
    for (let i = 0; i < CONFIG.sectorCount; i++) {
      const r = callUpButtonRect(i);
      const available = reservesAvailableForSector(game, i);
      const selected = game.selectedSector === i;

      ctx.fillStyle = available ? (selected ? "#5a6848" : "#3a4434") : "#252820";
      ctx.strokeStyle = available ? (selected ? "#b8d888" : "#6a8058") : "#3a4034";
      ctx.lineWidth = available ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = available ? "#e8e4dc" : "#666860";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(available ? "+ Call Up" : "No reserves", r.x + r.w / 2, r.y + r.h / 2 + 3);
      ctx.textAlign = "left";
    }
  }

  private drawMgButtons(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < CONFIG.sectorCount; i++) {
      const r = mgButtonRect(i);
      ctx.fillStyle = "#2e3848";
      ctx.strokeStyle = "#5a7898";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a8c4e0";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("+ MG", r.x + r.w / 2, r.y + r.h / 2 + 3);
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
