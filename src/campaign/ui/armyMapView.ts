import type { Division, DivisionLineStatus } from "../types";
import { divisionStrength } from "../company";
import { CAMPAIGN_OBJECTIVE_LABEL } from "../constants";

const LINE_STATUS_LABEL: Record<DivisionLineStatus, string> = {
  friendly_ai: "Allied hold",
  contested: "Contested",
  enemy: "Enemy pressure",
};

const LINE_STATUS_CLASS: Record<DivisionLineStatus, string> = {
  friendly_ai: "army-marker--friendly",
  contested: "army-marker--contested",
  enemy: "army-marker--enemy",
};

function renderPlayableMarker(div: Division, activeDivisionId: string | null): string {
  const active = div.id === activeDivisionId;
  const strength = divisionStrength(div);
  return `
    <button
      type="button"
      class="army-marker army-marker--playable${active ? " army-marker--active" : ""}"
      data-division-id="${div.id}"
      aria-pressed="${active}"
    >
      <span class="army-marker__slot">${div.mapSlot + 1}</span>
      <span class="army-marker__label">${div.label}</span>
      <span class="army-marker__meta">${strength} rifles · tap to command</span>
    </button>
  `;
}

function renderAiMarker(div: Division): string {
  const status = div.lineStatus ?? "friendly_ai";
  return `
    <div class="army-marker army-marker--ai ${LINE_STATUS_CLASS[status]}" aria-hidden="true">
      <span class="army-marker__slot">${div.mapSlot + 1}</span>
      <span class="army-marker__label">${div.label}</span>
      <span class="army-marker__meta">${LINE_STATUS_LABEL[status]}</span>
    </div>
  `;
}

function renderDivisionMarker(div: Division, activeDivisionId: string | null): string {
  return div.playable ? renderPlayableMarker(div, activeDivisionId) : renderAiMarker(div);
}

export function renderArmyObjectiveBar(objectiveLabel: string, progress: number): string {
  const clamped = Math.max(0, Math.min(100, progress));
  return `
    <div class="army-objective">
      <div class="army-objective__head">
        <span class="army-objective__label">${objectiveLabel}</span>
        <span class="army-objective__pct">${clamped}%</span>
      </div>
      <div class="army-objective__track" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
        <div class="army-objective__fill" style="width:${clamped}%"></div>
      </div>
    </div>
  `;
}

export function renderArmyMap(
  divisions: Division[],
  objectiveLabel: string,
  activeDivisionId: string | null,
): string {
  const sorted = [...divisions].sort((a, b) => a.mapSlot - b.mapSlot);

  return `
    <div class="army-map" role="img" aria-label="Army strategic front map">
      <div class="army-map__top">
        <span class="army-map__objective">▲ ${objectiveLabel || CAMPAIGN_OBJECTIVE_LABEL}</span>
        <span class="army-map__scale">10 divisions on the corps front · 3 under your command</span>
      </div>
      <div class="army-map__line">
        ${sorted.map((div) => renderDivisionMarker(div, activeDivisionId)).join("")}
      </div>
      <div class="army-map__legend">
        <span><i class="map-legend-swatch map-legend-swatch--player"></i> Your divisions</span>
        <span><i class="map-legend-swatch map-legend-swatch--contested"></i> Allied / contested</span>
        <span class="map-legend-note">Tap a division counter to zoom to its brigade front</span>
      </div>
    </div>
  `;
}
