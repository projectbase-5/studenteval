import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  rows, columns, pageSize = 10, searchKeys, emptyMessage = "No data",
}: {
  rows: T[]; columns: Column<T>[]; pageSize?: number;
  searchKeys?: (keyof T)[]; emptyMessage?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    if (!q || !searchKeys) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s))
    );
  }, [rows, q, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return filtered;
    const get = col.sortValue ?? ((r: T) => r[col.key as keyof T] as number | string);
    return [...filtered].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const view = sorted.slice(cur * pageSize, (cur + 1) * pageSize);

  return (
    <div className="space-y-3">
      {searchKeys && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {columns.map((c) => {
                const sk = String(c.key);
                const active = sort?.key === sk;
                return (
                  <th
                    key={sk}
                    className={cn(
                      "select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                      c.sortValue || c.key ? "cursor-pointer hover:text-foreground" : "",
                    )}
                    onClick={() => setSort((s) => ({ key: sk, dir: s?.key === sk && s.dir === "asc" ? "desc" : "asc" }))}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {active && (sort!.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">{emptyMessage}</td></tr>
            )}
            {view.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                {columns.map((c) => (
                  <td key={String(c.key)} className={cn(
                    "px-3 py-2",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    c.className,
                  )}>
                    {c.render ? c.render(r) : (r[c.key as keyof T] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sorted.length} rows</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0}
              className="rounded border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted">Prev</button>
            <span className="px-2 font-medium text-foreground">{cur + 1}/{pages}</span>
            <button onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur === pages - 1}
              className="rounded border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
