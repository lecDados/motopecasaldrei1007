import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, History } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { exportToCSV } from "@/lib/csv";
import { getGanhos, getHistoricoMensal, getHistoricoSemanal } from "@/lib/finance";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · MotoShop" }] }),
  component: RelatoriosPage,
});

type Row = { id: string; data_servico: string; valor_total: number; valor_produtos: number; valor_servico: number; tipo_servico: string | null; produtos: any };

function RelatoriosPage() {
  const [ganhos, setGanhos] = useState({ hoje: 0, semana: 0, mes: 0 });
  const [openHist, setOpenHist] = useState(false);

  useEffect(() => {
    setGanhos(getGanhos());
    const onChange = () => setGanhos(getGanhos());
    window.addEventListener("oficina:finance", onChange);
    return () => window.removeEventListener("oficina:finance", onChange);
  }, []);

  const { data: rows = [] } = useQuery({
    queryKey: ["historico-rel"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("historico_vendas").select("id, data_servico, valor_total, valor_produtos, valor_servico, tipo_servico, produtos").order("data_servico", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const totalServicos = rows.length;
  const faturamentoTotal = rows.reduce((s, r) => s + Number(r.valor_total), 0);
  const custoProdutos = rows.reduce((s, r) => s + Number(r.valor_produtos) * 0.6, 0);
  const lucro = faturamentoTotal - custoProdutos;

  const semanal = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    rows.forEach((r) => { if (map.has(r.data_servico)) map.set(r.data_servico, (map.get(r.data_servico) ?? 0) + Number(r.valor_total)); });
    return Array.from(map.entries()).map(([data, total]) => ({ data: data.slice(5), total }));
  }, [rows]);

  const mensal = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.data_servico.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + Number(r.valor_total));
    });
    return Array.from(map.entries()).sort().slice(-12).map(([mes, total]) => ({ mes, total }));
  }, [rows]);

  const anual = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.data_servico.slice(0, 4);
      map.set(k, (map.get(k) ?? 0) + Number(r.valor_total));
    });
    return Array.from(map.entries()).sort().map(([ano, total]) => ({ ano, total }));
  }, [rows]);

  const topProdutos = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => (r.produtos as any[]).forEach((p) => map.set(p.nomeProduto, (map.get(p.nomeProduto) ?? 0) + Number(p.quantidade))));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, qtd]) => ({ nome, qtd }));
  }, [rows]);

  const topServicos = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => { const k = r.tipo_servico || "Outros"; map.set(k, (map.get(k) ?? 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tipo, qtd]) => ({ tipo, qtd }));
  }, [rows]);

  function exportar() {
    exportToCSV("relatorio-financeiro.csv", [
      { Métrica: "Faturamento total", Valor: faturamentoTotal },
      { Métrica: "Total de serviços", Valor: totalServicos },
      { Métrica: "Lucro aproximado", Valor: lucro },
      { Métrica: "Ganho hoje", Valor: ganhos.hoje },
      { Métrica: "Ganho semana", Valor: ganhos.semana },
      { Métrica: "Ganho mês", Valor: ganhos.mes },
    ]);
  }

  return (
    <>
      <AppHeader
        title="Relatórios"
        subtitle="Análise financeira e operacional da oficina."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpenHist(true)} className="gap-2"><History className="h-4 w-4" /> Histórico</Button>
            <Button onClick={exportar} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Faturamento diário" value={formatBRL(ganhos.hoje)} />
        <Kpi label="Faturamento semanal" value={formatBRL(ganhos.semana)} />
        <Kpi label="Faturamento mensal" value={formatBRL(ganhos.mes)} />
        <Kpi label="Total de serviços" value={String(totalServicos)} />
        <Kpi label="Faturamento total" value={formatBRL(faturamentoTotal)} />
        <Kpi label="Lucro aproximado" value={formatBRL(lucro)} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Semanal">
          <ChartLine data={semanal} xKey="data" />
        </Panel>
        <Panel title="Mensal">
          <ChartBar data={mensal} xKey="mes" />
        </Panel>
        <Panel title="Anual">
          <ChartBar data={anual} xKey="ano" />
        </Panel>
        <Panel title="Top produtos vendidos">
          <ul className="space-y-2 text-sm">
            {topProdutos.map((p) => (
              <li key={p.nome} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                <span>{p.nome}</span><span className="font-medium">{p.qtd}</span>
              </li>
            ))}
            {topProdutos.length === 0 && <li className="text-muted-foreground">Sem dados.</li>}
          </ul>
        </Panel>
        <Panel title="Serviços mais realizados" className="lg:col-span-2">
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            {topServicos.map((s) => (
              <li key={s.tipo} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                <span>{s.tipo}</span><span className="font-medium">{s.qtd}</span>
              </li>
            ))}
            {topServicos.length === 0 && <li className="text-muted-foreground">Sem dados.</li>}
          </ul>
        </Panel>
      </div>

      <Dialog open={openHist} onOpenChange={setOpenHist}>
        <DialogContent className="bg-surface sm:max-w-md">
          <DialogHeader><DialogTitle>Histórico Financeiro</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Meses</div>
              <ul className="space-y-1">
                {getHistoricoMensal().length === 0 && <li className="text-muted-foreground">Nenhum mês fechado ainda.</li>}
                {getHistoricoMensal().map((b) => (
                  <li key={b.key} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                    <span>{b.label}</span><span className="font-medium text-primary">{formatBRL(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Semanas</div>
              <ul className="space-y-1">
                {getHistoricoSemanal().length === 0 && <li className="text-muted-foreground">Nenhuma semana fechada ainda.</li>}
                {getHistoricoSemanal().map((b) => (
                  <li key={b.key} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                    <span>{b.label}</span><span className="font-medium">{formatBRL(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="card-surface p-5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === "success" ? "text-success" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-surface p-5 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
function ChartBar({ data, xKey }: { data: any[]; xKey: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: any) => formatBRL(Number(v))} />
          <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function ChartLine({ data, xKey }: { data: any[]; xKey: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: any) => formatBRL(Number(v))} />
          <Line type="monotone" dataKey="total" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
