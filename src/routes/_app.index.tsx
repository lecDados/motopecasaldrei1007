import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowUpRight, Wallet, Boxes, ShoppingCart, TriangleAlert, TrendingUp, Wrench, Trash2, Pencil, Eye, CircleDollarSign, Clock } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import { getGanhos } from "@/lib/finance";
import { NovoServicoModal } from "@/components/NovoServicoModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Home · MotoShop" }] }),
  component: Home,
});

type ServicoRow = {
  id: string;
  cliente: string;
  placa: string | null;
  marca_moto: string | null;
  cor_moto: string | null;
  tipo_servico: string | null;
  produtos: any;
  valor_total: number;
  valor_servico: number;
  valor_produtos: number;
  status: string;
  forma_pagamento: string | null;
  data_servico: string;
};

function Home() {
  const [novoAberto, setNovoAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ganhos, setGanhos] = useState({ hoje: 0, semana: 0, mes: 0 });
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [visualizar, setVisualizar] = useState<ServicoRow | null>(null);

  useEffect(() => {
    setGanhos(getGanhos());
    const onChange = () => setGanhos(getGanhos());
    window.addEventListener("oficina:finance", onChange);
    return () => window.removeEventListener("oficina:finance", onChange);
  }, []);

  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos"],
    queryFn: async (): Promise<ServicoRow[]> => {
      const { data, error } = await supabase.from("historico_vendas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServicoRow[];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, quantidade_estoque, quantidade_vendida");
      if (error) throw error;
      return data as { id: string; nome: string; quantidade_estoque: number; quantidade_vendida: number }[];
    },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const servicosHoje = servicos.filter((s) => s.data_servico === hoje);

  const kpis = {
    servicosHoje: servicosHoje.length,
    vendidoHoje: servicosHoje.reduce((s, x) => s + Number(x.valor_total), 0),
    ganhoSemana: ganhos.semana,
    ganhoMes: ganhos.mes,
    produtosEmEstoque: produtos.reduce((s, p) => s + p.quantidade_estoque, 0),
    estoqueBaixo: produtos.filter((p) => p.quantidade_estoque > 0 && p.quantidade_estoque <= 5).length,
  };

  // Vendas 30 dias
  const grafico30 = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    servicos.forEach((s) => {
      if (map.has(s.data_servico)) map.set(s.data_servico, (map.get(s.data_servico) ?? 0) + Number(s.valor_total));
    });
    return Array.from(map.entries()).map(([data, total]) => ({ data: data.slice(5), total }));
  }, [servicos]);

  const servicosPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    servicos.forEach((s) => {
      const k = s.tipo_servico?.trim() || "Outros";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [servicos]);

  const topProdutos = useMemo(() => {
    return [...produtos]
      .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
      .slice(0, 5)
      .map((p) => ({ name: p.nome, value: p.quantidade_vendida }));
  }, [produtos]);

  const ultimosFiltrados = servicos.filter((s) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      s.cliente.toLowerCase().includes(q) ||
      s.placa?.toLowerCase().includes(q) ||
      s.tipo_servico?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const queryClient = useQueryClient();

  async function confirmarExcluir() {
    if (!excluirId) return;
    const { error } = await supabase.from("historico_vendas").delete().eq("id", excluirId);
    if (error) toast.error(error.message);
    else {
      toast.success("Serviço excluído.");
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
    }
    setExcluirId(null);
  }

  async function alternarStatus(s: ServicoRow) {
    const novo = s.status?.toLowerCase() === "pago" ? "Pendente" : "Pago";
    const { error } = await supabase.from("historico_vendas").update({ status: novo }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Status alterado para ${novo}.`);
    queryClient.invalidateQueries({ queryKey: ["servicos"] });
    window.dispatchEvent(new Event("oficina:finance"));
  }

  return (
    <>
      <AppHeader
        title="Olá, bem-vindo"
        subtitle="Este é o que está acontecendo na sua oficina hoje."
        action={
          <Button size="lg" className="gap-2" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" /> Iniciar Serviço
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={<Wrench />} label="Serviços realizados hoje" value={String(kpis.servicosHoje)} tone="info" />
        <KpiCard icon={<Wallet />} label="Valor vendido hoje" value={formatBRL(kpis.vendidoHoje)} tone="success" />
        <KpiCard icon={<TrendingUp />} label="Ganho semanal" value={formatBRL(kpis.ganhoSemana)} tone="warning" />
        <KpiCard icon={<TrendingUp />} label="Ganho mensal" value={formatBRL(kpis.ganhoMes)} tone="info" />
        <KpiCard icon={<Boxes />} label="Produtos em estoque" value={String(kpis.produtosEmEstoque)} tone="success" />
        <KpiCard icon={<TriangleAlert />} label="Produtos com estoque baixo" value={String(kpis.estoqueBaixo)} tone="danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Vendas nos últimos 30 dias" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico30}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: any) => formatBRL(Number(v))} />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Serviços por tipo" className="text-white">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={servicosPorTipo} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {servicosPorTipo.map((_, i) => (
                    <Cell key={i} fill={["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Produtos mais vendidos" className="lg:col-span-3">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProdutos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="var(--success)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-lg font-semibold">Últimos serviços</h3>
            <p className="text-sm text-muted-foreground">Pesquisa instantânea por cliente, placa ou tipo.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
            <Link to="/historico" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <Th>Cliente</Th><Th>Placa</Th><Th>Valor</Th><Th>Status</Th><Th>Data</Th><Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {ultimosFiltrados.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-background/40">
                  <Td>{s.cliente}</Td>
                  <Td className="font-mono text-xs">{s.placa || "-"}</Td>
                  <Td>{formatBRL(s.valor_total)}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td>{formatDateBR(s.data_servico)}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">
                      <IconBtn onClick={() => setVisualizar(s)} title="Visualizar"><Eye className="h-4 w-4" /></IconBtn>
                      <IconBtn onClick={() => alternarStatus(s)} title={s.status?.toLowerCase() === "pago" ? "Marcar como pendente" : "Marcar como pago"}>
                        {s.status?.toLowerCase() === "pago" ? <Clock className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4 text-success" />}
                      </IconBtn>
                      <Link to="/historico" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" title="Editar"><Pencil className="h-4 w-4" /></Link>
                      <IconBtn onClick={() => setExcluirId(s.id)} title="Excluir"><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </Td>
                </tr>
              ))}
              {ultimosFiltrados.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum serviço registrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NovoServicoModal open={novoAberto} onOpenChange={setNovoAberto} />

      <AlertDialog open={!!excluirId} onOpenChange={(v) => !v && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!visualizar} onOpenChange={(v) => !v && setVisualizar(null)}>
        <DialogContent className="bg-surface sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Serviço</DialogTitle></DialogHeader>
          {visualizar && (
            <div className="space-y-3 text-sm">
              <Info k="Cliente" v={visualizar.cliente} />
              <Info k="Moto" v={`${visualizar.marca_moto || "-"} · ${visualizar.cor_moto || "-"}`} />
              <Info k="Placa" v={visualizar.placa || "-"} />
              <Info k="Tipo" v={visualizar.tipo_servico || "-"} />
              <Info k="Pagamento" v={`${visualizar.forma_pagamento || "-"} · ${visualizar.status}`} />
              <Info k="Data" v={formatDateBR(visualizar.data_servico)} />
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Produtos</div>
                <ul className="space-y-1">
                  {(visualizar.produtos as any[]).map((p, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                      <span>{p.quantidade}× {p.nomeProduto}</span>
                      <span>{formatBRL(p.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span><span className="text-primary">{formatBRL(visualizar.valor_total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "info" | "success" | "warning" | "danger" }) {
  const toneMap = {
    info: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
  } as const;
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneMap[tone]}`}>{icon}</div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-6 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-surface p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === "pago" ? "bg-success/15 text-success" : "bg-warning/15 text-warning";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button title={title} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="text-foreground">{v}</span></div>;
}
