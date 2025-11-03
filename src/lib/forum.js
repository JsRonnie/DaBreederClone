import supabase from "./supabaseClient";

// Tiny helper to read the current authenticated user id
async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

// Fetch latest threads with vote counts
export async function fetchThreads({
  limit = 20,
  from = 0,
  sort = "newest",
} = {}) {
  // build query
  let qb = supabase
    .from("threads")
    .select(
      "id, title, body, user_id, created_at, upvotes_count, downvotes_count"
    );

  switch (sort) {
    case "newest":
      qb = qb.order("created_at", { ascending: false });
      break;
    case "oldest":
      qb = qb.order("created_at", { ascending: true });
      break;
    case "most_popular":
      qb = qb.order("upvotes_count", { ascending: false });
      break;
    case "least_popular":
      qb = qb.order("upvotes_count", { ascending: true });
      break;
    default:
      qb = qb.order("created_at", { ascending: false });
  }

  const { data, error } = await qb.range(from, from + limit - 1);
  if (error) throw error;
  let rows = data || [];

  // Attach comment counts per thread (safe if comments table exists)
  try {
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: comments } = await supabase
        .from("comments")
        .select("thread_id")
        .in("thread_id", ids);
      const counts = {};
      (comments || []).forEach((c) => {
        counts[c.thread_id] = (counts[c.thread_id] || 0) + 1;
      });
      rows = rows.map((r) => ({ ...r, comments_count: counts[r.id] || 0 }));
    }
  } catch {
    // ignore if comments table/permission not present
  }

  // Fallback: if denormalized up/down counts aren't maintained by triggers,
  // compute them directly from votes and merge. This ensures UI persists after reload.
  try {
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: votesRows } = await supabase
        .from("votes")
        .select("thread_id, value")
        .in("thread_id", ids);
      if (votesRows && votesRows.length) {
        const tally = {};
        for (const v of votesRows) {
          if (!v.thread_id) continue;
          const t = (tally[v.thread_id] ||= { up: 0, down: 0 });
          if (v.value === 1) t.up += 1;
          else if (v.value === -1) t.down += 1;
        }
        rows = rows.map((r) => {
          const t = tally[r.id];
          return t ? { ...r, upvotes_count: t.up, downvotes_count: t.down } : r;
        });
      }
    }
  } catch {
    // ignore if votes not accessible
  }

  return rows;
}

