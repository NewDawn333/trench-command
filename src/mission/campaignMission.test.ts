import { describe, expect, it } from "vitest";
import { COMPANY_MAX_STRENGTH } from "../campaign/company";
import { frontPlatoonCount } from "./campaignMission";

describe("frontPlatoonCount", () => {
  it("fields all sectors at full strength", () => {
    expect(frontPlatoonCount(COMPANY_MAX_STRENGTH, COMPANY_MAX_STRENGTH)).toBe(8);
  });

  it("reduces sectors for depleted companies", () => {
    const half = Math.floor(COMPANY_MAX_STRENGTH * 0.5);
    expect(frontPlatoonCount(half, COMPANY_MAX_STRENGTH)).toBeLessThan(8);
    expect(frontPlatoonCount(half, COMPANY_MAX_STRENGTH)).toBeGreaterThanOrEqual(5);
  });

  it("fields minimum coverage for critical companies", () => {
    const critical = Math.floor(COMPANY_MAX_STRENGTH * 0.15);
    expect(frontPlatoonCount(critical, COMPANY_MAX_STRENGTH)).toBeGreaterThanOrEqual(3);
    expect(frontPlatoonCount(critical, COMPANY_MAX_STRENGTH)).toBeLessThan(5);
  });
});
