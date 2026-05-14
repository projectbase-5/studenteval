import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { PageHeader, Section, Pill } from "@/components/ui-kit";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/predict/batch")({
  component: BatchPredict,
  head: () => ({ meta: [{ title: "Batch Predictions — ScholarSense" }] }),
});

type Row = {
  student_id?: string;
  name?: string;
  study_hours: number;
  attendance: number;
  sleep_hours: number;
  previous_marks: number;
  assignments_completed: number;
  participation: string;
  internet_usage: number;
  predicted_score: number;
  pass: string;
  risk: string;
};

const REQUIRED = [
  "study_hours","attendance","sleep_hours","previous_marks",
  "assignments_completed","participation","internet_usage",
];

function predictRow(i: any): number {
  const partBoost = i.participation === "High" ? 5 : i.participation === "Medium" ? 0 : -4;
  const s =
    0.30 * Number(i.previous_marks) +
    0.18 * Number(i.attendance) +
    2.4 * Number(i.study_hours) +
    1.2 * Number(i.assignments_completed) -
    1.1 * Math.max(0, Number(i.internet_usage) - 4) +
    0.7 * (Number(i.sleep_hours) - 6) +
    partBoost;
  return Math.max(0, Math.min(100, s));
}

function BatchPredict() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setError(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as any[];
        if (data.length === 0) { setError("CSV is empty."); return; }
        const cols = Object.keys(data[0] ?? {});
        const missing = REQUIRED.filter((r) => !cols.includes(r));
        if (missing.length) {
          setError(`Missing required columns: ${missing.join(", ")}. Required: ${REQUIRED.join(", ")}`);
          return;
        }
        const out: Row[] = data.map((r) => {
          const score = +predictRow(r).toFixed(1);
          const pass = score >= 40 ? "Yes" : "No";
          const risk = score < 50 || Number(r.attendance) < 70 ? "High" : score < 70 || Number(r.attendance) < 85 ? "Medium" : "Low";
          return {
            student_id: r.student_id || r.id || "",
            name: r.name || "",
            study_hours: Number(r.study_hours),
            attendance: Number(r.attendance),
            sleep_hours: Number(r.sleep_hours),
            previous_marks: Number(r.previous_marks),
            assignments_completed: Number(r.assignments_completed),
            participation: String(r.participation),
            internet_usage: Number(r.internet_usage),
            predicted_score: score,
            pass,
            risk,
          };
        });
        setRows(out);
      },
      error: (err) => setError(err.message),
    });
  }

  function downloadCsv() {
    if (!rows) return;
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `predictions-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const sample = [{
      student_id: "STU0001", name: "Sample Student",
      study_hours: 5, attendance: 88, sleep_hours: 7,
      previous_marks: 72, assignments_completed: 10,
      participation: "Medium", internet_usage: 3,
    }];
    const blob = new Blob([Papa.unparse(sample)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "batch-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Predictions"
        description="Upload a CSV with one row per student, run predictions for the whole class, and download results."
      />

      <Section title="Upload CSV"
        actions={
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Download template
          </button>
        }
      >
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/50">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Click to upload CSV</div>
          <div className="text-xs text-muted-foreground">
            Required columns: {REQUIRED.join(", ")}
          </div>
          <input type="file" accept=".csv" className="hidden" onChange={onFile} />
        </label>
        {filename && <div className="mt-3 text-xs text-muted-foreground">Loaded: <span className="font-mono text-foreground">{filename}</span></div>}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>{error}</div>
          </div>
        )}
      </Section>

      {rows && rows.length > 0 && (
        <Section
          title={`Results (${rows.length} students)`}
          actions={
            <button onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          }
        >
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">Predicted</th>
                  <th className="px-3 py-2">Pass</th>
                  <th className="px-3 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{r.student_id}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{r.predicted_score}</td>
                    <td className="px-3 py-2"><Pill tone={r.pass === "Yes" ? "success" : "danger"}>{r.pass}</Pill></td>
                    <td className="px-3 py-2"><Pill tone={r.risk === "High" ? "danger" : r.risk === "Medium" ? "warning" : "success"}>{r.risk}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
