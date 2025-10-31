import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { fetchThreadWithComments, toggleThreadVote, toggleCommentVote, getMyThreadVote, getMyCommentVotes } from '../lib/forum'

export default function ThreadPage() {
  const { id } = useParams()
  const threadId = id
  const [thread, setThread] = useState(null)
  const [comments, setComments] = useState([])
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)
  const [myVote, setMyVote] = useState(null) // 1, -1, or null
  const [author, setAuthor] = useState(null)
  const [deletingThread, setDeletingThread] = useState(false)
  const [deletingComment, setDeletingComment] = useState({})
  const [currentUserId, setCurrentUserId] = useState(null)

  async function load() {
    try {
      setError('')
  const { thread, comments } = await fetchThreadWithComments(threadId)
  setThread(thread)
  // fetch thread author profile
  try {
    if (thread?.user_id) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', thread.user_id)
        .maybeSingle()
      setAuthor(profile || null)
    } else { setAuthor(null) }
  } catch (_) { setAuthor(null) }
  // attach my votes to comments
  const myVotesMap = await getMyCommentVotes(threadId)
  let withMyVotes = (comments || []).map(c => ({ ...c, my_vote: myVotesMap[c.id] ?? null }))
  // attach commenter profiles
  try {
    const ids = [...new Set((withMyVotes || []).map(c => c.user_id).filter(Boolean))]
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', ids)
      const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      withMyVotes = (withMyVotes || []).map(c => ({ ...c, author: map[c.user_id] || null }))
    }
  } catch (_) { /* ignore */ }
  setComments(withMyVotes)
      const v = await getMyThreadVote(threadId)
      setMyVote(v)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load thread')
    }
  }

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null)).catch(() => setCurrentUserId(null))
    const channel = supabase.channel(`thread-${threadId}-realtime`)
      // DB-trigger-driven updates (threads/comments upvote/downvote counts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'threads', filter: `id=eq.${threadId}` }, (payload) => {
        const row = payload?.new
        if (!row) return
        setThread((prev) => prev ? { ...prev, upvotes_count: row.upvotes_count ?? prev.upvotes_count, downvotes_count: row.downvotes_count ?? prev.downvotes_count } : prev)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `thread_id=eq.${threadId}` }, (payload) => {
        const c = payload?.new
        if (!c?.id) return
        setComments((prev) => prev.map(x => x.id === c.id ? { ...x, upvotes_count: c.upvotes_count ?? x.upvotes_count, downvotes_count: c.downvotes_count ?? x.downvotes_count } : x))
      })
      // Fallback: listen on votes directly to compute live deltas
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        const op = payload?.eventType || payload?.event
        const n = payload?.new
        const o = payload?.old
        const vThreadId = n?.thread_id ?? o?.thread_id
        const commentId = n?.comment_id ?? o?.comment_id
        const oldVal = o?.value ?? null
        const newVal = n?.value ?? null

        // Thread-level deltas (only for current thread)
        if (vThreadId && String(vThreadId) === String(threadId)) {
          setThread((prev) => {
            if (!prev) return prev
            let ups = prev.upvotes_count ?? 0
            let downs = prev.downvotes_count ?? 0
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
            return { ...prev, upvotes_count: ups, downvotes_count: downs }
          })
        }

        // Comment-level deltas (only for comments in current thread)
        if (commentId) {
          setComments((prev) => prev.map(c => {
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
          }))
        }
      })
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch (_) {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  async function postComment(e) {
    e.preventDefault()
    const body = e.currentTarget.body.value.trim()
    if (!body) return
    setPosting(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('You must be signed in to comment')
      const { data, error } = await supabase
        .from('comments')
        .insert([{ body, thread_id: threadId, user_id: user.id }])
        .select('id, body, user_id, thread_id, created_at, upvotes_count, downvotes_count')
        .single()
      if (error) throw error
      e.currentTarget.reset()
      // Optimistically add at end
      setComments((prev) => [...prev, { ...data, my_vote: null }])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  async function deleteThread() {
    if (!confirm('Delete this thread? This cannot be undone.')) return
    setDeletingThread(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('You must be signed in to delete')
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user.id)
      if (error) throw error
      window.history.back()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to delete thread')
    } finally {
      setDeletingThread(false)
    }
  }

  async function deleteComment(commentId) {
    if (!confirm('Delete this comment? This cannot be undone.')) return
    setDeletingComment((m) => ({ ...m, [commentId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('You must be signed in to delete')
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)
      if (error) throw error
      setComments((prev) => prev.filter(c => c.id !== commentId))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to delete comment')
    } finally {
      setDeletingComment((m) => ({ ...m, [commentId]: false }))
    }
  }

  async function voteThread(val) {
    try {
      // Optimistic counts using previous myVote
      setThread((prev) => {
        if (!prev) return prev
        let ups = prev.upvotes_count ?? 0
        let downs = prev.downvotes_count ?? 0
        if (myVote === 1 && val === 1) {
          // remove upvote
          ups = Math.max(0, ups - 1)
          setMyVote(null)
        } else if (myVote === -1 && val === -1) {
          // remove downvote
          downs = Math.max(0, downs - 1)
          setMyVote(null)
        } else if (myVote === 1 && val === -1) {
          ups = Math.max(0, ups - 1)
          downs = downs + 1
          setMyVote(-1)
        } else if (myVote === -1 && val === 1) {
          downs = Math.max(0, downs - 1)
          ups = ups + 1
          setMyVote(1)
        } else if (myVote == null && val === 1) {
          ups = ups + 1
          setMyVote(1)
        } else if (myVote == null && val === -1) {
          downs = downs + 1
          setMyVote(-1)
        }
        return { ...prev, upvotes_count: ups, downvotes_count: downs }
      })

      const t = await toggleThreadVote(threadId, val)
      setThread((prev) => prev ? { ...prev, upvotes_count: t.upvotes_count, downvotes_count: t.downvotes_count } : t)
      setMyVote(t.my_vote ?? null)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Vote failed')
    }
  }

  async function voteComment(commentId, val) {
    try {
      // Optimistic update
      setComments((prev) => prev.map(cm => {
        if (cm.id !== commentId) return cm
        let ups = cm.upvotes_count ?? 0
        let downs = cm.downvotes_count ?? 0
        if (cm.my_vote === 1 && val === 1) { ups = Math.max(0, ups - 1); cm = { ...cm, my_vote: null } }
        else if (cm.my_vote === -1 && val === -1) { downs = Math.max(0, downs - 1); cm = { ...cm, my_vote: null } }
        else if (cm.my_vote === 1 && val === -1) { ups = Math.max(0, ups - 1); downs += 1; cm = { ...cm, my_vote: -1 } }
        else if (cm.my_vote === -1 && val === 1) { downs = Math.max(0, downs - 1); ups += 1; cm = { ...cm, my_vote: 1 } }
        else if (cm.my_vote == null && val === 1) { ups += 1; cm = { ...cm, my_vote: 1 } }
        else if (cm.my_vote == null && val === -1) { downs += 1; cm = { ...cm, my_vote: -1 } }
        return { ...cm, upvotes_count: ups, downvotes_count: downs }
      }))

      const c = await toggleCommentVote(commentId, val)
      setComments((prev) => prev.map(cm => {
        if (cm.id !== commentId) return cm
        const zeroFromServer = (c.upvotes_count ?? 0) === 0 && (c.downvotes_count ?? 0) === 0
        const hadNonZero = (cm.upvotes_count ?? 0) + (cm.downvotes_count ?? 0) > 0
        const nextCounts = zeroFromServer && hadNonZero
          ? { upvotes_count: cm.upvotes_count, downvotes_count: cm.downvotes_count }
          : { upvotes_count: c.upvotes_count ?? cm.upvotes_count, downvotes_count: c.downvotes_count ?? cm.downvotes_count }
        return { ...cm, ...nextCounts, my_vote: (c.my_vote ?? cm.my_vote ?? null) }
      }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Vote failed')
    }
  }

  if (!thread) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        {error ? <div className="text-red-600">{error}</div> : 'Loading…'}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{thread.title}</h1>
          {thread.body && (
            <p className="mt-2 whitespace-pre-wrap">{thread.body}</p>
          )}
          <div className="text-xs text-slate-500 mt-2">
            {author?.name ? (<span className="mr-1 font-bold text-slate-700">{author.name}</span>) : null}
            {new Date(thread.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Upvote thread"
            className={`px-2 py-1 rounded border hover:bg-slate-50 ${myVote === 1 ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
            onClick={() => voteThread(1)}
          >
            ▲
          </button>
          <div className="text-sm tabular-nums text-slate-700">
            <span title="Upvotes" className="mr-2">{thread.upvotes_count ?? 0}</span>
            <span title="Downvotes">{thread.downvotes_count ?? 0}</span>
          </div>
          <button
            aria-label="Downvote thread"
            className={`px-2 py-1 rounded border hover:bg-slate-50 ${myVote === -1 ? 'bg-rose-50 border-rose-300 text-rose-700' : ''}`}
            onClick={() => voteThread(-1)}
          >
            ▼
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => window.history.back()} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50">← Back to Forum</button>
        <h2 className="text-lg font-medium">Comments</h2>
        {currentUserId && currentUserId === thread?.user_id && (
          <button onClick={deleteThread} disabled={deletingThread} className="ml-auto text-sm px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50">{deletingThread ? 'Deleting…' : 'Delete thread'}</button>
        )}
      </div>
      <ul className="grid gap-3 mb-6">
        {comments.map(c => (
          <li key={c.id} className="p-3 border border-slate-200 rounded-md bg-white/60 backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div className="whitespace-pre-wrap">{c.body}</div>
              <div className="flex items-center gap-3">
                <button aria-label="Upvote comment" className={`px-2 py-1 rounded border hover:bg-slate-50 ${c.my_vote === 1 ? 'bg-green-50 border-green-300 text-green-700' : ''}`} onClick={() => voteComment(c.id, 1)}>▲</button>
                <div className="text-sm tabular-nums text-slate-700">
                  <span className="mr-2">{c.upvotes_count ?? 0}</span>
                  <span>{c.downvotes_count ?? 0}</span>
                </div>
                <button aria-label="Downvote comment" className={`px-2 py-1 rounded border hover:bg-slate-50 ${c.my_vote === -1 ? 'bg-rose-50 border-rose-300 text-rose-700' : ''}`} onClick={() => voteComment(c.id, -1)}>▼</button>
                {currentUserId && c.user_id === currentUserId && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    disabled={!!deletingComment[c.id]}
                    className="ml-2 text-xs px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deletingComment[c.id] ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {c.author?.name ? (<span className="mr-1 font-bold text-slate-700">{c.author.name}</span>) : null}
              {new Date(c.created_at).toLocaleString()}
            </div>
          </li>
        ))}
        {!comments.length && (
          <li className="text-slate-500">No comments yet.</li>
        )}
      </ul>

      <form onSubmit={postComment} className="grid gap-2 p-4 border border-slate-200 rounded-md bg-white/60 backdrop-blur">
        <label className="text-sm font-medium" htmlFor="body">Add a comment</label>
        <textarea id="body" name="body" className="border rounded-md p-2 min-h-24" placeholder="Write something…" />
        <div className="flex justify-end">
          <button type="submit" disabled={posting} className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {posting ? 'Posting…' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}
