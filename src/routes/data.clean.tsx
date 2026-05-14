import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DIRTY_STUDENTS, SAMPLE_STUDENTS, type DirtyStudent } from "@/data/students";
import { PageHeader, Section, Kpi, Pill } from "@/components/ui-kit";
import { DataTable } from "@/components/DataTable";
import { CheckCircle2, AlertTriangle, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data/clean")({
  component: DataClean,
});

type StepKey = "missing" | "dedup" | "coerce" | "encode" | "scale";

const STEP_DEFS: { key: StepKey; label: string; desc: string }[] = [
  { key: "missing", label: "Impute missing values", desc: "Fill nulls in attendance, sleep, marks, internet with column mean" },
  { key: "dedup", label: "Remove duplicates", desc: "Drop rows where (name, class, semester) fingerprint repeats" },
  { key: "coerce", label: "Coerce data types", desc: "Convert text-numbers (\"ninety\" → 90) into floats/ints" },
  { key: "encode", label: "Encode categoricals", desc: "Participation Low/Med/High → 0/1/2; gender → 0/1" },
  { key: "scale", label: "Normalize numerics", desc: "Standard scale numeric columns to mean 0 / std 1" },
];

const WORD_NUMS: Record<string, number> = { ninety: 90, eighty: 80, seventy: 70, sixty: 60, fifty: 50 };

