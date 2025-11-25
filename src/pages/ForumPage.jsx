import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FaRegCommentDots, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { uploadFileToBucket } from "../lib/storage";
import { safeGetUser } from "../lib/auth";
import { fetchThreads, toggleThreadVote } from "../lib/forum";
import "./FindMatchPage.css";
import "./ForumPage.css"; // warm dog-lover theme
import { getCookie, setCookie } from "../utils/cookies";
import LoadingState from "../components/LoadingState";
import ErrorMessage from "../components/ErrorMessage";

// Module-level cache to survive unmounts and brief auth revalidations between tab switches
const GLOBAL_FORUM_CACHE = (globalThis.__DB_GLOBAL_FORUM_CACHE__ =
  globalThis.__DB_GLOBAL_FORUM_CACHE__ || {
    threads: [],
    lastLoadedAt: 0,
    sort: "new",
  });

export default function ForumPage() {
  const { user, loading } = React.useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [threads, setThreads] = useState(() => GLOBAL_FORUM_CACHE.threads || []);
  const [busy, setBusy] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [myVotes, setMyVotes] = useState({}); // { [threadId]: 1 | -1 | null }
  const [votingMap, setVotingMap] = useState({}); // in-flight votes per thread id

  // comments are loaded on the thread page now; keep thread list simple
  const lastLoadedAtRef = useRef(GLOBAL_FORUM_CACHE.lastLoadedAt || 0);
  const [focusedTick, setFocusedTick] = useState(0);
  // Avoid overlapping loads
  const loadingRef = useRef(false);
  // per-card delete removed from list UI; thread deletion is handled on the thread page
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postType, setPostType] = useState("text"); // 'text' | 'image'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const canPost = useMemo(() => !!user, [user]);

  const [sort, setSort] = useState(() => getCookie("forum_sort") || "new");

  const lastRetryAtRef = useRef(0);

  const load = useCallback(async () => {
    try {
      setError("");
      setListLoading(true);
      // If auth is in flux and we have cached threads, prefer showing cache instead of a blank state.
      if ((!user || loading) && (GLOBAL_FORUM_CACHE.threads || []).length) {
        setThreads(GLOBAL_FORUM_CACHE.threads);
        lastLoadedAtRef.current = GLOBAL_FORUM_CACHE.lastLoadedAt || Date.now();
      }

      // Prevent overlapping loads (helps during rapid focus/visibility events)
      if (loadingRef.current) return;
      loadingRef.current = true;

      const rows = await fetchThreads({ limit: 50, sort });
      // Fetch display names for posters
      let enriched = rows;
      try {
        const ids = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("users")
            .select("id, name, avatar_url")
            .in("id", ids);
          const map = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
          enriched = rows.map((r) => ({
            ...r,
            author: map[r.user_id] || null,
          }));
        }
      } catch {
        enriched = rows;
      }
      // If server returned 0 rows but we have a non-empty cache and the user is not yet authenticated,
      // keep showing the cached list to avoid a confusing empty flash after a tab switch.
      const isUnauthed = !user && loading !== false;
      if (enriched.length === 0 && (GLOBAL_FORUM_CACHE.threads || []).length && isUnauthed) {
        setThreads(GLOBAL_FORUM_CACHE.threads);
        lastLoadedAtRef.current = GLOBAL_FORUM_CACHE.lastLoadedAt || Date.now();
      } else {
        setThreads(enriched);
        const ts = Date.now();
        lastLoadedAtRef.current = ts;
        // persist to module cache
        GLOBAL_FORUM_CACHE.threads = enriched;
        GLOBAL_FORUM_CACHE.lastLoadedAt = ts;
        GLOBAL_FORUM_CACHE.sort = sort;
      }
      // Preload my votes for listed threads in bulk
      if (user) {
        try {
          const ids = (rows || []).map((r) => r.id).filter(Boolean);
          const map = await (await import("../lib/forum")).getMyThreadVotes(ids);
          setMyVotes(map || {});
        } catch {
          setMyVotes({});
        }
      } else {
        setMyVotes({});
      }
    } catch (err) {
      console.error(err);
      const msg = (err?.message || "").toLowerCase();
      // If RLS/permission or transient auth refresh causes a denied select,
      // keep any cached threads visible and schedule a short retry.
      if (
        /permission denied|not allowed|rls|anonymous/.test(msg) &&
        (GLOBAL_FORUM_CACHE.threads || []).length
      ) {
        setThreads(GLOBAL_FORUM_CACHE.threads);
        const now = Date.now();
        if (now - (lastRetryAtRef.current || 0) > 1200) {
          lastRetryAtRef.current = now;
          setTimeout(() => {
            try {
              load();
            } catch {
              /* noop */
            }
          }, 800);
        }
      } else {
        setError(err.message || "Failed to load threads");
      }
    } finally {
      loadingRef.current = false;
      setListLoading(false);
    }
  }, [user, sort, loading]);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, () => {
        load();
      })
      // Comment insert/delete should adjust thread comment counts in the list
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (payload) => {
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
            if (op === "DELETE") return { ...t, comments_count: Math.max(0, cur - 1) };
            return t;
          })
        );
      })
      // (comment updates handled on thread pages)
      // Fallback: react to votes directly so counts change instantly even if DB triggers are missing
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, (payload) => {
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
      })
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

  // Refresh on tab focus/visibility change; nudge refetch via focusedTick to debounce
  useEffect(() => {
    function onFocusVisibility() {
      setFocusedTick((t) => t + 1);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") onFocusVisibility();
    }
    window.addEventListener("focus", onFocusVisibility);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocusVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Debounced reload when tab gains focus or becomes visible; keep cache to avoid empty flashes
  useEffect(() => {
    const stale = Date.now() - (GLOBAL_FORUM_CACHE.lastLoadedAt || 0) > 10000;
    if (!threads.length || stale) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTick]);

  async function handleCreateThread(e) {
    e.preventDefault();
    if (!canPost) return;
    const form = e.currentTarget;
    const title = form.title.value.trim();
    const body = (form.body?.value || "").trim();
    if (!title) return;

    setBusy(true);
    setError("");
    try {
      const { data: sess } = await safeGetUser();
      const authUser = sess?.user;
      if (!authUser?.id) throw new Error("You must be signed in to post");
      let image_url = null;
      if (postType === "image") {
        const file = imageFile || form.image?.files?.[0];
        if (!file) throw new Error("Please choose an image file");
        const path = `${authUser.id}/${Date.now()}_${file.name}`;
        const { publicUrl } = await uploadFileToBucket({
          bucket: "thread-images",
          path,
          file,
          upsert: false,
          contentType: file.type,
        });
        image_url = publicUrl;
        if (!image_url)
          throw new Error(
            "Could not get a public URL for the uploaded image; check storage policy"
          );
      }

      // Build insert payload: only include image_url when actually posting an image
      const payload = {
        title,
        body: postType === "text" ? body || null : null,
        user_id: authUser.id,
      };
      if (postType === "image") payload.image_url = image_url;

      const { data, error } = await supabase
        .from("threads")
        .insert([payload])
        .select("id")
        .maybeSingle();
      if (error) throw error;

      if (data?.id) {
        // Notify success, then navigate
        try {
          window.dispatchEvent(
            new CustomEvent("toast", {
              detail: {
                message: "Post published to the forum",
                type: "success",
              },
            })
          );
        } catch {
          /* noop */
        }
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
          try {
            window.dispatchEvent(
              new CustomEvent("toast", {
                detail: {
                  message: "Post published to the forum",
                  type: "success",
                },
              })
            );
          } catch {
            /* noop */
          }
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
      window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { mode: "signin" } }));
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
            (updated.upvotes_count ?? 0) === 0 && (updated.downvotes_count ?? 0) === 0;
          const hadNonZero = (t.upvotes_count ?? 0) + (t.downvotes_count ?? 0) > 0;
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
          <label className="text-xs text-slate-600 flex items-center gap-2">
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                const val = e.target.value;
                setSort(val);
                try {
                  setCookie("forum_sort", val, { days: 60 });
                } catch (err) {
                  void err;
                }
              }}
              className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white"
              aria-label="Sort threads"
            >
              <option value="best">Best</option>
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="old">Old</option>
            </select>
          </label>
          <button
            onClick={() => {
              if (canPost) {
                // Reset modal state on open
                setPostType("text");
                if (imagePreview) {
                  try {
                    URL.revokeObjectURL(imagePreview);
                  } catch {
                    /* noop */
                  }
                }
                setImageFile(null);
                setImagePreview(null);
                setShowCreateModal(true);
              } else
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

      {error && <ErrorMessage message={error} />}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => {
              setShowCreateModal(false);
              if (imagePreview) {
                try {
                  URL.revokeObjectURL(imagePreview);
                } catch {
                  /* noop */
                }
              }
              setImageFile(null);
              setImagePreview(null);
            }}
          />
          {/* Panel */}
          <div className="relative z-10 mx-auto max-w-2xl p-4 min-h-full flex items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold">Create post</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                  className="text-slate-500 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  const ok = await handleCreateThread(e);
                  if (ok) {
                    if (imagePreview) {
                      try {
                        URL.revokeObjectURL(imagePreview);
                      } catch {
                        /* noop */
                      }
                    }
                    setShowCreateModal(false);
                    setImageFile(null);
                    setImagePreview(null);
                  }
                }}
                className="p-5 grid gap-4"
              >
                {/* Segmented control */}
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-sm w-max">
                  <button
                    type="button"
                    onClick={() => setPostType("text")}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      postType === "text"
                        ? "bg-white shadow-sm border border-slate-200"
                        : "hover:bg-white/60"
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType("image")}
                    className={`ml-1 px-3 py-1.5 rounded-md transition-colors ${
                      postType === "image"
                        ? "bg-white shadow-sm border border-slate-200"
                        : "hover:bg-white/60"
                    }`}
                  >
                    Image
                  </button>
                </div>

                {/* Title */}
                <div className="grid gap-1">
                  <label className="text-xs text-slate-600" htmlFor="modal-title">
                    Title
                  </label>
                  <input
                    id="modal-title"
                    name="title"
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Catchy headline"
                  />
                </div>

                {postType === "text" ? (
                  <div className="grid gap-1">
                    <label className="text-xs text-slate-600" htmlFor="modal-body">
                      Body (optional)
                    </label>
                    <textarea
                      id="modal-body"
                      name="body"
                      className="rounded-lg border border-slate-300 px-3 py-2 min-h-28 outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Write your thoughts..."
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <label className="text-xs text-slate-600" htmlFor="modal-image">
                      Image
                    </label>
                    {/* Dropzone-like area */}
                    <label
                      htmlFor="modal-image"
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 cursor-pointer hover:bg-slate-50"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Selected"
                          className="max-h-56 w-full object-contain rounded-md border border-slate-200 bg-slate-50"
                        />
                      ) : (
                        <>
                          <span>Drag and drop an image here, or click to select</span>
                          <span className="text-xs text-slate-500">
                            PNG, JPG, GIF (per your rules)
                          </span>
                        </>
                      )}
                    </label>
                    <input
                      id="modal-image"
                      name="image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (!f) {
                          if (imagePreview) {
                            try {
                              URL.revokeObjectURL(imagePreview);
                            } catch {
                              /* noop */
                            }
                          }
                          setImageFile(null);
                          setImagePreview(null);
                          return;
                        }
                        if (imagePreview) {
                          try {
                            URL.revokeObjectURL(imagePreview);
                          } catch {
                            /* noop */
                          }
                        }
                        setImageFile(f);
                        try {
                          const url = URL.createObjectURL(f);
                          setImagePreview(url);
                        } catch {
                          setImagePreview(null);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      if (imagePreview) {
                        try {
                          URL.revokeObjectURL(imagePreview);
                        } catch {
                          /* noop */
                        }
                      }
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy ? "Posting…" : "Post"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inline post removed — modal is primary. */}

      {listLoading && threads.length === 0 ? (
        <LoadingState message="Loading forum..." minHeight={140} />
      ) : (
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
                  if (e.key === "Enter" || e.key === " ") navigate(`/thread/${t.id}`);
                }}
                className="p-4 border border-slate-200 rounded-lg bg-white/60 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  {/* Top row: Name   Date */}
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div className="truncate">
                      {t.author?.name ? (
                        <span className="font-medium text-slate-800">{t.author.name}</span>
                      ) : (
                        <span className="text-slate-500">Anonymous</span>
                      )}
                    </div>
                    <span className="shrink-0">{new Date(t.created_at).toLocaleString()}</span>
                  </div>

                  {/* Title */}
                  <div className="mt-1 text-lg font-semibold text-slate-900">{t.title}</div>

                  {/* Body excerpt or Image preview */}
                  {t.image_url ? (
                    <div className="mt-2">
                      <img
                        src={t.image_url}
                        alt={t.title || "Thread image"}
                        className="max-h-72 w-full object-contain rounded-md border border-slate-200 bg-slate-50"
                        loading="lazy"
                      />
                    </div>
                  ) : excerpt ? (
                    <p className="mt-1 text-sm text-slate-700 line-clamp-3">{excerpt}</p>
                  ) : null}

                  {t.dog_id && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">
                        Featured dog: {t.dog_name || "Unnamed"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {(t.dog_gender || "").toString().toLowerCase() || "gender n/a"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                        <span>
                          {(() => {
                            const gender = (t.dog_gender || "").toString().toLowerCase();
                            if (gender === "male") {
                              const pct = Number(t.male_success_rate_pct || 0).toFixed(0);
                              return `Success rate ${pct}% (${t.match_success_count || 0}/${t.match_completed_count || 0})`;
                            }
                            return `${t.female_successful_matings || 0} verified matings`;
                          })()}
                        </span>
                        <span>{t.match_requests_count || 0} requests</span>
                        <span>{t.match_completed_count || 0} completed</span>
                      </div>
                    </div>
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
                      <FaArrowUp className="inline" />
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
                      <FaArrowDown className="inline" />
                      <span className="tabular-nums">{t.downvotes_count ?? 0}</span>
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
                      <FaRegCommentDots className="inline" />
                      <span className="tabular-nums">{t.comments_count ?? 0}</span>
                    </button>
                  </div>
                </div>

                {/* delete button removed from forum list cards per design */}
              </li>
            );
          })}
          {!threads.length && (
            <li className="text-slate-500">No threads yet. Be the first to post.</li>
          )}
        </ul>
      )}
    </div>
  );
}
