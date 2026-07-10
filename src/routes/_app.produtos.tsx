import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, Pencil, Trash2, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import { exportToCSV } from "@/lib/csv";
import { ProdutoFormModal, type ProdutoRow } from "@/components/ProdutoFormModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/produtos")({
  head: () => ({ meta: [{ title: "Produtos · MotoShop" }] }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const [busca, setBusca] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editar, setEditar] = useState<ProdutoRow | null>(null);
  const [excluir, setExcluir] = useState<ProdutoRow | null>(null);
  const [sortKey, setSortKey] = useState<keyof ProdutoRow>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: async (): Promise<ProdutoRow[]> => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data as ProdutoRow[];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    let out = produtos.filter((p) =>
      !q || p.nome.toLowerCase().includes(q) || (p.categoria ?? "").toLowerCase().includes(q),
    );
    out = [...out].sort((a, b) => {
      const va = a[sortKey] as any, vb = b[sortKey] as any;
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return out;
  }, [produtos, busca, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / perPage));
  const pageData = filtrados.slice((page - 1) * perPage, page * perPage);

  function toggleSort(k: keyof ProdutoRow) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    const { error } = await supabase.from("produtos").delete().eq("id", excluir.id);
    if (error) toast.error(error.message); else toast.success("Produto excluído.");
    setExcluir(null);
  }

  function exportar() {
    exportToCSV("produtos.csv", produtos.map((p) => ({
      Nome: p.nome, Categoria: p.categoria, "Valor Compra": p.valor_compra, "Valor Venda": p.valor_venda,
      "Qtd Comprada": p.quantidade_comprada, "Qtd Vendida": p.quantidade_vendida, "Qtd Estoque": p.quantidade_estoque,
      "Data Compra": p.data_compra, Descrição: p.descricao,
    })));
  }

  return (
    <>
      <AppHeader
        title="Produtos"
        subtitle="Gerencie o catálogo de produtos da oficina."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportar} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
            <Button onClick={() => { setEditar(null); setOpenForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
          </div>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Buscar produto..." className="w-72 pl-9" />
          </div>
          <div className="text-sm text-muted-foreground">{filtrados.length} produto(s)</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <SortableTh label="Nome" k="nome" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Valor Compra" k="valor_compra" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Valor Venda" k="valor_venda" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Qtd Comprada" k="quantidade_comprada" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Qtd Vendida" k="quantidade_vendida" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Estoque" k="quantidade_estoque" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Data Compra" k="data_compra" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="Categoria" k="categoria" cur={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3">{formatBRL(p.valor_compra)}</td>
                  <td className="px-4 py-3">{formatBRL(p.valor_venda)}</td>
                  <td className="px-4 py-3">{p.quantidade_comprada}</td>
                  <td className="px-4 py-3">{p.quantidade_vendida}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.quantidade_estoque === 0 ? "bg-destructive/15 text-destructive" :
                      p.quantidade_estoque <= 5 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                    }`}>{p.quantidade_estoque}</span>
                  </td>
                  <td className="px-4 py-3">{formatDateBR(p.data_compra)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoria || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button title="Editar" onClick={() => { setEditar(p); setOpenForm(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button title="Excluir" onClick={() => setExcluir(p)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-3 text-sm">
          <div className="text-muted-foreground">Página {page} de {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próximo</Button>
          </div>
        </div>
      </div>

      <ProdutoFormModal open={openForm} onOpenChange={setOpenForm} produto={editar} />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá o produto do catálogo.</AlertDialogDescription>
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

function SortableTh({ label, k, cur, dir, onClick }: { label: string; k: keyof ProdutoRow; cur: keyof ProdutoRow; dir: "asc" | "desc"; onClick: (k: keyof ProdutoRow) => void }) {
  return (
    <th className="px-4 py-3 text-left font-medium">
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${cur === k ? "text-primary" : "text-muted-foreground/60"}`} />
        {cur === k && <span className="text-[10px]">{dir}</span>}
      </button>
    </th>
  );
}
