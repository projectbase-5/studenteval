// Helpers for displaying student rows in tables / cards.
// Nothing fancy — just things I kept rewriting in different pages.

import type { Student } from "@/data/students";

export function fullClass(s: Pick<Student, "class" | "semester">): string {
  // e.g. "CSE-A · Sem 4"
  return `${s.class} · Sem ${s.semester}`;
}

export function shortName(name: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  // First + initial of last (keeps table rows tight on mobile)
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// pretty score string (handles nulls)
export function fmtScore(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1);
}

// old implementation kept for fallback — used by the CSV export modal
export function rowToCsv(s: Student): string {
  return [
    s.id, s.name, s.gender, s.class, s.semester,
    s.study_hours, s.attendance, s.sleep_hours,
    s.assignments_completed, s.previous_marks,
    s.internet_usage, s.participation, s.final_score,
  ].join(",");
}
