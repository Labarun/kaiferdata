/**
 * ResponsiveTable — one column definition renders as a real table on `md+`
 * and as stacked cards on mobile. Kills horizontal overflow on the admin side.
 *
 * Each column declares where it appears on the mobile card via `mobile`:
 *   title    → big heading      subtitle → muted line under title
 *   trailing → right side       row      → label/value line in the card body
 *   hide     → desktop only
 */
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  mobile?: "title" | "subtitle" | "trailing" | "row" | "hide";
  thClass?: string;
  tdClass?: string;
}

interface Props<T> {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  keyFn: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  actions?: (row: T) => ReactNode;
}

const alignClass = (a?: string) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function ResponsiveTable<T>({
  rows,
  columns,
  keyFn,
  loading,
  emptyText = "Nothing here yet.",
  onRowClick,
  selectedIds,
  onToggle,
  onToggleAll,
  actions,
}: Props<T>) {
  const selectable = !!onToggle && !!selectedIds;

  if (loading) {
    return (
      <div className="flex justify-center py-14 glass-card rounded-2xl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-center py-14 text-sm text-muted-foreground glass-card rounded-2xl">{emptyText}</div>
    );
  }

  const title = columns.find((c) => c.mobile === "title");
  const subtitle = columns.find((c) => c.mobile === "subtitle");
  const trailing = columns.find((c) => c.mobile === "trailing");
  const rowCols = columns.filter((c) => c.mobile === "row");

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden md:block glass-card rounded-2xl overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-background/40">
                {selectable && (
                  <th className="px-3 py-2.5 w-[40px]">
                    <Checkbox
                      checked={rows.length > 0 && rows.every((r) => selectedIds!.has(keyFn(r)))}
                      onCheckedChange={onToggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                      alignClass(c.align),
                      c.thClass,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
                {actions && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = keyFn(row);
                return (
                  <tr
                    key={id}
                    className={cn(
                      "border-b border-border/20 last:border-0 transition-colors",
                      onRowClick ? "hover:bg-primary/[0.04] cursor-pointer" : "hover:bg-primary/[0.02]",
                      selectedIds?.has(id) && "bg-primary/5",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds!.has(id)} onCheckedChange={() => onToggle!(id)} />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2.5 align-middle", alignClass(c.align), c.tdClass)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-2.5">
        {rows.map((row) => {
          const id = keyFn(row);
          return (
            <div
              key={id}
              className={cn(
                "glass-card rounded-2xl p-3.5 transition-all duration-200 active:scale-[0.99]",
                onRowClick && "cursor-pointer",
                selectedIds?.has(id) && "ring-1 ring-primary/40 bg-primary/5",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <div className="flex items-start gap-2.5">
                {selectable && (
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox checked={selectedIds!.has(id)} onCheckedChange={() => onToggle!(id)} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {title && <div className="text-[14px] font-semibold text-foreground truncate">{title.cell(row)}</div>}
                  {subtitle && <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">{subtitle.cell(row)}</div>}
                </div>
                {trailing && <div className="text-right shrink-0">{trailing.cell(row)}</div>}
              </div>

              {rowCols.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-border/40 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {rowCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground/60 font-semibold">{c.header}</p>
                      <div className="text-[12px] text-foreground truncate">{c.cell(row)}</div>
                    </div>
                  ))}
                </div>
              )}

              {actions && (
                <div className="mt-2.5 pt-2.5 border-t border-border/40 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
