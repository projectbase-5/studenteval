import type { EngineeredStudent, Student } from "@/data/students";

export const PASS_THRESHOLD = 40;

export function summary(students: EngineeredStudent[]) {
  const n = students.length;
  if (!n) return null;
  const sum = (key: keyof Student) =>
    students.reduce((a, s) => a + (s[key] as number), 0);
  const avg_score = sum("final_score") / n;
  const avg_attendance = sum("attendance") / n;
  const pass = students.filter((s) => s.final_score >= PASS_THRESHOLD).length;
  const at_risk = students.filter((s) => s.risk_level === "High").length;
  const top = students.filter((s) => s.final_score >= 85).length;
  return {
    n,
    avg_score: +avg_score.toFixed(1),
    avg_attendance: +avg_attendance.toFixed(1),
    pass_rate: +((pass / n) * 100).toFixed(1),
    at_risk,
    top_performers: top,
  };
}

export function histogram(values: number[], bins: number, min?: number, max?: number) {
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const w = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    bucket: `${Math.round(lo + i * w)}-${Math.round(lo + (i + 1) * w)}`,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - lo) / w);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx].count++;
  }
  return out;
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2 || 1);
}

export const NUMERIC_KEYS: (keyof Student)[] = [
  "study_hours","attendance","sleep_hours","assignments_completed",
  "previous_marks","internet_usage","final_score",
];

export function correlationMatrix(students: Student[]) {
  const cols = NUMERIC_KEYS;
  const data: Record<string, number[]> = {};
  for (const k of cols) data[k as string] = students.map((s) => s[k] as number);
  return cols.map((a) => ({
    feature: a as string,
    values: cols.map((b) => +pearson(data[a as string], data[b as string]).toFixed(2)),
  }));
}

export function topN<T>(arr: T[], n: number, key: (t: T) => number, desc = true) {
  return [...arr].sort((a, b) => (desc ? key(b) - key(a) : key(a) - key(b))).slice(0, n);
}
