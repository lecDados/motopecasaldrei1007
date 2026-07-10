import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · MotoShop" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  function limparFinanceiro() {
    ["oficina.ganhoHoje", "oficina.ganhoSemana", "oficina.ganhoMes"].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("oficina:finance"));
    toast.success("Contadores financeiros zerados.");
  }
  function limparHistorico() {
    localStorage.removeItem("oficina.historicoMensal");
    localStorage.removeItem("oficina.historicoSemanal");
    toast.success("Histórico local apagado.");
  }

  return (
    <>
      <AppHeader title="Configurações" subtitle="Ajustes gerais do sistema." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold">Nome da Oficina</h3>
          <p className="mt-1 text-sm text-muted-foreground">Personalize o nome exibido no topo.</p>
          <input defaultValue="MotoShop" className="mt-4 w-full rounded-xl border border-border bg-background py-2.5 px-3 text-sm" />
        </div>
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold">Financeiro (LocalStorage)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Utilitários para reiniciar contadores.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={limparFinanceiro}>Zerar contadores</Button>
            <Button variant="destructive" onClick={limparHistorico}>Apagar histórico local</Button>
          </div>
        </div>
      </div>
    </>
  );
}
