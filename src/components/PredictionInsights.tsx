import { useEffect, useState } from "react";
import { loadPredictor, type Predictor } from "@/lib/ml-data";
import { explainPrediction, inputsToPredictorValues, FEATURE_LABELS } from "@/lib/explain";

export type ExplainInputs = {
  study_hours: number; attendance: number; sleep_hours: number;
  previous_marks: number; assignments_completed: number;
  participation: "Low" | "Medium" | "High"; internet_usage: number;
};

export function ExplainPanel({ inputs }: { inputs: ExplainInputs }) {
  const [pred, setPred] = useState<Predictor | null>(null);
  useEffect(() => {
    loadPredictor().then(setPred).catch(() => setPred(null));
  }, []);
  if (!pred) {
    return <div className="text-xs text-muted-foreground">Loading explainability model…</div>;
  }
  const values = inputsToPredictorValues(inputs);
  const { contributions } = explainPrediction(pred, values);
  const top = contributions.slice(0, 6);
  const max = Math.max(...top.map((c) => Math.abs(c.contribution)), 0.01);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Feature impact (SHAP-style contribution)</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> increases score</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> decreases score</span>
        </span>
      </div>
      <div className="space-y-1.5">
        {top.map((c) => {
          const pct = (Math.abs(c.contribution) / max) * 100;
          const positive = c.contribution >= 0;
          return (
            <div key={c.feature} className="grid grid-cols-[160px_1fr_70px] items-center gap-2 text-xs">
              <div className="truncate text-foreground">{FEATURE_LABELS[c.feature] ?? c.feature}</div>
              <div className="relative h-5 rounded bg-muted/60">
                <div
                  className={`absolute top-0 h-full rounded ${positive ? "left-1/2 bg-success/70" : "right-1/2 bg-danger/70"}`}
                  style={{ width: `${pct / 2}%` }}
                />
                <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
              </div>
              <div className={`text-right font-mono ${positive ? "text-success" : "text-danger"}`}>
                {positive ? "+" : ""}{c.contribution.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pt-1 text-[11px] text-muted-foreground">
        Contributions are computed from the trained linear regression coefficients (R² 0.84). Positive bars
        push the predicted score up; negative bars pull it down. Tree-based importances are shown on /model/evaluate.
      </p>
    </div>
  );
}
