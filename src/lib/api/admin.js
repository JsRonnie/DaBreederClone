import supabase from "../supabaseClient";
import {
  applyTextSearch,
  buildPaginationRange,
  normalizeDirection,
  normalizeSort,
} from "./queryUtils";

function ensureCount(count, fallbackLength = 0) {
  return typeof count === "number" ? count : fallbackLength;
}

function withSearchFilter(query, search) {
  if (search?.trim()) {
    return applyTextSearch(query, ["email", "name"], search);
  }
  return query;
}

export async function fetchAdminUsers(params = {}) {
  const {
    search = "",
    status = "all",
    page = 1,
    pageSize = 20,
    sort = "created_at",
    direction = "desc",
  } = params;

  const range = buildPaginationRange(page, pageSize);

  let query = supabase.from("users").select(
    `
        id,
        email,
        name,
        role,
        created_at,
        avatar_url,
        is_active,
        banned_at,
        ban_reason,
        reputation
      `,
    { count: "exact" }
  );

  query = withSearchFilter(query, search);

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "deactivated") {
    query = query.eq("is_active", false);
  }

  query = query.order(normalizeSort(sort, "created_at"), {
    ascending: normalizeDirection(direction) === "asc",
  });

  const [{ data, error, count }, activeCountRes, inactiveCountRes, adminCountRes] =
    await Promise.all([
      query.range(range.from, range.to),
      withSearchFilter(
        supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", true),
        search
      ),
      withSearchFilter(
        supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", false),
        search
      ),
      withSearchFilter(
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
        search
      ),
    ]);

  if (error) {
    throw new Error(error.message || "Failed to load users");
  }

  return {
    data: data ?? [],
    total: ensureCount(count, data?.length || 0),
    stats: {
      active: ensureCount(activeCountRes?.count, 0),
      inactive: ensureCount(inactiveCountRes?.count, 0),
      admins: ensureCount(adminCountRes?.count, 0),
    },
  };
}

export async function fetchAdminReports(params = {}) {
  const {
    search = "",
    status = "all",
    type = "all",
    page = 1,
    pageSize = 20,
    sort = "created_at",
    direction = "desc",
  } = params;

  const range = buildPaginationRange(page, pageSize);

  let query = supabase.from("reports").select(
    `
        id,
        reporter_id,
        report_type,
        category,
        status,
        priority,
        reason,
        description,
        target_id,
        reported_at,
        created_at,
        updated_at,
        admin_notes,
        resolution,
        reviewed_by,
        reporter:users!reports_reporter_id_fkey(id, name, email),
        reviewer:users!reports_reviewed_by_fkey(id, name, email)
      `,
    { count: "exact" }
  );

  if (status !== "all" && status) {
    query = query.eq("status", status);
  }

  if (type !== "all" && type) {
    query = query.eq("report_type", type);
  }

  if (search?.trim()) {
    query = applyTextSearch(query, ["reason", "category", "report_type"], search);
  }

  query = query.order(normalizeSort(sort, "created_at"), {
    ascending: normalizeDirection(direction) === "asc",
  });

  const { data, error, count } = await query.range(range.from, range.to);

  if (error) {
    throw new Error(error.message || "Failed to load reports");
  }

  return {
    data: data ?? [],
    total: ensureCount(count, data?.length || 0),
  };
}
