import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Activity, Camera, Brain, History, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: Activity },
  { to: "/detect", label: "Defect Detection", icon: Camera },
  { to: "/rca", label: "Root Cause AI", icon: Brain },
  { to: "/history", label: "History", icon: History },
];

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-foreground leading-tight">BebasQC</h1>
              <p className="text-xs text-muted-foreground leading-tight">AI Defect Detection + RCA</p>
            </div>
          </div>
          <nav className="flex gap-1 flex-wrap">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        BebasQC • IoT (Mosquitto) + Vision AI + Postgres + n8n + Grafana
      </footer>
    </div>
  );
}