import type { LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: {
  icon: LucideIcon; label: string; value: string; sub?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/15 text-danger",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className={`rounded-lg p-2 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
