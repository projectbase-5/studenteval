import { createFileRoute } from "@tanstack/react-router";
import { useWorkspace } from "@/stores/workspace";
import { PageHeader, Section } from "@/components/ui-kit";
import { correlationMatrix, histogram, NUMERIC_KEYS, pearson } from "@/lib/analytics";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ScatterChart, Scatter, PieChart, Pie, LineChart, Line,
} from "recharts";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/eda")({
  component: EDA,
  head: () => ({ meta: [{ title: "Exploratory Data Analysis — ScholarSense" }] }),
});

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function EDA() {
  const students = useWorkspace((s) => s.students);

  const studyVsScore = students.map((s) => ({ x: s.study_hours, y: s.final_score }));
  const sleepDist = histogram(students.map((s) => s.sleep_hours), 8, 3, 10);
  const attDist = histogram(students.map((s) => s.attendance), 8, 30, 100);

  const partGroups = ["Low", "Medium", "High"].map((p) => ({
    participation: p,
    avg_score: +(students.filter((s) => s.participation === p).reduce((a, s) => a + s.final_score, 0) / Math.max(1, students.filter((s) => s.participation === p).length)).toFixed(1),
    count: students.filter((s) => s.participation === p).length,
  }));

  const passFail = [
    { name: "Pass", value: students.filter((s) => s.final_score >= 40).length, color: "var(--success)" },
    { name: "Fail", value: students.filter((s) => s.final_score < 40).length, color: "var(--danger)" },
  ];

  const assignmentVsPass = Array.from({ length: 13 }, (_, k) => {
    const grp = students.filter((s) => s.assignments_completed === k);
    const passRate = grp.length ? (grp.filter((s) => s.final_score >= 40).length / grp.length) * 100 : 0;
    return { assignments: k, pass_rate: +passRate.toFixed(1), count: grp.length };
  }).filter((d) => d.count > 0);

  const corrMatrix = correlationMatrix(students);

  // computed insights
  const cAtt = pearson(students.map((s) => s.attendance), students.map((s) => s.final_score));
  const cStudy = pearson(students.map((s) => s.study_hours), students.map((s) => s.final_score));
  const lowAssignFail = students.filter((s) => s.assignments_completed < 5);
  const lowAssignFailRate = lowAssignFail.length
    ? (lowAssignFail.filter((s) => s.final_score < 40).length / lowAssignFail.length) * 100 : 0;
  const highAtt = students.filter((s) => s.attendance > 85);
  const highAttAvg = highAtt.length
    ? highAtt.reduce((a, s) => a + s.final_score, 0) / highAtt.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exploratory Data Analysis"
        description="Visual investigation of patterns and relationships across the cohort."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Insight title="Attendance correlates with score" body={`r = ${cAtt.toFixed(2)}. Students with attendance > 85% average ${highAttAvg.toFixed(1)} marks.`} />
        <Insight title="Study time pays off" body={`Pearson r = ${cStudy.toFixed(2)} between weekly study hours and final score.`} />
        <Insight title="Assignment completion is critical" body={`${lowAssignFailRate.toFixed(0)}% of students completing <5 assignments fail the term.`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Attendance vs Final Score" description="Each dot is a student">
          <Scatter2D data={students.map((s) => ({ x: s.attendance, y: s.final_score }))} xLabel="Attendance %" yLabel="Score" />
        </Section>
        <Section title="Study Hours vs Final Score">
          <Scatter2D data={studyVsScore} xLabel="Study hours/day" yLabel="Score" xMin={0} xMax={12} />
        </Section>

        <Section title="Sleep hours distribution">
          <Hist data={sleepDist} />
        </Section>
        <Section title="Attendance distribution">
          <Hist data={attDist} />
        </Section>

        <Section title="Pass rate by assignment completion">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={assignmentVsPass}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="assignments" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pass_rate" radius={[3, 3, 0, 0]}>
                  {assignmentVsPass.map((d, i) => (
                    <Cell key={i} fill={d.pass_rate >= 80 ? "var(--success)" : d.pass_rate >= 50 ? "var(--warning)" : "var(--danger)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Average score by participation">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={partGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="participation" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="avg_score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Pass / Fail distribution">
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passFail} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label={(e: any) => `${e.name}: ${e.value}`}>
                  {passFail.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Correlation heatmap" description="Pearson correlation between numeric features">
          <Heatmap matrix={corrMatrix} />
        </Section>
      </div>
    </div>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" /> AI INSIGHT
      </div>
      <div className="mt-1 text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function Scatter2D({ data, xLabel, yLabel, xMin, xMax }: { data: { x: number; y: number }[]; xLabel: string; yLabel: string; xMin?: number; xMax?: number }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" dataKey="x" name={xLabel} stroke="var(--muted-foreground)" fontSize={11} domain={[xMin ?? 'auto', xMax ?? 'auto']} />
          <YAxis type="number" dataKey="y" name={yLabel} stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="var(--primary)" fillOpacity={0.45} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function Hist({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Heatmap({ matrix }: { matrix: { feature: string; values: number[] }[] }) {
  const cols = NUMERIC_KEYS as unknown as string[];
  const cell = (v: number) => {
    const a = Math.abs(v);
    const bg = v >= 0 ? `oklch(0.42 0.14 265 / ${a})` : `oklch(0.60 0.20 25 / ${a})`;
    const fg = a > 0.55 ? "white" : "var(--foreground)";
    return { background: bg, color: fg };
  };
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th />
            {cols.map((c) => <th key={c} className="px-1 py-1 font-mono text-[10px] text-muted-foreground -rotate-45 h-20 align-bottom">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.feature}>
              <th className="pr-2 py-1 text-right font-mono text-[10px] text-muted-foreground">{row.feature}</th>
              {row.values.map((v, j) => (
                <td key={j} className="h-9 w-12 text-center font-mono font-medium" style={cell(v)}>
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
