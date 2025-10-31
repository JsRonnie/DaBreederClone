import supabase from './supabaseClient'

// Tiny helper to read the current authenticated user id
async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) throw new Error('Not authenticated')
  return data.user.id
}

// Fetch latest threads with vote counts
export async function fetchThreads({ limit = 20, from = 0 } = {}) {
  const { data, error } = await supabase
    .from('threads')
    .select('id, title, body, user_id, created_at, upvotes_count, downvotes_count')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) throw error
  return data || []
}

// Fetch a single thread and its comments (with vote counts)
export async function fetchThreadWithComments(threadId) {
  const [threadRes, commentsRes] = await Promise.all([
    supabase
      .from('threads')
      .select('id, title, body, user_id, created_at, upvotes_count, downvotes_count')
      .eq('id', threadId)
      .single(),
    supabase
      .from('comments')
      .select('id, body, user_id, thread_id, created_at, upvotes_count, downvotes_count')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
  ])

  if (threadRes.error) throw threadRes.error
  if (commentsRes.error) throw commentsRes.error

  return { thread: threadRes.data, comments: commentsRes.data || [] }
}

// Get current user's vote on a thread (1, -1, or null)
export async function getMyThreadVote(threadId) {
  const userId = await getCurrentUserId().catch(() => null)
  if (!userId) return null
  const { data, error } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle()
  if (error) return null
  return data?.value ?? null
}

// Get current user's votes on comments in a thread as a map { commentId: value }
export async function getMyCommentVotes(threadId) {
  const userId = await getCurrentUserId().catch(() => null)
  if (!userId) return {}
  const { data, error } = await supabase
    .from('votes')
    .select('comment_id, value')
    .eq('user_id', userId)
    .is('thread_id', null)
    .in('comment_id', (await supabase
      .from('comments')
      .select('id')
      .eq('thread_id', threadId)).data?.map(r => r.id) || [])
  if (error) return {}
  const map = {}
  for (const row of data || []) if (row.comment_id) map[row.comment_id] = row.value
  return map
}

// Toggle a vote on a thread. value: 1 (up) or -1 (down).
export async function toggleThreadVote(threadId, value) {
  if (value !== 1 && value !== -1) throw new Error('value must be 1 or -1')
  const userId = await getCurrentUserId()

  // Read existing vote
  const { data: existing, error: readErr } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle()
  if (readErr) throw readErr

  if (existing?.id) {
    if (existing.value === value) {
      // Same vote → remove (toggle off)
      const { error: delErr } = await supabase
        .from('votes')
        .delete()
        .eq('id', existing.id)
      if (delErr) throw delErr
    } else {
      // Different vote → flip
      const { error: updErr } = await supabase
        .from('votes')
        .update({ value })
        .eq('id', existing.id)
      if (updErr) throw updErr
    }
  } else {
    // No vote → add
    const { error: insErr } = await supabase
      .from('votes')
      .insert([{ user_id: userId, thread_id: threadId, value }])
    if (insErr) throw insErr
  }

  // Return fresh counts and my vote after trigger runs
  const { data: thread, error: tErr } = await supabase
    .from('threads')
    .select('id, upvotes_count, downvotes_count')
    .eq('id', threadId)
    .single()
  if (tErr) throw tErr
  const { data: my, error: vErr } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .maybeSingle()
  if (vErr) return { ...thread, my_vote: null }
  return { ...thread, my_vote: my?.value ?? null }
}

// Toggle a vote on a comment. value: 1 (up) or -1 (down).
export async function toggleCommentVote(commentId, value) {
  if (value !== 1 && value !== -1) throw new Error('value must be 1 or -1')
  const userId = await getCurrentUserId()

  const { data: existing, error: readErr } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle()
  if (readErr) throw readErr

  if (existing?.id) {
    if (existing.value === value) {
      const { error: delErr } = await supabase
        .from('votes')
        .delete()
        .eq('id', existing.id)
      if (delErr) throw delErr
    } else {
      const { error: updErr } = await supabase
        .from('votes')
        .update({ value })
        .eq('id', existing.id)
      if (updErr) throw updErr
    }
  } else {
    const { error: insErr } = await supabase
      .from('votes')
      .insert([{ user_id: userId, comment_id: commentId, value }])
    if (insErr) throw insErr
  }

  const { data: comment, error: cErr } = await supabase
    .from('comments')
    .select('id, upvotes_count, downvotes_count')
    .eq('id', commentId)
    .single()
  if (cErr) throw cErr
  const { data: my, error: vErr } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle()
  if (vErr) return { ...comment, my_vote: null }
  return { ...comment, my_vote: my?.value ?? null }
}
