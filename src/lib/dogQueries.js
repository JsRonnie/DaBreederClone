import supabase from "./supabaseClient";
import { DOG_LIST_COLUMNS } from "./dogs";

const BASE_SELECT_COLUMNS = Array.from(
  new Set([...DOG_LIST_COLUMNS, "gender", "image_url", "is_visible"])
);

export function mapDogRow(row) {
  if (!row) return null;
  const gender = row.gender || row.sex || null;
  const derivedHidden =
    typeof row.hidden === "boolean" ? row.hidden : row.is_visible === false ? true : false;

  return {
    id: row.id,
    name: row.name || "Unnamed",
    breed: row.breed || "Unknown",
    age_years: row.age_years ?? null,
    sex: gender,
    gender,
    size: row.size || null,
    weight_kg: row.weight_kg ?? null,
    coat_type: row.coat_type || null,
    color: row.color || null,
    activity_level: row.activity_level || null,
    sociability: row.sociability || null,
    trainability: row.trainability || null,
    image: row.image || row.image_url || null,
    image_url: row.image_url || row.image || null,
    hidden: derivedHidden,
    is_visible: row.is_visible ?? !derivedHidden,
    user_id: row.user_id,
    match_requests_count: row.match_requests_count ?? 0,
    match_accept_count: row.match_accept_count ?? 0,
    match_completed_count: row.match_completed_count ?? 0,
    match_success_count: row.match_success_count ?? 0,
    match_failure_count: row.match_failure_count ?? 0,
    female_successful_matings: row.female_successful_matings ?? 0,
    male_success_rate: typeof row.male_success_rate === "number" ? row.male_success_rate : 0,
  };
}

function buildBaseDogsQuery(userId, columns = BASE_SELECT_COLUMNS) {
  return supabase
    .from("dogs")
    .select(columns.join(","))
    .eq("user_id", userId)
    .order("id", { ascending: false });
}

export async function fetchDogsForUser(userId) {
  if (!userId) return [];

  let response = await buildBaseDogsQuery(userId);

  if (response.error && response.error.code === "42703") {
    response = await supabase
      .from("dogs")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });
  }

  if (response.error) throw response.error;

  return (response.data || []).map(mapDogRow);
}
