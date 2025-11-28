import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useChat from "../hooks/useChat";
import { createSignedAttachmentUrl } from "../lib/chat";
import useDogs from "../hooks/useDogs";
import { useAuth } from "../hooks/useAuth";
import ReportModal from "../components/ReportModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { createMatchRequest } from "../lib/matches";
import LoadingState from "../components/LoadingState";
import "./ChatPage.css"; // warm dog-lover theme

// Helper: truncate long preview messages for contact list
function truncatePreview(text, max = 80) {
  if (!text) return "";
  try {
    const singleSpaced = String(text).replace(/\s+/g, " ").trim();
    if (singleSpaced.length <= max) return singleSpaced;
    return singleSpaced.slice(0, max - 1) + "…";
  } catch {
    return text;
  }
}

// Paperclip icon for attaching files
function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 20, height: 20 }}
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// Three dots menu icon
function ThreeDotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// Simple chat UI page. Shows either list of contacts or active messages.
// Route: /chat (contact list) or /chat/:contactId (specific thread)
export default function ChatPage() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    loadingContacts,
  } = useChat();
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const messagesContainerRef = useRef(null);
  const autoScrollRef = useRef(true);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const blobUrlsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const textareaRef = useRef(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedMessageForReport, setSelectedMessageForReport] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestContext, setRequestContext] = useState(null);
  const [requestingMatch, setRequestingMatch] = useState(false);
  const [requestError, setRequestError] = useState("");

  // Fetch user's dogs using the hook
  const { dogs: userDogs } = useDogs();
  const activeContact = contacts.find((c) => c.id === activeContactId);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Set page title
  useEffect(() => {
    const contactName = activeContact?.dog_name || activeContact?.my_dog_name;
    document.title = contactName
      ? `Chat with ${contactName} 🐾 | DaBreeder`
      : "Messages 🐾 | DaBreeder";
  }, [activeContact]);

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
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Failed to send message", type: "error" },
        })
      );
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate line height (approximately 1.5em * font size)
    const lineHeight = 1.5 * 15; // 0.9375rem * 16px = 15px
    const maxHeight = lineHeight * 5; // 5 lines

    // Set new height based on content, max 5 lines
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Show scrollbar only when content exceeds max height
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.overflowY = "hidden";
    }
  }, [input]);

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
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Unable to delete this message right now", type: "error" },
        })
      );
    }
  };

  const handleOpenMatchRequest = (context) => {
    if (!context) return;
    setRequestContext(context);
    setRequestError("");
    setRequestDialogOpen(true);
  };

  const handleCloseMatchRequest = () => {
    setRequestDialogOpen(false);
    setRequestContext(null);
    setRequestError("");
  };

  const handleConfirmMatchRequest = async () => {
    if (!requestContext || requestingMatch) return;
    if (!currentUserId) {
      setRequestError("Please sign in to request a breeding match.");
      return;
    }
    try {
      setRequestingMatch(true);
      await createMatchRequest({
        contactId: requestContext.contactId,
        requesterDogId: requestContext.requesterDogId,
        requestedDogId: requestContext.requestedDogId,
        requesterUserId: currentUserId,
        requestedUserId: requestContext.requestedUserId,
      });

      // Send a chat message with clickable link to My Matches
      const myDogName = requestContext.myDogName || "Your dog";
      const partnerDogName = requestContext.partnerDogName || "their dog";
      // Use markdown-style link for chat rendering, or plain text with instructions
      const messageText = `${myDogName} wants to breed with your dog ${partnerDogName}. Please go to My Matches to see the request.`;
      await sendText(messageText, "system");

      setRequestDialogOpen(false);
      setRequestContext(null);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            message: "Breeding request sent! Track it from the My Matches page.",
            type: "success",
          },
        })
      );
    } catch (err) {
      console.error("Failed to send match request", err);
      let message = err?.message || "We couldn't send that request just now.";
      if (typeof message === "string" && message.includes("dog_match_events")) {
        message =
          "Security policies are blocking the match timeline entry. Please run the latest Supabase migration (dog_match_events_policies.sql).";
      }
      setRequestError(message);
    } finally {
      setRequestingMatch(false);
    }
  };

  const renderContactList = () => (
    <div
      className="chat-contact-list"
      style={{
        borderRight: "3px solid #fef3e8",
        padding: "1.5rem 1rem",
        overflowY: "auto",
        height: "100%",
        minHeight: 0,
        background: "linear-gradient(145deg, #ffffff, #fff9f5)",
        boxShadow: "4px 0 12px rgba(251, 146, 60, 0.08)",
      }}
    >
      <style>
        {`
          @media (max-width: 768px) {
            .chat-contact-list {
              border-right: none !important;
              padding: 1rem !important;
            }
            .contact-list-title {
              font-size: 1.125rem !important;
            }
          }
        `}
      </style>
      <h2
        className="contact-list-title"
        style={{
          marginBottom: "1.5rem",
          fontSize: "1.5rem",
          fontWeight: 900,
          background: "linear-gradient(135deg, #7c2d12, #9a3412)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.025em",
          textTransform: "uppercase",
        }}
      >
        Messages
      </h2>
      {loadingContacts ? (
        <div style={{ marginTop: "2rem" }}>
          <LoadingState message="Loading your conversations..." minHeight={120} />
        </div>
      ) : contacts.length === 0 ? (
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#9a3412",
            textAlign: "center",
            marginTop: "3rem",
            fontWeight: 700,
          }}
        >
          No conversations yet.
          <br />
          Start chatting from a match!
        </p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {contacts.map((c) => {
          // Always show the owner of the other dog
          let myDogForContact = null;
          let otherDogName = "";
          let otherDogImage = "";
          let ownerName = "";

          // Determine which dog belongs to the current user
          const myDogId = userDogs?.map((d) => d.id) || [];
          const isMyDogA = myDogId.includes(c.dog_id);
          const isMyDogB = myDogId.includes(c.my_dog_id);

          if (isMyDogA) {
            // My dog is dog_id, so show info for my_dog_id (other dog)
            myDogForContact = userDogs.find((d) => d.id === c.dog_id);
            otherDogName = c.my_dog_name || "Dog";
            otherDogImage = c.my_dog_image || "/shibaPor.jpg";
            ownerName = c.my_dog_owner_name || "Owner";
          } else if (isMyDogB) {
            // My dog is my_dog_id, so show info for dog_id (other dog)
            myDogForContact = userDogs.find((d) => d.id === c.my_dog_id);
            otherDogName = c.dog_name || "Dog";
            otherDogImage = c.dog_image || "/shibaPor.jpg";
            ownerName = c.dog_owner_name || "Owner";
          } else {
            // Fallback: show info for dog_id as my dog, my_dog_id as other dog
            myDogForContact = null;
            otherDogName = c.my_dog_name || c.dog_name || "Dog";
            otherDogImage = c.my_dog_image || c.dog_image || "/shibaPor.jpg";
            ownerName = c.my_dog_owner_name || c.dog_owner_name || "Owner";
          }

          return (
            <li key={c.id} style={{ marginBottom: "0.375rem" }}>
              <button
                onClick={() => {
                  openContact(c.id);
                  navigate(`/chat/${c.id}`);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.875rem 1rem",
                  border: c.id === activeContactId ? "2px solid #fb923c" : "2px solid transparent",
                  borderRadius: 16,
                  background:
                    c.id === activeContactId
                      ? "linear-gradient(145deg, #fff9f5, #fef3e8)"
                      : "transparent",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow:
                    c.id === activeContactId ? "0 4px 12px rgba(251, 146, 60, 0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (c.id !== activeContactId) {
                    e.currentTarget.style.background =
                      "linear-gradient(to right, #fef9f3, #fef3e8)";
                    e.currentTarget.style.borderColor = "#fed7aa";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (c.id !== activeContactId) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  {/* Overlapping dog avatars in contact list */}
                  <div
                    style={{
                      position: "relative",
                      width: myDogForContact ? 52 : 36,
                      height: 36,
                      flexShrink: 0,
                    }}
                  >
                    {/* My dog avatar (front) - show first if exists */}
                    {myDogForContact && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "#e5e7eb",
                          border: "3px solid #fb923c",
                          boxShadow: "0 2px 8px rgba(251, 146, 60, 0.25)",
                          zIndex: 1,
                        }}
                      >
                        <img
                          src={myDogForContact.image || "/shibaPor.jpg"}
                          alt={myDogForContact.name || "My Dog"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    )}

                    {/* Other dog avatar (back or standalone) */}
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#e5e7eb",
                        border: "3px solid #fb923c",
                        boxShadow: "0 2px 8px rgba(251, 146, 60, 0.25)",
                      }}
                    >
                      <img
                        src={otherDogImage}
                        alt={otherDogName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "0.9375rem",
                        color: "#7c2d12",
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {myDogForContact
                        ? `${myDogForContact.name} & ${otherDogName} (Owner: ${ownerName})`
                        : `${otherDogName} (Owner: ${ownerName})`}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "#9a3412",
                        lineHeight: "1.25",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      {c.last_message ? truncatePreview(c.last_message, 40) : "No messages yet"}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const renderMessages = () => {
    // Determine the correct perspective based on current user
    const isOwner = activeContact?.owner_id === currentUserId;

    let myDog = null;
    let otherDog = { name: "Dog", image: "/shibaPor.jpg" };
    let ownerName = "";

    // Always show the owner of the other dog
    const myDogId = userDogs?.map((d) => d.id) || [];
    const isMyDogA = activeContact?.dog_id && myDogId.includes(activeContact.dog_id);
    const isMyDogB = activeContact?.my_dog_id && myDogId.includes(activeContact.my_dog_id);

    if (isMyDogA) {
      // My dog is dog_id, so show info for my_dog_id (other dog)
      myDog = userDogs.find((d) => d.id === activeContact.dog_id);
      otherDog = {
        name: activeContact?.my_dog_name || "Dog",
        image: activeContact?.my_dog_image || "/shibaPor.jpg",
      };
      ownerName = activeContact?.my_dog_owner_name || "Owner";
    } else if (isMyDogB) {
      // My dog is my_dog_id, so show info for dog_id (other dog)
      myDog = userDogs.find((d) => d.id === activeContact.my_dog_id);
      otherDog = {
        name: activeContact?.dog_name || "Dog",
        image: activeContact?.dog_image || "/shibaPor.jpg",
      };
      ownerName = activeContact?.dog_owner_name || "Owner";
    } else {
      // Fallback: show info for dog_id as my dog, my_dog_id as other dog
      myDog = null;
      otherDog = {
        name: activeContact?.my_dog_name || activeContact?.dog_name || "Dog",
        image: activeContact?.my_dog_image || activeContact?.dog_image || "/shibaPor.jpg",
      };
      ownerName = activeContact?.my_dog_owner_name || activeContact?.dog_owner_name || "Owner";
    }

    const requesterDogIdForRequest = isOwner ? activeContact?.dog_id : activeContact?.my_dog_id;
    const partnerDogIdForRequest = isOwner ? activeContact?.my_dog_id : activeContact?.dog_id;
    const requestPayload = {
      contactId: activeContact?.id || null,
      requesterDogId: requesterDogIdForRequest || null,
      requestedDogId: partnerDogIdForRequest || null,
      requestedUserId: isOwner ? null : activeContact?.owner_id || null,
      myDogName:
        myDog?.name ||
        (isOwner ? activeContact?.dog_name : activeContact?.my_dog_name) ||
        "Your dog",
      partnerDogName: otherDog.name || "their dog",
    };
    const hasMatchContext = Boolean(
      requestPayload.contactId && requestPayload.requesterDogId && requestPayload.requestedDogId
    );
    let requestButtonDisabledReason = "";
    if (!currentUserId) {
      requestButtonDisabledReason = "Please sign in to request breeding";
    } else if (!hasMatchContext) {
      requestButtonDisabledReason = "Both dogs must be linked to this chat";
    } else if (requestingMatch) {
      requestButtonDisabledReason = "Sending request…";
    }
    const requestButtonDisabled = !currentUserId || !hasMatchContext || requestingMatch;

    return (
      <div
        className="chat-thread"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          background: "linear-gradient(145deg, #ffffff, #fff9f5)",
        }}
      >
        <div
          className="chat-thread-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            borderBottom: "3px solid #fef3e8",
            padding: "1rem 1.5rem",
            background: "linear-gradient(145deg, #ffffff, #fff9f5)",
            boxShadow: "0 2px 8px rgba(251, 146, 60, 0.08)",
          }}
        >
          <button
            onClick={() => navigate("/chat")}
            className="mobile-back-button"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              marginLeft: "-0.5rem",
              color: "#7c2d12",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 24, height: 24 }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Overlapping dog avatars */}
          <div style={{ position: "relative", width: myDog ? 56 : 44, height: 44, flexShrink: 0 }}>
            {/* My dog (front) - show first if exists */}
            {myDog && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e5e7eb",
                  border: "3px solid #fb923c",
                  boxShadow: "0 2px 8px rgba(251, 146, 60, 0.25)",
                  zIndex: 1,
                }}
              >
                <img
                  src={myDog.image || "/shibaPor.jpg"}
                  alt={myDog.name || "My Dog"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Other dog (back or standalone) */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#e5e7eb",
                border: "3px solid #fb923c",
                boxShadow: "0 2px 8px rgba(251, 146, 60, 0.25)",
              }}
            >
              <img
                src={otherDog.image}
                alt={otherDog.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Dog names and owner */}
          <div className="thread-details" style={{ flex: 1, overflow: "hidden" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 900,
                color: "#7c2d12",
                letterSpacing: "-0.0125em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {myDog
                ? `${myDog.name} & ${otherDog.name} (Owner: ${ownerName})`
                : `${otherDog.name} (Owner: ${ownerName})`}
            </h3>
          </div>
          <div
            className="chat-thread-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (!requestButtonDisabled) handleOpenMatchRequest(requestPayload);
              }}
              disabled={requestButtonDisabled}
              title={requestButtonDisabledReason || "Request a breeding match for these dogs"}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: 20,
                border: requestButtonDisabled
                  ? "2px solid #e5e7eb"
                  : "2px solid rgba(255, 255, 255, 0.3)",
                fontWeight: 800,
                fontSize: "0.875rem",
                background: requestButtonDisabled
                  ? "linear-gradient(to bottom, #e5e7eb, #d1d5db)"
                  : "linear-gradient(135deg, #fb923c, #f97316)",
                color: requestButtonDisabled ? "#9ca3af" : "#ffffff",
                cursor: requestButtonDisabled ? "not-allowed" : "pointer",
                boxShadow: requestButtonDisabled ? "none" : "0 4px 12px rgba(251, 146, 60, 0.35)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
              onMouseEnter={(e) => {
                if (requestButtonDisabled) return;
                e.currentTarget.style.background = "linear-gradient(135deg, #f97316, #ea580c)";
                e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(251, 146, 60, 0.5)";
              }}
              onMouseLeave={(e) => {
                if (requestButtonDisabled) return;
                e.currentTarget.style.background = "linear-gradient(135deg, #fb923c, #f97316)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 146, 60, 0.35)";
              }}
              onMouseDown={(e) => {
                if (requestButtonDisabled) return;
                e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Request breeding
            </button>
          </div>
        </div>
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "1.5rem",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
          className="messages-container"
        >
          <style>
            {`
              @media (max-width: 768px) {
                .messages-container {
                  padding: 1rem !important;
                }
                .message-wrapper {
                  max-width: 90% !important;
                  gap: 0.375rem !important;
                }
                .message-bubble {
                  font-size: 0.875rem !important;
                  padding: 0.625rem 0.875rem !important;
                }
                .message-bubble img {
                  max-width: 100% !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .message-menu-button {
                  width: 24px !important;
                  height: 24px !important;
                }
              }
            `}
          </style>
          {loadingMessages && (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "0.875rem",
                margin: "2rem 0",
              }}
            >
              Loading messages…
            </p>
          )}
          {messages.map((m) => {
            const isOwn = currentUserId && m.sender_id === currentUserId;
            const attachments = m.message_attachments || [];
            const createdAt = m.created_at ? new Date(m.created_at) : null;
            const withinHour = createdAt ? Date.now() - createdAt.getTime() <= 3600000 : false;
            const isHovered = hoveredMessageId === m.id;
            const isMenuOpen = openMenuId === m.id;
            const showOwnMenu = isOwn && !m.deleted_at && (isHovered || isMenuOpen);

            return (
              <div
                key={m.id}
                onMouseEnter={() => setHoveredMessageId(m.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className="message-wrapper"
                style={{
                  marginBottom: "0.25rem",
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.25rem",
                  flexDirection: isOwn ? "row-reverse" : "row",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  className="message-bubble"
                  style={{
                    padding: "0.75rem 1rem",
                    background: isOwn ? "linear-gradient(135deg, #fb923c, #f97316)" : "#ffffff",
                    color: isOwn ? "#ffffff" : "#7c2d12",
                    borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    boxShadow: isOwn
                      ? "0 2px 8px rgba(251, 146, 60, 0.25)"
                      : "0 2px 4px rgba(0,0,0,0.05)",
                    border: isOwn ? "none" : "1px solid #fef3e8",
                    fontSize: "0.9375rem",
                    lineHeight: "1.5",
                    wordWrap: "break-word",
                    maxWidth: "min(75%, 420px)",
                    minWidth: "50px",
                    flex: "0 0 auto",
                    width: "fit-content",
                  }}
                >
                  {m.deleted_at && (
                    <em style={{ opacity: 0.5, fontSize: "0.875rem" }}>Message deleted</em>
                  )}
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
                                  className="message-image"
                                  style={{
                                    maxWidth: "280px",
                                    width: "100%",
                                    height: "auto",
                                    borderRadius: 12,
                                    marginTop: "0.25rem",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <a
                                  href={url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: isOwn ? "#ffedd5" : "#f97316",
                                    textDecoration: url ? "underline" : "none",
                                    pointerEvents: url ? "auto" : "none",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {url ? `📎 ${filename}` : "Preparing attachment…"}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      {m.kind !== "text" && attachments.length === 0 && (
                        <em style={{ opacity: 0.6, fontSize: "0.875rem" }}>
                          Processing attachment…
                        </em>
                      )}
                    </div>
                  )}
                </div>
                {showOwnMenu && (
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : m.id)}
                      className="message-menu-button"
                      style={{
                        background: "#f3f4f6",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        transition: "all 0.2s ease",
                        marginTop: "0.5rem",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f3f4f6";
                      }}
                    >
                      <ThreeDotsIcon />
                    </button>
                    {isMenuOpen && (
                      <>
                        <div
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                          }}
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: isOwn ? 0 : "auto",
                            left: isOwn ? "auto" : 0,
                            marginTop: "0.25rem",
                            background: "#ffffff",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            minWidth: 120,
                            zIndex: 20,
                            overflow: "hidden",
                          }}
                        >
                          {withinHour ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteMessage(m.id);
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "0.625rem 1rem",
                                border: "none",
                                background: "transparent",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                color: "#ef4444",
                                transition: "background 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fef2f2";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              Delete message
                            </button>
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                padding: "0.625rem 1rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                color: "#9ca3af",
                              }}
                            >
                              Can't delete older messages
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!isOwn && (isHovered || isMenuOpen) && (
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : m.id)}
                      className="message-menu-button"
                      style={{
                        background: "#f3f4f6",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        transition: "all 0.2s ease",
                        marginTop: "0.5rem",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f3f4f6";
                      }}
                    >
                      <ThreeDotsIcon />
                    </button>
                    {isMenuOpen && (
                      <>
                        <div
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                          }}
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: isOwn ? 0 : "auto",
                            left: isOwn ? "auto" : 0,
                            marginTop: "0.25rem",
                            background: "#ffffff",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            minWidth: 120,
                            zIndex: 20,
                            overflow: "hidden",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMessageForReport(m);
                              setReportOpen(true);
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "0.625rem 1rem",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              color: "#dc2626",
                              transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fee2e2";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            Report message
                          </button>
                        </div>
                      </>
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
            gap: "0.75rem",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
          className="chat-input-form"
        >
          <style>
            {`
              @media (max-width: 768px) {
                .chat-input-form {
                  padding: 0.75rem 1rem !important;
                  gap: 0.5rem !important;
                }
                .chat-input-row {
                  gap: 0.5rem !important;
                }
                .chat-textarea {
                  font-size: 0.875rem !important;
                  padding: 0.75rem !important;
                }
                .attach-button, .send-button {
                  min-width: auto !important;
                }
                .attach-button {
                  width: 40px !important;
                  height: 40px !important;
                  padding: 0.75rem !important;
                }
                .send-button {
                  padding: 0.75rem 1rem !important;
                  font-size: 0.875rem !important;
                }
              }
            `}
          </style>
          {pendingAttachments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                }}
              >
                Attachments
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {pendingAttachments.map((att) => {
                  const isImage = att.file.type.startsWith("image/");
                  return (
                    <div
                      key={att.id}
                      style={{
                        position: "relative",
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "2px solid #e5e7eb",
                        background: "#f9fafb",
                      }}
                    >
                      {isImage ? (
                        <img
                          src={att.previewUrl}
                          alt={att.file.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: "0.5rem",
                            fontSize: "0.6875rem",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#6b7280",
                            wordBreak: "break-all",
                          }}
                        >
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
                          background: "rgba(0,0,0,0.75)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          lineHeight: 1,
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0,0,0,0.9)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(0,0,0,0.75)";
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
          <div
            className="chat-input-row"
            style={{ display: "flex", gap: "0.625rem", alignItems: "flex-end" }}
          >
            <style>
              {`
                .chat-textarea::-webkit-scrollbar {
                  width: 6px;
                }
                .chat-textarea::-webkit-scrollbar-track {
                  background: transparent;
                }
                .chat-textarea::-webkit-scrollbar-thumb {
                  background: #d1d5db;
                  border-radius: 10px;
                }
                .chat-textarea::-webkit-scrollbar-thumb:hover {
                  background: #9ca3af;
                }
                .chat-textarea {
                  scrollbar-width: thin;
                  scrollbar-color: #d1d5db transparent;
                }
              `}
            </style>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="chat-textarea"
              style={{
                flex: 1,
                padding: "0.875rem 1rem",
                border: "2px solid #fed7aa",
                borderRadius: 24,
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.2s ease",
                background: "#fffbf5",
                resize: "none",
                overflowY: "hidden", // Hide scrollbar initially
                lineHeight: "1.5",
                fontFamily: "inherit",
                minHeight: "auto",
                maxHeight: "7.5em", // 5 lines (1.5em line-height * 5)
                color: "#7c2d12",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#fb923c";
                e.currentTarget.style.background = "#ffffff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#fed7aa";
                e.currentTarget.style.background = "#fffbf5";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFile}
              multiple
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="attach-button"
              style={{
                padding: "0.875rem",
                background: "#f3f4f6",
                color: "#6b7280",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                width: 44,
                height: 44,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e5e7eb";
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              <PaperclipIcon />
            </button>
            <button
              type="submit"
              disabled={!input.trim() && pendingAttachments.length === 0}
              className="send-button"
              style={{
                padding: "0.875rem 1.5rem",
                background:
                  !input.trim() && pendingAttachments.length === 0
                    ? "#fed7aa"
                    : "linear-gradient(135deg, #fb923c, #f97316)",
                color: "white",
                border: "none",
                borderRadius: 24,
                cursor:
                  !input.trim() && pendingAttachments.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "0.9375rem",
                transition: "all 0.2s ease",
                minWidth: 80,
                boxShadow:
                  !input.trim() && pendingAttachments.length === 0
                    ? "none"
                    : "0 4px 12px rgba(251, 146, 60, 0.25)",
              }}
              onMouseEnter={(e) => {
                if (input.trim() || pendingAttachments.length > 0) {
                  e.currentTarget.style.background = "linear-gradient(135deg, #f97316, #ea580c)";
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim() || pendingAttachments.length > 0) {
                  e.currentTarget.style.background = "linear-gradient(135deg, #fb923c, #f97316)";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  };

  const requestDialogMessage = requestContext
    ? [
        `We'll notify ${requestContext.partnerDogName}'s owner that ${requestContext.myDogName} would like to proceed.`,
        "They can respond from the My Matches dashboard.",
        requestError ? `\nError: ${requestError}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="chat-page-container">
      <style>
        {`
          @media (max-width: 768px) {
            .chat-page-container {
              grid-template-columns: 1fr !important;
            }
            .contacts-column {
              display: ${contactId ? "none" : "flex"} !important;
            }
            .thread-column {
              display: ${contactId ? "flex" : "none"} !important;
            }
            .mobile-back-button {
              display: flex !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-back-button {
              display: none !important;
            }
          }
        `}
      </style>
      <div className="chat-columns">
        <div className="chat-column contacts-column">{renderContactList()}</div>
        <div className="chat-column thread-column">
          {contactId ? (
            renderMessages()
          ) : (
            <div className="chat-placeholder">
              <div className="chat-placeholder-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No conversation selected</h3>
              <p>Choose a conversation from the list to start chatting.</p>
            </div>
          )}
        </div>
      </div>
      {selectedMessageForReport && (
        <ReportModal
          isOpen={reportOpen}
          reportType="chat_message"
          targetData={{
            id: selectedMessageForReport.id,
            senderId: selectedMessageForReport.sender_id,
            receiverId: selectedMessageForReport.receiver_id,
            content: selectedMessageForReport.message,
            timestamp: selectedMessageForReport.created_at,
          }}
          onClose={() => {
            setReportOpen(false);
            setSelectedMessageForReport(null);
          }}
          onReportSuccess={() => {
            setReportOpen(false);
            setSelectedMessageForReport(null);
          }}
        />
      )}
      <ConfirmDialog
        isOpen={requestDialogOpen}
        onClose={handleCloseMatchRequest}
        onConfirm={handleConfirmMatchRequest}
        title={
          requestContext ? `Request breeding for ${requestContext.myDogName}?` : "Request breeding?"
        }
        message={requestDialogMessage || "Select a conversation to request a match."}
        confirmText={requestingMatch ? "Sending…" : "Send request"}
        cancelText={requestingMatch ? "Close" : "Cancel"}
        confirmButtonClass="bg-blue-600 hover:bg-blue-700 text-white"
      />
    </div>
  );
}
