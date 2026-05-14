import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Section, Pill } from "@/components/ui-kit";
import { WalkingLoader } from "@/components/WalkingLoader";
import { ExplainPanel } from "@/components/ExplainPanel";
import { SAMPLE_STUDENTS, type Student } from "@/data/students";
import {
  Wand2, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2,
  Search, Info, User2,
} from "lucide-react";

export const Route = createFileRoute("/predict")({
  component: PredictPage,
  head: () => ({ meta: [{ title: "Predict Performance — ScholarSense" }] }),
});

type Inputs = {
  study_hours: number; attendance: number; sleep_hours: number;
  previous_marks: number; assignments_completed: number;
  participation: "Low" | "Medium" | "High"; internet_usage: number;
};

const DEFAULTS: Inputs = {
  study_hours: 5, attendance: 85, sleep_hours: 7,
  previous_marks: 75, assignments_completed: 9, participation: "Medium", internet_usage: 3,
};

function predict(i: Inputs): number {
  const partBoost = i.participation === "High" ? 5 : i.participation === "Medium" ? 0 : -4;
  const score =
    0.30 * i.previous_marks +
    0.18 * i.attendance +
    2.4 * i.study_hours +
    1.2 * i.assignments_completed -
    1.1 * Math.max(0, i.internet_usage - 4) +
    0.7 * (i.sleep_hours - 6) +
    partBoost;
  return Math.max(0, Math.min(100, score));
}

function category(s: number) {
  if (s >= 85) return { label: "Excellent", tone: "success" as const };
  if (s >= 70) return { label: "Good", tone: "primary" as const };
  if (s >= 55) return { label: "Average", tone: "warning" as const };
  if (s >= 40) return { label: "Below Average", tone: "warning" as const };
  return { label: "Poor", tone: "danger" as const };
}

function risk(i: Inputs, s: number) {
  if (i.attendance < 70 || s < 50) return "High" as const;
  if (i.attendance < 85 || s < 70) return "Medium" as const;
  return "Low" as const;
}

function suggestions(i: Inputs, s: number): string[] {
  const out: string[] = [];
  if (i.attendance < 85) out.push(`Improve attendance from ${i.attendance}% to at least 85% — adds ~${(0.18 * (85 - i.attendance)).toFixed(1)} points.`);
  if (i.study_hours < 5) out.push(`Increase study time to 5+ hrs/day for a projected +${(2.4 * (5 - i.study_hours)).toFixed(1)} point gain.`);
  if (i.assignments_completed < 10) out.push(`Submit at least 10 of 12 assignments — currently at ${i.assignments_completed}.`);
  if (i.internet_usage > 4) out.push(`Reduce non-academic screen time below 4 hrs/day to limit a ${(1.1 * (i.internet_usage - 4)).toFixed(1)} point penalty.`);
  if (i.sleep_hours < 6.5) out.push(`Aim for 7+ hours of sleep to support cognitive performance.`);
  if (i.participation === "Low") out.push(`Move from Low to Medium classroom participation for +4 points.`);
  if (s >= 85 && out.length === 0) out.push(`Maintain current habits — performance is already in the top decile.`);
  return out.slice(0, 5);
}

type Field = {
  key: keyof Inputs; label: string; min: number; max: number; step: number; unit?: string;
  tip: string;
};
const FIELDS: Field[] = [
  { key: "study_hours", label: "Study hours / day", min: 0, max: 12, step: 0.5, unit: " h",
    tip: "Average daily focused study time. Realistic range: 1–8 hours." },
  { key: "attendance", label: "Attendance", min: 0, max: 100, step: 1, unit: "%",
    tip: "Class attendance percentage this semester. Below 75% is a red flag." },
  { key: "sleep_hours", label: "Sleep hours / night", min: 3, max: 10, step: 0.5, unit: " h",
    tip: "Average sleep per night. 7–9 hours is optimal for cognitive performance." },
  { key: "previous_marks", label: "Previous marks", min: 0, max: 100, step: 1, unit: "/100",
    tip: "Aggregate of internal assessments and prior semester marks." },
  { key: "assignments_completed", label: "Assignments completed", min: 0, max: 12, step: 1, unit: "/12",
    tip: "Number of submitted assignments out of 12 total this semester." },
  { key: "internet_usage", label: "Internet usage (non-academic)", min: 0, max: 10, step: 0.5, unit: " h/day",
    tip: "Hours spent on social media / streaming per day, excluding study use." },
];

const CLASSES = ["All classes", "CSE-A", "CSE-B", "ECE-A", "ECE-B", "ME-A", "IT-A", "IT-B"];

function studentToInputs(s: Student): Inputs {
  return {
    study_hours: s.study_hours,
    attendance: s.attendance,
    sleep_hours: s.sleep_hours,
    previous_marks: s.previous_marks,
    assignments_completed: s.assignments_completed,
    participation: s.participation,
    internet_usage: s.internet_usage,
  };
}

