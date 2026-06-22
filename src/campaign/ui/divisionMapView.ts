import type { Brigade, Battalion } from "../types";
import { brigadeFrontBattalions } from "../garrison";
import { battalionMissionForce } from "../companyDeployment";
import { controllerTint } from "../display";
import { battalionGarrisonLabel } from "../garrison";
import { subsectorVulnerableLabel } from "../overextension";
import { NO_MANS_LAND_LABEL } from "../names";
import { PLATOON_SIZE, PLATOONS_PER_COMPANY } from "../oob";

const SLICE_POSITION = ["left", "center", "right"] as const;

function brigadeController(brigade: Brigade): Battalion["controller"] {
  const front = brigadeFrontBattalions(brigade);
  if (front.some((bn) => bn.controller === "enemy")) return "contested";
  if (front.every((bn) => bn.controller === "player")) return "player";
  return "contested";
}

function brigadeVulnerable(brigade: Brigade): boolean {
  return brigadeFrontBattalions(brigade).some((bn) => bn.vulnerable);
}

function renderBattalionSummary(bn: Battalion): string {
  const force = battalionMissionForce(bn);
  const garrison = battalionGarrisonLabel(bn);
  const vulnerable = subsectorVulnerableLabel(bn);
  const warnings = [garrison, vulnerable].filter(Boolean);
  return `
    <div class="map-unit map-unit--line${bn.role === "brigade_reserve" ? " map-unit--reserve" : ""}">
      <span class="map-unit__letter">${bn.label}</span>
      <span class="map-unit__meta">${force.totalEngaged} rifles</span>
      <span class="map-unit__status">${bn.controller}${warnings.length ? " · !" : ""}</span>
    </div>
  `;
}

function renderBrigadeSlice(
  brigade: Brigade,
  position: (typeof SLICE_POSITION)[number],
): string {
  const controller = brigadeController(brigade);
  const front = brigadeFrontBattalions(brigade);
  const reserve = brigade.battalions.filter((bn) => bn.role === "brigade_reserve");
  const shortLabel = brigade.label;

  return `
    <button
      type="button"
      class="front-slice front-slice--${position} front-slice--${controller}${brigadeVulnerable(brigade) ? " front-slice--vulnerable" : ""}"
      style="--slice-tint:${controllerTint(controller)}"
      data-brigade-id="${brigade.id}"
    >
      <div class="front-slice__head">
        <span class="front-slice__name">${shortLabel}</span>
        <span class="front-slice__control">${controller}</span>
      </div>
      <div class="front-slice__trenches" aria-hidden="true">
        <span class="front-slice__line front-slice__line--enemy"></span>
        <span class="front-slice__nml">${NO_MANS_LAND_LABEL}</span>
        <span class="front-slice__line front-slice__line--friendly"></span>
      </div>
      <div class="front-slice__units">
        ${front.map((bn) => renderBattalionSummary(bn)).join("")}
        ${reserve.map((bn) => `<div class="map-unit map-unit--reserve"><span class="map-unit__letter">${bn.label}</span><span class="map-unit__meta">Reserve</span></div>`).join("")}
      </div>
    </button>
  `;
}

export function renderDivisionMap(brigades: Brigade[], objectiveLabel: string): string {
  return `
    <div class="front-map" role="img" aria-label="Division front map">
      <div class="front-map__top">
        <span class="front-map__objective">▲ ${objectiveLabel}</span>
        <span class="front-map__scale">1 battalion = 2 companies on map · ${PLATOONS_PER_COMPANY} platoons × ${PLATOON_SIZE} riflemen</span>
      </div>
      <div class="front-map__arc">
        ${brigades.map((bde, i) => renderBrigadeSlice(bde, SLICE_POSITION[i] ?? "center")).join("")}
      </div>
      <div class="front-map__legend">
        <span><i class="map-legend-swatch map-legend-swatch--player"></i> Held</span>
        <span><i class="map-legend-swatch map-legend-swatch--contested"></i> Contested</span>
        <span><i class="map-legend-swatch map-legend-swatch--enemy"></i> Enemy</span>
        <span class="map-legend-note">Tap a brigade sector to manage battalions</span>
      </div>
    </div>
  `;
}
