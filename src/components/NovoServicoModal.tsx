import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, maskPlaca, todayISO } from "@/lib/format";
import { registrarGanho } from "@/lib/finance";

type Produto = {
  id: string;
  nome: string;
  valor_venda: number;
  quantidade_estoque: number;
};

type LinhaProduto = {
  idProduto: string;
  nomeProduto: string;
  valorUnitario: number;
  quantidade: number;
  subtotal: number;
};

export function NovoServicoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: async (): Promise<Produto[]> => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, valor_venda, quantidade_estoque")
        .order("nome");
      if (error) throw error;
      return data as Produto[];
    },
    enabled: open,
  });

  const [cliente, setCliente] = useState("");
  const [marca, setMarca] = useState("");
  const [cor, setCor] = useState("");
  const [placa, setPlaca] = useState("");
  const [quilometragem, setQuilometragem] = useState<number | "">("");
  const [tipoServico, setTipoServico] = useState("");
  const [valorServico, setValorServico] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [status, setStatus] = useState("Pago");
  const [linhas, setLinhas] = useState<LinhaProduto[]>([]);
  const [produtoSel, setProdutoSel] = useState<string>("");
  const [qtd, setQtd] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const produtoAtual = produtos.find((p) => p.id === produtoSel);

  const valorProdutos = useMemo(() => linhas.reduce((s, l) => s + l.subtotal, 0), [linhas]);
  const valorTotal = valorProdutos + (Number(valorServico) || 0);

  function reset() {
    setCliente(""); setMarca(""); setCor(""); setPlaca(""); setQuilometragem(""); setTipoServico("");
    setValorServico(0); setFormaPagamento("Pix"); setStatus("Pago");
    setLinhas([]); setProdutoSel(""); setQtd(1);
  }

  function adicionarProduto() {
    if (!produtoAtual) return toast.error("Selecione um produto.");
    if (qtd <= 0) return toast.error("Quantidade inválida.");
    const jaAdicionado = linhas.find((l) => l.idProduto === produtoAtual.id)?.quantidade ?? 0;
    if (qtd + jaAdicionado > produtoAtual.quantidade_estoque) {
      return toast.error("Produto sem estoque suficiente.");
    }
    setLinhas((prev) => {
      const existente = prev.find((l) => l.idProduto === produtoAtual.id);
      if (existente) {
        return prev.map((l) =>
          l.idProduto === produtoAtual.id
            ? { ...l, quantidade: l.quantidade + qtd, subtotal: (l.quantidade + qtd) * l.valorUnitario }
            : l,
        );
      }
      return [
        ...prev,
        {
          idProduto: produtoAtual.id,
          nomeProduto: produtoAtual.nome,
          valorUnitario: Number(produtoAtual.valor_venda),
          quantidade: qtd,
          subtotal: qtd * Number(produtoAtual.valor_venda),
        },
      ];
    });
    setProdutoSel("");
    setQtd(1);
  }

  function removerLinha(id: string) {
    setLinhas((prev) => prev.filter((l) => l.idProduto !== id));
  }

  async function salvar() {
    if (!cliente.trim()) return toast.error("Informe o cliente.");
    setSaving(true);
    try {
      // Validar estoque
      for (const l of linhas) {
        const p = produtos.find((x) => x.id === l.idProduto);
        if (!p || p.quantidade_estoque < l.quantidade) {
          throw new Error(`Produto sem estoque suficiente: ${l.nomeProduto}`);
        }
      }

      const { error: insErr } = await supabase.from("historico_vendas").insert({
        cliente: cliente.trim(),
        placa: placa || null,
        marca_moto: marca || null,
        cor_moto: cor || null,
        tipo_servico: tipoServico || null,
        quilometragem: quilometragem === "" ? null : Number(quilometragem),
        produtos: linhas as any,
        valor_produtos: valorProdutos,
        valor_servico: Number(valorServico) || 0,
        valor_total: valorTotal,
        forma_pagamento: formaPagamento,
        status,
        data_servico: todayISO(),
      });
      if (insErr) throw insErr;

      // Atualizar estoque de cada produto
      for (const l of linhas) {
        const p = produtos.find((x) => x.id === l.idProduto)!;
        const { error } = await supabase
          .from("produtos")
          .update({
            quantidade_estoque: p.quantidade_estoque - l.quantidade,
            quantidade_vendida: undefined as never,
          })
          .eq("id", l.idProduto);
        if (error) throw error;
        // increment quantidade_vendida via RPC-less approach: fetch current then update
        const { data: cur } = await supabase.from("produtos").select("quantidade_vendida").eq("id", l.idProduto).single();
        await supabase
          .from("produtos")
          .update({
            quantidade_vendida: (Number(cur?.quantidade_vendida) || 0) + l.quantidade,
            data_venda: todayISO(),
          })
          .eq("id", l.idProduto);
      }

      if (status === "Pago") registrarGanho(valorTotal);

      toast.success("Serviço salvo com sucesso!");
      await qc.invalidateQueries();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
          <DialogDescription>Registre um serviço realizado na oficina.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cliente"><Input value={cliente} onChange={(e) => setCliente(e.target.value)} /></Field>
          <Field label="Placa"><Input value={placa} onChange={(e) => setPlaca(maskPlaca(e.target.value))} placeholder="ABC-1234" /></Field>
          <Field label="Marca da Moto"><Input value={marca} onChange={(e) => setMarca(e.target.value)} /></Field>
          <Field label="Cor"><Input value={cor} onChange={(e) => setCor(e.target.value)} /></Field>
          <Field label="Quilometragem (km)"><Input type="number" min={0} value={quilometragem} onChange={(e) => setQuilometragem(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Ex: 25000" /></Field>
          <Field label="Tipo de Serviço"><Input value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} placeholder="Troca de óleo, revisão..." /></Field>
          <Field label="Valor do Serviço (R$)"><Input type="number" min={0} step="0.01" value={valorServico} onChange={(e) => setValorServico(Number(e.target.value))} /></Field>
          <Field label="Forma de Pagamento">
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Pix", "Dinheiro", "Cartão de Débito", "Cartão de Crédito", "Boleto"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-2 rounded-xl border border-border bg-background/40 p-4">
          <div className="mb-3 text-sm font-medium">Produtos utilizados</div>
          <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
            <Select value={produtoSel} onValueChange={setProdutoSel}>
              <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} — {formatBRL(p.valor_venda)} · estoque {p.quantidade_estoque}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
            <Button type="button" onClick={adicionarProduto} variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          {linhas.length > 0 && (
            <ul className="mt-4 space-y-2">
              {linhas.map((l) => (
                <li key={l.idProduto} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{l.nomeProduto}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.quantidade} × {formatBRL(l.valorUnitario)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatBRL(l.subtotal)}</span>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => removerLinha(l.idProduto)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4 text-sm">
          <Row label="Total dos produtos" value={formatBRL(valorProdutos)} />
          <Row label="Valor do serviço" value={formatBRL(Number(valorServico) || 0)} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Valor final</span>
            <span className="text-primary">{formatBRL(valorTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar Serviço"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
