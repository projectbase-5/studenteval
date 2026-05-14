import { createFileRoute, Link } from "@tanstack/react-router";
import { useWorkspace } from "@/stores/workspace";
import { summary, histogram, topN, PASS_THRESHOLD } from "@/lib/analytics";
import { PageHeader, Kpi, Section, Pill } from "@/components/ui-kit";
import { DataTable } from "@/components/DataTable";
import {
  Users, GraduationCap, TrendingUp, AlertTriangle, Trophy, CalendarCheck, Cpu,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ScholarSense" }] }),
});

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function Dashboard() {
  const students = useWorkspace((s) => s.students);
  const stats = summary(students)!;
  const dist = histogram(students.map((s) => s.final_score), 10, 0, 100);
  const scatter = students.map((s) => ({ x: s.attendance, y: s.final_score, name: s.name }));
  const atRisk = topN(students.filter((s) => s.risk_level === "High"), 8, (s) => -s.final_score);
  const top = topN(students, 8, (s) => s.final_score);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Snapshot of student outcomes, model health, and attention areas across the current cohort."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={Users} label="Total Students" value={stats.n.toLocaleString()} sub="Active cohort" />
        <Kpi icon={GraduationCap} label="Avg Score" value={`${stats.avg_score}`} sub="Out of 100" tone="primary" />
        <Kpi icon={TrendingUp} label="Pass Rate" value={`${stats.pass_rate}%`} sub={`Score ≥ ${PASS_THRESHOLD}`} tone="success" />
        <Kpi icon={Cpu} label="Model Accuracy" value="94%" sub="Random Forest" tone="primary" />
        <Kpi icon={AlertTriangle} label="At-Risk" value={stats.at_risk} sub="High risk band" tone="danger" />
        <Kpi icon={CalendarCheck} label="Avg Attendance" value={`${stats.avg_attendance}%`} sub="Term-to-date" tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Final score distribution" description="Cohort spread across score bands" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Attendance vs Final Score" description="Stronger attendance trends with higher scores">
          <div className="h-64">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name="Attendance" unit="%" stroke="var(--muted-foreground)" fontSize={11} domain={[30, 100]} />
                <YAxis type="number" dataKey="y" name="Score" stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                <ZAxis range={[20, 20]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatter} fill="var(--primary)" fillOpacity={0.55} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="At-risk students"
          description="Flagged for intervention this term"
          actions={<Link to="/reports" className="text-xs font-medium text-primary hover:underline">View all →</Link>}
        >
          <DataTable
            rows={atRisk}
            pageSize={8}
            columns={[
              { key: "id", label: "ID", className: "font-mono text-xs" },
              { key: "name", label: "Name" },
              { key: "class", label: "Class" },
              { key: "attendance", label: "Att%", align: "right", render: (r) => <span className="font-mono">{r.attendance}</span> },
              { key: "final_score", label: "Score", align: "right", render: (r) => <span className="font-mono font-semibold text-danger">{r.final_score}</span> },
              { key: "risk_level", label: "Risk", render: (r) => <Pill tone="danger">{r.risk_level}</Pill> },
            ]}
          />
        </Section>

        <Section
          title="Top performers"
          description="Honor candidates"
          actions={<Link to="/reports" className="text-xs font-medium text-primary hover:underline">View all →</Link>}
        >
          <DataTable
            rows={top}
            pageSize={8}
            columns={[
              { key: "id", label: "ID", className: "font-mono text-xs" },
              { key: "name", label: "Name" },
              { key: "class", label: "Class" },
              { key: "attendance", label: "Att%", align: "right", render: (r) => <span className="font-mono">{r.attendance}</span> },
              { key: "final_score", label: "Score", align: "right", render: (r) => <span className="font-mono font-semibold text-success">{r.final_score}</span> },
              { key: "performance_index", label: "PI", align: "right", render: (r) => <span className="font-mono">{r.performance_index}</span> },
            ]}
          />
        </Section>
      </div>

      <Section title="Quick actions">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {[
            { to: "/data/upload", label: "Upload new data", icon: Users },
            { to: "/eda", label: "Explore charts", icon: TrendingUp },
            { to: "/predict", label: "Run a prediction", icon: Cpu },
            { to: "/reports", label: "Export report", icon: Trophy },
          ].map((a) => (
            <Link key={a.to} to={a.to}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <a.icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
