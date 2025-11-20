export function buildPaginationRange(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number.isFinite(Number(page)) ? Number(page) : 1);
  const safeSize = Math.max(1, Number.isFinite(Number(pageSize)) ? Number(pageSize) : 20);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { from, to, page: safePage, pageSize: safeSize };
}

export function sanitizeSearchTerm(term) {
  return (term || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function applyTextSearch(query, columns = [], term) {
  if (!query || typeof query.or !== "function") {
    return query;
  }
  const cleaned = sanitizeSearchTerm(term);
  if (!cleaned || !columns.length) return query;
  const orClause = columns.map((col) => `${col}.ilike.%${cleaned}%`).join(",");
  return query.or(orClause);
}

export function normalizeSort(sort, fallback = "created_at") {
  return typeof sort === "string" && sort.trim().length ? sort : fallback;
}

export function normalizeDirection(direction = "desc") {
  return direction === "asc" ? "asc" : "desc";
}
