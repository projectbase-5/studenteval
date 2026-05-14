import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, Database, Plus, Trash2 } from "lucide-react";
import { PageHeader, Section, Kpi, Pill } from "@/components/ui-kit";
import { DataTable } from "@/components/DataTable";
import { useWorkspace, workspace } from "@/stores/workspace";
import { engineer, SAMPLE_STUDENTS, type Student } from "@/data/students";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/data/upload")({
  component: DataUpload,
});

const COLUMNS = [
  "id","name","gender","class","semester","study_hours","attendance","sleep_hours",
  "assignments_completed","previous_marks","internet_usage","participation","final_score",
];

function DataUpload() {
  const students = useWorkspace((s) => s.students);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", gender: "M", class: "CSE-A", semester: 4,
    study_hours: 4, attendance: 85, sleep_hours: 7, assignments_completed: 9,
    previous_marks: 75, internet_usage: 3, participation: "Medium", final_score: 75,
  });

  const numCols = ["study_hours","attendance","sleep_hours","assignments_completed","previous_marks","internet_usage","final_score","semester"];
  const stats = students.length === 0 ? [] : numCols.map((c) => {
    const vals = students.map((s) => Number((s as any)[c])).filter(Number.isFinite);
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / (vals.length || 1);
    return { col: c, mean: +mean.toFixed(2), min: Math.min(...vals), max: Math.max(...vals), missing: students.length - vals.length };
  });

  const handleCsv = (file: File) => {
    setCsvError(null);
    setCsvSuccess(null);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        try {
          const baseIdx = students.length;
          const headers = res.meta.fields ?? [];
          const expected = ["name","attendance","study_hours","previous_marks","final_score"];
          const missingCols = expected.filter((c) => !headers.includes(c));
          const rows: Student[] = res.data.map((r, i) => ({
            id: r.id || `UPL${Date.now().toString(36)}${String(baseIdx + i + 1).padStart(4, "0")}`,
            name: r.name || `Student ${i + 1}`,
            gender: (r.gender === "F" ? "F" : "M") as "M" | "F",
            class: r.class || "—",
            semester: Number(r.semester) || 1,
            study_hours: Number(r.study_hours) || 0,
            attendance: Number(r.attendance) || 0,
            sleep_hours: Number(r.sleep_hours) || 7,
            assignments_completed: Number(r.assignments_completed) || 0,
            previous_marks: Number(r.previous_marks) || 0,
            internet_usage: Number(r.internet_usage) || 0,
            participation: (["Low","Medium","High"].includes(r.participation) ? r.participation : "Medium") as Student["participation"],
            final_score: Number(r.final_score) || 0,
          }));
          if (!rows.length) throw new Error("CSV had no rows.");
          if (missingCols.length === expected.length) {
            throw new Error(`CSV columns don't match expected schema. Expected at least one of: ${expected.join(", ")}. Got: ${headers.join(", ") || "(no headers)"}.`);
          }
          const result = await workspace.addStudents(rows, "csv");
          if (result.error) {
            setCsvError(`Saved 0 / ${rows.length} rows — ${result.error}`);
          } else {
            const warn = missingCols.length > 0 ? ` (warning: missing columns ${missingCols.join(", ")} — those values defaulted to 0)` : "";
            setCsvSuccess(`Imported ${result.inserted} students${warn}.`);
          }
        } catch (e) {
          setCsvError((e as Error).message);
        }
      },
      error: (e) => setCsvError(e.message),
    });
  };

  const addManual = async () => {
    if (!form.name.trim()) return;
    const s: Student = {
      id: `MAN${Date.now().toString(36)}${String(students.length + 1).padStart(4, "0")}`,
      name: form.name.trim(),
      gender: form.gender as "M" | "F",
      class: form.class,
      semester: Number(form.semester),
      study_hours: Number(form.study_hours),
      attendance: Number(form.attendance),
      sleep_hours: Number(form.sleep_hours),
      assignments_completed: Number(form.assignments_completed),
      previous_marks: Number(form.previous_marks),
      internet_usage: Number(form.internet_usage),
      participation: form.participation as Student["participation"],
      final_score: Number(form.final_score),
    };
    const result = await workspace.addStudents([s], "manual");
    if (result.error) {
      setCsvError(`Could not save: ${result.error}`);
    } else {
      setCsvError(null);
      setCsvSuccess(`Added ${form.name.trim()}.`);
      setForm({ ...form, name: "" });
    }
  };

  const [sampleLoading, setSampleLoading] = useState(false);
  const loadSample = async () => {
    setSampleLoading(true);
    setCsvError(null);
    setCsvSuccess(null);
    try {
      const result = await workspace.addStudents(SAMPLE_STUDENTS as Student[], "sample");
      if (result.error) setCsvError(`Sample load failed: ${result.error}`);
      else setCsvSuccess(`Loaded ${result.inserted} sample students.`);
    } finally {
      setSampleLoading(false);
    }
  };

  const removeMockData = async () => {
    if (!confirm("Remove the seeded sample data only? Manual and CSV-uploaded entries will be kept.")) return;
    const result = await workspace.clearMockData();
    if (result.error) setCsvError(`Could not remove sample data: ${result.error}`);
    else setCsvSuccess("Sample data removed. Manual and CSV entries are preserved.");
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<"csv" | "manual" | null>(null);
  const handleDeleteBySource = async (source: "csv" | "manual") => {
    setDeleting(source);
    setCsvError(null);
    setCsvSuccess(null);
    const result = await workspace.deleteBySource(source);
    setDeleting(null);
    setDeleteOpen(false);
    if (result.error) setCsvError(`Could not delete ${source} data: ${result.error}`);
    else setCsvSuccess(`${source === "csv" ? "CSV" : "Manual"} data deleted.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Collection"
        description="Ingest student records from CSV, add entries manually, or load the institutional sample dataset."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Rows" value={students.length} />
        <Kpi label="Columns" value={COLUMNS.length} sub="Schema-validated" />
        <Kpi label="Classes" value={new Set(students.map((s) => s.class)).size} />
        <Kpi label="Semesters" value={new Set(students.map((s) => s.semester)).size} />
      </div>

      <Tabs defaultValue="csv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="csv"><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload CSV</TabsTrigger>
          <TabsTrigger value="manual"><Plus className="mr-1.5 h-3.5 w-3.5" /> Manual entry</TabsTrigger>
          <TabsTrigger value="sample"><Database className="mr-1.5 h-3.5 w-3.5" /> Sample dataset</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <Section title="Import a CSV file" description={`Required columns: ${COLUMNS.join(", ")}`}>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/60">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Click to select a CSV, or drag & drop</div>
              <div className="text-xs text-muted-foreground">UTF-8 encoded · header row required</div>
              <input type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
            </label>
            {csvError && <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{csvError}</div>}
            {csvSuccess && !csvError && <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{csvSuccess}</div>}
          </Section>
        </TabsContent>

        <TabsContent value="manual">
          <Section title="Add a single student record">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {[
                { k: "name", label: "Name", type: "text" },
                { k: "class", label: "Class", type: "text" },
                { k: "semester", label: "Semester", type: "number" },
                { k: "gender", label: "Gender", type: "select", opts: ["M", "F"] },
                { k: "study_hours", label: "Study hours/day", type: "number" },
                { k: "attendance", label: "Attendance %", type: "number" },
                { k: "sleep_hours", label: "Sleep hours", type: "number" },
                { k: "assignments_completed", label: "Assignments (0-12)", type: "number" },
                { k: "previous_marks", label: "Previous marks", type: "number" },
                { k: "internet_usage", label: "Internet (h/day)", type: "number" },
                { k: "participation", label: "Participation", type: "select", opts: ["Low","Medium","High"] },
                { k: "final_score", label: "Final score", type: "number" },
              ].map((f) => (
                <label key={f.k} className="block text-xs">
                  <span className="text-muted-foreground">{f.label}</span>
                  {f.type === "select" ? (
                    <select value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                      className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm">
                      {f.opts!.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                      className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={addManual} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Add student
              </button>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="sample">
          <Section title="Institutional sample dataset" description="500 synthetic students sampled from the active term, with realistic distributions across classes and semesters.">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-4">
              <div>
                <div className="text-sm font-medium">SAMPLE_500.csv</div>
                <div className="text-xs text-muted-foreground">500 rows · 13 columns · seeded for reproducibility</div>
              </div>
              <button onClick={loadSample} disabled={sampleLoading} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {sampleLoading ? "Loading…" : students.length > 0 ? "Append sample" : "Load sample"}
              </button>
            </div>
            <div className="mt-3 flex flex-col items-end gap-2">
              <button
                onClick={removeMockData}
                className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/20"
              >
                <Trash2 className="h-4 w-4" /> Remove all the mock data
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete student data</DialogTitle>
                  <DialogDescription>
                    Choose which set of records to permanently delete. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={!!deleting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteBySource("manual")}
                    disabled={!!deleting}
                  >
                    {deleting === "manual" ? "Deleting…" : "Delete manual data"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteBySource("csv")}
                    disabled={!!deleting}
                  >
                    {deleting === "csv" ? "Deleting…" : "Delete CSV data"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        </TabsContent>
      </Tabs>

      <Section title="Column statistics">
        <DataTable
          rows={stats.map((s, i) => ({ ...s, id: String(i) }))}
          pageSize={20}
          columns={[
            { key: "col", label: "Column", className: "font-mono text-xs" },
            { key: "mean", label: "Mean", align: "right", render: (r) => <span className="font-mono">{r.mean}</span> },
            { key: "min", label: "Min", align: "right", render: (r) => <span className="font-mono">{r.min}</span> },
            { key: "max", label: "Max", align: "right", render: (r) => <span className="font-mono">{r.max}</span> },
            { key: "missing", label: "Missing", align: "right", render: (r) => r.missing > 0 ? <Pill tone="warning">{r.missing}</Pill> : <span className="text-muted-foreground">0</span> },
          ]}
        />
      </Section>

      <Section title="Data preview" description="First 50 records of the active dataset" actions={
        <button onClick={removeMockData} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
          <Trash2 className="h-3.5 w-3.5" /> Remove sample
        </button>
      }>
        <DataTable
          rows={students.slice(0, 50)}
          searchKeys={["name", "id", "class"]}
          pageSize={10}
          columns={[
            { key: "id", label: "ID", className: "font-mono text-xs" },
            { key: "name", label: "Name" },
            { key: "class", label: "Class" },
            { key: "semester", label: "Sem", align: "right" },
            { key: "attendance", label: "Att%", align: "right" },
            { key: "study_hours", label: "Study", align: "right" },
            { key: "previous_marks", label: "Prev", align: "right" },
            { key: "final_score", label: "Score", align: "right", render: (r) => <span className="font-mono font-semibold">{r.final_score}</span> },
            { key: "participation", label: "Part." },
          ]}
        />
      </Section>
    </div>
  );
}
