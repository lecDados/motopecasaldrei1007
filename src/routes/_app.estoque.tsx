import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import type { ProdutoRow } from "@/components/ProdutoFormModal";

export const Route = createFileRoute("/_app/estoque")({
  head: () => ({ meta: [{ title: "Estoque · MotoShop" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: async (): Promise<ProdutoRow[]> => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data as ProdutoRow[];
    },
  });

  const zerados = produtos.filter((p) => p.quantidade_estoque === 0);
  const baixo = produtos.filter((p) => p.quantidade_estoque > 0 && p.quantidade_estoque <= 5);
  const criticos = produtos.filter((p) => p.quantidade_estoque > 0 && p.quantidade_estoque <= 2);
  const normal = produtos.filter((p) => p.quantidade_estoque > 5);

  const chartData = useMemo(() => produtos.map((p) => ({
    nome: p.nome.length > 14 ? p.nome.slice(0, 14) + "…" : p.nome,
    Comprado: p.quantidade_comprada,
    Vendido: p.quantidade_vendida,
  })).slice(0, 12), [produtos]);

  function exportar() {
    exportToCSV("estoque.csv", produtos.map((p) => ({
      Produto: p.nome, Comprado: p.quantidade_comprada, Vendido: p.quantidade_vendida,
      Disponível: p.quantidade_estoque, Status: statusLabel(p.quantidade_estoque),
    })));
  }

  return (
    <>
      <AppHeader
        title="Controle de Estoque"
        subtitle="Acompanhe a entrada e saída dos produtos."
        action={<Button variant="secondary" onClick={exportar} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Críticos (≤ 2)" value={criticos.length} tone="danger" />
        <StatCard label="Sem estoque" value={zerados.length} tone="danger" />
        <StatCard label="Estoque baixo" value={baixo.length} tone="warning" />
        <StatCard label="Normal" value={normal.length} tone="success" />
      </div>

      <div className="mt-6 card-surface p-5">
        <h3 className="mb-4 text-sm font-semibold">Entrada × Saída</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="Comprado" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Vendido" fill="var(--success)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 card-surface overflow-hidden">
        <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Detalhamento</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-left">Comprado</th><th className="px-4 py-3 text-left">Vendido</th><th className="px-4 py-3 text-left">Disponível</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3">{p.quantidade_comprada}</td>
                  <td className="px-4 py-3">{p.quantidade_vendida}</td>
                  <td className="px-4 py-3">{p.quantidade_estoque}</td>
                  <td className="px-4 py-3"><StatusPill q={p.quantidade_estoque} /></td>
                </tr>
              ))}
              {produtos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function statusLabel(q: number) { return q === 0 ? "Sem estoque" : q <= 5 ? "Baixo" : "Normal"; }
function StatusPill({ q }: { q: number }) {
  const cls = q === 0 ? "bg-destructive/15 text-destructive" : q <= 5 ? "bg-warning/15 text-warning" : "bg-success/15 text-success";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{statusLabel(q)}</span>;
}
function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "success" }) {
  const map = { danger: "text-destructive", warning: "text-warning", success: "text-success" } as const;
  return (
    <div className="card-surface p-5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${map[tone]}`}>{value}</div>
    </div>
  );
}
