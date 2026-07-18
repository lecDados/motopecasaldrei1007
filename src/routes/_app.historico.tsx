import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import { exportToCSV } from "@/lib/csv";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/historico")({
  head: () => ({ meta: [{ title: "Histórico · MotoShop" }] }),
  component: HistoricoPage,
});

type Row = {
  id: string; cliente: string; placa: string | null; marca_moto: string | null; cor_moto: string | null;
  tipo_servico: string | null; produtos: any; valor_total: number; valor_servico: number; valor_produtos: number;
  status: string; forma_pagamento: string | null; data_servico: string; quilometragem: number | null;
};

function HistoricoPage() {
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState(""); const [ate, setAte] = useState("");
  const [ver, setVer] = useState<Row | null>(null);
  const [excluir, setExcluir] = useState<Row | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["historico"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("historico_vendas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtrados = useMemo(() => rows.filter((r) => {
    const q = busca.toLowerCase();
    if (q && !(r.cliente.toLowerCase().includes(q) || r.placa?.toLowerCase().includes(q) || r.tipo_servico?.toLowerCase().includes(q))) return false;
    if (de && r.data_servico < de) return false;
    if (ate && r.data_servico > ate) return false;
    return true;
  }), [rows, busca, de, ate]);

  async function confirmarExcluir() {
    if (!excluir) return;
    const { error } = await supabase.from("historico_vendas").delete().eq("id", excluir.id);
    if (error) toast.error(error.message); else toast.success("Registro excluído.");
    setExcluir(null);
  }

  function exportar() {
    exportToCSV("historico-servicos.csv", filtrados.map((r) => ({
      Cliente: r.cliente, Moto: `${r.marca_moto || ""} ${r.cor_moto || ""}`.trim(), Placa: r.placa,
      Tipo: r.tipo_servico, Produtos: (r.produtos as any[]).map((p) => `${p.quantidade}x ${p.nomeProduto}`).join(" | "),
      Valor: r.valor_total, "Forma Pagamento": r.forma_pagamento, Status: r.status, Data: r.data_servico,
    })));
  }

  return (
    <>
      <AppHeader
        title="Histórico de Serviços"
        subtitle="Todos os serviços registrados na oficina."
        action={<Button variant="secondary" onClick={exportar} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>}
      />

      <div className="card-surface overflow-hidden">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, placa ou serviço..." className="pl-9" />
          </div>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Moto</th>
                <th className="px-4 py-3 text-left">Placa</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-4 py-3 font-medium">{r.cliente}</td>
                  <td className="px-4 py-3">{[r.marca_moto, r.cor_moto].filter(Boolean).join(" · ") || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.placa || "-"}</td>
                  <td className="px-4 py-3">{r.tipo_servico || "-"}</td>
                  <td className="px-4 py-3">{formatBRL(r.valor_total)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.forma_pagamento || "-"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${r.status.toLowerCase() === "pago" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{r.status}</span></td>
                  <td className="px-4 py-3">{formatDateBR(r.data_servico)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setVer(r)} title="Visualizar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => setExcluir(r)} title="Excluir" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum serviço encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!ver} onOpenChange={(v) => !v && setVer(null)}>
        <DialogContent className="bg-surface sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Serviço</DialogTitle></DialogHeader>
          {ver && (
            <div className="space-y-3 text-sm">
              <Info k="Cliente" v={ver.cliente} />
              <Info k="Moto" v={`${ver.marca_moto || "-"} · ${ver.cor_moto || "-"}`} />
              <Info k="Placa" v={ver.placa || "-"} />
              <Info k="Tipo" v={ver.tipo_servico || "-"} />
              <Info k="Quilometragem" v={ver.quilometragem != null ? `${ver.quilometragem} km` : "-"} />
              <Info k="Pagamento" v={`${ver.forma_pagamento || "-"} · ${ver.status}`} />
              <Info k="Data" v={formatDateBR(ver.data_servico)} />
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Produtos</div>
                <ul className="space-y-1">
                  {(ver.produtos as any[]).map((p, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-background/40 px-3 py-2">
                      <span>{p.quantidade}× {p.nomeProduto}</span><span>{formatBRL(p.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span><span className="text-primary">{formatBRL(ver.valor_total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
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
    </>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="text-foreground">{v}</span></div>;
}
