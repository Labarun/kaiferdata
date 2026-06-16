/**
 * DataPagination — compact, mobile-friendly pagination control.
 */
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminPagination } from "@/hooks/useAdminPagination";

const PAGE_SIZES = [30, 50, 100];

export function DataPagination({
  pagination,
  rowsOnPage,
  showPageSize = true,
}: {
  pagination: AdminPagination;
  rowsOnPage: number;
  showPageSize?: boolean;
}) {
  const { page, setPage, pageSize, setPageSize, total, totalPages } = pagination;
  if (total === 0) return null;

  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = page * pageSize + rowsOnPage;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
      <p className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{start.toLocaleString()}–{end.toLocaleString()}</span> of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
      </p>

      <div className="flex items-center gap-1.5">
        {showPageSize && (
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[11px] text-muted-foreground px-1 tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