function DataClean() {
  const [applied, setApplied] = useState<Set<StepKey>>(new Set());

  // Compute issues from raw dirty dataset
  const issues = useMemo(() => {
    const r = DIRTY_STUDENTS;
    const missAttendance = r.filter((x) => x.attendance == null).length;
    const missSleep = r.filter((x) => x.sleep_hours == null).length;
    const missMarks = r.filter((x) => x.previous_marks == null).length;
    const missInternet = r.filter((x) => x.internet_usage == null).length;
    const typeIssues = r.filter((x) => typeof x.attendance === "string").length;
    const dups = r.filter((x) => x.duplicate_of).length;
    return { missAttendance, missSleep, missMarks, missInternet, typeIssues, dups };
  }, []);

  // Process pipeline
  const cleaned = useMemo<Partial<DirtyStudent>[]>(() => {
    let rows: any[] = DIRTY_STUDENTS.map((r) => ({ ...r }));

    if (applied.has("coerce")) {
      rows = rows.map((r) => {
        const att = typeof r.attendance === "string" ? (WORD_NUMS[r.attendance.toLowerCase()] ?? null) : r.attendance;
        return { ...r, attendance: att };
      });
    }
    if (applied.has("missing")) {
      const cols = ["attendance", "sleep_hours", "previous_marks", "internet_usage"];
      const means: Record<string, number> = {};
      for (const c of cols) {
        const vals = rows.map((r) => r[c]).filter((v) => typeof v === "number");
        means[c] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      }
      rows = rows.map((r) => {
        const out = { ...r };
        for (const c of cols) if (out[c] == null || typeof out[c] !== "number") out[c] = +means[c].toFixed(1);
        return out;
      });
    }
    if (applied.has("dedup")) {
      rows = rows.filter((r) => !r.duplicate_of);
    }
    if (applied.has("encode")) {
      rows = rows.map((r) => ({
        ...r,
        participation_enc: r.participation === "High" ? 2 : r.participation === "Medium" ? 1 : 0,
        gender_enc: r.gender === "F" ? 1 : 0,
      }));
    }
    if (applied.has("scale")) {
      const cols = ["attendance", "study_hours", "previous_marks"];
      for (const c of cols) {
        const vals = rows.map((r) => r[c]).filter((v) => typeof v === "number");
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
        rows = rows.map((r) => ({ ...r, [`${c}_z`]: typeof r[c] === "number" ? +((r[c] - mean) / std).toFixed(2) : null }));
      }
    }
    return rows;
  }, [applied]);

  const toggle = (k: StepKey) => setApplied((s) => {
    const ns = new Set(s); ns.has(k) ? ns.delete(k) : ns.add(k); return ns;
  });
  const runAll = () => setApplied(new Set(STEP_DEFS.map((s) => s.key)));
  const reset = () => setApplied(new Set());

  const totalMissing = issues.missAttendance + issues.missSleep + issues.missMarks + issues.missInternet;
  const remaining = applied.has("missing") ? 0 : totalMissing;
  const remainingDups = applied.has("dedup") ? 0 : issues.dups;
  const remainingTypes = applied.has("coerce") ? 0 : issues.typeIssues;

  // Sample of dirty rows for before/after
  const beforeSample = DIRTY_STUDENTS.slice(0, 10).map((r, i) => ({ ...r, id: r.id + "-b" + i }));
  const afterSample = cleaned.slice(0, 10).map((r: any, i) => ({ ...r, id: r.id + "-a" + i }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Cleaning & Preprocessing"
        description="Detect and fix quality issues in the raw dataset before modeling."
        actions={
          <div className="flex gap-2">
            <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button onClick={runAll} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Play className="h-3.5 w-3.5" /> Run all steps
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Raw rows" value={DIRTY_STUDENTS.length} />
        <Kpi label="Missing values" value={remaining} sub={remaining ? "Pending" : "Resolved"} tone={remaining ? "warning" : "success"} />
        <Kpi label="Type errors" value={remainingTypes} tone={remainingTypes ? "warning" : "success"} />
        <Kpi label="Duplicates" value={remainingDups} tone={remainingDups ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Detected issues" className="lg:col-span-1">
          <ul className="space-y-2 text-sm">
            <Issue label={`${issues.missAttendance} missing in attendance`} resolved={applied.has("missing")} />
            <Issue label={`${issues.missSleep} missing in sleep_hours`} resolved={applied.has("missing")} />
            <Issue label={`${issues.missMarks} missing in previous_marks`} resolved={applied.has("missing")} />
            <Issue label={`${issues.missInternet} missing in internet_usage`} resolved={applied.has("missing")} />
            <Issue label={`${issues.typeIssues} text-as-number values`} resolved={applied.has("coerce")} />
            <Issue label={`${issues.dups} duplicate records`} resolved={applied.has("dedup")} />
          </ul>
        </Section>

        <Section title="Pipeline steps" description="Apply transformations in order" className="lg:col-span-2">
          <ol className="space-y-2">
            {STEP_DEFS.map((s, i) => {
              const on = applied.has(s.key);
              return (
                <li key={s.key}
                  className={cn("flex items-start justify-between gap-3 rounded-md border p-3 transition-colors",
                    on ? "border-success/40 bg-success/5" : "border-border bg-card")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                      on ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                      {on ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => toggle(s.key)}
                    className={cn("rounded-md px-3 py-1.5 text-xs font-medium",
                      on ? "border border-border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                    {on ? "Undo" : "Apply"}
                  </button>
                </li>
              );
            })}
          </ol>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Before cleaning" description="Raw values from the source CSV">
          <DataTable
            rows={beforeSample as any[]}
            pageSize={5}
            columns={[
              { key: "id", label: "ID", className: "font-mono text-xs" },
              { key: "name", label: "Name" },
              { key: "attendance", label: "Att", align: "right",
                render: (r: any) => r.attendance == null
                  ? <Pill tone="danger">null</Pill>
                  : typeof r.attendance === "string" ? <Pill tone="warning">{r.attendance}</Pill> : <span className="font-mono">{r.attendance}</span>,
              },
              { key: "sleep_hours", label: "Sleep", align: "right",
                render: (r: any) => r.sleep_hours == null ? <Pill tone="danger">null</Pill> : <span className="font-mono">{r.sleep_hours}</span>,
              },
              { key: "previous_marks", label: "Prev", align: "right",
                render: (r: any) => r.previous_marks == null ? <Pill tone="danger">null</Pill> : <span className="font-mono">{r.previous_marks}</span>,
              },
            ]}
          />
        </Section>

        <Section title="After cleaning" description={`Pipeline applied: ${applied.size}/${STEP_DEFS.length} steps`}>
          <DataTable
            rows={afterSample as any[]}
            pageSize={5}
            columns={[
              { key: "id", label: "ID", className: "font-mono text-xs" },
              { key: "name", label: "Name" },
              { key: "attendance", label: "Att", align: "right", render: (r: any) => <span className="font-mono">{r.attendance ?? "—"}</span> },
              { key: "sleep_hours", label: "Sleep", align: "right", render: (r: any) => <span className="font-mono">{r.sleep_hours ?? "—"}</span> },
              { key: "previous_marks", label: "Prev", align: "right", render: (r: any) => <span className="font-mono">{r.previous_marks ?? "—"}</span> },
              ...(applied.has("encode") ? [{ key: "participation_enc" as any, label: "Part-enc", align: "right" as const, render: (r: any) => <span className="font-mono text-primary">{r.participation_enc}</span> }] : []),
            ]}
          />
        </Section>
      </div>

      {applied.size === STEP_DEFS.length && (
        <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <div className="font-medium">Dataset is clean and ready for analysis.</div>
            <div className="text-xs text-muted-foreground">
              {SAMPLE_STUDENTS.length} validated rows · 0 missing values · 0 duplicates. Continue to <span className="font-mono">/eda</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Issue({ label, resolved }: { label: string; resolved: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {resolved
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        : <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />}
      <span className={cn(resolved && "text-muted-foreground line-through")}>{label}</span>
    </li>
  );
}
