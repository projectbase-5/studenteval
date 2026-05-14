## Goals

1. "Remove all the mock data" must only remove the 500 seeded sample rows — never CSV-imported or manually entered students.
2. When the student list is empty, the **Manual entry** and **Sample dataset** tabs must respond to clicks.
3. CSV upload should actually surface what happens — today rows can silently fail to persist and the user has no feedback.

---

## 1. Tag rows by origin so we can selectively clear

Today `addStudents` accepts a `source` of `"manual" | "csv"`, and the sample-load button passes `"csv"` — so sample rows look identical to user-uploaded CSV rows. We will:

- Extend the `source` union to `"manual" | "csv" | "sample"` in `src/stores/workspace.tsx` (and the DB column already accepts free text).
- In `src/routes/data.upload.tsx`, change the sample-load handler to call `workspace.addStudents(SAMPLE_STUDENTS, "sample")`.
- Track `source` on the engineered student in memory (small extension to the `EngineeredStudent` type / `engineer()` pass-through) so the local state knows which rows are sample vs. user data.

## 2. Rewrite `clearAll` → `clearMockData`

- Rename `workspace.clearAll()` to `workspace.clearMockData()`.
- It will:
  - Filter local `state.students` to keep everything where `source !== "sample"`.
  - Delete only the sample rows from Supabase: `supabase.from("students").delete().eq("source", "sample")`.
- This requires a new RLS DELETE policy scoped to sample rows only, added via `supabase--migration`:
  ```sql
  CREATE POLICY "Public can delete sample students"
    ON public.students FOR DELETE
    TO public
    USING (source = 'sample');
  ```
  Manual / CSV rows remain undeletable from the client, preserving the earlier security fix.
- Update the button label/confirm copy in `data.upload.tsx` to "Remove sample data — your manual and CSV entries will be kept".
- Update the secondary "Reset" button in the Data preview section to use the same scoped clear (or remove it to avoid confusion).

## 3. Fix unresponsive tabs when student count is 0

Reproduce first, then patch. Likely cause: with `students = []`, the column-stats block computes `Math.min(...[])` = `Infinity` and `Math.max(...[])` = `-Infinity`, which the `DataTable` happily renders, but the empty `students.slice(0, 50)` table below may throw inside a render path that unmounts the Tabs subtree on the first click. Plan:

- Reproduce in the preview with an empty dataset and capture the console error.
- Guard the stats / preview blocks: when `students.length === 0`, render an empty-state card instead of computing stats or rendering `DataTable`. This keeps the Tabs component mounted and interactive.
- Verify all three tabs switch correctly with 0, 1, and 500 rows.

## 4. CSV upload — make persistence visible

`handleCsv` parses fine, but `addStudents` is fire-and-forget: a Supabase insert error silently rolls back the optimistic append and the user just sees "nothing happened". Plan:

- `await` the `addStudents` result inside `handleCsv` and `addManual`.
- On `{ inserted, error }`:
  - Success → show a sonner toast `Imported N students`.
  - Failure → show an inline error banner with the Supabase message (reuse the existing `csvError` UI).
- When the CSV file's first row is the headers but column names don't match (`name`, `class`, `attendance`, …), every numeric becomes `0` — we already silently coerce. Add a one-line detection: if **all** rows produce `final_score === 0` and `attendance === 0`, surface a "CSV columns don't match expected schema" warning so the user knows why their numbers are missing.
- Keep the optimistic append, but on failure leave the rolled-back state and the visible error banner so the discrepancy is obvious.

---

## Technical details

Files touched:
- `src/stores/workspace.tsx` — extend `source` union, propagate to engineered student, replace `clearAll` with `clearMockData`.
- `src/routes/data.upload.tsx` — pass `"sample"` for the sample loader, await results + toasts, empty-state guards, updated button copy.
- New migration adding the scoped `DELETE` policy on `public.students`.

Out of scope:
- Authentication / user-scoped ownership of rows (still public read+insert).
- Schema-mapping UI for arbitrary CSV column names — we only warn when the standard columns are missing.
- Deduplication of re-uploaded CSVs beyond the existing `student_code` check.
