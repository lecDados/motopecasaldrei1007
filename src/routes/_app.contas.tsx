import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet, History, Download, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getGanhos, debitarMes } from "@/lib/finance";
import { formatBRL, formatDateBR } from "@/lib/format";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contas")({
  head: () => ({ meta: [{ title: "Pagar Contas · Aldrei Moto Peças" }] }),
  component: ContasPage,
});

type Conta = { id: string; nome: string; valor: number };
type PagamentoHist = {
  id: string;
  data: string; // ISO
  mes: string; // YYYY-MM
  total: number;
  contas: { nome: string; valor: number }[];
};

const HIST_KEY = "oficina.contasPagas";

function getHistorico(): PagamentoHist[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
  } catch {
    return [];
  }
}
function setHistorico(h: PagamentoHist[]) {
  localStorage.setItem(HIST_KEY, JSON.stringify(h));
}

function ContasPage() {
  const [ganhoMes, setGanhoMes] = useState(0);
  const [contas, setContas] = useState<Conta[]>([
    { id: crypto.randomUUID(), nome: "", valor: 0 },
  ]);
  const [historico, setHistoricoState] = useState<PagamentoHist[]>([]);
  const [showHist, setShowHist] = useState(false);

  useEffect(() => {
    const refresh = () => setGanhoMes(getGanhos().mes);
    refresh();
    setHistoricoState(getHistorico());
    window.addEventListener("oficina:finance", refresh);
    return () => window.removeEventListener("oficina:finance", refresh);
  }, []);

  const totalContas = contas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const saldoApos = ganhoMes - totalContas;

  function addConta() {
    setContas((prev) => [...prev, { id: crypto.randomUUID(), nome: "", valor: 0 }]);
  }
  function removeConta(id: string) {
    setContas((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== id)));
  }
  function updateConta(id: string, patch: Partial<Conta>) {
    setContas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function pagar() {
    const validas = contas
      .map((c) => ({ nome: c.nome.trim(), valor: Number(c.valor) || 0 }))
      .filter((c) => c.nome && c.valor > 0);
    if (!validas.length) {
      toast.error("Adicione ao menos uma conta válida.");
      return;
    }
    const total = validas.reduce((s, c) => s + c.valor, 0);
    debitarMes(total);
    const now = new Date();
    const registro: PagamentoHist = {
      id: crypto.randomUUID(),
      data: now.toISOString(),
      mes: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      total,
      contas: validas,
    };
    const novoHist = [registro, ...getHistorico()];
    setHistorico(novoHist);
    setHistoricoState(novoHist);
    setContas([{ id: crypto.randomUUID(), nome: "", valor: 0 }]);
    toast.success(`Contas pagas: ${formatBRL(total)}`);
  }

  function exportarCSV() {
    const rows = historico.flatMap((h) =>
      h.contas.map((c) => ({
        data: formatDateBR(h.data),
        mes: h.mes,
        nome: c.nome,
        valor: c.valor.toFixed(2).replace(".", ","),
        total_pagamento: h.total.toFixed(2).replace(".", ","),
      })),
    );
    if (!rows.length) {
      toast.error("Sem histórico para exportar.");
      return;
    }
    exportToCSV("historico-contas.csv", rows, ["data", "mes", "nome", "valor", "total_pagamento"]);
  }

  // agrupar histórico por mês
  const porMes = historico.reduce<Record<string, PagamentoHist[]>>((acc, h) => {
    (acc[h.mes] = acc[h.mes] || []).push(h);
    return acc;
  }, {});

  return (
    <>
      <AppHeader
        title="Pagar Contas"
        subtitle="Registre e pague contas do mês, descontando do valor arrecadado."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowHist((v) => !v)}>
              <History className="mr-2 h-4 w-4" /> {showHist ? "Ocultar" : "Histórico"}
            </Button>
            <Button variant="secondary" onClick={exportarCSV}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Arrecadado no mês</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{formatBRL(ganhoMes)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total em contas</div>
          <div className="mt-2 text-2xl font-semibold text-orange-400">{formatBRL(totalContas)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Saldo após pagamento</div>
          <div
            className={`mt-2 text-2xl font-semibold ${
              saldoApos < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {formatBRL(saldoApos)}
          </div>
        </div>
      </div>

      <div className="card-surface mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Adicionar contas</h3>
          <Button variant="secondary" size="sm" onClick={addConta}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar mais conta
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {contas.map((c, i) => (
            <div key={c.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
              <input
                placeholder={`Nome da conta ${i + 1} (ex: Aluguel)`}
                value={c.nome}
                onChange={(e) => updateConta(c.id, { nome: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Valor (R$)"
                value={c.valor || ""}
                onChange={(e) => updateConta(c.id, { valor: parseFloat(e.target.value) || 0 })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
              <button
                onClick={() => removeConta(c.id)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground hover:text-red-400"
                aria-label="Remover conta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={pagar} disabled={totalContas <= 0}>
            <Wallet className="mr-2 h-4 w-4" /> Pagar {formatBRL(totalContas)}
          </Button>
        </div>
      </div>

      {showHist && (
        <div className="card-surface mt-6 p-5">
          <h3 className="mb-4 text-sm font-semibold">Histórico de contas pagas</h3>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta paga ainda.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(porMes)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([mes, items]) => {
                  const totalMes = items.reduce((s, i) => s + i.total, 0);
                  return (
                    <div key={mes}>
                      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                        <div className="text-sm font-medium text-foreground">{mes}</div>
                        <div className="text-sm text-muted-foreground">
                          Total: <span className="text-foreground">{formatBRL(totalMes)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {items.map((h) => (
                          <div
                            key={h.id}
                            className="rounded-xl border border-border bg-background/40 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDateBR(h.data)}</span>
                              <span>{formatBRL(h.total)}</span>
                            </div>
                            <ul className="flex flex-col gap-1 text-sm">
                              {h.contas.map((c, idx) => (
                                <li key={idx} className="flex justify-between">
                                  <span className="text-foreground">{c.nome}</span>
                                  <span className="text-muted-foreground">{formatBRL(c.valor)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
