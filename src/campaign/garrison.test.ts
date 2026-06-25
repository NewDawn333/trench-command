import { describe, expect, it } from "vitest";
import { createLegacySingleDivision } from "./factory";
import { isBattalionUndermanned, battalionGarrisonLabel } from "./garrison";
import { assaultCompany, lineCompany, setCompanyStrength } from "./company";

describe("battalion garrison", () => {
  it("flags understrength when line or assault is depleted", () => {
    const bn = createLegacySingleDivision().brigades[0].battalions[0];
    const line = lineCompany(bn)!;
    setCompanyStrength(line, 20);
    expect(isBattalionUndermanned(bn)).toBe(true);
    expect(battalionGarrisonLabel(bn)).toContain("Understrength");
  });

  it("is clear at full strength", () => {
    const bn = createLegacySingleDivision().brigades[0].battalions[0];
    expect(isBattalionUndermanned(bn)).toBe(false);
    expect(battalionGarrisonLabel(bn)).toBeNull();
  });

  it("detects depleted assault reserve", () => {
    const bn = createLegacySingleDivision().brigades[0].battalions[0];
    const assault = assaultCompany(bn)!;
    setCompanyStrength(assault, 10);
    expect(isBattalionUndermanned(bn)).toBe(true);
  });
});
