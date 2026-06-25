import { createArmyDivisions } from "./factory";
import { PLAYABLE_DIVISION_SLOTS } from "./oob";
import type { CampaignState, Division } from "./types";

export function divisionById(state: CampaignState, divisionId: string): Division | null {
  return state.army.divisions.find((d) => d.id === divisionId) ?? null;
}

export function playableDivisions(state: CampaignState): Division[] {
  return state.army.divisions.filter((d) => d.playable);
}

export function activeDivision(state: CampaignState): Division | null {
  if (state.activeDivisionId) {
    const selected = divisionById(state, state.activeDivisionId);
    if (selected?.playable) return selected;
  }
  return playableDivisions(state)[0] ?? null;
}

export function ensureArmyScale(state: CampaignState): CampaignState {
  const divisions = state.army.divisions;
  if (divisions.length >= 10 && divisions.every((d) => d.mapSlot !== undefined)) {
    if (!state.activeDivisionId) {
      state.activeDivisionId = playableDivisions(state)[0]?.id ?? null;
    }
    return state;
  }

  const existingPlayable = divisions.find((d) => d.playable && d.brigades.length > 0) ?? null;
  state.army.divisions = createArmyDivisions(existingPlayable ?? undefined);

  if (state.activeDivisionId) {
    const stillValid = state.army.divisions.some(
      (d) => d.id === state.activeDivisionId && d.playable,
    );
    if (!stillValid) state.activeDivisionId = null;
  }
  if (!state.activeDivisionId) {
    state.activeDivisionId =
      existingPlayable?.id ?? playableDivisions(state)[0]?.id ?? null;
  }

  return state;
}

export function armyMapSlotLabel(slot: number): string {
  const playable = (PLAYABLE_DIVISION_SLOTS as readonly number[]).includes(slot);
  return playable ? "Your command" : "Allied sector";
}
