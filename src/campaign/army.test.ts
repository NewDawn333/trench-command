import { describe, expect, it } from "vitest";
import { createNewCampaign, createArmyDivisions } from "./factory";
import { ARMY_DIVISION_COUNT, PLAYABLE_DIVISION_SLOTS } from "./oob";
import { activeDivision, ensureArmyScale, playableDivisions } from "./army";
import { createLegacySingleDivision } from "./factory";
import { normalizeCampaignState } from "./outcomes";

describe("army strategic map", () => {
  it("creates ten divisions with three playable slots", () => {
    const state = createNewCampaign();
    expect(state.army.divisions).toHaveLength(ARMY_DIVISION_COUNT);
    expect(playableDivisions(state)).toHaveLength(PLAYABLE_DIVISION_SLOTS.length);
    expect(state.phase).toBe("army");
    expect(state.activeDivisionId).toBeTruthy();
  });

  it("places playable divisions on the configured map slots", () => {
    const divisions = createArmyDivisions();
    for (const slot of PLAYABLE_DIVISION_SLOTS) {
      const div = divisions.find((d) => d.mapSlot === slot);
      expect(div?.playable).toBe(true);
      expect(div?.brigades.length).toBeGreaterThan(0);
    }
  });

  it("marks AI divisions as static sectors without brigades", () => {
    const divisions = createArmyDivisions();
    const ai = divisions.filter((d) => !d.playable);
    expect(ai).toHaveLength(ARMY_DIVISION_COUNT - PLAYABLE_DIVISION_SLOTS.length);
    expect(ai.every((d) => d.brigades.length === 0 && d.lineStatus)).toBe(true);
  });

  it("migrates legacy single-division saves to corps scale", () => {
    const legacy = createLegacySingleDivision();
    const state = normalizeCampaignState({
      version: 3,
      createdAt: 1,
      updatedAt: 1,
      turn: 2,
      phase: "division",
      activeDivisionId: legacy.id,
      activeBrigadeId: null,
      objectiveLabel: "River Line",
      recruitPool: 12,
      recruitTricklePerTurn: 8,
      army: {
        id: "bef-4",
        label: "BEF — Fourth Army",
        objectiveProgress: 8,
        divisions: [{ ...legacy, playable: true, mapSlot: 0 }],
      },
      events: [],
      reinforcementRequests: [],
    });

    ensureArmyScale(state);
    expect(state.army.divisions).toHaveLength(10);
    expect(playableDivisions(state).length).toBe(3);
    expect(activeDivision(state)?.id).toBe(legacy.id);
    expect(activeDivision(state)?.brigades.length).toBeGreaterThan(0);
  });
});
