import { describe, expect, it, beforeEach, vi } from "vitest";
import { createNewCampaign } from "./factory";
import { playableDivision } from "./company";
import { setCompanyStrength } from "./company";
import { advanceCampaignTurn } from "./outcomes";
import {
  approveReinforcementRequest,
  queueReinforcementRequest,
  pendingReinforcementRequests,
  VICTORY_RECRUIT_BONUS,
} from "./recruits";
import { REBUILD_RECRUIT_COST } from "./constants";

describe("recruit pipeline", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    });
  });

  it("queues and approves replenishment for depleted company", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const company = div.brigades[0].battalions[0].companies[0];
    setCompanyStrength(company, 80);
    state.recruitPool = 100;

    expect(queueReinforcementRequest(state, company.id)).toBe(true);
    expect(pendingReinforcementRequests(state)).toHaveLength(1);

    const requestId = state.reinforcementRequests[0].id;
    expect(approveReinforcementRequest(state, requestId)).toBe(true);
    expect(company.strength).toBeGreaterThan(80);
    expect(state.recruitPool).toBeLessThan(100);
    expect(pendingReinforcementRequests(state)).toHaveLength(0);
  });

  it("starts rebuild when approving destroyed company request", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const company = div.brigades[0].battalions[0].companies[2];
    company.strength = 0;
    company.status = "destroyed";
    state.recruitPool = REBUILD_RECRUIT_COST;

    queueReinforcementRequest(state, company.id);
    approveReinforcementRequest(state, state.reinforcementRequests[0].id);
    expect(company.status).toBe("rebuilding");
    expect(company.rebuildTurnsRemaining).toBeGreaterThan(0);
  });

  it("recovers garrisoned reserve companies each turn", () => {
    const state = createNewCampaign();
    const reserve = playableDivision(state)!.brigades[0].battalions[0].companies[2];
    expect(reserve.duty).toBe("battalion_reserve");
    setCompanyStrength(reserve, 100);
    const before = reserve.strength;
    advanceCampaignTurn(state);
    expect(reserve.strength).toBeGreaterThan(before);
  });

  it("awards victory bonus through mission outcome hook", () => {
    const state = createNewCampaign();
    const pool = state.recruitPool;
    state.recruitPool += VICTORY_RECRUIT_BONUS;
    expect(state.recruitPool).toBe(pool + VICTORY_RECRUIT_BONUS);
  });
});
