import { describe, expect, it } from "vitest";
import { createNewCampaign } from "./factory";
import { playableDivision } from "./company";
import {
  counterPushTargets,
  isBattalionVulnerable,
  recomputeVulnerableFlags,
  resolveOverextension,
} from "./overextension";
import { assaultCompany, lineCompany, setCompanyStrength } from "./company";

describe("battalion vulnerability", () => {
  it("marks front battalion vulnerable when neighbor is enemy-held", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const bde = div.brigades[0];
    const left = bde.battalions[0];
    const center = bde.battalions[1];

    center.controller = "enemy";
    recomputeVulnerableFlags(state, bde.id);
    expect(left.vulnerable).toBe(true);

    center.controller = "player";
    recomputeVulnerableFlags(state, bde.id);
    expect(left.vulnerable).toBe(false);
  });

  it("targets undermanned battalion beside a vulnerable neighbor", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const bde = div.brigades[0];
    const left = bde.battalions[0];
    const center = bde.battalions[1];
    const right = bde.battalions[2];

    right.controller = "enemy";
    recomputeVulnerableFlags(state, bde.id);
    expect(center.vulnerable).toBe(true);

    setCompanyStrength(assaultCompany(left)!, 10);
    expect(counterPushTargets(state, bde.id).some((t) => t.id === left.id)).toBe(true);
  });

  it("resolves counter-push and updates controller", () => {
    const state = createNewCampaign();
    const div = playableDivision(state)!;
    const bde = div.brigades[0];
    const left = bde.battalions[0];
    const center = bde.battalions[1];
    const right = bde.battalions[2];

    right.controller = "enemy";
    recomputeVulnerableFlags(state, bde.id);
    setCompanyStrength(lineCompany(left)!, 10);
    setCompanyStrength(assaultCompany(left)!, 10);

    const events = resolveOverextension(state, bde.id);
    expect(events.length).toBeGreaterThan(0);
    expect(left.controller).not.toBe("player");
    expect(state.events.length).toBeGreaterThan(0);
    expect(isBattalionVulnerable(center, bde)).toBe(true);
  });
});
