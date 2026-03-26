/**
 * Convert a player level to the mainstat and substat thresholds needed.
 *
 * In KoL, each level requires a minimum mainstat, and each mainstat
 * point requires substats² total substats to reach.
 */
export function statsForLevel(level: number) {
  return {
    level,
    mainstat: Math.pow(level, 2) - level * 2 + 5,
    substat: Math.pow(Math.pow(level - 1, 2) + 4, 2),
  };
}

/**
 * Determine the level and total substat for a given mainstat value.
 */
export function levelForMainstat(mainstat: number) {
  return {
    level: 1 + Math.floor(Math.sqrt(Math.max(0, mainstat - 4))),
    mainstat,
    substat: Math.pow(mainstat, 2),
  };
}

/**
 * Determine the mainstat and level for a given total substat count.
 */
export function levelForSubstat(substat: number) {
  return levelForMainstat(Math.floor(Math.sqrt(Math.max(0, substat))));
}
