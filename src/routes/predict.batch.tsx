import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { PageHeader, Section, Pill, Kpi } from "@/components/ui-kit";
import { WalkingLoader } from "@/components/WalkingLoader";
import { useWorkspace } from "@/stores/workspace";
import type { EngineeredStudent } from "@/data/students";
import { Wand2, Download, Users, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/predict/batch")({
  component: BatchPredict,
  head: () => ({ meta: [{ title: "Batch Predictions — ScholarSense" }] }),
});

type Prediction = {
  id: string;
  name: string;
  klass: string;
  semester: number;
  previous_marks: number;
  attendance: number;
  predicted_score: number;
  pass: boolean;
  risk: "Low" | "Medium" | "High";
};

function predictOne(s: EngineeredStudent): number {
  const partBoost = s.participation === "High" ? 5 : s.participation === "Medium" ? 0 : -4;
  const score =
    0.30 * s.previous_marks +
    0.18 * s.attendance +
    2.4 * s.study_hours +
    1.2 * s.assignments_completed -
    1.1 * Math.max(0, s.internet_usage - 4) +
    0.7 * (s.sleep_hours - 6) +
    partBoost;
  return Math.max(0, Math.min(100, +score.toFixed(1)));
}

function riskOf(s: EngineeredStudent, score: number): "Low" | "Medium" | "High" {
  if (s.attendance < 70 || score < 50) return "High";
  if (s.attendance < 85 || score < 70) return "Medium";
  return "Low";
}

function BatchPredict() {
  const students = useWorkspace((s) => s.students);
  const [klass, setKlass] = useState<string>("");
  const [semester, setSemester] = useState<string>("All");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<Prediction[] | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.class))).sort(),
    [students],
  );
  const semesters = useMemo(
    () => Array.from(new Set(students.map((s) => s.semester))).sort((a, b) => a - b),
    [students],
  );

  // default class
  useEffect(() => {
    if (!klass && classes.length) setKlass(classes[0]);
  }, [classes, klass]);

  const batch = useMemo(
    () =>
      students.filter(
        (s) => s.class === klass && (semester === "All" || s.semester === Number(semester)),
      ),
    [students, klass, semester],
  );

  // Auto-scroll like the Predict page.
  useEffect(() => {
    if (phase === "loading" && loaderRef.current) {
      loaderRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (phase === "done" && resultRef.current) {
      const t = setTimeout(() => {
        const top = resultRef.current!.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: "smooth" });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function runBatch() {
    if (!batch.length) return;
    setPhase("loading");
    setResults(null);
    setTimeout(() => {
      const out: Prediction[] = batch.map((s) => {
        const score = predictOne(s);
        return {
          id: s.id,
          name: s.name,
          klass: s.class,
          semester: s.semester,
          previous_marks: s.previous_marks,
          attendance: s.attendance,
          predicted_score: score,
          pass: score >= 40,
          risk: riskOf(s, score),
        };
      });
      setResults(out);
      setPhase("done");
    }, 1500);
  }

  function reset() {
    setPhase("idle");
    setResults(null);
  }

  function downloadCsv() {
    if (!results) return;
    const csv = Papa.unparse(
      results.map((r) => ({
        student_id: r.id,
        name: r.name,
        class: r.klass,
        semester: r.semester,
        previous_marks: r.previous_marks,
        attendance: r.attendance,
        predicted_score: r.predicted_score,
        outcome: r.pass ? "Pass" : "Fail",
        risk: r.risk,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${klass}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = useMemo(() => {
    if (!results) return null;
    const pass = results.filter((r) => r.pass).length;
    const fail = results.length - pass;
    const avg = results.reduce((a, r) => a + r.predicted_score, 0) / Math.max(1, results.length);
    return {
      total: results.length,
      pass,
      fail,
      passRate: +((pass / Math.max(1, results.length)) * 100).toFixed(1),
      avg: +avg.toFixed(1),
    };
  }, [results]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Predictions"
        description="Pick a batch (class + semester), run the model on every student in it, and see who is predicted to pass or fail using their historical data."
        actions={
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
        }
      />

      <Section title="Select a batch" description="Choose a class and (optionally) a semester to run predictions on.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="text-muted-foreground">Class</span>
            <select
              value={klass}
              onChange={(e) => { setKlass(e.target.value); reset(); }}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus:border-primary focus:outline-none"
            >
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Semester</span>
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); reset(); }}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="All">All semesters</option>
              {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{batch.length}</span>
              <span className="text-muted-foreground">students in batch</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            onClick={runBatch}
            disabled={phase === "loading" || !batch.length}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            {phase === "loading" ? "Predicting…" : "Predict final scores for batch"}
          </button>
        </div>
      </Section>

      {phase === "loading" && (
        <div ref={loaderRef}>
          <Section>
            <WalkingLoader label={`Running ML model on ${batch.length} students…`} />
          </Section>
        </div>
      )}

      {phase === "done" && results && summary && (
        <div ref={resultRef} className="scroll-mt-20 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi label="Students" value={summary.total} />
            <Kpi label="Predicted pass" value={summary.pass} sub={`${summary.passRate}%`} />
            <Kpi label="Predicted fail" value={summary.fail} />
            <Kpi label="Avg score" value={summary.avg} sub="/ 100" />
            <Kpi label="Batch" value={klass} sub={semester === "All" ? "all sems" : `Sem ${semester}`} />
          </div>

          {/* Pass / fail bar */}
          <Section title="Pass vs Fail distribution">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all"
                style={{ width: `${summary.passRate}%`, background: "var(--success)" }}
              />
              <div
                className="h-full transition-all"
                style={{ width: `${100 - summary.passRate}%`, background: "var(--danger)" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span><Pill tone="success">Pass</Pill> {summary.pass}</span>
              <span>{summary.fail} <Pill tone="danger">Fail</Pill></span>
            </div>
          </Section>

          <Section
            title={`Per-student predictions (${results.length})`}
            actions={
              <button
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </button>
            }
          >
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2 text-right">Prev marks</th>
                    <th className="px-3 py-2 text-right">Attendance</th>
                    <th className="px-3 py-2 text-right">Predicted</th>
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {[...results]
                    .sort((a, b) => b.predicted_score - a.predicted_score)
                    .map((r) => (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.previous_marks}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.attendance}%</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{r.predicted_score}</td>
                        <td className="px-3 py-2">
                          <Pill tone={r.pass ? "success" : "danger"}>{r.pass ? "Pass" : "Fail"}</Pill>
                        </td>
                        <td className="px-3 py-2">
                          <Pill tone={r.risk === "High" ? "danger" : r.risk === "Medium" ? "warning" : "success"}>
                            {r.risk}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
