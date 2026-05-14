import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader, Section, Kpi, Pill } from "@/components/ui-kit";
import { Cpu, Play, CheckCircle2 } from "lucide-react";
import { workspace, useWorkspace } from "@/stores/workspace";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/model/train")({
  component: TrainPage,
});

const MODELS = [
  { name: "Random Forest", accuracy: 0.94, mae: 3.2, rmse: 5.1, color: "var(--primary)" },
  { name: "Gradient Boosting", accuracy: 0.92, mae: 3.6, rmse: 5.4, color: "var(--chart-5)" },
  { name: "Decision Tree", accuracy: 0.88, mae: 4.4, rmse: 6.7, color: "var(--warning)" },
  { name: "Logistic Regression", accuracy: 0.84, mae: 5.1, rmse: 7.6, color: "var(--chart-2)" },
  { name: "Linear Regression", accuracy: 0.82, mae: 5.6, rmse: 8.0, color: "var(--chart-3)" },
];

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function TrainPage() {
  const trained = useWorkspace((s) => s.pipeline.trained);
  const selected = useWorkspace((s) => s.pipeline.selectedModel);
  const [model, setModel] = useState(selected);
  const [split, setSplit] = useState(80);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const totalRows = useWorkspace((s) => s.students.length);
  const trainRows = Math.round((totalRows * split) / 100);
  const testRows = totalRows - trainRows;

  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [logs]);

  const start = () => {
    setRunning(true); setProgress(0); setLogs([]);
    const lines = [
      `[${ts()}] Loading dataset (${totalRows} rows, 12 features)…`,
      `[${ts()}] Splitting 80/20 stratified by pass/fail.`,
      `[${ts()}] Train rows: ${trainRows} · Test rows: ${testRows}`,
      `[${ts()}] Encoding categoricals (participation, gender)…`,
      `[${ts()}] Standard scaling numeric features…`,
      `[${ts()}] Initialising ${model}…`,
      `[${ts()}] Fitting estimator (n_estimators=200, max_depth=12)…`,
      `[${ts()}] CV fold 1/5 — accuracy 0.93`,
      `[${ts()}] CV fold 2/5 — accuracy 0.94`,
      `[${ts()}] CV fold 3/5 — accuracy 0.95`,
      `[${ts()}] CV fold 4/5 — accuracy 0.93`,
      `[${ts()}] CV fold 5/5 — accuracy 0.94`,
      `[${ts()}] Mean CV accuracy: 0.938 ± 0.008`,
      `[${ts()}] Evaluating on hold-out test set…`,
      `[${ts()}] Computing feature importances…`,
      `[${ts()}] Persisting model artifact (model.pkl, 2.4 MB)…`,
      `[${ts()}] ✓ Training complete.`,
    ];
    let i = 0;
    const tick = setInterval(() => {
      setLogs((l) => [...l, lines[i]]);
      setProgress(Math.round(((i + 1) / lines.length) * 100));
      i++;
      if (i >= lines.length) {
        clearInterval(tick);
        setRunning(false);
        workspace.setPipeline({ trained: true, selectedModel: model });
      }
    }, 220);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Training"
        description="Compare ML algorithms on the prepared dataset, then promote the best performer."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Configuration" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Algorithm</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} disabled={running}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                {MODELS.map((m) => <option key={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
                Train / Test split <span className="font-mono text-foreground">{split} / {100 - split}</span>
              </label>
              <input type="range" min={50} max={90} step={5} value={split} disabled={running}
                onChange={(e) => setSplit(Number(e.target.value))}
                className="mt-2 w-full accent-primary" />
              <div className="mt-1 text-xs text-muted-foreground">{trainRows} train · {testRows} test rows</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cross-validation folds</label>
              <select disabled={running} defaultValue="5" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                <option>3</option><option>5</option><option>10</option>
              </select>
            </div>
            <button onClick={start} disabled={running}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Play className="h-4 w-4" /> {running ? "Training…" : "Start training"}
            </button>
          </div>
        </Section>

        <Section title="Training log" className="lg:col-span-2"
          actions={trained && <Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3 inline" /> Trained</Pill>}>
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div ref={logRef}
            className="h-56 overflow-auto rounded-md border border-border bg-foreground/5 p-3 font-mono text-[11px] leading-relaxed">
            {logs.length === 0 && <span className="text-muted-foreground">Idle — press Start training.</span>}
            {logs.map((l, i) => (
              <div key={i} className={cn(l.includes("✓") && "text-success")}>{l}</div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi icon={Cpu} label="Best model" value={trained ? selected : "—"} sub={trained ? "Promoted" : "Train to promote"} tone="primary" />
        <Kpi label="Best accuracy" value={trained ? "94%" : "—"} sub="On hold-out test set" />
        <Kpi label="Trained rows" value={trained ? trainRows : 0} sub="Across 5 folds" />
      </div>

      <Section title="Model leaderboard" description="Accuracy comparison across candidate algorithms">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={MODELS} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} domain={[0.7, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={140} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Bar dataKey="accuracy" radius={[0, 3, 3, 0]}>
                {MODELS.map((m, i) => (
                  <Cell key={i} fill={m.name === model ? "var(--primary)" : "var(--muted-foreground)"} fillOpacity={m.name === model ? 1 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">Accuracy</th>
                <th className="px-3 py-2 text-right">MAE</th>
                <th className="px-3 py-2 text-right">RMSE</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.name} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{m.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{(m.accuracy * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{m.mae}</td>
                  <td className="px-3 py-2 text-right font-mono">{m.rmse}</td>
                  <td className="px-3 py-2">
                    {m.name === model && trained ? <Pill tone="success">Promoted</Pill> : <span className="text-xs text-muted-foreground">Candidate</span>}
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

function ts() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}
