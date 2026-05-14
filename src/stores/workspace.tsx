import { useSyncExternalStore } from "react";
import { ENGINEERED_STUDENTS, type EngineeredStudent } from "@/data/students";

type Pipeline = {
  loaded: boolean;
  cleaned: boolean;
  engineered: boolean;
  trained: boolean;
  selectedModel: string;
};

type State = {
  students: EngineeredStudent[];
  pipeline: Pipeline;
};

type Listener = () => void;

const initial: State = {
  students: ENGINEERED_STUDENTS,
  pipeline: {
    loaded: true,
    cleaned: true,
    engineered: true,
    trained: false,
    selectedModel: "Random Forest",
  },
};

let state: State = initial;
const listeners = new Set<Listener>();

function emit() { listeners.forEach((l) => l()); }

export const workspace = {
  get: () => state,
  setStudents(students: EngineeredStudent[]) {
    state = { ...state, students };
    emit();
  },
  setPipeline(p: Partial<Pipeline>) {
    state = { ...state, pipeline: { ...state.pipeline, ...p } };
    emit();
  },
  reset() { state = initial; emit(); },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useWorkspace<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(workspace.subscribe, () => selector(workspace.get()), () => selector(initial));
}
