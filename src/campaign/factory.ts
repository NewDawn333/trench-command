import { createBattalionCompanies } from "./company";
import {
  ARMY_DIVISION_COUNT,
  BATTALIONS_PER_BRIGADE,
  BRIGADE_FRONT_BATTALIONS,
  BRIGADES_PER_DIVISION,
  PLAYABLE_DIVISION_SLOTS,
} from "./oob";
import { CAMPAIGN_OBJECTIVE_LABEL, RECRUIT_TRICKLE_PER_TURN } from "./constants";
import type { Battalion, Brigade, CampaignState, Division, DivisionLineStatus } from "./types";

import { battalionLabel, brigadeLabel, divisionLabel } from "./names";

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

function aiLineStatus(mapSlot: number): DivisionLineStatus {
  if (mapSlot <= 1) return "friendly_ai";
  if (mapSlot >= 8) return "contested";
  return "friendly_ai";
}

export function createPlayableDivision(divisionNumber: number, mapSlot: number): Division {
  const id = `div-${divisionNumber}`;
  return {
    id,
    label: divisionLabel(divisionNumber),
    playable: true,
    mapSlot,
    brigades: Array.from({ length: BRIGADES_PER_DIVISION }, (_, i) => buildBrigade(id, i)),
  };
}

function createAiDivision(divisionNumber: number, mapSlot: number): Division {
  return {
    id: `div-${divisionNumber}`,
    label: divisionLabel(divisionNumber),
    playable: false,
    mapSlot,
    lineStatus: aiLineStatus(mapSlot),
    brigades: [],
  };
}

export function createArmyDivisions(preservePlayable?: Division): Division[] {
  const divisions: Division[] = [];
  let playableIndex = 0;

  for (let slot = 0; slot < ARMY_DIVISION_COUNT; slot++) {
    const divisionNumber = slot + 1;
    const isPlayable = (PLAYABLE_DIVISION_SLOTS as readonly number[]).includes(slot);

    if (isPlayable) {
      if (preservePlayable && playableIndex === 0) {
        divisions.push({
          ...preservePlayable,
          mapSlot: slot,
          playable: true,
        });
      } else {
        divisions.push(createPlayableDivision(divisionNumber, slot));
      }
      playableIndex += 1;
    } else {
      divisions.push(createAiDivision(divisionNumber, slot));
    }
  }

  return divisions;
}

/** @deprecated use createPlayableDivision(1, 2) */
export function createLegacySingleDivision(): Division {
  return createPlayableDivision(1, PLAYABLE_DIVISION_SLOTS[0]);
}

export function createNewCampaign(): CampaignState {
  const divisions = createArmyDivisions();
  const primary = divisions.find((d) => d.playable) ?? divisions[0];
  const now = Date.now();

  return {
    version: 3,
    createdAt: now,
    updatedAt: now,
    turn: 0,
    phase: "army",
    activeDivisionId: primary.id,
    activeBrigadeId: null,
    objectiveLabel: CAMPAIGN_OBJECTIVE_LABEL,
    recruitPool: 40,
    recruitTricklePerTurn: RECRUIT_TRICKLE_PER_TURN,
    army: {
      id: "bef-4",
      label: "BEF — Fourth Army",
      objectiveProgress: 0,
      divisions,
    },
    events: [],
    reinforcementRequests: [],
  };
}
