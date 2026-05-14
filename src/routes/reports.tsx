import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useWorkspace } from "@/stores/workspace";
import { PageHeader, Section, Pill } from "@/components/ui-kit";
import { DataTable } from "@/components/DataTable";
import { Download, FileText, Trophy } from "lucide-react";
import { summary, topN, PASS_THRESHOLD } from "@/lib/analytics";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const students = useWorkspace((s) => s.students);
  const stats = summary(students)!;
  const [risk, setRisk] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [klass, setKlass] = useState<string>("All");

  const filtered = students.filter((s) =>
    (risk === "All" || s.risk_level === risk) &&
    (klass === "All" || s.class === klass)
  );

  const ranked = [...filtered].sort((a, b) => b.final_score - a.final_score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const classes = Array.from(new Set(students.map((s) => s.class))).sort();

  const exportCsv = () => {
    const headers = ["rank","id","name","class","semester","attendance","study_hours","previous_marks","final_score","risk_level"];
    const rows = ranked.map((s) => headers.map((h) => (s as any)[h]).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scholarsense_report_${Date.now()}.csv`; a.click();
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("ScholarSense — Cohort Report", 14, 18);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleString()} · ${stats.n} students`, 14, 24);

    doc.setFontSize(11); doc.setTextColor(20);
    doc.text("Summary", 14, 36);
    autoTable(doc, {
      startY: 40,
      theme: "grid", styles: { fontSize: 9 },
      head: [["Metric", "Value"]],
      body: [
        ["Total students", String(stats.n)],
        ["Average score", `${stats.avg_score} / 100`],
        ["Pass rate", `${stats.pass_rate}% (≥ ${PASS_THRESHOLD})`],
        ["Average attendance", `${stats.avg_attendance}%`],
        ["At-risk students", String(stats.at_risk)],
        ["Top performers (≥85)", String(stats.top_performers)],
      ],
    });

    const top10 = topN(filtered, 10, (s) => s.final_score);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "striped", styles: { fontSize: 9 },
      head: [["Rank", "ID", "Name", "Class", "Att%", "Score"]],
      body: top10.map((s, i) => [i + 1, s.id, s.name, s.class, s.attendance, s.final_score]),
      headStyles: { fillColor: [60, 70, 200] },
    });

    const atRisk = topN(filtered.filter((s) => s.risk_level === "High"), 10, (s) => -s.final_score);
    if (atRisk.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        theme: "striped", styles: { fontSize: 9 },
        head: [["ID", "Name", "Class", "Att%", "Prev", "Score", "Risk"]],
        body: atRisk.map((s) => [s.id, s.name, s.class, s.attendance, s.previous_marks, s.final_score, s.risk_level]),
        headStyles: { fillColor: [180, 60, 60] },
      });
    }
    doc.save(`scholarsense_report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Insights"
        description="Sortable cohort leaderboard with class and risk filters. Export to CSV or PDF."
        actions={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <FileText className="h-3.5 w-3.5" /> Generate PDF
            </button>
          </div>
        }
      />

      <Section>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Class
            <select value={klass} onChange={(e) => setKlass(e.target.value)}
              className="ml-2 h-8 rounded-md border border-border bg-background px-2 text-sm">
              <option>All</option>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">Risk
            <select value={risk} onChange={(e) => setRisk(e.target.value as any)}
              className="ml-2 h-8 rounded-md border border-border bg-background px-2 text-sm">
              <option>All</option><option>Low</option><option>Medium</option><option>High</option>
            </select>
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            Showing {filtered.length} of {students.length} students
          </span>
        </div>
      </Section>

      <Section title="Student leaderboard" description="Sorted by final score (descending)" actions={<Pill tone="primary"><Trophy className="mr-1 h-3 w-3 inline" /> Live</Pill>}>
        <DataTable
          rows={ranked}
          searchKeys={["name", "id", "class"]}
          pageSize={15}
          columns={[
            { key: "rank", label: "#", align: "right", className: "font-mono text-xs",
              render: (r) => <span className={r.rank <= 3 ? "font-semibold text-primary" : ""}>{r.rank}</span> },
            { key: "id", label: "ID", className: "font-mono text-xs" },
            { key: "name", label: "Name" },
            { key: "class", label: "Class" },
            { key: "semester", label: "Sem", align: "right" },
            { key: "attendance", label: "Att%", align: "right" },
            { key: "previous_marks", label: "Prev", align: "right" },
            { key: "final_score", label: "Score", align: "right",
              render: (r) => <span className="font-mono font-semibold">{r.final_score}</span> },
            { key: "risk_level", label: "Risk",
              render: (r) => <Pill tone={r.risk_level === "High" ? "danger" : r.risk_level === "Medium" ? "warning" : "success"}>{r.risk_level}</Pill> },
          ]}
        />
      </Section>
    </div>
  );
}
