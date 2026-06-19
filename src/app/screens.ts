export type AppScreen = "menu" | "game";

export function showScreen(screen: AppScreen): void {
  document.getElementById("screen-menu")?.classList.toggle("hidden", screen !== "menu");
  document.getElementById("screen-game")?.classList.toggle("hidden", screen !== "game");
}

export function applyControlHintsVisible(show: boolean): void {
  document.getElementById("legend")?.classList.toggle("hidden", !show);
}
