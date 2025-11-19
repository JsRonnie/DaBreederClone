import supabase from "./supabaseClient";

export async function createNotification({
  userId,
  title,
  message,
  type = "general",
  metadata = null,
}) {
  if (!userId) {
    throw new Error("userId is required to create a notification");
  }
  const payload = {
    user_id: userId,
    title,
    message,
    type,
    metadata,
  };
  const { data, error } = await supabase.from("notifications").insert(payload).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function listNotificationsForUser(userId, { status } = {}) {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data;
}
