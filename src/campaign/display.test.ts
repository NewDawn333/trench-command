import { describe, expect, it } from "vitest";
import { createNewCampaign } from "./factory";
import { playableDivision } from "./company";
import { battalionAvailableForMission } from "./display";
import { buildMissionSetup } from "../mission/MissionSetup";

describe("battalion mission availability", () => {
  it("front battalions are selectable on fresh campaign", () => {
    const state = createNewCampaign();
    const bde = playableDivision(state)!.brigades[0];
    const front = bde.battalions.filter((bn) => bn.role === "front");
    expect(front).toHaveLength(3);
    for (const bn of front) {
      expect(battalionAvailableForMission(bn)).toBe(true);
      expect(buildMissionSetup(bn, state.turn)).not.toBeNull();
    }
    const reserve = bde.battalions.find((bn) => bn.role === "brigade_reserve")!;
    expect(battalionAvailableForMission(reserve)).toBe(false);
  });
});
