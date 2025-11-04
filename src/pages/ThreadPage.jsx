import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  fetchThreadWithComments,
  toggleThreadVote,
  toggleCommentVote,
  getMyThreadVote,
  getMyCommentVotes,
} from "../lib/forum";

export default function ThreadPage() {
  const { id } = useParams();
  const threadId = id;
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  // reply functionality removed by request
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [myVote, setMyVote] = useState(null); // 1, -1, or null
  const [author, setAuthor] = useState(null);
  const [deletingThread, setDeletingThread] = useState(false);
  const [deletingComment, setDeletingComment] = useState({});
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null, // 'thread' | 'comment'
    id: null,
  });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [commentSort, setCommentSort] = useState("best"); // best | top | new | old
  const [showComposer, setShowComposer] = useState(false);
  const [votingThread, setVotingThread] = useState(false);
  const [votingComments, setVotingComments] = useState({});
  const composerId = "new-comment";
  const [focusedTick, setFocusedTick] = useState(0);

  async function load() {
    try {
      setError("");
      const { thread, comments } = await fetchThreadWithComments(threadId);
      setThread(thread);
      // fetch thread author profile
      try {
        if (thread?.user_id) {
          const { data: profile } = await supabase
            .from("users")
            .select("id, name, avatar_url")
            .eq("id", thread.user_id)
            .maybeSingle();
          setAuthor(profile || null);
        } else {
          setAuthor(null);
        }
      } catch {
        setAuthor(null);
      }
      // attach my votes to comments
      const myVotesMap = await getMyCommentVotes(threadId);
      let withMyVotes = (comments || []).map((c) => ({
        ...c,
        my_vote: myVotesMap[c.id] ?? null,
      }));
      // attach commenter profiles
      try {
        const ids = [
          ...new Set((withMyVotes || []).map((c) => c.user_id).filter(Boolean)),
        ];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("users")
            .select("id, name, avatar_url")
            .in("id", ids);
          const map = Object.fromEntries(
            (profiles || []).map((p) => [p.id, p])
          );
          withMyVotes = (withMyVotes || []).map((c) => ({
            ...c,
            author: map[c.user_id] || null,
          }));
        }
      } catch (err) {
        void err;
        /* ignore */
      }
      setComments(withMyVotes);
      const v = await getMyThreadVote(threadId);
      setMyVote(v);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load thread");
    }
  }

  useEffect(() => {
    load();
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUserId(data?.user?.id || null))
      .catch(() => setCurrentUserId(null));
    const channel = supabase
      .channel(`thread-${threadId}-realtime`)
      // DB-trigger-driven updates (threads/comments upvote/downvote counts)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "threads",
          filter: `id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row) return;
          setThread((prev) =>
            prev
              ? {
                  ...prev,
                  upvotes_count: row.upvotes_count ?? prev.upvotes_count,
                  downvotes_count: row.downvotes_count ?? prev.downvotes_count,
                }
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comments",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const c = payload?.new;
          if (!c?.id) return;
          setComments((prev) =>
            prev.map((x) =>
              x.id === c.id
                ? {
                    ...x,
                    upvotes_count: c.upvotes_count ?? x.upvotes_count,
                    downvotes_count: c.downvotes_count ?? x.downvotes_count,
                  }
                : x
            )
          );
        }
      )
      // Fallback: listen on votes directly to compute live deltas
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const op = payload?.eventType || payload?.event;
          const n = payload?.new;
          const o = payload?.old;
          const vThreadId = n?.thread_id ?? o?.thread_id;
          const commentId = n?.comment_id ?? o?.comment_id;
          const oldVal = o?.value ?? null;
          const newVal = n?.value ?? null;

          // Thread-level deltas (only for current thread)
          if (vThreadId && String(vThreadId) === String(threadId)) {
            setThread((prev) => {
              if (!prev) return prev;
              let ups = prev.upvotes_count ?? 0;
              let downs = prev.downvotes_count ?? 0;
              if (op === "INSERT") {
                if (newVal === 1) ups += 1;
                else if (newVal === -1) downs += 1;
              } else if (op === "UPDATE") {
                if (oldVal === 1 && newVal === -1) {
                  ups = Math.max(0, ups - 1);
                  downs += 1;
                } else if (oldVal === -1 && newVal === 1) {
                  downs = Math.max(0, downs - 1);
                  ups += 1;
                }
              } else if (op === "DELETE") {
                if (oldVal === 1) ups = Math.max(0, ups - 1);
                else if (oldVal === -1) downs = Math.max(0, downs - 1);
              }
              return { ...prev, upvotes_count: ups, downvotes_count: downs };
            });
          }

          // Comment-level deltas (only for comments in current thread)
          if (commentId) {
            setComments((prev) =>
              prev.map((c) => {
                if (c.id !== commentId) return c;
                let ups = c.upvotes_count ?? 0;
                let downs = c.downvotes_count ?? 0;
                if (op === "INSERT") {
                  if (newVal === 1) ups += 1;
                  else if (newVal === -1) downs += 1;
                } else if (op === "UPDATE") {
                  if (oldVal === 1 && newVal === -1) {
                    ups = Math.max(0, ups - 1);
                    downs += 1;
                  } else if (oldVal === -1 && newVal === 1) {
                    downs = Math.max(0, downs - 1);
                    ups += 1;
                  }
                } else if (op === "DELETE") {
                  if (oldVal === 1) ups = Math.max(0, ups - 1);
                  else if (oldVal === -1) downs = Math.max(0, downs - 1);
                }
                return { ...c, upvotes_count: ups, downvotes_count: downs };
              })
            );
          }
        }
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        void err;
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Refresh when window regains focus or document becomes visible again
  useEffect(() => {
    const onFocus = () => setFocusedTick((t) => t + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setFocusedTick((t) => t + 1);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Debounced reload on focus changes (avoids empty flashes during auth refresh)
  useEffect(() => {
    // Only reload if we have nothing yet or content is older than 10s
    if (!thread || !thread.id) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTick]);

  const netScore = (u, d) => Number(u || 0) - Number(d || 0) || 0;

  // helper to build nested comments tree
  function buildTree(flat) {
    const byId = {};
    (flat || []).forEach((c) => (byId[c.id] = { ...c, children: [] }));
    const roots = [];
    (flat || []).forEach((c) => {
      if (c.parent_id) {
        if (byId[c.parent_id]) byId[c.parent_id].children.push(byId[c.id]);
        else roots.push(byId[c.id]);
      } else {
        roots.push(byId[c.id]);
      }
    });
    return roots;
  }

  // sort comparator based on commentSort
  const commentComparator = useMemo(() => {
    switch (commentSort) {
      case "new":
        return (a, b) => new Date(b.created_at) - new Date(a.created_at);
      case "old":
        return (a, b) => new Date(a.created_at) - new Date(b.created_at);
      case "top":
      case "best":
      default:
        return (a, b) => {
          const as = netScore(a.upvotes_count, a.downvotes_count);
          const bs = netScore(b.upvotes_count, b.downvotes_count);
          if (bs !== as) return bs - as;
          return new Date(a.created_at) - new Date(b.created_at);
        };
    }
  }, [commentSort]);

  const sortTree = React.useCallback(
    (nodes) => {
      const arr = [...(nodes || [])].sort(commentComparator);
      for (const n of arr) {
        if (n.children && n.children.length) n.children = sortTree(n.children);
      }
      return arr;
    },
    [commentComparator]
  );

  const sortedTree = useMemo(
    () => sortTree(buildTree(comments)),
    [comments, sortTree]
  );

  // collapse and comment share removed

  // removed thread-level save; composer toggles instead
  async function postComment(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = form.body.value.trim();
    if (!body) return;
    setPosting(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("You must be signed in to comment");
      const { data, error } = await supabase
        .from("comments")
        .insert([{ body, thread_id: threadId, user_id: user.id }])
        .select(
          "id, body, user_id, thread_id, created_at, upvotes_count, downvotes_count"
        )
        .single();
      if (error) throw error;
      if (form && typeof form.reset === "function") form.reset();
      // Optimistically add at end and bump thread comment count
      setComments((prev) => [...prev, { ...data, my_vote: null }]);
      setThread((t) =>
        t ? { ...t, comments_count: (t.comments_count || 0) + 1 } : t
      );
      setShowComposer(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  // postReply removed

  function requestDeleteThread() {
    setConfirmState({ open: true, type: "thread", id: threadId });
  }

  async function actuallyDeleteThread() {
    setDeletingThread(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("You must be signed in to delete");
      const { error } = await supabase
        .from("threads")
        .delete()
        .eq("id", threadId)
        .eq("user_id", user.id);
      if (error) throw error;
      setConfirmState({ open: false, type: null, id: null });
      window.history.back();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete thread");
    } finally {
      setDeletingThread(false);
    }
  }

  function requestDeleteComment(commentId) {
    setConfirmState({ open: true, type: "comment", id: commentId });
  }

  async function actuallyDeleteComment(commentId) {
    setDeletingComment((m) => ({ ...m, [commentId]: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("You must be signed in to delete");
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setThread((t) =>
        t
          ? { ...t, comments_count: Math.max(0, (t.comments_count || 1) - 1) }
          : t
      );
      setConfirmState({ open: false, type: null, id: null });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete comment");
    } finally {
      setDeletingComment((m) => ({ ...m, [commentId]: false }));
    }
  }

  async function onConfirmDelete() {
    try {
      if (confirmState.type === "thread") {
        await actuallyDeleteThread();
      } else if (confirmState.type === "comment" && confirmState.id) {
        await actuallyDeleteComment(confirmState.id);
      }
    } catch (err) {
      // errors are handled within the called functions
      void err;
    }
  }

  async function voteThread(val) {
    if (!currentUserId) {
      // prompt sign-in
      window.dispatchEvent(
        new CustomEvent("openAuthModal", { detail: { mode: "signin" } })
      );
      return;
    }
    if (votingThread) return;
    setVotingThread(true);
    try {
      // Optimistic counts using previous myVote
      setThread((prev) => {
        if (!prev) return prev;
        let ups = prev.upvotes_count ?? 0;
        let downs = prev.downvotes_count ?? 0;
        if (myVote === 1 && val === 1) {
          // remove upvote
          ups = Math.max(0, ups - 1);
          setMyVote(null);
        } else if (myVote === -1 && val === -1) {
          // remove downvote
          downs = Math.max(0, downs - 1);
          setMyVote(null);
        } else if (myVote === 1 && val === -1) {
          ups = Math.max(0, ups - 1);
          downs = downs + 1;
          setMyVote(-1);
        } else if (myVote === -1 && val === 1) {
          downs = Math.max(0, downs - 1);
          ups = ups + 1;
          setMyVote(1);
        } else if (myVote == null && val === 1) {
          ups = ups + 1;
          setMyVote(1);
        } else if (myVote == null && val === -1) {
          downs = downs + 1;
          setMyVote(-1);
        }
        return { ...prev, upvotes_count: ups, downvotes_count: downs };
      });

      const t = await toggleThreadVote(threadId, val);
      setThread((prev) => {
        if (!prev) return prev;
        const zeroFromServer =
          (t.upvotes_count ?? 0) === 0 && (t.downvotes_count ?? 0) === 0;
        const hadNonZero =
          (prev.upvotes_count ?? 0) + (prev.downvotes_count ?? 0) > 0;
        if (zeroFromServer && hadNonZero) {
          // Keep optimistic counts if server aggregation hasn't updated yet
          return { ...prev, my_vote: t.my_vote ?? myVote ?? null };
        }
        return {
          ...prev,
          upvotes_count: t.upvotes_count ?? prev.upvotes_count,
          downvotes_count: t.downvotes_count ?? prev.downvotes_count,
        };
      });
      setMyVote(t.my_vote ?? null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Vote failed");
    } finally {
      setVotingThread(false);
    }
  }

  async function voteComment(commentId, val) {
    if (!currentUserId) {
      window.dispatchEvent(
        new CustomEvent("openAuthModal", { detail: { mode: "signin" } })
      );
      return;
    }
    if (votingComments[commentId]) return;
    setVotingComments((m) => ({ ...m, [commentId]: true }));
    try {
      // Optimistic update
      setComments((prev) =>
        prev.map((cm) => {
          if (cm.id !== commentId) return cm;
          let ups = cm.upvotes_count ?? 0;
          let downs = cm.downvotes_count ?? 0;
          if (cm.my_vote === 1 && val === 1) {
            ups = Math.max(0, ups - 1);
            cm = { ...cm, my_vote: null };
          } else if (cm.my_vote === -1 && val === -1) {
            downs = Math.max(0, downs - 1);
            cm = { ...cm, my_vote: null };
          } else if (cm.my_vote === 1 && val === -1) {
            ups = Math.max(0, ups - 1);
            downs += 1;
            cm = { ...cm, my_vote: -1 };
          } else if (cm.my_vote === -1 && val === 1) {
            downs = Math.max(0, downs - 1);
            ups += 1;
            cm = { ...cm, my_vote: 1 };
          } else if (cm.my_vote == null && val === 1) {
            ups += 1;
            cm = { ...cm, my_vote: 1 };
          } else if (cm.my_vote == null && val === -1) {
            downs += 1;
            cm = { ...cm, my_vote: -1 };
          }
          return { ...cm, upvotes_count: ups, downvotes_count: downs };
        })
      );

      const c = await toggleCommentVote(commentId, val);
      setComments((prev) =>
        prev.map((cm) => {
          if (cm.id !== commentId) return cm;
          const zeroFromServer =
            (c.upvotes_count ?? 0) === 0 && (c.downvotes_count ?? 0) === 0;
          const hadNonZero =
            (cm.upvotes_count ?? 0) + (cm.downvotes_count ?? 0) > 0;
          const nextCounts =
            zeroFromServer && hadNonZero
              ? {
                  upvotes_count: cm.upvotes_count,
                  downvotes_count: cm.downvotes_count,
                }
              : {
                  upvotes_count: c.upvotes_count ?? cm.upvotes_count,
                  downvotes_count: c.downvotes_count ?? cm.downvotes_count,
                };
          return {
            ...cm,
            ...nextCounts,
            my_vote: c.my_vote ?? cm.my_vote ?? null,
          };
        })
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Vote failed");
    } finally {
      setVotingComments((m) => ({ ...m, [commentId]: false }));
    }
  }

  if (!thread) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        {error ? <div className="text-red-600">{error}</div> : "Loading…"}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => window.history.back()}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50"
        >
          ← Back to Forum
        </button>
        {currentUserId && currentUserId === thread?.user_id && (
          <button
            onClick={requestDeleteThread}
            disabled={deletingThread}
            className="text-sm px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            {deletingThread ? "Deleting…" : "Delete thread"}
          </button>
        )}
      </div>
      {/* Thread header styled like forum card */}
      <div className="p-4 mb-4 border border-slate-200 rounded-lg bg-white/60">
        {/* Top row: Name   Date */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="truncate">
            {author?.name ? (
              <span className="font-medium text-slate-800">{author.name}</span>
            ) : (
              <span className="text-slate-500">Anonymous</span>
            )}
          </div>
          <span className="shrink-0">
            {new Date(thread.created_at).toLocaleString()}
          </span>
        </div>

        {/* Title */}
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {thread.title}
        </h1>

        {/* Body or Image */}
        {thread.image_url ? (
          <div className="mt-3">
            <img
              src={thread.image_url}
              alt={thread.title || "Thread image"}
              className="max-h-[520px] w-full object-contain rounded-md border border-slate-200 bg-slate-50"
            />
          </div>
        ) : thread.body ? (
          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {thread.body}
          </p>
        ) : null}

        {/* Bottom row: votes and comments */}
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <button
            aria-label="Upvote"
            onClick={() => voteThread(1)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
              myVote === 1
                ? "border-green-300 text-green-700 bg-green-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
            disabled={votingThread}
          >
            ▲ <span className="tabular-nums">{thread.upvotes_count ?? 0}</span>
          </button>
          <button
            aria-label="Downvote"
            onClick={() => voteThread(-1)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
              myVote === -1
                ? "border-rose-300 text-rose-700 bg-rose-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
            disabled={votingThread}
          >
            ▼{" "}
            <span className="tabular-nums">{thread.downvotes_count ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowComposer((v) => !v);
              setTimeout(() => {
                const el = document.getElementById(composerId);
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 0);
            }}
            className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="Add a comment"
            title="Add a comment"
          >
            💬{" "}
            <span className="tabular-nums">
              {thread.comments_count ?? comments.length}
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-medium">
          Comments ({thread.comments_count ?? comments.length})
        </h2>
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Sort by
          <select
            value={commentSort}
            onChange={(e) => setCommentSort(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white"
          >
            <option value="best">Best</option>
            <option value="top">Top</option>
            <option value="new">New</option>
            <option value="old">Old</option>
          </select>
        </label>
      </div>
      {/* Composer toggled by header comment chip */}
      {showComposer && (
        <form id={composerId} onSubmit={postComment} className="p-3">
          <div className="flex items-start gap-3 p-3 border border-slate-200 bg-white rounded-md">
            <textarea
              id="body"
              name="body"
              className="flex-1 resize-none bg-transparent outline-none px-3 py-2 min-h-[56px] rounded-md"
              placeholder="What are your thoughts?"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const f = e.currentTarget.closest("form");
                  if (f) f.reset();
                  setShowComposer(false);
                }}
                className="px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={posting}
                className="px-4 py-1.5 rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Comment"}
              </button>
            </div>
          </div>
        </form>
      )}

      <ul className="grid gap-3 mb-6">
        {sortedTree.map((c) => (
          <li key={c.id} className="">
            <div
              id={`c-${c.id}`}
              className="p-3 border border-slate-100 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {c.author?.name ? (
                  <span className="font-medium text-slate-700">
                    {c.author.name}
                  </span>
                ) : null}
                <span>{new Date(c.created_at).toLocaleString()}</span>
                {/* collapse and share removed */}
                {/* Reply removed by request */}
                {currentUserId && c.user_id === currentUserId && (
                  <button
                    onClick={() => requestDeleteComment(c.id)}
                    disabled={!!deletingComment[c.id]}
                    className="ml-auto text-xs px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deletingComment[c.id] ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-slate-700">
                {c.body}
              </div>
              {/* Bottom row: up/down votes (like thread) */}
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <button
                  aria-label="Upvote comment"
                  onClick={() => voteComment(c.id, 1)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                    c.my_vote === 1
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                  disabled={!!votingComments[c.id]}
                >
                  ▲ <span className="tabular-nums">{c.upvotes_count ?? 0}</span>
                </button>
                <button
                  aria-label="Downvote comment"
                  onClick={() => voteComment(c.id, -1)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                    c.my_vote === -1
                      ? "border-rose-300 text-rose-700 bg-rose-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                  disabled={!!votingComments[c.id]}
                >
                  ▼{" "}
                  <span className="tabular-nums">{c.downvotes_count ?? 0}</span>
                </button>
              </div>
            </div>

            {/* Reply form removed by request */}

            {/* children */}
            {c.children && c.children.length > 0 && (
              <div className="ml-14 mt-3 space-y-3">
                {c.children.map((ch) => (
                  <div
                    key={ch.id}
                    id={`c-${ch.id}`}
                    className="p-3 border border-slate-100 rounded-lg bg-white/50"
                  >
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {ch.author?.name ? (
                        <span className="font-medium text-slate-700">
                          {ch.author.name}
                        </span>
                      ) : null}
                      <span>{new Date(ch.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-slate-700">
                      {ch.body}
                    </div>
                    {/* Bottom row votes for reply */}
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                      <button
                        aria-label="Upvote reply"
                        onClick={() => voteComment(ch.id, 1)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                          ch.my_vote === 1
                            ? "border-green-300 text-green-700 bg-green-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                        disabled={!!votingComments[ch.id]}
                      >
                        ▲{" "}
                        <span className="tabular-nums">
                          {ch.upvotes_count ?? 0}
                        </span>
                      </button>
                      <button
                        aria-label="Downvote reply"
                        onClick={() => voteComment(ch.id, -1)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                          ch.my_vote === -1
                            ? "border-rose-300 text-rose-700 bg-rose-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                        disabled={!!votingComments[ch.id]}
                      >
                        ▼{" "}
                        <span className="tabular-nums">
                          {ch.downvotes_count ?? 0}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
        {!comments.length && (
          <li className="text-slate-500">No comments yet.</li>
        )}
      </ul>

      {/* Removed standalone Add a comment button; use the comment icon in header */}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        isOpen={!!confirmState.open}
        onClose={() => setConfirmState({ open: false, type: null, id: null })}
        onConfirm={onConfirmDelete}
        title={
          confirmState.type === "thread"
            ? "Delete this thread?"
            : "Delete this comment?"
        }
        message={
          confirmState.type === "thread"
            ? "This action cannot be undone and will permanently remove the thread."
            : "This action cannot be undone and will permanently remove the comment."
        }
        confirmText={
          confirmState.type === "thread"
            ? deletingThread
              ? "Deleting…"
              : "Delete thread"
            : deletingComment[confirmState.id || ""]
            ? "Deleting…"
            : "Delete comment"
        }
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
      />
    </div>
  );
}
