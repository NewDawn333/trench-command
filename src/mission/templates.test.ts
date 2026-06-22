import { describe, expect, it } from "vitest";
import { CONFIG } from "../types";
import { resolveMissionLayout } from "./MissionLayout";
import { getTemplate, templateDisplayName } from "./templateRegistry";
import { distributeByWeight } from "./campaignMission";
import { mulberry32 } from "./MissionLayout";

describe("mission templates", () => {
  it("loads all nine template definitions", () => {
    const ids = [
      "straight",
      "bulge_forward",
      "re_entrant",
      "staggered",
      "ridge_line",
      "wire_heavy",
      "muddy_flank",
      "pillbox_redoubt",
      "sunken_road",
    ];
    for (const id of ids) {
      expect(getTemplate(id).id).toBe(id);
      expect(templateDisplayName(id).length).toBeGreaterThan(0);
    }
  });

  it("seed-stable layout resolution", () => {
    const a = resolveMissionLayout({ templateId: "wire_heavy", seed: 42 });
    const b = resolveMissionLayout({ templateId: "wire_heavy", seed: 42 });
    expect(a.wireSectors).toEqual(b.wireSectors);
    expect(a.enemyTrenchOffset).toEqual(b.enemyTrenchOffset);
  });

  it("bulge_forward pushes center enemy trench toward NML", () => {
    const layout = resolveMissionLayout({ templateId: "bulge_forward", seed: 1 });
    const center = layout.enemyTrenchOffset[3] + layout.enemyTrenchOffset[4];
    const flanks = layout.enemyTrenchOffset[0] + layout.enemyTrenchOffset[7];
    expect(center).toBeGreaterThan(flanks);
  });

  it("distributes enemy platoons by sector weight", () => {
    const weights = getTemplate("bulge_forward").enemySectorWeight;
    const counts = distributeByWeight(8, weights, mulberry32(99));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(8);
    expect(counts.length).toBe(CONFIG.sectorCount);
    expect(counts[3] + counts[4]).toBeGreaterThanOrEqual(counts[0]);
  });
});
