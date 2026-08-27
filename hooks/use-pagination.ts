"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Client-side pagination over an already-loaded array. This app loads a
 * client's whole workspace into memory up front (see lib/store.tsx), so
 * there's no server page to request — this just slices what's already
 * there and keeps the "page" state sane as filters change the list size.
 */
export function usePagination<T>(items: T[], initialPageSize: number = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Filters shrinking the list can leave `page` pointing past the end —
  // clamp for rendering without feeding a setState loop back into the effect.
  const clampedPage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  return {
    page: clampedPage,
    pageCount,
    pageSize,
    pageItems,
    total: items.length,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
