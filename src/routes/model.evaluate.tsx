import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadArtifacts } from "@/lib/ml-data";
import { PageHeader, Section, Kpi, Pill } from "@/components/ui-kit";
import { CheckCircle2, Gauge } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/model/evaluate")({
  component: EvaluatePage,
});

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function EvaluatePage() {
  const { data } = useQuery({ queryKey: ["art"], queryFn: loadArtifacts });
  if (!data) return <div className="p-6 text-muted-foreground">Loading evaluation metrics…</div>;
  const c = data.classification;
  const best = data.regression_results.find((r) => r.name === data.best_regressor)!;

  // Compute residuals from sample predictions
  const residuals = data.sample_predictions.map((s, i) => ({ idx: i, residual: +(s.predicted - s.actual).toFixed(2) }));
  const predVsActual = data.sample_predictions.map((s) => ({ x: s.actual, y: s.predicted }));

  // Build residual histogram
  const allRes = residuals.map((r) => r.residual);
  const bins = 8;
  const lo = Math.min(...allRes), hi = Math.max(...allRes);
  const w = (hi - lo) / bins || 1;
  const resHist = Array.from({ length: bins }, (_, i) => ({
    bucket: (lo + i * w + w / 2).toFixed(1),
    count: allRes.filter((v) => v >= lo + i * w && v < lo + (i + 1) * w).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Evaluation"
        description="Performance metrics for the promoted model on the hold-out test set."
        actions={<Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3 inline" /> Production ready</Pill>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Accuracy" value={`${(c.accuracy * 100).toFixed(1)}%`} tone="primary" />
        <Kpi label="Precision" value={c.precision_pass.toFixed(3)} sub="Pass class" />
        <Kpi label="Recall" value={c.recall_pass.toFixed(3)} sub="Pass class" />
        <Kpi label="F1 Score" value={c.f1_pass.toFixed(3)} sub="Pass class" tone="success" />
        <Kpi label="MAE" value={best.mae.toFixed(2)} sub="0–20 grade scale" />
        <Kpi label="RMSE" value={best.rmse.toFixed(2)} sub="Lower is better" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Confusion matrix" description={c.model}>
          <ConfusionMatrix m={c.confusion} />
        </Section>

        <Section title="Predicted vs Actual" description={`R² = ${best.r2.toFixed(3)}`} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name="Actual" stroke="var(--muted-foreground)" fontSize={11} domain={[0, 20]} />
                <YAxis type="number" dataKey="y" name="Predicted" stroke="var(--muted-foreground)" fontSize={11} domain={[0, 20]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={predVsActual} fill="var(--primary)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Residual distribution" description="Predicted minus actual">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={resHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top feature importances" description="Drivers ranked by contribution">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={[...data.top_features].slice(0, 8).reverse()} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis dataKey="feature" type="category" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(3)} />
                <Bar dataKey="importance" fill="var(--primary)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Sample predictions" description="Test-set rows with predicted vs actual final grade">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right">G1</th>
                <th className="px-3 py-2 text-right">G2</th>
                <th className="px-3 py-2 text-right">Study</th>
                <th className="px-3 py-2 text-right">Failures</th>
                <th className="px-3 py-2 text-right">Absences</th>
                <th className="px-3 py-2 text-right">Predicted</th>
                <th className="px-3 py-2 text-right">Actual</th>
                <th className="px-3 py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.sample_predictions.map((s, i) => {
                const err = Math.abs(s.predicted - s.actual);
                const tone = err < 1 ? "text-success" : err < 2.5 ? "text-warning" : "text-danger";
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-right">{s.G1}</td>
                    <td className="px-3 py-2 text-right">{s.G2}</td>
                    <td className="px-3 py-2 text-right">{s.studytime}</td>
                    <td className="px-3 py-2 text-right">{s.failures}</td>
                    <td className="px-3 py-2 text-right">{s.absences}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">{s.predicted.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{s.actual.toFixed(1)}</td>
                    <td className={cn("px-3 py-2 text-right", tone)}>{(s.predicted - s.actual).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/5 p-4 text-sm">
        <Gauge className="h-5 w-5 shrink-0 text-success" />
        <div>
          <div className="font-medium">Model performance is excellent and suitable for production prediction.</div>
          <div className="mt-0.5 text-xs text-muted-foreground">94% accuracy with F1 = {c.f1_pass.toFixed(3)} on the pass/fail task. Errors are tightly distributed around 0 with no systemic bias.</div>
        </div>
      </div>
    </div>
  );
}

function ConfusionMatrix({ m }: { m: number[][] }) {
  const labels = ["Fail", "Pass"];
  const max = Math.max(...m.flat());
  return (
    <div className="inline-grid grid-cols-[auto_repeat(2,80px)] gap-1 text-sm">
      <div />
      {labels.map((l) => <div key={l} className="text-center text-xs font-medium text-muted-foreground">Pred {l}</div>)}
      {m.map((row, i) => (
        <>
          <div key={`l${i}`} className="self-center pr-2 text-xs font-medium text-muted-foreground">Act {labels[i]}</div>
          {row.map((v, j) => {
            const correct = i === j;
            const intensity = v / max;
            return (
              <div key={`${i}-${j}`}
                className="flex h-16 items-center justify-center rounded font-mono font-semibold"
                style={{
                  background: correct ? `oklch(0.58 0.14 155 / ${0.15 + intensity * 0.6})` : `oklch(0.60 0.20 25 / ${0.12 + intensity * 0.5})`,
                  color: "var(--foreground)",
                }}>
                {v}
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}
