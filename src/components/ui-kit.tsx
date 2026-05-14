import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, description, actions }: {
  title: string; description?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, description, actions, children, className }: {
  title?: string; description?: string; actions?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({ icon: Icon, label, value, sub, tone = "neutral" }: {
  icon?: LucideIcon; label: string; value: React.ReactNode; sub?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const toneClass = {
    neutral: "text-muted-foreground bg-muted",
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-danger bg-danger/10",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn("rounded-md p-1.5", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Pill({ tone = "neutral", children }: {
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  children: React.ReactNode;
}) {
  const cls = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[oklch(0.40_0.10_70)] dark:text-warning",
    danger: "bg-danger/15 text-danger",
  }[tone];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
      {children}
    </span>
  );
}
