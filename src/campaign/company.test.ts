import { describe, expect, it } from "vitest";
import {
  battalionStrength,
  COMPANY_MAX_STRENGTH,
  divisionStrength,
  lineCompany,
  assaultCompany,
} from "./company";
import { createLegacySingleDivision } from "./factory";
import { COMPANIES_PER_BATTALION, BRIGADES_PER_DIVISION, BATTALIONS_PER_BRIGADE } from "./oob";

describe("division OOB", () => {
  it("builds 3 brigades × 4 battalions × 4 companies", () => {
    const div = createLegacySingleDivision();
    expect(div.brigades).toHaveLength(BRIGADES_PER_DIVISION);
    for (const bde of div.brigades) {
      expect(bde.battalions).toHaveLength(BATTALIONS_PER_BRIGADE);
      for (const bn of bde.battalions) {
        expect(bn.companies).toHaveLength(COMPANIES_PER_BATTALION);
      }
    }
  });

  it("uses full unit names on labels", () => {
    const div = createLegacySingleDivision();
    const bn = div.brigades[0].battalions[0];
    expect(bn.label).toBe("1st Battalion");
    expect(bn.companies[0].label).toBe("A Company");
    expect(div.brigades[0].label).toBe("1st Brigade");
  });

  it("assigns line and assault companies per battalion", () => {
    const div = createLegacySingleDivision();
    const bn = div.brigades[0].battalions[0];
    expect(lineCompany(bn)?.duty).toBe("line");
    expect(assaultCompany(bn)?.duty).toBe("assault");
    expect(bn.companies.filter((c) => c.duty === "battalion_reserve")).toHaveLength(2);
  });

  it("aggregates division strength from companies", () => {
    const div = createLegacySingleDivision();
    const expected = div.brigades
      .flatMap((b) => b.battalions)
      .flatMap((bn) => bn.companies)
      .reduce((sum, c) => sum + c.strength, 0);
    expect(divisionStrength(div)).toBe(expected);
    expect(battalionStrength(div.brigades[0].battalions[0])).toBe(COMPANY_MAX_STRENGTH * 4);
  });
});
