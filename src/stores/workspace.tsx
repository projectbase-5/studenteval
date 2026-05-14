import { useSyncExternalStore, useEffect } from "react";
import { engineer, type EngineeredStudent, type Student } from "@/data/students";
import { supabase } from "@/integrations/supabase/client";

export type RowSource = "manual" | "csv" | "sample";
export type StoredStudent = EngineeredStudent & { source?: RowSource };

type Pipeline = {
  loaded: boolean;
  cleaned: boolean;
  engineered: boolean;
  trained: boolean;
  selectedModel: string;
};

type State = {
  students: StoredStudent[];
  pipeline: Pipeline;
  hydrated: boolean;
};

type Listener = () => void;

const initial: State = {
  students: [],
  pipeline: {
    loaded: true,
    cleaned: true,
    engineered: true,
    trained: false,
    selectedModel: "Random Forest",
  },
  hydrated: false,
};

let state: State = initial;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }

function rowToStudent(r: any): Student {
  return {
    id: r.student_code,
    name: r.name,
    gender: (r.gender === "F" ? "F" : "M"),
    class: r.class,
    semester: Number(r.semester),
    study_hours: Number(r.study_hours),
    attendance: Number(r.attendance),
    sleep_hours: Number(r.sleep_hours),
    assignments_completed: Number(r.assignments_completed),
    previous_marks: Number(r.previous_marks),
    internet_usage: Number(r.internet_usage),
    participation: (["Low","Medium","High"].includes(r.participation) ? r.participation : "Medium") as Student["participation"],
    final_score: Number(r.final_score),
  };
}

function studentToRow(s: Student, source: RowSource) {
  return {
    student_code: s.id,
    name: s.name,
    gender: s.gender,
    class: s.class,
    semester: s.semester,
    study_hours: s.study_hours,
    attendance: s.attendance,
    sleep_hours: s.sleep_hours,
    assignments_completed: s.assignments_completed,
    previous_marks: s.previous_marks,
    internet_usage: s.internet_usage,
    participation: s.participation,
    final_score: s.final_score,
    source,
  };
}

export const workspace = {
  get: () => state,
  setPipeline(p: Partial<Pipeline>) {
    state = { ...state, pipeline: { ...state.pipeline, ...p } };
    emit();
  },
  setStudents(students: StoredStudent[]) {
    state = { ...state, students };
    emit();
  },
  /** Append new students locally + persist to Supabase. */
  async addStudents(rows: Student[], source: RowSource = "manual") {
    const existingCodes = new Set(state.students.map((s) => s.id));
    const fresh = rows.filter((r) => !existingCodes.has(r.id));
    if (!fresh.length) return { inserted: 0, error: null as string | null };
    // Optimistic local append
    const engineered: StoredStudent[] = fresh.map((s) => ({ ...engineer(s), source }));
    state = { ...state, students: [...engineered, ...state.students] };
    emit();
    try {
      const { error } = await supabase
        .from("students")
        .insert(fresh.map((s) => studentToRow(s, source)));
      if (error) {
        console.error("Supabase insert failed:", error);
        // Roll back local additions on failure
        const codes = new Set(fresh.map((s) => s.id));
        state = { ...state, students: state.students.filter((s) => !codes.has(s.id)) };
        emit();
        return { inserted: 0, error: error.message };
      }
      return { inserted: fresh.length, error: null };
    } catch (e: any) {
      console.error(e);
      return { inserted: 0, error: e?.message ?? "Insert failed" };
    }
  },
  /** Remove only the seeded sample rows. Manual + CSV entries are preserved. */
  async clearMockData() {
    return workspace.deleteBySource("sample");
  },
  /** Delete all rows of a given source from local state + DB. */
  async deleteBySource(source: RowSource) {
    state = { ...state, students: state.students.filter((s) => s.source !== source) };
    emit();
    try {
      const { error } = await supabase.from("students").delete().eq("source", source);
      if (error) {
        console.error(`Failed to delete ${source} rows from DB:`, error);
        return { error: error.message };
      }
      return { error: null };
    } catch (e: any) {
      console.error(e);
      return { error: e?.message ?? "Delete failed" };
    }
  },
  async hydrate(force = false) {
    if (state.hydrated && !force) return;
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows: StoredStudent[] = (data ?? []).map((r: any) => ({
        ...engineer(rowToStudent(r)),
        source: (["manual", "csv", "sample"].includes(r.source) ? r.source : "manual") as RowSource,
      }));
      state = { ...state, students: rows, hydrated: true };
      emit();
    } catch (e) {
      console.error("Failed to hydrate students from Supabase:", e);
      state = { ...state, hydrated: true };
      emit();
    }
  },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useWorkspace<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(workspace.subscribe, () => selector(workspace.get()), () => selector(initial));
}

export function useHydrateWorkspace() {
  useEffect(() => { workspace.hydrate(); }, []);
}
