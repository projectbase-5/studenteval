export type Artifacts = {
  summary: {
    n_rows: number; n_features: number; n_math: number; n_por: number;
    pass_rate: number; avg_g3: number; avg_absences: number; avg_studytime: number;
  };
  top_correlations: { feature: string; corr: number }[];
  regression_results: { name: string; r2: number; mae: number; rmse: number; cv_r2: number }[];
  best_regressor: string;
  classification: {
    model: string; accuracy: number; cv_accuracy: number;
    confusion: number[][]; precision_pass: number; recall_pass: number; f1_pass: number;
  };
  top_features: { feature: string; importance: number }[];
  sample_predictions: { actual: number; predicted: number; G1: number; G2: number; absences: number; studytime: number; failures: number }[];
  grade_distribution: number[];
  studytime_avg_grade: { studytime: number; avg_g3: number; count: number }[];
  absences_buckets: { bucket: string; avg_g3: number; count: number }[];
  failures_avg_grade: { failures: number; avg_g3: number; count: number }[];
  pass_by_sex: { sex: string; pass_rate: number; count: number }[];
  pass_by_school: { school: string; pass_rate: number; count: number }[];
};

export type Predictor = {
  features: string[];
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
  r2: number;
};

export async function loadArtifacts(): Promise<Artifacts> {
  const r = await fetch("/ml/artifacts.json");
  return r.json();
}
export async function loadPredictor(): Promise<Predictor> {
  const r = await fetch("/ml/predictor.json");
  return r.json();
}

export function predictGrade(p: Predictor, values: Record<string, number>): number {
  let y = p.intercept;
  for (let i = 0; i < p.features.length; i++) {
    const f = p.features[i];
    const v = values[f] ?? 0;
    const z = (v - p.mean[i]) / p.scale[i];
    y += z * p.coef[i];
  }
  return Math.max(0, Math.min(20, y));
}
