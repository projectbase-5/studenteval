# Implementation Plan

## 1. Netlify deployment & 404 on refresh

The app is built with TanStack Start (SSR-oriented). On Netlify it must be deployed as a static SPA so deep-link refreshes don't 404 and don't redirect to the lovable.app domain.

- Switch the app to client-only static output (prerender all routes) so Netlify can serve it.
- Add `public/_redirects` with `/* /index.html 200` so refresh on `/predict`, `/dashboard`, etc. resolves.
- Add `netlify.toml` with build command, publish dir, and the SPA fallback.
- Remove any hardcoded `lovable.app` URLs in meta tags (`__root.tsx` `og:image`, `og:url`, canonical) and replace with relative paths or a configurable site URL.

## 2. Remove all Lovable / "AI created" references

Sweep and replace:
- `src/routes/__root.tsx` meta (og:image points to lovable R2, descriptions etc.)
- `index.html` if it contains lovable script/badge meta
- Any "Built with Lovable", "AI generated", "Powered by AI" copy in landing/dashboard/footer.
- Update README and page titles to "ScholarSense" only.
- Hide the Edit-with-Lovable badge on published deployments.

## 3. Instant page transitions

The lag is the route component doing heavy synthetic-data generation on every mount.

- Memoize the 500-student dataset once at module load (already in `src/data/students.ts` — verify it's not regenerated per route).
- Move expensive chart computations (correlations, histograms) into `useMemo` keyed on the dataset, not recomputed each render.
- Add TanStack Router `defaultPreload="intent"` so hovering a sidebar link prefetches.
- Remove any artificial loading delays in route components.

## 4. Are charts dynamic?

Short answer: **the Recharts charts on Dashboard / EDA / Model Evaluate are dynamic** — they read from the in-memory student dataset and from `public/ml/artifacts.json`, recomputed via `src/lib/analytics.ts`. If you change the dataset (upload CSV, clean, feature-engineer), they update.

The PNGs in `public/ml/` (`correlation.png`, `confusion.png`, etc.) are static exports from the original Python pipeline and are no longer rendered in the UI after the redesign — safe to ignore or delete.

I'll add a small "Live data" badge on chart cards to make this obvious.

## 5. Predict page redesign

New layout:
- **Top bar**: search input (by name or student ID) + class filter dropdown (CSE-A, CSE-B, ECE-A, …) + "New manual entry" button.
- **Left column**: filtered student list (virtualized table). Selecting a row autofills the form.
- **Right column**: guided form with the seven inputs (study hrs/day, attendance, sleep hrs, previous marks, assignments completed, internet usage, participation level). Each field gets:
  - validation (zod) with inline error
  - tooltip explaining the field and realistic range
  - slider + numeric input pair
- **Predict button** at the bottom of the form.
- On click → show the **Uiverse walking-character loader** (HTML/CSS provided) for ~1.2s, then reveal:
  - Predicted final score (large KPI)
  - Pass/fail + risk pill
  - **AI suggestions** panel (rule-based, 3–5 contextual tips based on which inputs are weakest)
  - **Explainability panel** (see §7)

The loader will live in `src/components/WalkingLoader.tsx` with the exact SVG markup and CSS converted to a scoped stylesheet (or inline `<style>`).

## 6. Admin / Model Ops page (`/admin/models`)

New route with:
- **Retrain** button — runs the simulated training pipeline (same logic as `/model/train`) and appends a new entry to a `modelVersions` store (persisted in localStorage).
- **Versions table**: version id, timestamp, algorithm, R², MAE, accuracy, F1.
- **Compare view**: line chart of R² and accuracy across versions; bar chart comparing the two latest.
- "Promote to production" toggle that marks one version as active (used by `/predict`).

## 7. Explainability panel (per prediction)

Since we run in the browser with a linear/GBR coefficient export (`predictor.json`), real SHAP isn't feasible client-side. I'll implement a **SHAP-style approximation**:
- For linear models: contribution = coefficient × (value − feature_mean), normalized.
- For tree models: use precomputed global feature importances (already in `artifacts.json`) scaled by how far the input is from the dataset mean.
- Render as a horizontal diverging bar chart (positive = pushes score up, negative = down) with feature labels and signed values.

Component: `src/components/ExplainPanel.tsx`, used on `/predict` and on the batch results page.

## 8. Batch CSV predictions (`/predict/batch`)

- PapaParse upload (reuse the upload component from `/data/upload`).
- Validate columns match the seven required inputs; show a column-mapping UI if names differ.
- Run `predictGrade` over each row, attach predicted_score, risk_level, and top-3 explanations.
- Render results in a paginated table with sort/filter.
- "Download CSV" button (Blob + `URL.createObjectURL`).

## 9. File-level changes

```text
new:
  public/_redirects
  netlify.toml
  src/components/WalkingLoader.tsx
  src/components/ExplainPanel.tsx
  src/components/StudentPicker.tsx
  src/stores/modelVersions.ts
  src/routes/admin.models.tsx
  src/routes/predict.batch.tsx
  src/lib/explain.ts
  src/lib/predict-form-schema.ts

edited:
  src/routes/__root.tsx          (remove lovable URLs, add preload)
  src/routes/predict.tsx         (full redesign per §5)
  src/router.tsx                 (defaultPreload: 'intent')
  src/components/WorkspaceShell.tsx (add Admin + Batch nav items, remove any AI/Lovable copy)
  src/routes/index.tsx           (remove "AI-generated" copy)
  src/styles.css                 (loader keyframes if not inlined)
  vite.config.ts                 (prerender: true for static Netlify build)
  package.json                   (add zod if missing — already present via shadcn forms)

delete (optional cleanup):
  public/ml/*.png                (unused static exports)
  src/components/AppShell.tsx    (legacy, unused)
  src/components/StatCard.tsx    (legacy, unused)
```

## 10. Out of scope

- Real Python retraining from the browser (admin retrain is simulated, same as existing `/model/train`).
- Server-side model hosting (no backend in this project).
- True SHAP via a WASM library (approximation explained in §7).

---

After approval I'll implement in this order: deployment + rebrand → nav speed → Predict redesign + loader → Admin → Explainability → Batch CSV.
