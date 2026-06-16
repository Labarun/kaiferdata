/**
 * useAdminPagination — page state + Supabase `.range(from, to)` helpers.
 * Default 30 rows/page. The caller fetches with `{ count: "exact" }` and feeds
 * the total back via setTotal.
 */
import { useState, useMemo, useCallback } from "react";

export function useAdminPagination(defaultPageSize = 30) {
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const reset = useCallback(() => setPage(0), []);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(0);
  }, []);

  return useMemo(
    () => ({ page, setPage, pageSize, setPageSize: changePageSize, from, to, total, setTotal, totalPages, reset }),
    [page, pageSize, from, to, total, totalPages, reset, changePageSize],
  );
}

export type AdminPagination = ReturnType<typeof useAdminPagination>;
