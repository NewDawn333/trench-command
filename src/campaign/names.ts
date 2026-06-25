/** User-facing unit labels — no abbreviations in player copy. */

const ORDINAL_SUFFIX = ["th", "st", "nd", "rd"] as const;

export function ordinal(n: number): string {
  const v = n % 100;
  const suffix = ORDINAL_SUFFIX[(v - 20) % 10] ?? ORDINAL_SUFFIX[v] ?? ORDINAL_SUFFIX[0];
  return `${n}${suffix}`;
}

export function divisionLabel(divisionNumber: number): string {
  return `${ordinal(divisionNumber)} Division`;
}

export function brigadeLabel(brigadeIndex: number): string {
  return `${ordinal(brigadeIndex + 1)} Brigade`;
}

export function battalionLabel(slot: number): string {
  return `${ordinal(slot + 1)} Battalion`;
}

export function companyLabel(letter: string): string {
  return `${letter} Company`;
}

export const NO_MANS_LAND_LABEL = "No Man's Land";
