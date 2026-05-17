import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  GraduationCap, LayoutDashboard, Upload, BarChart3,
  Gauge, Wand2, FileText, Moon, Sun, ChevronRight, FileSpreadsheet, Settings, Download,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useHydrateWorkspace } from "@/stores/workspace";
import { InstallPWAButton } from "@/components/InstallPWAButton";

const NAV: { label: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Data Pipeline",
    items: [
      { to: "/data/upload", label: "Data Collection", icon: Upload },
      { to: "/eda", label: "EDA", icon: BarChart3 },
    ],
  },
  {
    label: "Modeling",
    items: [
      { to: "/model/evaluate", label: "Evaluate", icon: Gauge },
      { to: "/predict", label: "Predict", icon: Wand2 },
      { to: "/predict/batch", label: "Batch Predict", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Administration",
    items: [{ to: "/admin/models", label: "Model Operations", icon: Settings }],
  },
  {
    label: "Output",
    items: [{ to: "/reports", label: "Reports", icon: FileText }],
  },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/data/upload": "Data Collection",
  "/data/clean": "Data Cleaning & Preprocessing",
  "/eda": "Exploratory Data Analysis",
  "/features": "Feature Engineering",
  "/model/train": "Model Training",
  "/model/evaluate": "Model Evaluation",
  "/predict": "Performance Prediction",
  "/predict/batch": "Batch Predictions",
  "/admin/models": "Model Operations",
  "/reports": "Reports & Insights",
};

function AppSidebar() {
  const loc = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-foreground">ScholarSense</div>
              <div className="text-[11px] text-muted-foreground">Academic Analytics</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = loc.pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            v1.0 · UCI + synthetic dataset
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function RouteProgress() {
  const loc = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(t);
  }, [loc.pathname]);
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-50 h-0.5 bg-primary transition-all duration-300 ${
        visible ? "w-full opacity-100" : "w-0 opacity-0"
      }`}
    />
  );
}

function Topbar() {
  const loc = useLocation();
  const title = TITLES[loc.pathname] ?? "ScholarSense";
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <nav className="ml-2 flex items-center gap-1.5 text-sm">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">ScholarSense</Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{title}</span>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs text-muted-foreground md:inline-flex">
          Role: <span className="ml-1 font-medium text-foreground">Faculty</span>
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function WorkspaceShell() {
  const loc = useLocation();
  useHydrateWorkspace();
  // Landing page renders without the sidebar shell.
  if (loc.pathname === "/") return <Outlet />;
  return (
    <SidebarProvider>
      <RouteProgress />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
