import supabase from "./supabaseClient";

export async function fetchReportRepliesForUser(userId) {
  const { data, error } = await supabase
    .from("report_replies")
    .select("*, reports(reason, report_type)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
