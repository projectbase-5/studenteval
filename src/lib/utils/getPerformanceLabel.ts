// quick band classifier — matches the thresholds we use in reports
// TODO: pull thresholds from a settings table later

export type PerformanceBand = "Excellent" | "Good" | "Average" | "At Risk";

export function getPerformanceLabel(score: number): PerformanceBand {
  // clamp first, sometimes the model returns slightly out-of-range values
  const s = Math.max(0, Math.min(100, score));

  if (s >= 85) return "Excellent";
  if (s >= 70) return "Good";
  if (s >= 40) return "Average";
  return "At Risk";
}

export function bandColor(band: PerformanceBand): string {
  switch (band) {
    case "Excellent": return "text-success";
    case "Good": return "text-primary";
    case "Average": return "text-warning";
    case "At Risk": return "text-danger";
  }
}
