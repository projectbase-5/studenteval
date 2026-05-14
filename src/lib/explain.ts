// Lightweight SHAP-style explainability for our linear regression predictor.
// Contribution per feature = coef * (value - mean) / scale  (in standardized
// units, then projected back via the coefficient). Sum + intercept = prediction.

import type { Predictor } from "./ml-data";

export type FeatureContribution = {
  feature: string;
  value: number;
  contribution: number; // signed impact on predicted score
};

export function explainPrediction(
  p: Predictor,
  values: Record<string, number>,
): { intercept: number; contributions: FeatureContribution[]; total: number } {
  const contributions: FeatureContribution[] = [];
  let total = p.intercept;
  for (let i = 0; i < p.features.length; i++) {
    const f = p.features[i];
    const v = values[f] ?? p.mean[i];
    const z = (v - p.mean[i]) / p.scale[i];
    const c = z * p.coef[i];
    contributions.push({ feature: f, value: v, contribution: c });
    total += c;
  }
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { intercept: p.intercept, contributions, total };
}

// Map our 7-input student form to the predictor's UCI feature space so the
// linear coefficients can produce a contribution breakdown.
export function inputsToPredictorValues(i: {
  study_hours: number; attendance: number; sleep_hours: number;
  previous_marks: number; assignments_completed: number; participation: string;
  internet_usage: number;
}): Record<string, number> {
  // UCI scales: G1/G2 = 0..20, studytime = 1..4, absences = 0..30,
  // Medu/Fedu 0..4, goout/Dalc/Walc/health 1..5, age ~16..22.
  const g = (i.previous_marks / 100) * 20;
  return {
    G1: g,
    G2: g,
    studytime:
      i.study_hours < 2 ? 1 : i.study_hours < 5 ? 2 : i.study_hours < 8 ? 3 : 4,
    failures: i.previous_marks < 40 ? 2 : i.previous_marks < 60 ? 1 : 0,
    absences: Math.max(0, Math.round((100 - i.attendance) * 0.3)),
    Medu: 3,
    Fedu: 3,
    goout: i.participation === "High" ? 4 : i.participation === "Medium" ? 3 : 2,
    Dalc: Math.min(5, Math.max(1, Math.round(i.internet_usage / 2))),
    Walc: Math.min(5, Math.max(1, Math.round(i.internet_usage / 2) + 1)),
    health: i.sleep_hours >= 7 ? 5 : i.sleep_hours >= 6 ? 4 : 3,
    age: 18,
  };
}

// Pretty labels for the UCI features.
export const FEATURE_LABELS: Record<string, string> = {
  G1: "Previous marks (G1)",
  G2: "Previous marks (G2)",
  studytime: "Study time tier",
  failures: "Past failures",
  absences: "Absences",
  Medu: "Mother's education",
  Fedu: "Father's education",
  goout: "Going out / participation",
  Dalc: "Weekday non-academic time",
  Walc: "Weekend non-academic time",
  health: "Sleep & health",
  age: "Age",
};
