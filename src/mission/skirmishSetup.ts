import { COMPANY_MAX_STRENGTH } from "../campaign/oob";
import type { MissionSetup } from "./MissionSetup";
import { skirmishBattalionOob } from "./skirmishOob";

export function buildSkirmishSetup(templateId: string, seed: number): MissionSetup {
  const enemyOob = skirmishBattalionOob(templateId);
  const playerMax = COMPANY_MAX_STRENGTH * 2;
  const playerStrength = playerMax;
  return {
    seed,
    templateId,
    battalionId: "skirmish",
    battalionLabel: "Skirmish",
    brigadeId: "skirmish",
    lineStrength: COMPANY_MAX_STRENGTH,
    lineMaxStrength: COMPANY_MAX_STRENGTH,
    assaultReserve: COMPANY_MAX_STRENGTH,
    assaultMaxStrength: COMPANY_MAX_STRENGTH,
    playerStrength,
    playerMaxStrength: playerMax,
    enemyOob,
  };
}

export function skirmishBattalionForMission(): import("../campaign/types").Battalion {
  return {
    id: "skirmish",
    label: "Skirmish Battalion",
    brigadeId: "skirmish",
    slot: 0,
    role: "front",
    controller: "player",
    vulnerable: false,
    enemyOobId: "skirmish",
    missionTemplateId: "straight",
    companies: [
      {
        id: "skirmish-line",
        label: "Line Company",
        battalionId: "skirmish",
        duty: "line",
        strength: COMPANY_MAX_STRENGTH,
        maxStrength: COMPANY_MAX_STRENGTH,
        status: "full",
        rebuildTurnsRemaining: 0,
        redeployCooldown: 0,
        transferTargetBattalionId: null,
        transferArrivesTurn: null,
        missionTemplateId: "straight",
      },
      {
        id: "skirmish-assault",
        label: "Assault Company",
        battalionId: "skirmish",
        duty: "assault",
        strength: COMPANY_MAX_STRENGTH,
        maxStrength: COMPANY_MAX_STRENGTH,
        status: "full",
        rebuildTurnsRemaining: 0,
        redeployCooldown: 0,
        transferTargetBattalionId: null,
        transferArrivesTurn: null,
        missionTemplateId: "straight",
      },
    ],
  };
}
