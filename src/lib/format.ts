export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(n: number | null | undefined): string {
  return BRL.format(Number(n ?? 0));
}

export function formatDateBR(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d.length <= 10 ? d + "T00:00:00" : d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function maskPlaca(v: string): string {
  const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + "-" + clean.slice(3);
}
