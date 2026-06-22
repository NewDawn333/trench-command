import { createBattalionCompanies } from "./company";
import {
  BATTALIONS_PER_BRIGADE,
  BRIGADE_FRONT_BATTALIONS,
  BRIGADES_PER_DIVISION,
} from "./oob";
import { CAMPAIGN_OBJECTIVE_LABEL, RECRUIT_TRICKLE_PER_TURN } from "./constants";
import type { Battalion, Brigade, CampaignState, Division } from "./types";

import { battalionLabel, brigadeLabel } from "./names";
const TEMPLATE_ROTATION = [
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

function templateForIndex(index: number): string {
  return TEMPLATE_ROTATION[index % TEMPLATE_ROTATION.length];
}

function buildBattalion(brigadeId: string, brigadeIndex: number, slot: number): Battalion {
  const id = `${brigadeId}-bn-${slot}`;
  const label = battalionLabel(slot);
  const templateId = templateForIndex(brigadeIndex * 4 + slot);
  const onFront = slot < BRIGADE_FRONT_BATTALIONS;
  const companies = createBattalionCompanies(id, templateId);

  return {
    id,
    label,
    brigadeId,
    slot,
    role: onFront ? "front" : "brigade_reserve",
    controller: "player",
    vulnerable: false,
    companies,
    enemyOobId: id,
    missionTemplateId: templateId,
  };
}

function buildBrigade(divisionId: string, brigadeIndex: number): Brigade {
  const id = `${divisionId}-bde-${brigadeIndex}`;
  return {
    id,
    label: brigadeLabel(brigadeIndex),
    divisionId,
    threeSectionFront: true,
    battalions: Array.from({ length: BATTALIONS_PER_BRIGADE }, (_, slot) =>
      buildBattalion(id, brigadeIndex, slot),
    ),
  };
}

export function createPlayableDivision(): Division {
  const id = "div-1";
  return {
    id,
    label: "1st Division",
    playable: true,
    brigades: Array.from({ length: BRIGADES_PER_DIVISION }, (_, i) => buildBrigade(id, i)),
  };
}

export function createNewCampaign(): CampaignState {
  const now = Date.now();
  return {
    version: 3,
    createdAt: now,
    updatedAt: now,
    turn: 0,
    phase: "division",
    activeBrigadeId: null,
    objectiveLabel: CAMPAIGN_OBJECTIVE_LABEL,
    recruitPool: 40,
    recruitTricklePerTurn: RECRUIT_TRICKLE_PER_TURN,
    army: {
      id: "bef-4",
      label: "BEF — Fourth Army",
      objectiveProgress: 0,
      divisions: [createPlayableDivision()],
    },
    events: [],
    reinforcementRequests: [],
  };
}
