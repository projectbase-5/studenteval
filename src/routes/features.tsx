import { createFileRoute } from "@tanstack/react-router";
import { useWorkspace } from "@/stores/workspace";
import { PageHeader, Section, Pill, Kpi } from "@/components/ui-kit";
import { DataTable } from "@/components/DataTable";
import { Layers, Sigma, ShieldAlert, Activity } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});

const FEATURES = [
  { icon: Sigma, name: "performance_index", label: "Performance Index",
    formula: "(study_hours × 0.4 × 10) + (attendance × 0.6)",
    desc: "Composite signal weighting attendance more heavily than self-study time." },
  { icon: Activity, name: "engagement_score", label: "Engagement Score",
    formula: "0.4·(assignments/12) + 0.35·(attendance/100) + part_weight",
    desc: "Captures classroom + coursework engagement on a 0–100 scale." },
  { icon: Layers, name: "study_category", label: "Study Category",
    formula: "study_hours < 2 → Low · < 5 → Medium · ≥ 5 → High",
    desc: "Banded study-intensity for grouped analysis." },
  { icon: ShieldAlert, name: "risk_level", label: "Risk Level",
    formula: "att < 70 ∨ marks < 50 → High · att < 85 ∨ marks < 70 → Medium · else Low",
    desc: "Operational signal for intervention planning." },
];

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function FeaturesPage() {
  const students = useWorkspace((s) => s.students);

  const riskCounts = ["Low", "Medium", "High"].map((r) => ({
    risk: r, count: students.filter((s) => s.risk_level === r).length,
  }));
  const studyCounts = ["Low", "Medium", "High"].map((c) => ({
    cat: c, count: students.filter((s) => s.study_category === c).length,
  }));
  const piBuckets = Array.from({ length: 5 }, (_, i) => {
    const lo = i * 20, hi = lo + 20;
    return {
      bucket: `${lo}–${hi}`,
      count: students.filter((s) => s.performance_index >= lo && s.performance_index < hi).length,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Engineering"
        description="Derive new intelligent features from the cleaned dataset to improve model signal."
      />

      <div className="grid gap-3 md:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.name} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{f.label}</div>
            </div>
            <code className="mt-2 block rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground/80">{f.formula}</code>
            <p className="mt-2 text-xs text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="High risk" value={riskCounts[2].count} sub={`${((riskCounts[2].count / students.length) * 100).toFixed(0)}% of cohort`} tone="danger" />
        <Kpi label="Medium risk" value={riskCounts[1].count} tone="warning" />
        <Kpi label="Low risk" value={riskCounts[0].count} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Risk level distribution">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={riskCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="risk" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {riskCounts.map((d, i) => (
                    <Cell key={i} fill={d.risk === "High" ? "var(--danger)" : d.risk === "Medium" ? "var(--warning)" : "var(--success)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Study category distribution">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={studyCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="cat" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Performance Index histogram">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={piBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Engineered dataset preview" description="First 12 rows with new feature columns">
        <DataTable
          rows={students.slice(0, 50)}
          searchKeys={["name", "id", "class"]}
          pageSize={12}
          columns={[
            { key: "id", label: "ID", className: "font-mono text-xs" },
            { key: "name", label: "Name" },
            { key: "attendance", label: "Att%", align: "right" },
            { key: "study_hours", label: "Study", align: "right" },
            { key: "performance_index", label: "Perf. Index", align: "right",
              render: (r) => <span className="font-mono font-semibold text-primary">{r.performance_index}</span> },
            { key: "engagement_score", label: "Engagement", align: "right",
              render: (r) => <span className="font-mono">{r.engagement_score}</span> },
            { key: "study_category", label: "Study cat.",
              render: (r) => <Pill tone={r.study_category === "High" ? "success" : r.study_category === "Medium" ? "primary" : "warning"}>{r.study_category}</Pill> },
            { key: "risk_level", label: "Risk",
              render: (r) => <Pill tone={r.risk_level === "High" ? "danger" : r.risk_level === "Medium" ? "warning" : "success"}>{r.risk_level}</Pill> },
          ]}
        />
      </Section>
    </div>
  );
}
