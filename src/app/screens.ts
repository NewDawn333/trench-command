export type AppScreen = "menu" | "division" | "brigade" | "game";

export function showScreen(screen: AppScreen): void {
  document.getElementById("screen-menu")?.classList.toggle("hidden", screen !== "menu");
  document.getElementById("screen-division")?.classList.toggle("hidden", screen !== "division");
  document.getElementById("screen-brigade")?.classList.toggle("hidden", screen !== "brigade");
  document.getElementById("screen-game")?.classList.toggle("hidden", screen !== "game");
}

export function applyControlHintsVisible(show: boolean): void {
  document.getElementById("legend")?.classList.toggle("hidden", !show);
}
