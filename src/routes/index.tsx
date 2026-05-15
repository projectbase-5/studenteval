import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap, ArrowRight, Database, Sparkles, BarChart3, Layers,
  Cpu, Gauge, Wand2, FileText, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const STEPS = [
  { icon: Database, label: "Data Collection" },
  { icon: Sparkles, label: "Cleaning" },
  { icon: BarChart3, label: "EDA" },
  { icon: Layers, label: "Features" },
  { icon: Cpu, label: "Train Model" },
  { icon: Gauge, label: "Evaluate" },
  { icon: Wand2, label: "Predict" },
];

const FEATURES = [
  { title: "Trained on real academic data", body: "UCI Student Performance dataset combined with a 500-student institutional sample, covering attendance, study habits, and assessment outcomes." },
  { title: "Full ML workflow, not just charts", body: "Walk through every step a data scientist would: ingest, clean, explore, engineer features, train, evaluate, and serve predictions." },
  { title: "Built for faculty & admins", body: "Identify at-risk students before final exams, surface top performers for honors, and download per-class reports as PDF." },
  { title: "Explainable predictions", body: "See feature importance, confusion matrices, and per-student suggestions — not a black box." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">ScholarSense</div>
              <div className="text-[11px] text-muted-foreground">Academic Analytics</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
            <a href="#stats" className="hover:text-foreground">Outcomes</a>
          </nav>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Launch Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Spline 3D background */}
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-60">
          {/* @ts-expect-error - custom element */}
          <spline-viewer url="https://prod.spline.design/Dz6o7LVZzvTInuOJ/scene.splinecode" style={{ width: "100%", height: "100%" }} />
        </div>
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> v1.0 — Production
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Predict student academic performance using Machine Learning.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              ScholarSense is an end-to-end analytics platform that helps faculty identify at-risk students,
              understand performance drivers, and forecast final grades — all backed by transparent, reproducible ML.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Launch Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/predict" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent">
                Try a prediction
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                ["500", "Students analysed"],
                ["94%", "Model accuracy"],
                ["7", "Pipeline modules"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="font-mono text-2xl font-semibold tabular-nums">{v}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* mock screenshot */}
          <div className="relative">
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Total Students", v: "500" },
                  { l: "Avg Score", v: "78%" },
                  { l: "Pass Rate", v: "92%" },
                ].map((k) => (
                  <div key={k.l} className="rounded-md border border-border bg-background p-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.l}</div>
                    <div className="mt-1 font-mono text-lg font-semibold">{k.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-[11px] font-medium text-muted-foreground">FINAL SCORE DISTRIBUTION</div>
                <svg viewBox="0 0 200 80" className="w-full">
                  {[14,28,46,62,72,68,52,40,28,18].map((h, i) => (
                    <rect key={i} x={i*20+2} y={80-h} width={16} height={h} fill="var(--primary)" opacity={0.85} rx={1.5} />
                  ))}
                </svg>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-success/30 bg-success/5 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-success">Top performers</div>
                  <div className="mt-1 font-mono text-base font-semibold">42</div>
                </div>
                <div className="rounded-md border border-danger/30 bg-danger/5 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-danger">At-risk students</div>
                  <div className="mt-1 font-mono text-base font-semibold">38</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* workflow */}
      <section id="workflow" className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Workflow</div>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">A complete ML pipeline, not a single screen.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Each module is a dedicated workspace, mirroring how a data team would actually deliver this analysis.</p>
          </div>
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-7">
            {STEPS.map((s, i) => (
              <li key={s.label} className="rounded-md border border-border bg-card p-3 text-center">
                <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-muted-foreground">Step {i + 1}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <h3 className="text-base font-semibold">{f.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* stats */}
      <section id="stats" className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Designed to support real academic decisions.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Built around faculty, not dashboards. Every chart and prediction is traceable to the underlying data.</p>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { v: "R² 0.84", l: "Grade prediction (Gradient Boosting)" },
              { v: "F1 0.91", l: "Pass/fail classifier" },
              { v: "MAE 0.94", l: "On 0–20 grade scale" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-border bg-card p-5">
                <div className="font-mono text-2xl font-semibold">{k.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.l}</div>
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="mt-8 inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Launch Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        ScholarSense · Academic Analytics Platform · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
