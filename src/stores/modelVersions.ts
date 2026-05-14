// Persisted store of "trained" model versions (simulated retraining).
import { useSyncExternalStore } from "react";

export type ModelVersion = {
  id: string;
  version: string;
  algorithm: "Random Forest" | "Gradient Boosting" | "Linear Regression" | "Decision Tree";
  trainedAt: string; // ISO
  r2: number;
  mae: number;
  rmse: number;
  accuracy: number;
  f1: number;
  rows: number;
  active: boolean;
};

const KEY = "scholarsense.model_versions";

const seed = (): ModelVersion[] => [
  { id: "v1", version: "1.0.0", algorithm: "Linear Regression", trainedAt: "2025-09-04T10:12:00.000Z",
    r2: 0.7997, mae: 1.017, rmse: 1.760, accuracy: 0.851, f1: 0.893, rows: 1044, active: false },
  { id: "v2", version: "1.1.0", algorithm: "Random Forest", trainedAt: "2025-10-15T14:33:00.000Z",
    r2: 0.8249, mae: 0.940, rmse: 1.645, accuracy: 0.871, f1: 0.914, rows: 1044, active: false },
  { id: "v3", version: "1.2.0", algorithm: "Gradient Boosting", trainedAt: "2025-12-02T09:48:00.000Z",
    r2: 0.8372, mae: 0.904, rmse: 1.586, accuracy: 0.879, f1: 0.921, rows: 1044, active: true },
];

let cache: ModelVersion[] | null = null;
function read(): ModelVersion[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = seed(); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ModelVersion[]) : seed();
  } catch { cache = seed(); }
  return cache!;
}
function write(next: ModelVersion[]) {
  cache = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export function useModelVersions() {
  return useSyncExternalStore(subscribe, read, read);
}

export function addModelVersion(algorithm: ModelVersion["algorithm"]): ModelVersion {
  const list = read();
  const lastVersion = list[list.length - 1]?.version ?? "1.0.0";
  const [maj, min, patch] = lastVersion.split(".").map(Number);
  const nextVersion = `${maj}.${min}.${patch + 1}`;
  // Slight, plausible variation around best metrics.
  const baseR2 = algorithm === "Gradient Boosting" ? 0.837 : algorithm === "Random Forest" ? 0.825 : algorithm === "Linear Regression" ? 0.80 : 0.78;
  const noise = (s: number) => +(s + (Math.random() - 0.5) * 0.012).toFixed(4);
  const r2 = noise(baseR2);
  const mae = +(2.0 - r2 * 1.3).toFixed(3);
  const rmse = +(mae * 1.75).toFixed(3);
  const accuracy = +(0.84 + (r2 - 0.78) * 0.5 + Math.random() * 0.01).toFixed(4);
  const f1 = +(accuracy + 0.04).toFixed(4);
  const v: ModelVersion = {
    id: `v${list.length + 1}`,
    version: nextVersion,
    algorithm,
    trainedAt: new Date().toISOString(),
    r2, mae, rmse, accuracy, f1,
    rows: 1044, active: false,
  };
  write([...list, v]);
  return v;
}

export function setActive(id: string) {
  const list = read().map((v) => ({ ...v, active: v.id === id }));
  write(list);
}
