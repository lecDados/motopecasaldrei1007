// Controle financeiro em LocalStorage
// - ganhoHoje / ganhoSemana / ganhoMes
// - historicoSemanal (por semana ISO)
// - historicoMensal (por mês)

const KEYS = {
  hoje: "oficina.ganhoHoje",
  semana: "oficina.ganhoSemana",
  mes: "oficina.ganhoMes",
  histMensal: "oficina.historicoMensal",
  histSemanal: "oficina.historicoSemanal",
  lastDay: "oficina.lastDay",
  lastWeek: "oficina.lastWeek",
  lastMonth: "oficina.lastMonth",
};

type Bucket = { key: string; label: string; total: number };

function safeGet<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function set(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function rolloverIfNeeded() {
  if (typeof window === "undefined") return;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const week = isoWeek(now);
  const month = monthKey(now);

  const lastDay = safeGet<string>(KEYS.lastDay, today);
  const lastWeek = safeGet<string>(KEYS.lastWeek, week);
  const lastMonth = safeGet<string>(KEYS.lastMonth, month);

  if (lastDay !== today) {
    set(KEYS.hoje, 0);
    set(KEYS.lastDay, today);
  }
  if (lastWeek !== week) {
    const prevTotal = safeGet<number>(KEYS.semana, 0);
    const hist = safeGet<Bucket[]>(KEYS.histSemanal, []);
    hist.push({ key: lastWeek, label: `Semana ${lastWeek.split("-W")[1]}`, total: prevTotal });
    set(KEYS.histSemanal, hist);
    set(KEYS.semana, 0);
    set(KEYS.lastWeek, week);
  }
  if (lastMonth !== month) {
    const prevTotal = safeGet<number>(KEYS.mes, 0);
    const [y, m] = lastMonth.split("-");
    const label = `${MESES[Number(m) - 1]} ${y}`;
    const hist = safeGet<Bucket[]>(KEYS.histMensal, []);
    hist.push({ key: lastMonth, label, total: prevTotal });
    set(KEYS.histMensal, hist);
    set(KEYS.mes, 0);
    set(KEYS.lastMonth, month);
  }
}

export function registrarGanho(valor: number) {
  rolloverIfNeeded();
  set(KEYS.hoje, safeGet<number>(KEYS.hoje, 0) + valor);
  set(KEYS.semana, safeGet<number>(KEYS.semana, 0) + valor);
  set(KEYS.mes, safeGet<number>(KEYS.mes, 0) + valor);
  window.dispatchEvent(new Event("oficina:finance"));
}

export function getGanhos() {
  rolloverIfNeeded();
  return {
    hoje: safeGet<number>(KEYS.hoje, 0),
    semana: safeGet<number>(KEYS.semana, 0),
    mes: safeGet<number>(KEYS.mes, 0),
  };
}

export function getHistoricoMensal(): Bucket[] {
  return safeGet<Bucket[]>(KEYS.histMensal, []);
}
export function getHistoricoSemanal(): Bucket[] {
  return safeGet<Bucket[]>(KEYS.histSemanal, []);
}
