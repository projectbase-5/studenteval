// small helper — kept simple on purpose, used in dashboard cards
// (was inlined earlier, pulled out so EDA could reuse it)

export function calculateAverage(values: number[]): number {
  if (!values || values.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }
  return total / values.length;
}

// rounded version for display
export function avgRounded(values: number[], decimals = 1): number {
  const a = calculateAverage(values);
  const f = Math.pow(10, decimals);
  return Math.round(a * f) / f;
}
