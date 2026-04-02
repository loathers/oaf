/**
 * Familiar-type effect calculations.
 *
 * KoL familiars provide bonuses that scale with their buffed weight.
 * Different familiar types use different formulas. The "power"
 * parameter accounts for equipment that multiplies the effect
 * (e.g. a Comma Chameleon acting as a fairy has power 1, but some
 * familiars have innate multipliers).
 */

/**
 * Calculate the +item drop percentage from a fairy-type familiar.
 *
 * Fairy-type familiars increase item drops from monsters. The formula
 * is sqrt(55 * weight * power) + weight * power - 3.
 */
export function fairyItemDrop(weight: number, power = 1): number {
  return Math.sqrt(55 * (weight * power)) + weight * power - 3;
}

/**
 * Calculate the familiar weight needed to reach a given +item drop bonus.
 *
 * Inverse of fairyItemDrop — given a desired item drop percentage,
 * returns the weight needed to achieve it.
 */
export function fairyWeightForItemDrop(modifier: number, power = 1): number {
  return (2 * modifier + 61 - Math.sqrt(220 * modifier + 3685)) / (2 * power);
}

/**
 * Calculate the +meat drop percentage from a leprechaun-type familiar.
 *
 * Meat drop bonus = sqrt(220 * weight) + 2 * weight - 6
 * This is exactly 2x the fairy item drop formula.
 */
export function leprechaunMeatDrop(weight: number, power = 1): number {
  return 2 * fairyItemDrop(weight, power);
}

/**
 * Calculate the familiar weight needed to reach a given +meat drop bonus.
 *
 * Inverse of leprechaunMeatDrop — halves the target then uses the
 * fairy inverse since meat drop = 2 * fairy item drop.
 */
export function leprechaunWeightForMeatDrop(
  modifier: number,
  power = 1,
): number {
  return fairyWeightForItemDrop(modifier / 2, power);
}

/**
 * Calculate substats per combat from a volleyball-type familiar.
 *
 * Volleyball-type familiars grant a flat substat bonus per combat
 * that scales linearly with weight.
 */
export function volleyballSubstats(weight: number): number {
  return 2 + 0.2 * weight;
}

/**
 * Calculate substats per combat from a sombrero-type familiar.
 *
 * Sombrero-type familiars grant substats that scale with both the
 * familiar's weight and the monster level (ML) of the enemy fought.
 */
export function sombreroSubstats(weight: number, ml: number): number {
  return (ml / 4) * (0.1 + 0.005 * weight);
}

/**
 * Calculate the +item drop bonus needed to cap a given drop rate.
 *
 * In KoL, item drops can be "capped" at 100% with enough +item.
 * This returns the minimum +item% needed to guarantee the drop.
 */
export function itemDropBonusToCap(dropRate: number): number {
  return Math.ceil(10000 / dropRate) - 100;
}
