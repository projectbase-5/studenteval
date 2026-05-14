import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { GraduationCap, BarChart3, Brain, Wand2, Home, Database } from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/eda", label: "EDA", icon: BarChart3 },
  { to: "/model", label: "Model", icon: Brain },
  { to: "/predict", label: "Predict", icon: Wand2 },
  { to: "/data", label: "Pipeline", icon: Database },
];

export function AppShell() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">ScholarSense</div>
              <div className="text-xs text-muted-foreground">Student Performance ML</div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-secondary"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built on UCI Student Performance dataset · scikit-learn pipeline · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
