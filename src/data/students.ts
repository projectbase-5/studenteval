// Synthetic but realistic student dataset (~500 records).
// Seeded RNG so values are stable across reloads.

export type Participation = "Low" | "Medium" | "High";
export type RiskLevel = "Low" | "Medium" | "High";
export type StudyCategory = "Low" | "Medium" | "High";

export type Student = {
  id: string;
  name: string;
  gender: "M" | "F";
  class: string; // e.g. "CSE-A"
  semester: number; // 1..8
  study_hours: number; // 0-12
  attendance: number; // 0-100
  sleep_hours: number; // 3-10
  assignments_completed: number; // 0-12
  previous_marks: number; // 0-100
  internet_usage: number; // 0-10 hours/day
  participation: Participation;
  final_score: number; // 0-100 (the "ground truth" we then perturb)
};

export type EngineeredStudent = Student & {
  performance_index: number;
  engagement_score: number;
  risk_level: RiskLevel;
  study_category: StudyCategory;
};

const FIRST_NAMES = [
  "Aarav","Aditi","Akhil","Ananya","Arjun","Aruna","Bhavya","Chetan","Deepika","Dhruv",
  "Esha","Faisal","Gaurav","Harini","Isha","Jayant","Kavya","Karthik","Lakshmi","Manish",
  "Meera","Nikhil","Neha","Omkar","Priya","Pranav","Rahul","Rhea","Rohan","Sanjay",
  "Sneha","Suresh","Tara","Tanvi","Uma","Varun","Vikram","Yash","Zara","Aditya",
  "Riya","Aryan","Naina","Kabir","Saanvi","Ishaan","Diya","Reyansh","Anaya","Vihaan",
];
const LAST_NAMES = [
  "Sharma","Verma","Gupta","Singh","Patel","Reddy","Nair","Iyer","Menon","Kumar",
  "Joshi","Rao","Chopra","Kapoor","Bose","Das","Mehta","Shah","Pillai","Bhatt",
];
const CLASSES = ["CSE-A","CSE-B","ECE-A","ECE-B","ME-A","IT-A","IT-B"];

// mulberry32 PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20251103);
const randn = () => {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const choice = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function makeStudent(i: number): Student {
  const first = choice(FIRST_NAMES);
  const last = choice(LAST_NAMES);
  const gender: "M" | "F" = rand() < 0.48 ? "M" : "F";
  const klass = choice(CLASSES);
  const semester = 1 + Math.floor(rand() * 8);

  const study_hours = clamp(2 + randn() * 1.8, 0, 12);
  const attendance = clamp(78 + randn() * 12, 35, 100);
  const sleep_hours = clamp(7 + randn() * 1.2, 3, 10);
  const assignments_completed = clamp(Math.round(8 + randn() * 2.5), 0, 12);
  const previous_marks = clamp(70 + randn() * 13, 25, 100);
  const internet_usage = clamp(3 + randn() * 1.8, 0, 10);
  const participation: Participation =
    rand() < 0.3 ? "Low" : rand() < 0.65 ? "Medium" : "High";
  const partBoost = participation === "High" ? 5 : participation === "Medium" ? 0 : -4;

  // True underlying score formula + noise.
  let score =
    0.30 * previous_marks +
    0.18 * attendance +
    2.4 * study_hours +
    1.2 * assignments_completed -
    1.1 * Math.max(0, internet_usage - 4) +
    0.7 * (sleep_hours - 6) +
    partBoost +
    randn() * 5;

  // Inject a few realistic outliers (top performers, dropouts).
  if (rand() < 0.04) score -= 25;
  if (rand() < 0.04) score += 12;

  const final_score = clamp(Math.round(score), 0, 100);

  return {
    id: `STU${String(i + 1).padStart(4, "0")}`,
    name: `${first} ${last}`,
    gender,
    class: klass,
    semester,
    study_hours: round1(study_hours),
    attendance: Math.round(attendance),
    sleep_hours: round1(sleep_hours),
    assignments_completed,
    previous_marks: Math.round(previous_marks),
    internet_usage: round1(internet_usage),
    participation,
    final_score,
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export const SAMPLE_STUDENTS: Student[] = Array.from({ length: 500 }, (_, i) => makeStudent(i));

// "Raw" version with deliberate dirtiness for the cleaning module.
export type DirtyValue = number | string | null;
export type DirtyStudent = Omit<
  Student,
  "attendance" | "sleep_hours" | "previous_marks" | "internet_usage"
> & {
  attendance: DirtyValue;
  sleep_hours: DirtyValue;
  previous_marks: DirtyValue;
  internet_usage: DirtyValue;
  duplicate_of?: string;
};

const WORD_NUMS: Record<string, number> = {
  ninety: 90, eighty: 80, seventy: 70, sixty: 60, fifty: 50,
};

export function makeDirtyDataset(clean: Student[]): DirtyStudent[] {
  const out: DirtyStudent[] = [];
  const seedRand = mulberry32(31337);
  for (const s of clean) {
    const d: DirtyStudent = { ...s };
    // ~6% missing per affected column
    if (seedRand() < 0.06) d.attendance = null;
    if (seedRand() < 0.05) d.sleep_hours = null;
    if (seedRand() < 0.04) d.previous_marks = null;
    if (seedRand() < 0.05) d.internet_usage = null;
    // 2% type-coercion errors (text where number expected)
    if (seedRand() < 0.02) {
      const word = ["ninety","eighty","seventy","sixty","fifty"][Math.floor(seedRand()*5)];
      d.attendance = word;
    }
    out.push(d);
  }
  // 1.5% duplicates
  const dupCount = Math.round(clean.length * 0.015);
  for (let i = 0; i < dupCount; i++) {
    const src = clean[Math.floor(seedRand() * clean.length)];
    out.push({ ...src, id: src.id + "-DUP", duplicate_of: src.id });
  }
  return out;
}

export const DIRTY_STUDENTS: DirtyStudent[] = makeDirtyDataset(SAMPLE_STUDENTS);

// ───── Feature engineering ──────────────────────────────────────
export function engineer(s: Student): EngineeredStudent {
  const performance_index = round1(s.study_hours * 0.4 * 10 + s.attendance * 0.6);
  const engagement_score = round1(
    (s.assignments_completed / 12) * 40 +
      (s.attendance / 100) * 35 +
      (s.participation === "High" ? 25 : s.participation === "Medium" ? 15 : 5)
  );
  const study_category: StudyCategory =
    s.study_hours < 2 ? "Low" : s.study_hours < 5 ? "Medium" : "High";
  const risk_level: RiskLevel =
    s.attendance < 70 || s.previous_marks < 50
      ? "High"
      : s.attendance < 85 || s.previous_marks < 70
        ? "Medium"
        : "Low";
  return { ...s, performance_index, engagement_score, study_category, risk_level };
}

export const ENGINEERED_STUDENTS: EngineeredStudent[] = SAMPLE_STUDENTS.map(engineer);
