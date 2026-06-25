import { describe, expect, it } from "vitest";
import type { AssaultOrder, Platoon, Sector } from "../types";
import { CONFIG } from "../types";
import { getAIProfile } from "../app/Difficulty";
import { createPlatoon, isInvader, movePlatoonToFront, opponentTrenchY } from "./platoons";
import { createSectors, platoonFrontY } from "./battlefield";
import {
  assaultMinStrength,
  canLaunchAssault,
  createAIState,
  launchAssault,
  tryEnemySectorAssault,
} from "./simulation";

function makeFront(side: Platoon["side"], sector: number, strength = CONFIG.platoonSize): Platoon {
  const p = createPlatoon(side, sector, "front");
  p.strength = strength;
  p.maxStrength = CONFIG.platoonSize;
  p.x = 100 + sector * 40;
  p.targetX = p.x;
  p.y = platoonFrontY(side, sector);
  p.targetY = p.y;
  return p;
}

function makeInvader(sector: number, strength = CONFIG.platoonSize): Platoon {
  const p = createPlatoon("enemy", sector, "enemy_trench");
  p.strength = strength;
  p.maxStrength = CONFIG.platoonSize;
  p.y = opponentTrenchY("enemy", sector);
  p.targetY = p.y;
  return p;
}

describe("enemy assault AI", () => {
  it("aligns launch threshold with canLaunchAssault minimum", () => {
    expect(assaultMinStrength("enemy")).toBe(Math.round(CONFIG.platoonSize * 1.75));
  });

  it("launches when two platoons are massed on the front", () => {
    const platoons = [makeFront("enemy", 2, 30), makeFront("enemy", 2, 30), makeFront("player", 2, 10)];
    const assaults: AssaultOrder[] = [];
    const profile = getAIProfile("balanced");

    expect(canLaunchAssault(platoons, "enemy", 2)).toBe(true);
    expect(tryEnemySectorAssault(platoons, assaults, 2, [], profile, "mass")).toBe(true);
    expect(assaults).toHaveLength(1);
    expect(platoons.some((p) => p.state === "crossing")).toBe(true);
  });

  it("pushes follow-up waves from a beachhead when the player sector is weak", () => {
    const platoons = [
      makeInvader(4, 24),
      makeFront("enemy", 4, 28),
      makeFront("player", 4, 6),
    ];
    const assaults: AssaultOrder[] = [{ id: "a1", side: "enemy", sector: 4, active: true, kind: "assault" }];
    const profile = getAIProfile("balanced");

    expect(tryEnemySectorAssault(platoons, assaults, 4, [], profile, "beachhead")).toBe(true);
    expect(platoons.filter((p) => p.state === "crossing")).toHaveLength(1);
  });

  it("takes opportunistic assaults against nearly empty player sectors", () => {
    const platoons = [makeFront("enemy", 1, 30), makeFront("player", 1, 4)];
    const assaults: AssaultOrder[] = [];
    const profile = getAIProfile("aggressive");

    expect(tryEnemySectorAssault(platoons, assaults, 1, [], profile, "opportunistic")).toBe(true);
    expect(assaults).toHaveLength(1);
  });

  it("continues assaulting over time when reserves refill the line", () => {
    const sectors: Sector[] = createSectors();
    const profile = getAIProfile("aggressive");
    const ai = createAIState(profile);
    ai.assaultCooldown = 0;
    ai.massingSector = 3;

    const platoons: Platoon[] = [];
    for (let i = 0; i < 3; i++) {
      const p = makeFront("enemy", 3, CONFIG.platoonSize);
      platoons.push(p);
    }
    platoons.push(makeFront("player", 3, CONFIG.platoonSize));
    const reserve = createPlatoon("enemy", 3, "reserve");
    reserve.strength = CONFIG.platoonSize;
    reserve.maxStrength = CONFIG.platoonSize;
    platoons.push(reserve);

    const assaults: AssaultOrder[] = [];
    const first = launchAssault(platoons, "enemy", 3, assaults);
    expect(first).not.toBeNull();

    for (const p of platoons) {
      if (p.side === "enemy" && p.state === "crossing") {
        p.state = "enemy_trench";
        p.y = opponentTrenchY("enemy", 3);
        p.targetY = p.y;
      }
    }

    movePlatoonToFront(reserve, 0, 1);
    reserve.sector = 3;
    const secondFront = makeFront("enemy", 3, CONFIG.platoonSize);
    platoons.push(secondFront);

    ai.assaultCooldown = 0;
    expect(tryEnemySectorAssault(platoons, assaults, 3, [], profile, "mass")).toBe(true);
    expect(platoons.some((p) => p.side === "enemy" && p.state === "crossing")).toBe(true);
  });
});
