import { Bell, Search, Settings2 } from "lucide-react";

export function AppHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const now = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <header className="mb-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar..."
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="text-xs text-muted-foreground first-letter:uppercase">{now}</div>
        <div className="flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground">
            <Settings2 className="h-4 w-4" />
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-sm font-semibold text-primary">
            OF
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
