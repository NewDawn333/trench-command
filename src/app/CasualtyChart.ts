import type { CasualtySample } from "./MissionStats";
import { formatTime } from "./GameSettings";

const PAD = { top: 28, right: 20, bottom: 36, left: 48 };

export function drawCasualtyChart(
  canvas: HTMLCanvasElement,
  history: CasualtySample[],
  missionTime: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 480;
  const cssH = canvas.clientHeight || 220;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = "#1e221c";
  ctx.fillRect(0, 0, cssW, cssH);

  const samples =
    history.length > 0 ? history : [{ time: 0, player: 0, enemy: 0 }];
  const maxTime = Math.max(missionTime, samples[samples.length - 1]?.time ?? 1, 1);
  const maxCasualties = Math.max(
    10,
    ...samples.map((s) => Math.max(s.player, s.enemy)),
  );

  const plotW = cssW - PAD.left - PAD.right;
  const plotH = cssH - PAD.top - PAD.bottom;

  const toX = (t: number) => PAD.left + (t / maxTime) * plotW;
  const toY = (v: number) => PAD.top + plotH - (v / maxCasualties) * plotH;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "10px system-ui";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxCasualties * (4 - i)) / 4);
    const y = PAD.top + (plotH * i) / 4;
    ctx.fillText(String(val), PAD.left - 6, y + 3);
  }

  ctx.textAlign = "center";
  ctx.fillText("0:00", toX(0), cssH - 8);
  ctx.fillText(formatTime(maxTime), toX(maxTime), cssH - 8);
  ctx.fillText("Mission time →", PAD.left + plotW / 2, cssH - 8);

  const drawLine = (key: "player" | "enemy", color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = toX(s.time);
      const y = toY(s[key]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const last = samples[samples.length - 1];
    if (last && last.time < missionTime) {
      ctx.lineTo(toX(missionTime), toY(last[key]));
    }
    ctx.stroke();
  };

  drawLine("player", "#6ca8e8");
  drawLine("enemy", "#e87878");

  const lastSample = samples[samples.length - 1];
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.fillStyle = "#6ca8e8";
  ctx.fillText(`Your losses: ${Math.round(lastSample?.player ?? 0)}`, PAD.left, 16);
  ctx.fillStyle = "#e87878";
  ctx.fillText(`Enemy losses: ${Math.round(lastSample?.enemy ?? 0)}`, PAD.left + 140, 16);
}