function PredictPage() {
  const [v, setV] = useState<Inputs>(DEFAULTS);
  const [selected, setSelected] = useState<Student | null>(null);
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState("All classes");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<{ inputs: Inputs; score: number } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Inputs, string>>>({});
  const resultRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Scroll the loader / result into view as the flow progresses.
  useEffect(() => {
    if (phase === "loading" && loaderRef.current) {
      loaderRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (phase === "done" && resultRef.current) {
      // Small delay so the DOM is painted before we measure.
      const t = setTimeout(() => {
        const el = resultRef.current!;
        const top = el.getBoundingClientRect().top + window.scrollY - 72; // offset for sticky header
        window.scrollTo({ top, behavior: "smooth" });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SAMPLE_STUDENTS.filter((s) => {
      if (klass !== "All classes" && s.class !== klass) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    }).slice(0, 200);
  }, [search, klass]);

  function pickStudent(s: Student) {
    setSelected(s);
    setV(studentToInputs(s));
    setPhase("idle");
    setResult(null);
    setErrors({});
  }

  function validate(i: Inputs): boolean {
    const e: Partial<Record<keyof Inputs, string>> = {};
    for (const f of FIELDS) {
      const val = i[f.key] as number;
      if (Number.isNaN(val)) e[f.key] = "Required";
      else if (val < f.min || val > f.max) e[f.key] = `Must be between ${f.min} and ${f.max}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function runPredict() {
    if (!validate(v)) return;
    setPhase("loading");
    setResult(null);
    setTimeout(() => {
      const score = +predict(v).toFixed(1);
      setResult({ inputs: { ...v }, score });
      setPhase("done");
    }, 1400);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Prediction"
        description="Pick a student or enter inputs manually, then run the model to get a predicted final score with explainability and AI suggestions."
        actions={
          <button onClick={() => { setV(DEFAULTS); setSelected(null); setResult(null); setPhase("idle"); setErrors({}); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
        }
      />

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or ID (e.g. STU0042)"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={klass}
          onChange={(e) => setKlass(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
        >
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-mono text-foreground">{filtered.length}</span> students
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Student list */}
        <Section title="Students">
          <div className="max-h-[480px] overflow-y-auto -mx-2">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</div>
            )}
            <ul className="space-y-1">
              {filtered.map((s) => {
                const active = selected?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => pickStudent(s)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        active ? "bg-primary/10 text-foreground" : "hover:bg-accent"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{s.id} · {s.class} · Sem {s.semester}</div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{s.previous_marks}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>

        {/* Form + results */}
        <div className="space-y-4">
          <Section
            title="Student inputs"
            description={selected ? `Editing ${selected.name} (${selected.id})` : "Manual entry"}
            actions={
              <button onClick={() => { setSelected(null); setV(DEFAULTS); }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
                <User2 className="h-3.5 w-3.5" /> Manual
              </button>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {f.label}
                      <span className="group relative inline-flex">
                        <Info className="h-3 w-3 cursor-help" />
                        <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-56 rounded-md border border-border bg-popover p-2 text-[11px] text-popover-foreground shadow-md group-hover:block">
                          {f.tip}
                        </span>
                      </span>
                    </label>
                    <input
                      type="number"
                      min={f.min} max={f.max} step={f.step}
                      value={v[f.key] as number}
                      onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
                      className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-right font-mono text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step}
                    value={v[f.key] as number}
                    onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
                    className="w-full accent-primary" />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>{f.min}{f.unit}</span>
                    <span>{f.max}{f.unit}</span>
                  </div>
                  {errors[f.key] && <div className="mt-1 text-[11px] text-danger">{errors[f.key]}</div>}
                </div>
              ))}
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Participation level</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Low","Medium","High"] as const).map((p) => (
                    <button key={p} onClick={() => setV({ ...v, participation: p })}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        v.participation === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                onClick={runPredict}
                disabled={phase === "loading"}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                {phase === "loading" ? "Predicting…" : "Predict final score"}
              </button>
            </div>
          </Section>

          {phase === "loading" && (
            <div ref={loaderRef}>
              <Section>
                <WalkingLoader label="Running ML model…" />
              </Section>
            </div>
          )}

          {phase === "done" && result && (
            <div ref={resultRef} className="scroll-mt-20">
              <PredictResult inputs={result.inputs} score={result.score} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PredictResult({ inputs, score }: { inputs: Inputs; score: number }) {
  const cat = category(score);
  const r = risk(inputs, score);
  const tips = suggestions(inputs, score);
  const pass = score >= 40;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Wand2 className="h-3.5 w-3.5" /> Predicted final score
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-mono text-5xl font-bold tabular-nums">{score}</div>
          <div className="text-sm text-muted-foreground">/ 100</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: pass ? "var(--success)" : "var(--danger)" }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Status</div>
            <div className="mt-1"><Pill tone={pass ? "success" : "danger"}>{pass ? "Pass" : "Fail"}</Pill></div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Category</div>
            <div className="mt-1"><Pill tone={cat.tone}>{cat.label}</Pill></div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Risk</div>
            <div className="mt-1"><Pill tone={r === "High" ? "danger" : r === "Medium" ? "warning" : "success"}>{r}</Pill></div>
          </div>
        </div>
      </div>

      <Section title="AI suggestions">
        <ul className="space-y-2 text-sm">
          {tips.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              {score >= 85 ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                : <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Why this prediction? (Explainability)">
        <ExplainPanel inputs={inputs} />
      </Section>

      {r === "High" && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <div className="font-medium">Flagged for intervention</div>
            <div className="text-xs text-muted-foreground">Recommend faculty mentor follow-up within 7 days.</div>
          </div>
        </div>
      )}
    </div>
  );
}
