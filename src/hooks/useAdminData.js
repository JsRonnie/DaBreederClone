import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useDebounce from "./useDebounce";

export function useAdminData({
  queryKey = "admin-data",
  fetcher,
  initialFilters = {},
  initialPageSize = 10,
  enabled = true,
  staleTime = 60_000,
  debounceMs = 300,
} = {}) {
  const { search: initialSearch = "", ...restFilters } = initialFilters;

  const [filters, setFilters] = useState(restFilters);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: initialPageSize,
  });

  const debouncedSearch = useDebounce(searchInput, debounceMs);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || "",
    }),
    [filters, debouncedSearch]
  );

  const queryKeyParts = useMemo(
    () => [queryKey, effectiveFilters, pagination.page, pagination.pageSize],
    [queryKey, effectiveFilters, pagination.page, pagination.pageSize]
  );

  const queryEnabled = Boolean(enabled && typeof fetcher === "function");

  const derivedGcTime = staleTime > 0 ? staleTime * 5 : undefined;

  const queryResult = useQuery({
    queryKey: queryKeyParts,
    queryFn: () =>
      fetcher({
        ...effectiveFilters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
    staleTime,
    gcTime: derivedGcTime,
    enabled: queryEnabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!error) return failureCount < 2;
      const msg = error?.message?.toLowerCase?.() || "";
      if (msg.includes("permission denied") || msg.includes("not authorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const resultPayload = queryResult.data || { data: [], total: 0 };
  const rows = resultPayload.data ?? [];
  const total = resultPayload.total ?? 0;
  const stats = resultPayload.stats ?? null;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize) || 1);

  const handleSearch = useCallback((value) => {
    setSearchInput(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback(
    (nextPage) => {
      setPagination((prev) => ({
        ...prev,
        page: Math.max(1, Math.min(nextPage, Number.isFinite(pageCount) ? pageCount : nextPage)),
      }));
    },
    [pageCount]
  );

  const handlePageSizeChange = useCallback((nextSize) => {
    setPagination({
      page: 1,
      pageSize: nextSize,
    });
  }, []);

  const refresh = useCallback(() => {
    return queryResult.refetch();
  }, [queryResult]);

  return {
    rows,
    total,
    stats,
    pageCount,
    pagination,
    filters: { ...filters, search: searchInput },
    search: searchInput,
    loading: queryResult.isLoading || (queryEnabled && !queryResult.data && queryResult.isFetching),
    isFetching: queryResult.isFetching,
    error: queryResult.error ? queryResult.error.message || "Failed to load data" : null,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handlePageSizeChange,
    refresh,
  };
}
