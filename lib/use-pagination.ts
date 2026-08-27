"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination over an array that's already fully loaded in the
 * browser (which is how every list in this app works today — the whole
 * workspace is fetched as one JSON blob). This doesn't reduce the network
 * payload the way a real `?page=`/`?cursor=` API would, but it's what
 * actually matters at the scale this is meant for: rendering a couple
 * thousand DOM rows into a big table is what gets sluggish as a school's
 * roster grows, and slicing to one page at a time fixes exactly that.
 *
 * If a school's dataset ever gets big enough that loading the *entire*
 * workspace on every page load becomes the bottleneck (rather than just
 * rendering it), that's a sign to paginate `/api/state` itself — a bigger
 * change, not needed yet.
 */
export function usePagination<T>(rows: T[], pageSize = 25) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  // If the filtered/sorted row count shrinks (e.g. a search term narrows
  // the list) and the current page no longer exists, snap back instead of
  // showing a blank page.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, rows.length);

  return {
    page,
    setPage,
    pageCount,
    pageRows,
    total: rows.length,
    from,
    to,
    /** Call whenever a filter/search input changes, to reset back to page 1. */
    resetPage: () => setPage(1),
  };
}
