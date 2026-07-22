/** Round to nearest rupee: 1000.00–1000.49 → 1000, 1000.50–1000.99 → 1001 */
export function roundToRupee(amount: number): number {
  return Math.round(amount);
}

export function getRoundOff(amount: number): number {
  const rounded = roundToRupee(amount);
  return Math.round((rounded - amount) * 100) / 100;
}

/** Indian numbering: 54967423 → 5,49,67,423 */
export function formatINR(amount: number, fractionDigits = 2): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatINRWhole(amount: number): string {
  return formatINR(amount, 0);
}

export function applyRoundOff(amount: number): {
  beforeRoundOff: number;
  roundOff: number;
  grand: number;
} {
  const beforeRoundOff = amount;
  const grand = roundToRupee(beforeRoundOff);
  const roundOff = getRoundOff(beforeRoundOff);
  return { beforeRoundOff, roundOff, grand };
}
