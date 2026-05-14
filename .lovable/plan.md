## Scope
Four asks rolled into one plan: (1) persist new students to Supabase while keeping the 500 mock students as a baseline, (2) make page navigation feel instant, (3) auto-scroll to the score on Predict, (4) rebuild Batch Predict to operate on a class/batch using stored history and show pass/fail per student with the same animated flow.

---

## 1. Supabase students table (mock + persisted, merged everywhere)

**DB migration**
- New table `public.students` mirroring the `Student` shape: `id` (uuid PK), `student_code` (text, unique), `name`, `gender`, `class`, `semester`, `study_hours`, `attendance`, `sleep_hours`, `assignments_completed`, `previous_marks`, `internet_usage`, `participation`, `final_score`, `source` ('manual' | 'csv'), `created_at`.
- RLS enabled. Since the app currently has no auth, expose **public read + public insert** policies so the UI keeps working. We'll flag in chat that auth should be added before production.

**Workspace store rewrite (`src/stores/workspace.tsx`)**
- Initial students = `ENGINEERED_STUDENTS` (the 500 mock) immediately, so the UI never blocks.
- On mount (one-time bootstrap in `__root.tsx`): fetch all rows from `students` via Supabase client, engineer them, and append to mock — never replace. De-dup by `student_code`.
- `addStudents(newRows)` helper: optimistic local append + `supabase.from('students').insert(...)`.

**Data Collection page (`src/routes/data.upload.tsx`)**
- "Upload CSV" → parse → `addStudents(rows)` (append, do not overwrite).
- "Manual entry" → `addStudents([row])`.
- "Sample dataset" tab becomes "Reset to sample" (clear local additions + re-fetch from Supabase).
- Remove the current behavior of `workspace.setStudents(rows.map(engineer))` which wipes the 500.

**Reactive graphs/EDA**
- EDA, Dashboard, Reports, Features pages already read from `useWorkspace((s) => s.students)`, so they will auto-update once the store appends. Verify each page's `useMemo` deps include `students`.

---

## 2. Faster page transitions

Root cause: each page does heavy synchronous work (charts, correlation matrices over 500 rows) on mount, and the router waits before painting.

- In `src/router.tsx`: keep `defaultPreload: "intent"` but also add `defaultPreloadDelay: 0` and ensure all nav `<Link>`s benefit (already global).
- Wrap heavy chart sections in `React.lazy` + `<Suspense fallback={<Skeleton/>}>` so the page header + layout render instantly and charts stream in.
- Memoize the expensive derivations (`correlationMatrix`, `histogram`) with stable keys; on EDA page, compute once per `students` ref instead of per filter change.
- AppShell: add `preload="intent"` explicitly on each nav `<Link>` (defensive) and a top-of-page route-change indicator (tiny progress bar) for perceived speed.

---

## 3. Predict page — auto-scroll to score

In `src/routes/predict.tsx`:
- Add a `resultRef` on the `PredictResult` wrapper.
- After `setPhase("done")` (inside the `setTimeout` of `runPredict`), call `resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })` with a small offset (e.g. `window.scrollBy(0, -16)`) so the score sits comfortably at the top under the sticky header.
- Same thing right when `phase === "loading"` to bring the walking animation into view first, then re-scroll when result lands.

---

## 4. Batch Predict — class-level pass/fail predictions

Replace the current single-student CSV flow in `src/routes/predict.batch.tsx` with a batch picker:

**UI flow (mirrors Predict page)**
1. Header + "Select a batch" panel: class dropdown (CSE-A, CSE-B, …) + semester filter, showing student count.
2. Big "Predict batch outcomes" button → walking-loader animation (shared `WalkingLoader`) → results.
3. Auto-scroll to results section (same pattern as Predict).

**Prediction logic**
- For every student in the chosen batch (mock + Supabase combined), run the existing `predict()` formula on their stored attributes.
- Display:
  - KPI row: total students, predicted pass count, predicted fail count, pass rate %, avg predicted score.
  - Distribution bar (pass vs fail) + score histogram.
  - Sortable table: name · ID · prev marks · attendance · predicted score · **Pass/Fail pill** · risk pill.
  - "Download CSV" of the predictions.
- Remove the manual CSV-upload path (or keep as a secondary tab — recommend removing to stay aligned with the request).

---

## Technical details

- Files touched:
  - new: `supabase` migration for `students`
  - edit: `src/stores/workspace.tsx`, `src/routes/__root.tsx` (bootstrap fetch), `src/routes/data.upload.tsx`, `src/routes/predict.tsx`, `src/routes/predict.batch.tsx`, `src/router.tsx`, EDA/Dashboard pages (lazy charts), `src/components/AppShell.tsx`.
- Supabase client already wired (`src/integrations/supabase/client.ts`).
- No auth required for this iteration; plan calls out the security trade-off and suggests adding auth in a later step.

---

## Out of scope
- Authentication (will note as follow-up since RLS is currently public).
- Re-training the model with new data (predictions still use the existing closed-form formula).
- Server-side prediction via `createServerFn` (kept client-side since the formula is trivial and avoids a roundtrip).
