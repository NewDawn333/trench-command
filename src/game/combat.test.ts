import { describe, expect, it } from "vitest";
import type { Platoon } from "../types";
import { CONFIG } from "../types";
import { createMissionStats } from "../app/MissionStats";
import { platoonFrontY } from "./battlefield";
import { opponentTrenchY } from "./platoons";
import { slotXInSector } from "./layout";
import { tickTrenchMelee, type CombatEvents } from "./combat";

function makePlatoon(
  side: Platoon["side"],
  sector: number,
  state: Platoon["state"],
  strength: number,
  x: number,
  targetX: number,
): Platoon {
  const y = state === "front" ? platoonFrontY(side, sector) : opponentTrenchY(side, sector);
  return {
    id: `${side}-${sector}-${x}`,
    side,
    sector,
    strength,
    maxStrength: CONFIG.platoonSize,
    state,
    x,
    y,
    targetX,
    targetY: y,
    effectiveness: 100,
    timeOnFront: 0,
    stagingTimer: 0,
    assaultId: null,
  };
}

function lateralAssaultSetup(): Platoon[] {
  const to = 3;
  const platoons: Platoon[] = [];

  for (let i = 0; i < 3; i++) {
    const x = slotXInSector(to, i, 3, 34);
    platoons.push(makePlatoon("player", to, "enemy_trench", CONFIG.platoonSize, x, x));
  }

  for (let i = 0; i < 3; i++) {
    const x = slotXInSector(to, i, 3, 34);
    platoons.push(makePlatoon("enemy", to, "front", CONFIG.platoonSize, x, x));
  }

  const from = 2;
  for (let i = 0; i < 3; i++) {
    const x = slotXInSector(from, i, 3, 34);
    platoons.push(makePlatoon("enemy", from, "front", CONFIG.platoonSize, x, x));
  }

  return platoons;
}

describe("trench melee balance", () => {
  it("trades evenly for 3v3 platoons in the same trench bay", () => {
    const platoons = lateralAssaultSetup();
    const stats = createMissionStats();
    const events: CombatEvents = { casualties: [], tracers: [], impacts: [] };

    const playerBefore = platoons.filter((p) => p.side === "player").reduce((a, p) => a + p.strength, 0);
    const enemyBefore = platoons.filter((p) => p.side === "enemy" && p.sector === 3).reduce((a, p) => a + p.strength, 0);

    for (let i = 0; i < 20; i++) {
      tickTrenchMelee(platoons, 0.05, events, stats);
    }

    const playerAfter = platoons.filter((p) => p.side === "player").reduce((a, p) => a + p.strength, 0);
    const enemyAfter = platoons.filter((p) => p.side === "enemy" && p.sector === 3).reduce((a, p) => a + p.strength, 0);

    const playerLoss = playerBefore - playerAfter;
    const enemyLoss = enemyBefore - enemyAfter;

    expect(enemyLoss).toBeGreaterThan(0);
    expect(playerLoss).toBeGreaterThan(0);
    expect(playerLoss).toBeLessThan(playerBefore * 0.85);
    expect(Math.abs(playerLoss - enemyLoss)).toBeLessThan(playerBefore * 0.5);
  });

  it("ignores departure-sector defenders while moving to an adjacent sector", () => {
    const from = 2;
    const to = 3;
    const platoons: Platoon[] = [];
    const defX = slotXInSector(to, 0, 3, 34);

    platoons.push(makePlatoon("player", to, "enemy_trench", CONFIG.platoonSize, defX - 20, defX));
    platoons.push(makePlatoon("enemy", to, "front", CONFIG.platoonSize, defX, defX));
    platoons.push(makePlatoon("enemy", from, "front", CONFIG.platoonSize, slotXInSector(from, 0, 1, 34), defX));

    const stats = createMissionStats();
    const events: CombatEvents = { casualties: [], tracers: [], impacts: [] };
    tickTrenchMelee(platoons, 0.1, events, stats);

    expect(platoons[0].strength).toBeLessThan(CONFIG.platoonSize);
    expect(platoons[1].strength).toBeLessThan(CONFIG.platoonSize);
    expect(platoons[2].strength).toBe(CONFIG.platoonSize);
  });
});
