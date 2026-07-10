import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Wrench,
  BarChart3,
  Settings,
  Bike,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/estoque", label: "Controle de Estoque", icon: Boxes },
  { to: "/historico", label: "Histórico de Serviços", icon: Wrench },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Bike className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Aldrei Moto Peças</div>
          <div className="text-xs text-muted-foreground">Gestão de Oficina</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {menu.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="text-xs text-muted-foreground">Versão</div>
        <div className="text-sm font-medium text-foreground">Aldrei Moto Peças 1.0</div>
      </div>
    </aside>
  );
}
