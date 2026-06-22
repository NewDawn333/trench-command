import { describe, expect, it } from "vitest";
import { COMPANY_MAX_STRENGTH, PLATOON_SIZE } from "./company";
import {
  battalionMissionForce,
  companyPlatoonCount,
  formatCompanyForce,
  planBattalionDeploymentFixed,
  PLATOONS_PER_COMPANY,
} from "./companyDeployment";
import { createPlayableDivision } from "./factory";

describe("company platoon math", () => {
  it("maps 240 riflemen to 8 platoons of 30", () => {
    expect(PLATOON_SIZE).toBe(30);
    expect(PLATOONS_PER_COMPANY).toBe(8);
    expect(COMPANY_MAX_STRENGTH).toBe(240);
    expect(companyPlatoonCount(240)).toBe(8);
    expect(formatCompanyForce(240)).toContain("8/8 platoons");
  });

  it("plans line platoons and assault reserve for a battalion", () => {
    const div = createPlayableDivision();
    const bn = div.brigades[0].battalions[0];
    const plan = planBattalionDeploymentFixed(bn);
    const force = battalionMissionForce(bn);

    expect(plan.linePlatoons.length).toBeGreaterThan(0);
    expect(plan.reserveRiflemen).toBe(force.assaultReserve);
    expect(force.totalEngaged).toBe(force.lineStrength + force.assaultReserve);
  });
});
