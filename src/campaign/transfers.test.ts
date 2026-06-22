import { describe, expect, it, beforeEach, vi } from "vitest";
import { createNewCampaign } from "./factory";
import { findCompanyInDivision, playableDivision } from "./company";
import { queueCompanyTransfer, resolvePendingTransfers } from "./transfers";

describe("company transfer between battalions", () => {
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

  it("queues transfer to arrive next turn", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const bde = div.brigades[0];
    const sourceBn = bde.battalions[0];
    const targetBn = bde.battalions[1];
    const reserve = sourceBn.companies.find((c) => c.duty === "battalion_reserve")!;

    expect(queueCompanyTransfer(state, bde.id, reserve.id, targetBn.id)).toBe(true);
    expect(reserve.transferArrivesTurn).toBe(state.turn + 1);
  });

  it("moves company between battalion rosters on resolve", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const bde = div.brigades[0];
    const sourceBn = bde.battalions[0];
    const targetBn = bde.battalions[2];
    const reserve = sourceBn.companies.find((c) => c.duty === "battalion_reserve")!;

    queueCompanyTransfer(state, bde.id, reserve.id, targetBn.id);
    state.turn += 1;
    resolvePendingTransfers(state);

    expect(findCompanyInDivision(div, reserve.id)?.battalionId).toBe(targetBn.id);
    expect(targetBn.companies.some((c) => c.id === reserve.id)).toBe(true);
    expect(sourceBn.companies.some((c) => c.id === reserve.id)).toBe(false);
  });
});
