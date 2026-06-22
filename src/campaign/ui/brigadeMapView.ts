import type { Battalion, Brigade } from "../types";
import { battalionMissionForce } from "../companyDeployment";
import {
  battalionAvailableForMission,
  battalionStatusLabel,
  companyDutyLabel,
  companyStatusLabel,
  controllerTint,
} from "../display";
import { battalionGarrisonLabel } from "../garrison";
import { subsectorVulnerableLabel } from "../overextension";
import { NO_MANS_LAND_LABEL } from "../names";
import { PLATOON_SIZE, PLATOONS_PER_COMPANY } from "../oob";

const SLOT_POSITION = ["left", "center-left", "center-right", "right"] as const;

function renderBattalionMarker(bn: Battalion, turn: number): string {
  const available = battalionAvailableForMission(bn);
  const force = battalionMissionForce(bn);
  const garrison = battalionGarrisonLabel(bn);
  const vulnerable = subsectorVulnerableLabel(bn);
  const warnings = [garrison, vulnerable].filter(Boolean);
  const reserve = bn.role === "brigade_reserve";
  const line = bn.companies.find((c) => c.duty === "line");

  return `
    <div
      class="map-unit map-unit--${reserve ? "reserve" : "line"}${available ? "" : " map-unit--disabled"}"
      title="${battalionStatusLabel(bn)}"
      aria-hidden="true"
    >
      <span class="map-unit__letter">${bn.label}</span>
      <span class="map-unit__meta">${force.totalEngaged} rifles</span>
      <span class="map-unit__status">${reserve ? "Reserve" : line ? companyStatusLabel(line, turn) : "—"}</span>
      ${warnings.map((w) => `<span class="map-unit__warn">${w}</span>`).join("")}
    </div>
  `;
}

function renderReserveCompanies(bn: Battalion, turn: number): string {
  const reserves = bn.companies.filter((c) => c.duty === "battalion_reserve");
  if (reserves.length === 0) return "";
  return `
    <div class="brigade-co-row">
      ${reserves
        .map(
          (c) =>
            `<span class="brigade-co-chip" title="${companyDutyLabel(c.duty)}">${c.label.split(" ").pop()} · ${c.strength} · ${companyStatusLabel(c, turn)}</span>`,
        )
        .join("")}
    </div>
  `;
}

function renderBattalionSlice(
  bn: Battalion,
  turn: number,
  position: (typeof SLOT_POSITION)[number],
): string {
  const available = battalionAvailableForMission(bn);
  const warnings = [battalionGarrisonLabel(bn), subsectorVulnerableLabel(bn)].filter(Boolean);
  const tag = available ? "button" : "div";
  const attrs = available
    ? `type="button" class="front-slice front-slice--clickable`
    : `class="front-slice`;

  return `
    <${tag}
      ${attrs} front-slice--${position} front-slice--${bn.controller}${bn.vulnerable ? " front-slice--vulnerable" : ""}"
      style="--slice-tint:${controllerTint(bn.controller)}"
      ${available ? `data-battalion-id="${bn.id}"` : ""}
    >
      <div class="front-slice__head">
        <span class="front-slice__name">${bn.label}</span>
        <span class="front-slice__control">${bn.role === "brigade_reserve" ? "reserve" : bn.controller}</span>
      </div>
      ${warnings.map((w) => `<p class="front-slice__warn">${w}</p>`).join("")}
      <div class="front-slice__trenches" aria-hidden="true">
        <span class="front-slice__line front-slice__line--enemy"></span>
        <span class="front-slice__nml">${NO_MANS_LAND_LABEL}</span>
        <span class="front-slice__line front-slice__line--friendly"></span>
      </div>
      <div class="front-slice__units">
        ${renderBattalionMarker(bn, turn)}
        ${renderReserveCompanies(bn, turn)}
      </div>
    </${tag}>
  `;
}

export function renderBrigadeMap(brigade: Brigade, turn: number, objectiveLabel: string): string {
  return `
    <div class="front-map front-map--brigade" role="img" aria-label="Brigade front map">
      <div class="front-map__top">
        <span class="front-map__objective">▲ ${objectiveLabel}</span>
        <span class="front-map__scale">${PLATOONS_PER_COMPANY} platoons × ${PLATOON_SIZE} men · line + assault companies on tactical map</span>
      </div>
      <div class="front-map__arc front-map__arc--four">
        ${brigade.battalions.map((bn, i) => renderBattalionSlice(bn, turn, SLOT_POSITION[i] ?? "center-left")).join("")}
      </div>
      <div class="front-map__legend">
        <span class="map-legend-note">Tap a battalion counter to commit assault · relocate battalion reserve companies in briefing</span>
      </div>
    </div>
  `;
}