// Fetch a single thread and its comments (with vote counts)
export async function fetchThreadWithComments(threadId) {
  const [threadRes, commentsRes] = await Promise.all([
    supabase
      .from("threads")
      .select(
        "id, title, body, user_id, created_at, upvotes_count, downvotes_count"
      )
      .eq("id", threadId)
      .single(),
    supabase
      .from("comments")
      .select(
        "id, body, user_id, thread_id, created_at, upvotes_count, downvotes_count"
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
  ]);

  if (threadRes.error) throw threadRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const thread = threadRes.data;
  const comments = commentsRes.data || [];
  // attach comments_count for convenience
  thread.comments_count = (comments || []).length;

  // Fallback aggregation: recompute up/down from votes if denormalized counts are stale
  try {
    // Thread counts
    const { data: tvotes } = await supabase
      .from("votes")
      .select("value")
      .eq("thread_id", threadId);
    if (tvotes && tvotes.length) {
      let up = 0,
        down = 0;
      for (const v of tvotes) {
        if (v.value === 1) up += 1;
        else if (v.value === -1) down += 1;
      }
      thread.upvotes_count = up;
      thread.downvotes_count = down;
    }
    // Comment counts in batch
    if (comments.length) {
      const ids = comments.map((c) => c.id);
      const { data: cvotes } = await supabase
        .from("votes")
        .select("comment_id, value")
        .in("comment_id", ids);
      if (cvotes && cvotes.length) {
        const tally = {};
        for (const v of cvotes) {
          if (!v.comment_id) continue;
          const t = (tally[v.comment_id] ||= { up: 0, down: 0 });
          if (v.value === 1) t.up += 1;
          else if (v.value === -1) t.down += 1;
        }
        for (const c of comments) {
          const t = tally[c.id];
          if (t) {
            c.upvotes_count = t.up;
            c.downvotes_count = t.down;
          }
        }
      }
    }
  } catch {
    // ignore if votes not accessible
  }
  return { thread, comments };
}

// Get current user's vote on a thread (1, -1, or null)
export async function getMyThreadVote(threadId) {
  const userId = await getCurrentUserId().catch(() => null);
  if (!userId) return null;
  const { data, error } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

// Get current user's votes on multiple threads as a map { threadId: value }
export async function getMyThreadVotes(threadIds = []) {
  const userId = await getCurrentUserId().catch(() => null);
  if (!userId || !threadIds.length) return {};
  const { data, error } = await supabase
    .from("votes")
    .select("thread_id, value")
    .eq("user_id", userId)
    .in("thread_id", threadIds);
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => {
    if (r.thread_id) map[r.thread_id] = r.value;
  });
  return map;
}

// Get current user's votes on comments in a thread as a map { commentId: value }
export async function getMyCommentVotes(threadId) {
  const userId = await getCurrentUserId().catch(() => null);
  if (!userId) return {};
  const { data, error } = await supabase
    .from("votes")
    .select("comment_id, value")
    .eq("user_id", userId)
    .is("thread_id", null)
    .in(
      "comment_id",
      (
        await supabase.from("comments").select("id").eq("thread_id", threadId)
      ).data?.map((r) => r.id) || []
    );
  if (error) return {};
  const map = {};
  for (const row of data || [])
    if (row.comment_id) map[row.comment_id] = row.value;
  return map;
}

// Toggle a vote on a thread. value: 1 (up) or -1 (down).
export async function toggleThreadVote(threadId, value) {
  if (value !== 1 && value !== -1) throw new Error("value must be 1 or -1");
  const userId = await getCurrentUserId();

  // Read existing vote
  const { data: existing, error: readErr } = await supabase
    .from("votes")
    .select("id, value")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing?.id) {
    if (existing.value === value) {
      // Same vote → remove (toggle off)
      const { error: delErr } = await supabase
        .from("votes")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;
    } else {
      // Different vote → flip
      const { error: updErr } = await supabase
        .from("votes")
        .update({ value })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    }
  } else {
    // No vote → add (guard against race: if another insert wins, update instead)
    const { error: insErr } = await supabase
      .from("votes")
      .insert([{ user_id: userId, thread_id: threadId, value }]);
    if (insErr) {
      // 23505 = unique_violation
      if (insErr.code === "23505") {
        const { error: updOnConflict } = await supabase
          .from("votes")
          .update({ value })
          .eq("user_id", userId)
          .eq("thread_id", threadId);
        if (updOnConflict) throw updOnConflict;
      } else {
        throw insErr;
      }
    }
  }

  // Return fresh counts and my vote after trigger runs
  const { data: thread, error: tErr } = await supabase
    .from("threads")
    .select("id, upvotes_count, downvotes_count")
    .eq("id", threadId)
    .single();
  if (tErr) throw tErr;
  const { data: my, error: vErr } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (vErr) return { ...thread, my_vote: null };
  return { ...thread, my_vote: my?.value ?? null };
}

// Toggle a vote on a comment. value: 1 (up) or -1 (down).
export async function toggleCommentVote(commentId, value) {
  if (value !== 1 && value !== -1) throw new Error("value must be 1 or -1");
  const userId = await getCurrentUserId();

  const { data: existing, error: readErr } = await supabase
    .from("votes")
    .select("id, value")
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing?.id) {
    if (existing.value === value) {
      const { error: delErr } = await supabase
        .from("votes")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;
    } else {
      const { error: updErr } = await supabase
        .from("votes")
        .update({ value })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    }
  } else {
    const { error: insErr } = await supabase
      .from("votes")
      .insert([{ user_id: userId, comment_id: commentId, value }]);
    if (insErr) {
      if (insErr.code === "23505") {
        const { error: updOnConflict } = await supabase
          .from("votes")
          .update({ value })
          .eq("user_id", userId)
          .eq("comment_id", commentId);
        if (updOnConflict) throw updOnConflict;
      } else {
        throw insErr;
      }
    }
  }

  const { data: comment, error: cErr } = await supabase
    .from("comments")
    .select("id, upvotes_count, downvotes_count")
    .eq("id", commentId)
    .single();
  if (cErr) throw cErr;
  const { data: my, error: vErr } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .maybeSingle();
  if (vErr) return { ...comment, my_vote: null };
  return { ...comment, my_vote: my?.value ?? null };
}
