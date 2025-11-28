import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

export function useNotificationBadge(userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("id, is_read")
      .eq("user_id", userId)
      .eq("is_read", false)
      .then((res) => {
        setUnreadCount(res.data ? res.data.length : 0);
      });
  }, [userId]);
  return unreadCount;
}
