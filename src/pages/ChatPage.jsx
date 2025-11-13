import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useChat from "../hooks/useChat";
import { createSignedAttachmentUrl } from "../lib/chat";

// Simple chat UI page. Shows either list of contacts or active messages.
// Route: /chat (contact list) or /chat/:contactId (specific thread)
export default function ChatPage() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const {
    contacts,
    messages,
    activeContactId,
    currentUserId,
    openContact,
    sendText,
    uploadFile,
    deleteMessage,
    loadingMessages,
  } = useChat();
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const messagesContainerRef = useRef(null);
  const autoScrollRef = useRef(true);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const blobUrlsRef = useRef(new Set());

  // Activate contact when param changes
  useEffect(() => {
    if (!contactId && activeContactId) {
      openContact(null);
    }
    if (contactId && contactId !== activeContactId) {
      openContact(contactId);
    }
  }, [contactId, activeContactId, openContact]);

  // Reset resolved attachment URLs when switching threads
  useEffect(() => {
    setAttachmentUrls({});
    setPendingAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) {
          blobUrlsRef.current.delete(item.previewUrl);
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
  }, [activeContactId]);

  // Track whether we should keep snapping to bottom (user not reading older messages)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    autoScrollRef.current = true;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.clientHeight - container.scrollTop;
      autoScrollRef.current = distanceFromBottom < 140;
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeContactId]);

  // Auto-scroll on new messages or attachments when user is near bottom or has not scrolled yet
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const notScrolledYet =
      container.scrollTop === 0 && container.scrollHeight > container.clientHeight;
    if (!autoScrollRef.current && !notScrolledYet) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, pendingAttachments]);

  // Resolve signed URLs lazily for image/file attachments
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const attachments = messages.flatMap((m) => m.message_attachments || []);
      const pending = attachments.filter((att) => {
        if (!att || !att.id) return false;
        const current = attachmentUrls[att.id];
        return !current || current.startsWith("blob:");
      });
      if (pending.length === 0) return;

      const updates = {};
      for (const att of pending) {
        if (!att.storage_path) continue;
        try {
          const signedUrl = await createSignedAttachmentUrl(att.storage_path, 300);
          if (!cancelled && signedUrl) {
            updates[att.id] = signedUrl;
          }
        } catch (err) {
          console.error("Failed to create signed URL", err);
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setAttachmentUrls((prev) => {
          const next = { ...prev };
          Object.entries(updates).forEach(([id, url]) => {
            const prevUrl = next[id];
            if (prevUrl && prevUrl.startsWith("blob:")) {
              blobUrlsRef.current.delete(prevUrl);
              URL.revokeObjectURL(prevUrl);
            }
            next[id] = url;
          });
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, attachmentUrls]);

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          void err;
        }
      });
      blobUrlsRef.current.clear();
    },
    []
  );

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    try {
      if (text) {
        await sendText(text);
      }

      const attachmentsToSend = [...pendingAttachments];
      for (let i = 0; i < attachmentsToSend.length; i += 1) {
        const pending = attachmentsToSend[i];
        const { attachment } = await uploadFile(pending.file);
        if (attachment?.id && pending.previewUrl) {
          setAttachmentUrls((prev) => ({ ...prev, [attachment.id]: pending.previewUrl }));
        }
        setPendingAttachments((prev) => prev.filter((item) => item.id !== pending.id));
      }

      setInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    }
  };

  const handleFile = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const entries = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      const tempId = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`;
      blobUrlsRef.current.add(previewUrl);
      return { id: tempId, file, previewUrl };
    });
    setPendingAttachments((prev) => [...prev, ...entries]);
    e.target.value = "";
  };

  const removePendingAttachment = (id) => {
    setPendingAttachments((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) {
        blobUrlsRef.current.delete(item.previewUrl);
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const target = messages.find((m) => m.id === messageId);
      if (target?.message_attachments?.length) {
        setAttachmentUrls((prev) => {
          const next = { ...prev };
          target.message_attachments.forEach((att) => {
            const url = next[att.id];
            if (url && url.startsWith("blob:")) {
              blobUrlsRef.current.delete(url);
              URL.revokeObjectURL(url);
            }
            delete next[att.id];
          });
          return next;
        });
      }
      await deleteMessage(messageId);
    } catch (err) {
      console.error(err);
      alert("Unable to delete this message right now.");
    }
  };

  const renderContactList = () => (
    <div
      className="chat-contact-list"
      style={{
        borderRight: "1px solid #e1e4ed",
        padding: "1rem",
        overflowY: "auto",
        height: "100%",
        minHeight: 0,
        background: "#ffffff",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Chats</h2>
      {contacts.length === 0 && (
        <p style={{ opacity: 0.7 }}>No chats yet. Start one from a match card.</p>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {contacts.map((c) => (
          <li key={c.id} style={{ marginBottom: "0.5rem" }}>
            <button
              onClick={() => {
                openContact(c.id);
                navigate(`/chat/${c.id}`);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: c.id === activeContactId ? "#eef5ff" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#f2f2f2",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={c.dog_image || "/shibaPor.jpg"}
                    alt={c.dog_name || "Dog"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div>
                  <strong>{c.dog_name || "Conversation"}</strong>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    {c.last_message ? c.last_message : "No messages yet"}
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderMessages = () => {
    const activeContact = contacts.find((c) => c.id === activeContactId);
    return (
      <div
        className="chat-thread"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          background: "#ffffff",
          borderLeft: "1px solid #e1e4ed",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderBottom: "1px solid #eee",
            padding: "0.75rem 1rem",
          }}
        >
          <button onClick={() => navigate("/chat")} style={{ padding: "0.4rem 0.8rem" }}>
            &larr; Back
          </button>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f2f2f2",
            }}
          >
            <img
              src={activeContact?.dog_image || "/shibaPor.jpg"}
              alt={activeContact?.dog_name || "Dog"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
            {activeContact?.dog_name || "Conversation"}
          </h3>
        </div>
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "1rem",
            background: "#f8faff",
          }}
        >
          {loadingMessages && <p>Loading messages…</p>}
          {messages.map((m) => {
            const isOwn = currentUserId && m.sender_id === currentUserId;
            const attachments = m.message_attachments || [];
            const createdAt = m.created_at ? new Date(m.created_at) : null;
            const withinHour = createdAt ? Date.now() - createdAt.getTime() <= 3600000 : false;
            const canDelete = isOwn && !m.deleted_at && withinHour;
            return (
              <div
                key={m.id}
                style={{
                  marginBottom: "0.75rem",
                  maxWidth: "70%",
                  padding: "0.6rem 0.8rem",
                  alignSelf: isOwn ? "flex-end" : "flex-start",
                  background: isOwn ? "#d1e7ff" : "#f5f5f5",
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 14,
                }}
              >
                {m.deleted_at && <em style={{ opacity: 0.6 }}>Deleted</em>}
                {!m.deleted_at && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {m.kind === "text" && <span>{m.content}</span>}
                    {m.kind !== "text" && m.content && <span>{m.content}</span>}
                    {attachments.length > 0 &&
                      attachments.map((att) => {
                        const url = attachmentUrls[att.id];
                        const filename =
                          att.original_name ||
                          att.file_name ||
                          (att.storage_path ? att.storage_path.split("/").pop() : "Attachment");
                        const isImage = (att.mime_type || "").startsWith("image/");
                        return (
                          <div key={att.id}>
                            {isImage && url ? (
                              <img
                                src={url}
                                alt={filename}
                                style={{ maxWidth: "240px", borderRadius: 8 }}
                              />
                            ) : (
                              <a
                                href={url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#1a56db",
                                  textDecoration: url ? "underline" : "none",
                                  pointerEvents: url ? "auto" : "none",
                                }}
                              >
                                {url ? `Download ${filename}` : "Preparing attachment…"}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    {m.kind !== "text" && attachments.length === 0 && (
                      <em style={{ opacity: 0.7 }}>Attachment processing…</em>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(m.id)}
                        style={{
                          alignSelf: "flex-end",
                          background: "transparent",
                          border: "none",
                          color: "#4b5563",
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <form
          onSubmit={handleSend}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            borderTop: "1px solid #eee",
          }}
        >
          {pendingAttachments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: 12, color: "#4b5563" }}>Ready to send</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {pendingAttachments.map((att) => {
                  const isImage = att.file.type.startsWith("image/");
                  return (
                    <div
                      key={att.id}
                      style={{
                        position: "relative",
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid #cbd5f5",
                        background: "#eef4ff",
                      }}
                    >
                      {isImage ? (
                        <img
                          src={att.previewUrl}
                          alt={att.file.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ padding: "0.5rem", fontSize: 12, textAlign: "center" }}>
                          {att.file.name}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(att.id)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              style={{ flex: 1, padding: "0.6rem", border: "1px solid #ccc", borderRadius: 6 }}
            />
            <input type="file" onChange={handleFile} title="Attach file" multiple />
            <button
              type="submit"
              style={{
                padding: "0.6rem 1.2rem",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "calc(100vh - 60px)",
        background: "#f6f8fc",
        paddingBottom: "2.5rem",
        overflowY: "auto",
      }}
    >
      {renderContactList()}
      {contactId ? (
        renderMessages()
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px solid #eee",
          }}
        >
          <p style={{ color: "#666" }}>Select a conversation to start chatting.</p>
        </div>
      )}
    </div>
  );
}
