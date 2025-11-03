import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { fetchThreads, toggleThreadVote } from "../lib/forum";

export default function ForumPage() {
  const { user, loading } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [myVotes, setMyVotes] = useState({}); // { [threadId]: 1 | -1 | null }
  const [votingMap, setVotingMap] = useState({}); // in-flight votes per thread id

  // comments are loaded on the thread page now; keep thread list simple
  const [lastLoadedAt, setLastLoadedAt] = useState(0);
  // per-card delete removed from list UI; thread deletion is handled on the thread page
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canPost = useMemo(() => !!user, [user]);

  const [sort, setSort] = useState("newest");

  const load = useCallback(async () => {
    try {
      setError("");
      const rows = await fetchThreads({ limit: 50, sort });
      // Fetch display names for posters
      let enriched = rows;
      try {
        const ids = [
          ...new Set((rows || []).map((r) => r.user_id).filter(Boolean)),
        ];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("users")
            .select("id, name, avatar_url")
            .in("id", ids);
          const map = Object.fromEntries(
            (profiles || []).map((p) => [p.id, p])
          );
          enriched = rows.map((r) => ({
            ...r,
            author: map[r.user_id] || null,
          }));
        }
      } catch {
        enriched = rows;
      }
      setThreads(enriched);
      setLastLoadedAt(Date.now());
      // Preload my votes for listed threads in bulk
      if (user) {
        try {
          const ids = (rows || []).map((r) => r.id).filter(Boolean);
          const map = await (
            await import("../lib/forum")
          ).getMyThreadVotes(ids);
          setMyVotes(map || {});
        } catch {
          setMyVotes({});
        }
      } else {
        setMyVotes({});
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load threads");
    }
  }, [user, sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: reflect thread/comment count changes from other users
  useEffect(() => {
    const channel = supabase
      .channel("forum-list-realtime")
      // Threads updated elsewhere (e.g., DB trigger refreshing counts)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "threads" },
        (payload) => {
          const row = payload?.new;
          if (!row?.id) return;
          setThreads((prev) =>
            prev.map((t) =>
              t.id === row.id
                ? {
                    ...t,
                    upvotes_count: row.upvotes_count ?? t.upvotes_count,
                    downvotes_count: row.downvotes_count ?? t.downvotes_count,
                  }
                : t
            )
          );
        }
      )
      // New thread inserted elsewhere
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "threads" },
        () => {
          load();
        }
      )
      // Comment insert/delete should adjust thread comment counts in the list
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload) => {
          const op = payload?.eventType || payload?.event;
          const n = payload?.new;
          const o = payload?.old;
          const threadId = n?.thread_id ?? o?.thread_id;
          if (!threadId) return;
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== threadId) return t;
              const cur = t.comments_count ?? 0;
              if (op === "INSERT") return { ...t, comments_count: cur + 1 };
              if (op === "DELETE")
                return { ...t, comments_count: Math.max(0, cur - 1) };
              return t;
            })
          );
        }
      )
      // (comment updates handled on thread pages)
      // Fallback: react to votes directly so counts change instantly even if DB triggers are missing
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const op = payload?.eventType || payload?.event;
          const n = payload?.new;
          const o = payload?.old;
          const threadId = n?.thread_id ?? o?.thread_id;
          const oldVal = o?.value ?? null;
          const newVal = n?.value ?? null;

          // Thread-level vote deltas
          if (threadId) {
            setThreads((prev) =>
              prev.map((t) => {
                if (t.id !== threadId) return t;
                let ups = t.upvotes_count ?? 0;
                let downs = t.downvotes_count ?? 0;
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
                return { ...t, upvotes_count: ups, downvotes_count: downs };
              })
            );
          }

          // comment-level deltas are handled on thread pages
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when auth state finishes resolving or user changes
  useEffect(() => {
    if (loading === false) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  // Auto-refresh if we navigated back and list is empty
  useEffect(() => {
    if (!threads.length && loading === false) {
      const t = setTimeout(load, 600);
      return () => clearTimeout(t);
    }
  }, [threads.length, loading, load]);

  // Refresh on tab focus/visibility change if list is empty or stale
  useEffect(() => {
    function onFocus() {
      const stale = Date.now() - lastLoadedAt > 10000;
      if (!threads.length || stale) load();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [threads.length, lastLoadedAt, load]);

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!canPost) return;
    const form = e.currentTarget;
    const title = form.title.value.trim();
    const body = form.body.value.trim();
    if (!title) return;

    setBusy(true);
    setError("");
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser?.id) throw new Error("You must be signed in to post");

      const { data, error } = await supabase
        .from("threads")
        .insert([{ title, body: body || null, user_id: authUser.id }])
        .select("id")
        .maybeSingle();
      if (error) throw error;

      if (data?.id) {
        navigate(`/thread/${data.id}`);
        return true;
      } else {
        // Fallback: some setups don’t return representation; fetch latest by this user
        const { data: rows, error: selErr } = await supabase
          .from("threads")
          .select("id")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (selErr) throw selErr;
        if (rows && rows[0]?.id) {
          navigate(`/thread/${rows[0].id}`);
          return true;
        } else {
          setError(
            "Thread created, but could not fetch it due to a SELECT policy or grant. Please refresh."
          );
          await load();
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create thread");
    } finally {
      setBusy(false);
    }
    return false;
  }

  async function vote(threadId, value) {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("openAuthModal", { detail: { mode: "signin" } })
      );
      return;
    }
    if (votingMap[threadId]) return;
    setVotingMap((m) => ({ ...m, [threadId]: true }));
    try {
      // Determine new vote and apply optimistic counts deterministically
      const current = myVotes[threadId] ?? null;
      let nextMy = current;
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          let ups = t.upvotes_count ?? 0;
          let downs = t.downvotes_count ?? 0;
          if (current === 1 && value === 1) {
            ups = Math.max(0, ups - 1);
            nextMy = null;
          } else if (current === -1 && value === -1) {
            downs = Math.max(0, downs - 1);
            nextMy = null;
          } else if (current === 1 && value === -1) {
            ups = Math.max(0, ups - 1);
            downs += 1;
            nextMy = -1;
          } else if (current === -1 && value === 1) {
            downs = Math.max(0, downs - 1);
            ups += 1;
            nextMy = 1;
          } else if (current == null && value === 1) {
            ups += 1;
            nextMy = 1;
          } else if (current == null && value === -1) {
            downs += 1;
            nextMy = -1;
          }
          return { ...t, upvotes_count: ups, downvotes_count: downs };
        })
      );
      setMyVotes((m) => ({ ...m, [threadId]: nextMy }));

      const updated = await toggleThreadVote(threadId, value);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          const zeroFromServer =
            (updated.upvotes_count ?? 0) === 0 &&
            (updated.downvotes_count ?? 0) === 0;
          const hadNonZero =
            (t.upvotes_count ?? 0) + (t.downvotes_count ?? 0) > 0;
          if (zeroFromServer && hadNonZero) return t; // keep optimistic if server hasn't aggregated yet
          return {
            ...t,
            upvotes_count: updated.upvotes_count ?? t.upvotes_count,
            downvotes_count: updated.downvotes_count ?? t.downvotes_count,
          };
        })
      );
      // If server returned a concrete my_vote, use it; otherwise keep the optimistic "nextMy"
      setMyVotes((m) => ({
        ...m,
        [threadId]: updated.my_vote ?? m[threadId] ?? nextMy ?? null,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Vote failed");
    } finally {
      setVotingMap((m) => ({ ...m, [threadId]: false }));
    }
  }

  // per-thread comments handled on the thread page now

  // Thread deletion is intentionally not available from the forum list UI.
  // Deleting a thread should be done on the thread detail page where the owner has context.

  // comment deletion handled on thread page

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            <span className="sr-only">Filter threads</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-200 bg-white"
              aria-label="Filter threads"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_popular">Most popular</option>
              <option value="least_popular">Least popular</option>
            </select>
          </label>
          <button
            onClick={() => {
              if (canPost) setShowCreateModal(true);
              else
                window.dispatchEvent(
                  new CustomEvent("openAuthModal", {
                    detail: { mode: "signin" },
                  })
                );
            }}
            className={`text-sm px-3 py-1.5 rounded-md ${
              canPost
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-600 text-white opacity-60"
            }`}
            aria-label="Create post"
            title={canPost ? "Create a new post" : "Sign in to create a post"}
          >
            {canPost ? "Create Post" : "Sign in to post"}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative z-10 w-full max-w-xl mx-4">
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Create Post</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                  className="text-slate-600 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  const ok = await handleCreateThread(e);
                  if (ok) setShowCreateModal(false);
                }}
                className="grid gap-3"
              >
                <label className="text-sm font-medium" htmlFor="modal-title">
                  Title
                </label>
                <input
                  id="modal-title"
                  name="title"
                  className="border rounded-md p-2"
                  placeholder="What do you want to discuss?"
                />
                <label className="text-sm font-medium" htmlFor="modal-body">
                  Body (optional)
                </label>
                <textarea
                  id="modal-body"
                  name="body"
                  className="border rounded-md p-2 min-h-24"
                  placeholder="Add details here..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 rounded-md border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy ? "Posting…" : "Post Thread"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inline post removed — modal is primary. */}

      <ul className="grid gap-3">
        {threads.map((t) => {
          const excerpt = t.body
            ? t.body.length > 220
              ? t.body.slice(0, 220) + "…"
              : t.body
            : "";
          return (
            <li
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/thread/${t.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigate(`/thread/${t.id}`);
              }}
              className="p-4 border border-slate-200 rounded-lg bg-white/60 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                {/* Top row: Name   Date */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="truncate">
                    {t.author?.name ? (
                      <span className="font-medium text-slate-800">
                        {t.author.name}
                      </span>
                    ) : (
                      <span className="text-slate-500">Anonymous</span>
                    )}
                  </div>
                  <span className="shrink-0">
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Title */}
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {t.title}
                </div>

                {/* Body excerpt */}
                {excerpt && (
                  <p className="mt-1 text-sm text-slate-700 line-clamp-3">
                    {excerpt}
                  </p>
                )}

                {/* Bottom row: up/down votes and comments */}
                <div
                  className="mt-3 flex items-center gap-2 text-sm text-slate-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    aria-label="Upvote"
                    onClick={(e) => {
                      e.stopPropagation();
                      vote(t.id, 1);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                      myVotes[t.id] === 1
                        ? "border-green-300 text-green-700 bg-green-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                    disabled={!!votingMap[t.id]}
                  >
                    ▲{" "}
                    <span className="tabular-nums">{t.upvotes_count ?? 0}</span>
                  </button>
                  <button
                    aria-label="Downvote"
                    onClick={(e) => {
                      e.stopPropagation();
                      vote(t.id, -1);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                      myVotes[t.id] === -1
                        ? "border-rose-300 text-rose-700 bg-rose-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                    disabled={!!votingMap[t.id]}
                  >
                    ▼{" "}
                    <span className="tabular-nums">
                      {t.downvotes_count ?? 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/thread/${t.id}`);
                    }}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                    aria-label="Open thread comments"
                    title="Open comments"
                  >
                    💬{" "}
                    <span className="tabular-nums">
                      {t.comments_count ?? 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* delete button removed from forum list cards per design */}
            </li>
          );
        })}
        {!threads.length && (
          <li className="text-slate-500">
            No threads yet. Be the first to post.
          </li>
        )}
      </ul>
    </div>
  );
}
