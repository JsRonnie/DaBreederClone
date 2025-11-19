import { useState, useEffect, useCallback } from "react";

export function useAdminData(fetchData, initialFilters = {}) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchData({
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(result.data);
      setFilteredData(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.total || result.data.length,
      }));
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [fetchData, filters, pagination.page, pagination.pageSize]);

  const handleSearch = useCallback(
    (searchTerm) => {
      if (!searchTerm) {
        setFilteredData(data);
        return;
      }

      const searchLower = searchTerm.toLowerCase();
      const filtered = data.filter((item) =>
        Object.values(item).some(
          (value) => value && value.toString().toLowerCase().includes(searchLower)
        )
      );
      setFilteredData(filtered);
    },
    [data]
  );

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setPagination((prev) => ({
      ...prev,
      page,
    }));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data: filteredData,
    loading,
    error,
    filters,
    pagination,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    refresh: loadData,
  };
}
