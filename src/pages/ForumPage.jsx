import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import supabase from '../lib/supabaseClient'
import { fetchThreads, toggleThreadVote, getMyThreadVote, fetchThreadWithComments } from '../lib/forum'

export default function ForumPage() {
  const { user, loading } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const [threads, setThreads] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [myVotes, setMyVotes] = useState({}) // { [threadId]: 1 | -1 | null }
  const [expanded, setExpanded] = useState({}) // { [threadId]: boolean }
  const [commentsByThread, setCommentsByThread] = useState({}) // { [threadId]: Comment[] }
  const [postingCommentFor, setPostingCommentFor] = useState(null) // threadId while posting
  const [lastLoadedAt, setLastLoadedAt] = useState(0)
  const [deleting, setDeleting] = useState({}) // { threadId: boolean }
  const [deletingComment, setDeletingComment] = useState({}) // { commentId: boolean }

  const canPost = useMemo(() => !!user, [user])

  async function load() {
    try {
      setError('')
      const rows = await fetchThreads({ limit: 50 })
      // Fetch display names for posters
      let enriched = rows
      try {
        const ids = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))]
        if (ids.length) {
          const { data: profiles } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .in('id', ids)
          const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
          enriched = rows.map(r => ({ ...r, author: map[r.user_id] || null }))
        }
      } catch (_) {
        enriched = rows
      }
      setThreads(enriched)
      setLastLoadedAt(Date.now())
      // Preload my vote per thread for highlighting
      if (user) {
        const votes = {}
        await Promise.all(
          (rows || []).map(async (t) => {
            try {
              votes[t.id] = await getMyThreadVote(t.id)
            } catch {
              votes[t.id] = null
            }
          })
        )
        setMyVotes(votes)
      } else {
        setMyVotes({})
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load threads')
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Live updates: reflect thread/comment count changes from other users
  useEffect(() => {
    const channel = supabase.channel('forum-list-realtime')
      // Threads updated elsewhere (e.g., DB trigger refreshing counts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'threads' }, (payload) => {
        const row = payload?.new
        if (!row?.id) return
        setThreads((prev) => prev.map(t => t.id === row.id ? { ...t, upvotes_count: row.upvotes_count ?? t.upvotes_count, downvotes_count: row.downvotes_count ?? t.downvotes_count } : t))
      })
      // New thread inserted elsewhere
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threads' }, () => {
        load()
      })
      // Comment rows updated elsewhere (e.g., DB trigger refreshing counts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload) => {
        const c = payload?.new
        if (!c?.id || !c?.thread_id) return
        setCommentsByThread((prev) => {
          const cur = prev[c.thread_id] || []
          if (!cur.length) return prev
          return { ...prev, [c.thread_id]: cur.map(x => x.id === c.id ? { ...x, upvotes_count: c.upvotes_count ?? x.upvotes_count, downvotes_count: c.downvotes_count ?? x.downvotes_count } : x) }
        })
      })
      // Fallback: react to votes directly so counts change instantly even if DB triggers are missing
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        const op = payload?.eventType || payload?.event
        const n = payload?.new
        const o = payload?.old
        const threadId = n?.thread_id ?? o?.thread_id
        const commentId = n?.comment_id ?? o?.comment_id
        const oldVal = o?.value ?? null
        const newVal = n?.value ?? null

        // Thread-level vote deltas
        if (threadId) {
          setThreads((prev) => prev.map(t => {
            if (t.id !== threadId) return t
            let ups = t.upvotes_count ?? 0
            let downs = t.downvotes_count ?? 0
            if (op === 'INSERT') {
              if (newVal === 1) ups += 1
              else if (newVal === -1) downs += 1
            } else if (op === 'UPDATE') {
              if (oldVal === 1 && newVal === -1) { ups = Math.max(0, ups - 1); downs += 1 }
              else if (oldVal === -1 && newVal === 1) { downs = Math.max(0, downs - 1); ups += 1 }
            } else if (op === 'DELETE') {
              if (oldVal === 1) ups = Math.max(0, ups - 1)
              else if (oldVal === -1) downs = Math.max(0, downs - 1)
            }
            return { ...t, upvotes_count: ups, downvotes_count: downs }
          }))
        }

        // Comment-level vote deltas (only if that comment list is loaded)
        if (commentId) {
          setCommentsByThread((prev) => {
            // Find which thread has this comment loaded
            let foundThreadId = null
            for (const [tid, arr] of Object.entries(prev)) {
              if ((arr || []).some(c => c.id === commentId)) { foundThreadId = tid; break }
            }
            if (!foundThreadId) return prev
            const arr = prev[foundThreadId] || []
            const next = arr.map(c => {
              if (c.id !== commentId) return c
              let ups = c.upvotes_count ?? 0
              let downs = c.downvotes_count ?? 0
              if (op === 'INSERT') {
                if (newVal === 1) ups += 1
                else if (newVal === -1) downs += 1
              } else if (op === 'UPDATE') {
                if (oldVal === 1 && newVal === -1) { ups = Math.max(0, ups - 1); downs += 1 }
                else if (oldVal === -1 && newVal === 1) { downs = Math.max(0, downs - 1); ups += 1 }
              } else if (op === 'DELETE') {
                if (oldVal === 1) ups = Math.max(0, ups - 1)
                else if (oldVal === -1) downs = Math.max(0, downs - 1)
              }
              return { ...c, upvotes_count: ups, downvotes_count: downs }
            })
            return { ...prev, [foundThreadId]: next }
          })
        }
      })
      .subscribe()

    return () => { try { supabase.removeChannel(channel) } catch (_) {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh when auth state finishes resolving or user changes
  useEffect(() => {
    if (loading === false) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id])

  // Auto-refresh if we navigated back and list is empty
  useEffect(() => {
    if (!threads.length && loading === false) {
      const t = setTimeout(load, 600)
      return () => clearTimeout(t)
    }
  }, [threads.length, loading])

  // Refresh on tab focus/visibility change if list is empty or stale
  useEffect(() => {
    function onFocus() {
      const stale = Date.now() - lastLoadedAt > 10000
      if (!threads.length || stale) load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [threads.length, lastLoadedAt])

  async function handleCreateThread(e) {
    e.preventDefault()
    if (!canPost) return
    const form = e.currentTarget
    const title = form.title.value.trim()
    const body = form.body.value.trim()
    if (!title) return

    setBusy(true)
    setError('')
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.id) throw new Error('You must be signed in to post')

      const { data, error } = await supabase
        .from('threads')
        .insert([{ title, body: body || null, user_id: authUser.id }])
        .select('id')
        .maybeSingle()
      if (error) throw error

      if (data?.id) {
        navigate(`/thread/${data.id}`)
      } else {
        // Fallback: some setups don’t return representation; fetch latest by this user
        const { data: rows, error: selErr } = await supabase
          .from('threads')
          .select('id')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (selErr) throw selErr
        if (rows && rows[0]?.id) {
          navigate(`/thread/${rows[0].id}`)
        } else {
          setError('Thread created, but could not fetch it due to a SELECT policy or grant. Please refresh.')
          await load()
        }
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to create thread')
    } finally {
      setBusy(false)
    }
  }

  async function vote(threadId, value) {
    try {
      // Determine new vote and apply optimistic counts deterministically
      const current = myVotes[threadId] ?? null
      let nextMy = current
      setThreads((prev) => prev.map(t => {
        if (t.id !== threadId) return t
        let ups = t.upvotes_count ?? 0
        let downs = t.downvotes_count ?? 0
        if (current === 1 && value === 1) { ups = Math.max(0, ups - 1); nextMy = null }
        else if (current === -1 && value === -1) { downs = Math.max(0, downs - 1); nextMy = null }
        else if (current === 1 && value === -1) { ups = Math.max(0, ups - 1); downs += 1; nextMy = -1 }
        else if (current === -1 && value === 1) { downs = Math.max(0, downs - 1); ups += 1; nextMy = 1 }
        else if (current == null && value === 1) { ups += 1; nextMy = 1 }
        else if (current == null && value === -1) { downs += 1; nextMy = -1 }
        return { ...t, upvotes_count: ups, downvotes_count: downs }
      }))
      setMyVotes((m) => ({ ...m, [threadId]: nextMy }))

      const updated = await toggleThreadVote(threadId, value)
      setThreads((prev) => prev.map(t => {
        if (t.id !== threadId) return t
        const zeroFromServer = (updated.upvotes_count ?? 0) === 0 && (updated.downvotes_count ?? 0) === 0
        const hadNonZero = (t.upvotes_count ?? 0) + (t.downvotes_count ?? 0) > 0
        if (zeroFromServer && hadNonZero) return t // keep optimistic if server hasn't aggregated yet
        return { ...t, upvotes_count: updated.upvotes_count ?? t.upvotes_count, downvotes_count: updated.downvotes_count ?? t.downvotes_count }
      }))
      // If server returned a concrete my_vote, use it; otherwise keep the optimistic "nextMy"
      setMyVotes((m) => ({ ...m, [threadId]: (updated.my_vote ?? m[threadId] ?? nextMy ?? null) }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Vote failed')
    }
  }

  function toggleComments(threadId) {
    setExpanded((prev) => ({ ...prev, [threadId]: !prev[threadId] }))
    // Load comments lazily when expanding first time
    if (!expanded[threadId] && !commentsByThread[threadId]) {
      loadComments(threadId)
    }
  }

  async function loadComments(threadId) {
    try {
      const { comments } = await fetchThreadWithComments(threadId)
      // attach display names for commenters
      let enriched = comments
      try {
        const ids = [...new Set((comments || []).map(c => c.user_id).filter(Boolean))]
        if (ids.length) {
          const { data: profiles } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .in('id', ids)
          const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
          enriched = (comments || []).map(c => ({ ...c, author: map[c.user_id] || null }))
        }
      } catch (_) {
        enriched = comments
      }
      setCommentsByThread((prev) => ({ ...prev, [threadId]: enriched || [] }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load comments')
    }
  }

  async function postComment(e, threadId) {
    e.preventDefault()
    const formEl = e.currentTarget // keep a stable ref; React sometimes nulls currentTarget later
    const textarea = formEl?.querySelector?.(`#body-${threadId}`)
    const body = (textarea?.value || '').trim()
    if (!body) return
    setPostingCommentFor(threadId)
    setError('')
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.id) throw new Error('You must be signed in to comment')
      const { data, error } = await supabase
        .from('comments')
        .insert([{ body, thread_id: threadId, user_id: authUser.id }])
        .select('id, body, user_id, thread_id, created_at, upvotes_count, downvotes_count')
        .single()
      if (error) throw error
      if (formEl && typeof formEl.reset === 'function') formEl.reset()
      setCommentsByThread((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), data] }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to post comment')
    } finally {
      setPostingCommentFor(null)
    }
  }

  async function deleteThread(threadId) {
    if (!confirm('Delete this thread? This cannot be undone.')) return
    setDeleting((m) => ({ ...m, [threadId]: true }))
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.id) throw new Error('You must be signed in to delete')
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', authUser.id) // RLS also enforces this, but it helps return 0 rows if not owner
      if (error) throw error
      setThreads((prev) => prev.filter(t => t.id !== threadId))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to delete thread')
    } finally {
      setDeleting((m) => ({ ...m, [threadId]: false }))
    }
  }

  async function deleteComment(commentId, threadId) {
    if (!confirm('Delete this comment? This cannot be undone.')) return
    setDeletingComment((m) => ({ ...m, [commentId]: true }))
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.id) throw new Error('You must be signed in to delete')
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', authUser.id)
      if (error) throw error
      setCommentsByThread((prev) => ({ ...prev, [threadId]: (prev[threadId] || []).filter(c => c.id !== commentId) }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to delete comment')
    } finally {
      setDeletingComment((m) => ({ ...m, [commentId]: false }))
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50"
          aria-label="Refresh threads"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      {canPost && (
        <form onSubmit={handleCreateThread} className="mb-8 grid gap-2 p-4 border border-slate-200 rounded-md bg-white/60 backdrop-blur">
          <label className="text-sm font-medium" htmlFor="title">Title</label>
          <input id="title" name="title" className="border rounded-md p-2" placeholder="What do you want to discuss?" />
          <label className="text-sm font-medium" htmlFor="body">Body (optional)</label>
          <textarea id="body" name="body" className="border rounded-md p-2 min-h-24" placeholder="Add details here..." />
          <div className="flex gap-2 justify-end">
            <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Posting…' : 'Post Thread'}
            </button>
          </div>
        </form>
      )}

      <ul className="grid gap-3">
        {threads.map((t) => (
          <li key={t.id} className="p-4 border border-slate-200 rounded-md bg-white/60 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-medium text-slate-800">{t.title}</div>
                {t.body && (
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{t.body}</p>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {t.author?.name ? (<span className="mr-1 font-bold text-slate-700">{t.author.name}</span>) : null}
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Upvote"
                  className={`px-2 py-1 rounded border hover:bg-slate-50 ${myVotes[t.id] === 1 ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                  onClick={() => vote(t.id, 1)}
                >
                  ▲
                </button>
                <div className="text-sm tabular-nums text-slate-700">
                  <span className="mr-2" title="Upvotes">{t.upvotes_count ?? 0}</span>
                  <span title="Downvotes">{t.downvotes_count ?? 0}</span>
                </div>
                <button
                  aria-label="Downvote"
                  className={`px-2 py-1 rounded border hover:bg-slate-50 ${myVotes[t.id] === -1 ? 'bg-rose-50 border-rose-300 text-rose-700' : ''}`}
                  onClick={() => vote(t.id, -1)}
                >
                  ▼
                </button>
              </div>
            </div>

              <div className="mt-3 flex gap-2 flex-wrap">
              <button
                className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50"
                onClick={() => toggleComments(t.id)}
                aria-expanded={!!expanded[t.id]}
                aria-controls={`comments-${t.id}`}
              >
                {expanded[t.id] ? 'Hide comments' : 'View comments'}
              </button>
              <Link to={`/thread/${t.id}`} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50">Open thread</Link>
                {user?.id === t.user_id && (
                  <button
                    onClick={() => deleteThread(t.id)}
                    disabled={!!deleting[t.id]}
                    className="text-sm px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deleting[t.id] ? 'Deleting…' : 'Delete thread'}
                  </button>
                )}
            </div>

            {expanded[t.id] && (
              <div id={`comments-${t.id}`} className="mt-3 border-t pt-3">
                <ul className="grid gap-2">
                  {(commentsByThread[t.id] || []).map(c => (
                    <li key={c.id} className="p-2 border border-slate-200 rounded-md bg-white/70">
                      <div className="whitespace-pre-wrap">{c.body}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {c.author?.name ? (<span className="mr-1 font-bold text-slate-700">{c.author.name}</span>) : null}
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                      {user?.id === c.user_id && (
                        <div className="mt-1">
                          <button
                            onClick={() => deleteComment(c.id, t.id)}
                            disabled={!!deletingComment[c.id]}
                            className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingComment[c.id] ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {!commentsByThread[t.id]?.length && (
                    <li className="text-slate-500">No comments yet.</li>
                  )}
                </ul>
                {user && (
                  <form onSubmit={(e) => postComment(e, t.id)} className="grid gap-2 mt-3 p-3 border border-slate-200 rounded-md bg-white/60">
                    <label className="text-sm font-medium" htmlFor={`body-${t.id}`}>Add a comment</label>
                    <textarea id={`body-${t.id}`} name={`body-${t.id}`} className="border rounded-md p-2 min-h-20" placeholder="Write something…" />
                    <div className="flex justify-end">
                      <button type="submit" disabled={postingCommentFor === t.id} className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        {postingCommentFor === t.id ? 'Posting…' : 'Post Comment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
        {!threads.length && (
          <li className="text-slate-500">No threads yet. Be the first to post.</li>
        )}
      </ul>
    </div>
  )
}
