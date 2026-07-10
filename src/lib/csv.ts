export function exportToCSV(filename: string, rows: Record<string, unknown>[], headers?: string[]) {
  if (!rows.length) {
    const blob = new Blob(["\uFEFF"], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[";\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => escape((r as any)[c])).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
