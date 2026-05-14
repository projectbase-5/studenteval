import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Section, Kpi, Pill } from "@/components/ui-kit";
import { useModelVersions, addModelVersion, setActive, type ModelVersion } from "@/stores/modelVersions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Cpu, Play, CheckCircle2, GitBranch } from "lucide-react";

export const Route = createFileRoute("/admin/models")({
  component: AdminModels,
});

const ALGOS: ModelVersion["algorithm"][] = ["Random Forest", "Gradient Boosting", "Linear Regression", "Decision Tree"];

function AdminModels() {
  const versions = useModelVersions();
  const [algo, setAlgo] = useState<ModelVersion["algorithm"]>("Gradient Boosting");
  const [training, setTraining] = useState(false);

  const active = versions.find((v) => v.active) ?? versions[versions.length - 1];

  function retrain() {
    setTraining(true);
    setTimeout(() => {
      addModelVersion(algo);
      setTraining(false);
    }, 1800);
  }

  const trend = versions.map((v) => ({
    name: `v${v.version}`,
    R2: +v.r2.toFixed(3),
    Accuracy: +v.accuracy.toFixed(3),
    F1: +v.f1.toFixed(3),
  }));

  const lastTwo = versions.slice(-2);
  const compareData = lastTwo.length === 2 ? [
    { metric: "R²", [lastTwo[0].version]: lastTwo[0].r2, [lastTwo[1].version]: lastTwo[1].r2 },
    { metric: "Accuracy", [lastTwo[0].version]: lastTwo[0].accuracy, [lastTwo[1].version]: lastTwo[1].accuracy },
    { metric: "F1", [lastTwo[0].version]: lastTwo[0].f1, [lastTwo[1].version]: lastTwo[1].f1 },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Operations"
        description="Trigger retraining, browse versions, compare metrics over time, and promote a model to production."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi icon={GitBranch} label="Total versions" value={versions.length} tone="primary" />
        <Kpi label="Active version" value={active.version} sub={active.algorithm} tone="success" />
        <Kpi label="Best R²" value={Math.max(...versions.map((v) => v.r2)).toFixed(3)} />
        <Kpi label="Best F1" value={Math.max(...versions.map((v) => v.f1)).toFixed(3)} />
      </div>

      <Section title="Retrain model" description="Re-fits the selected algorithm on the latest dataset and registers a new version.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Algorithm</label>
          <select value={algo} onChange={(e) => setAlgo(e.target.value as ModelVersion["algorithm"])}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm">
            {ALGOS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <button onClick={retrain} disabled={training}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {training ? <><Cpu className="h-4 w-4 animate-pulse" /> Training…</> : <><Play className="h-4 w-4" /> Retrain</>}
          </button>
        </div>
      </Section>

      <Section title="Metric trend across versions">
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0.7, 1]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="R2" stroke="var(--primary)" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Accuracy" stroke="var(--success)" strokeWidth={2} dot />
              <Line type="monotone" dataKey="F1" stroke="var(--warning)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {compareData.length > 0 && (
        <Section title={`Compare ${lastTwo[0].version} vs ${lastTwo[1].version}`}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis domain={[0.7, 1]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey={lastTwo[0].version} fill="var(--muted-foreground)" />
                <Bar dataKey={lastTwo[1].version} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title="Model registry">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Algorithm</th>
                <th className="px-3 py-2">Trained</th>
                <th className="px-3 py-2 text-right">R²</th>
                <th className="px-3 py-2 text-right">MAE</th>
                <th className="px-3 py-2 text-right">Accuracy</th>
                <th className="px-3 py-2 text-right">F1</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...versions].reverse().map((v) => (
                <tr key={v.id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono">{v.version}</td>
                  <td className="px-3 py-2">{v.algorithm}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(v.trainedAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{v.r2.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right font-mono">{v.mae.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{(v.accuracy * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{v.f1.toFixed(3)}</td>
                  <td className="px-3 py-2">
                    {v.active
                      ? <Pill tone="success"><CheckCircle2 className="mr-1 inline h-3 w-3" />Active</Pill>
                      : <Pill>Archived</Pill>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!v.active && (
                      <button onClick={() => setActive(v.id)}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent">
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
