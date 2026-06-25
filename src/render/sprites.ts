import type { FixedEmplacement, Platoon, ShellImpact, Side } from "../types";

/** Canvas-drawn sprites — atlas-ready structure for future PNG swap on Android. */

export function drawPlatoonSprite(
  ctx: CanvasRenderingContext2D,
  p: Platoon,
  selected: boolean,
  showEffectivenessBadge = true,
): void {
  const isPlayer = p.side === "player";
  const facing = isPlayer ? 1 : -1;
  const helmet = isPlayer ? "#4a6a8a" : "#8a4a4a";
  const coat = isPlayer
    ? p.state === "crossing"
      ? "#5a98d8"
      : p.state === "enemy_trench"
        ? "#3a78c8"
        : "#4a88b0"
    : p.state === "crossing"
      ? "#d87878"
      : "#b85858";
  const alpha = p.state === "routing" ? 0.45 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.scale(facing, 1);

  if (selected) {
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 6, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = coat;
  ctx.fillRect(-10, -2, 14, 10);
  ctx.fillStyle = "#2a3828";
  ctx.fillRect(-8, 6, 5, 7);
  ctx.fillRect(0, 6, 5, 7);

  ctx.fillStyle = helmet;
  ctx.beginPath();
  ctx.arc(-2, -6, 6, 0, Math.PI * 2);
  ctx.fill();

  if (p.state === "crossing") {
    ctx.strokeStyle = "#c8a840";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(14, -2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#3a3020";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(16, -1);
    ctx.stroke();
  }

  ctx.restore();

  // Draw labels in world space so enemy flip (scale -1) never mirrors numerals.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 9px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(String(Math.ceil(p.strength)), p.x, p.y - 14);

  if (showEffectivenessBadge && isPlayer && Math.abs(p.effectiveness - 100) > 2) {
    ctx.fillStyle = p.effectiveness >= 100 ? "#9f9" : p.effectiveness < 50 ? "#f99" : "#dd9";
    ctx.font = "8px system-ui";
    ctx.fillText(`${Math.round(p.effectiveness)}%`, p.x, p.y - 24);
  }

  ctx.textAlign = "left";
  ctx.restore();
}

export function drawEmplacementSprite(
  ctx: CanvasRenderingContext2D,
  e: FixedEmplacement,
  muzzleFlash: boolean,
): void {
  const isPlayer = e.side === "player";
  const metal = isPlayer ? "#6a8aa8" : "#a86a6a";
  const dark = isPlayer ? "#3a5068" : "#683838";

  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.type === "pillbox") {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.roundRect(-12, -8, 24, 16, 4);
    ctx.fill();
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(8, -1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = dark;
    ctx.fillRect(-4, -3, 8, 10);
    ctx.fillStyle = metal;
    ctx.fillRect(-10, -2, 14, 4);
    ctx.fillRect(2, -4, 4, 8);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(10, -2, 6, 3);
  }

  if (muzzleFlash) {
    ctx.fillStyle = "rgba(255,220,100,0.9)";
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(22, -6);
    ctx.lineTo(22, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,200,0.6)";
    ctx.beginPath();
    ctx.arc(14, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawShellImpact(ctx: CanvasRenderingContext2D, impact: ShellImpact): void {
  const life = impact.timer / 0.6;
  const r = impact.radius * (1.3 - life * 0.35);
  const x = impact.x;
  const y = impact.y;

  ctx.save();

  ctx.fillStyle = `rgba(255,200,80,${life * 0.5})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,140,40,${life * 0.85})`;
  ctx.lineWidth = 2 + life * 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(60,40,25,${life * 0.55})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + life;
    const dist = r * (0.5 + (1 - life) * 0.8);
    ctx.fillStyle = `rgba(90,60,35,${life * 0.4})`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 2 + life * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawTracerLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  side: Side,
): void {
  const color = side === "player" ? "rgba(255,255,120,0.75)" : "rgba(255,120,80,0.75)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x2, y2, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTrenchParapet(ctx: CanvasRenderingContext2D, y: number, color: string): void {
  ctx.fillStyle = color;
  for (let x = 0; x < 1200; x += 24) {
    const h = 6 + Math.sin(x * 0.08) * 2;
    ctx.fillRect(x, y - h, 20, h);
  }
}
