import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";

export type ProdutoRow = {
  id: string;
  nome: string;
  valor_compra: number;
  valor_venda: number;
  data_compra: string | null;
  quantidade_comprada: number;
  quantidade_vendida: number;
  quantidade_estoque: number;
  categoria: string | null;
  descricao: string | null;
};

export function ProdutoFormModal({
  open,
  onOpenChange,
  produto,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produto?: ProdutoRow | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    valor_compra: 0,
    valor_venda: 0,
    quantidade_comprada: 0,
    data_compra: todayISO(),
    descricao: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (produto) {
      setForm({
        nome: produto.nome,
        categoria: produto.categoria ?? "",
        valor_compra: Number(produto.valor_compra),
        valor_venda: Number(produto.valor_venda),
        quantidade_comprada: produto.quantidade_comprada,
        data_compra: produto.data_compra ?? todayISO(),
        descricao: produto.descricao ?? "",
      });
    } else {
      setForm({ nome: "", categoria: "", valor_compra: 0, valor_venda: 0, quantidade_comprada: 0, data_compra: todayISO(), descricao: "" });
    }
  }, [produto, open]);

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do produto.");
    setSaving(true);
    try {
      if (produto) {
        const { error } = await supabase
          .from("produtos")
          .update({
            nome: form.nome,
            categoria: form.categoria || null,
            valor_compra: form.valor_compra,
            valor_venda: form.valor_venda,
            quantidade_comprada: form.quantidade_comprada,
            data_compra: form.data_compra,
            descricao: form.descricao || null,
          })
          .eq("id", produto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert({
          nome: form.nome,
          categoria: form.categoria || null,
          valor_compra: form.valor_compra,
          valor_venda: form.valor_venda,
          quantidade_comprada: form.quantidade_comprada,
          quantidade_vendida: 0,
          quantidade_estoque: form.quantidade_comprada,
          data_compra: form.data_compra,
          descricao: form.descricao || null,
        });
        if (error) throw error;
      }
      toast.success("Produto salvo!");
      await qc.invalidateQueries();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></F>
          <F label="Categoria"><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Óleo, Filtro, Peça..." /></F>
          <F label="Valor de Compra"><Input type="number" step="0.01" value={form.valor_compra} onChange={(e) => setForm({ ...form, valor_compra: Number(e.target.value) })} /></F>
          <F label="Valor de Venda"><Input type="number" step="0.01" value={form.valor_venda} onChange={(e) => setForm({ ...form, valor_venda: Number(e.target.value) })} /></F>
          <F label="Quantidade Comprada"><Input type="number" value={form.quantidade_comprada} onChange={(e) => setForm({ ...form, quantidade_comprada: Number(e.target.value) })} /></F>
          <F label="Data de Compra"><Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} /></F>
          <div className="md:col-span-2">
            <F label="Descrição"><Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
