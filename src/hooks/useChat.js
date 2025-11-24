// React hook wrapper around chat helpers in lib/chat.js
// Provides: contacts, messages, activeContactId, actions
// Usage:
// const { contacts, messages, activeContactId, openContact, sendText, uploadFile } = useChat();

import { useEffect, useRef, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import {
  listContacts,
  listMessages,
  sendMessage,
  uploadAttachment,
  subscribeToMessages,
  unsubscribeFromMessages,
  ensureContact,
  getCurrentUserId,
  listMessageAttachments,
  softDeleteMessage,
} from "../lib/chat";

export default function useChat() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const channelRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load contacts on mount
  const refreshContacts = useCallback(async () => {
    try {
      const contactsRaw = await listContacts();
      if (!mountedRef.current) return;
      if (!Array.isArray(contactsRaw)) return;

      // Gather all dog IDs from contacts
      const dogIds = Array.from(
        new Set(
          contactsRaw
            .map((c) => [c.dog_id, c.my_dog_id])
            .flat()
            .filter(Boolean)
        )
      );

      // Fetch all dog records for these IDs
      let dogsMap = {};
      if (dogIds.length > 0) {
        const { data: dogs, error: dogsError } = await supabase
          .from("dogs")
          .select("id, user_id")
          .in("id", dogIds);
        if (!dogsError && Array.isArray(dogs)) {
          dogsMap = Object.fromEntries(dogs.map((d) => [d.id, d.user_id]));
        }
      }

      // Gather all user IDs from dog records
      const userIds = Array.from(new Set(Object.values(dogsMap).filter(Boolean)));
      let ownerMap = {};
      if (userIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);
        if (!ownersError && Array.isArray(owners)) {
          ownerMap = Object.fromEntries(owners.map((u) => [u.id, u.name]));
        }
      }

      // Attach owner names to contacts
      setContacts(
        contactsRaw.map((c) => ({
          ...c,
          dog_owner_name: ownerMap[dogsMap[c.dog_id]] || "Owner",
          my_dog_owner_name: ownerMap[dogsMap[c.my_dog_id]] || "Owner",
        }))
      );
    } catch (e) {
      console.error("refreshContacts failed", e);
    }
  }, []);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  // Load current user id once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const id = await getCurrentUserId();
        if (active) setCurrentUserId(id);
      } catch (e) {
        console.error("getCurrentUserId failed", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const previewFromMessage = useCallback((message) => {
    if (message.deleted_at) return "Message deleted";
    if (message.content) return message.content;
    if (message.kind === "image") return "📷 Image";
    if (message.kind === "file") return "📎 File";
    if (message.kind === "system") return "System update";
    return "New message";
  }, []);

  const normalizeMessages = useCallback(
    (items) =>
      (items || []).map((item) => ({
        ...item,
        message_attachments: Array.isArray(item.message_attachments)
          ? item.message_attachments
          : [],
      })),
    []
  );

  const refreshMessages = useCallback(async () => {
    if (!activeContactId) return;
    const contactId = activeContactId;
    setLoadingMessages(true);
    try {
      const data = await listMessages(contactId, { limit: 200 });
      if (!mountedRef.current) return;
      if (contactId !== activeContactId) return;
      setMessages(normalizeMessages(data));
    } catch (e) {
      console.error("listMessages failed", e);
    } finally {
      if (mountedRef.current && contactId === activeContactId) setLoadingMessages(false);
    }
  }, [activeContactId, normalizeMessages]);

  // Subscribe when activeContactId changes
  useEffect(() => {
    // Clean previous subscription
    if (channelRef.current) {
      unsubscribeFromMessages(channelRef.current);
      channelRef.current = null;
    }
    if (!activeContactId) return;

    // Load initial messages
    refreshMessages();

    // Realtime subscription
    channelRef.current = subscribeToMessages(activeContactId, async (newMsg) => {
      let hydrated = { ...newMsg, message_attachments: [] };
      if (["image", "file"].includes(newMsg.kind)) {
        try {
          let attachments = await listMessageAttachments(newMsg.id);
          if (!attachments.length) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            attachments = await listMessageAttachments(newMsg.id);
          }
          hydrated = { ...hydrated, message_attachments: attachments };
        } catch (err) {
          console.error("listMessageAttachments failed", err);
        }
      }

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === hydrated.id);
        if (exists) {
          return prev.map((m) => (m.id === hydrated.id ? { ...m, ...hydrated } : m));
        }
        return [...prev, hydrated];
      });

      const preview = previewFromMessage(hydrated);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId
            ? { ...c, last_message: preview, last_message_at: hydrated.created_at }
            : c
        )
      );
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromMessages(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeContactId, previewFromMessage, refreshMessages]);

  // When the window regains focus, refresh data to avoid stale state after tab suspension
  useEffect(() => {
    const handleFocus = () => {
      refreshContacts();
      refreshMessages();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshContacts();
        refreshMessages();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshContacts, refreshMessages]);

  const openContact = useCallback((contactId) => {
    setActiveContactId(contactId);
  }, []);

  const startContactForDog = useCallback(async ({ dogId, dogName, dogImage, ownerId }) => {
    const contactId = await ensureContact({ dogId, dogName, dogImage, ownerId });
    // Refresh contacts list to include new thread
    const updated = await listContacts();
    setContacts((prev) => (Array.isArray(updated) ? updated : prev));
    setActiveContactId(contactId);
    return contactId;
  }, []);

  const sendText = useCallback(
    async (text) => {
      if (!activeContactId) throw new Error("No active contact");
      const msg = await sendMessage({ contactId: activeContactId, content: text, kind: "text" });
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) {
          return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
        }
        return [...prev, msg];
      });
      const preview = previewFromMessage(msg);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId
            ? { ...c, last_message: preview, last_message_at: msg.created_at }
            : c
        )
      );
      return msg;
    },
    [activeContactId, previewFromMessage]
  );

  const uploadFile = useCallback(
    async (file) => {
      if (!activeContactId) throw new Error("No active contact");
      const { message, attachment } = await uploadAttachment({
        contactId: activeContactId,
        file,
        kind: file.type.startsWith("image/") ? "image" : "file",
      });
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) {
          return prev.map((m) => (m.id === message.id ? { ...m, ...message } : m));
        }
        return [...prev, message];
      });
      const preview = previewFromMessage(message);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId
            ? { ...c, last_message: preview, last_message_at: message.created_at }
            : c
        )
      );
      return { message, attachment };
    },
    [activeContactId, previewFromMessage]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      const deleted = await softDeleteMessage(messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...deleted } : m)));

      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== activeContactId) return c;
          if (!c.last_message_at) return c;
          if (deleted.created_at && c.last_message_at) {
            const deletedTs = new Date(deleted.created_at).getTime();
            const lastTs = new Date(c.last_message_at).getTime();
            if (Number.isFinite(deletedTs) && Number.isFinite(lastTs) && deletedTs === lastTs) {
              return { ...c, last_message: "Message deleted" };
            }
          }
          return c;
        })
      );

      return deleted;
    },
    [activeContactId]
  );

  return {
    contacts,
    messages,
    activeContactId,
    loadingMessages,
    currentUserId,
    openContact,
    startContactForDog,
    sendText,
    uploadFile,
    deleteMessage,
    refreshContacts,
    refreshMessages,
  };
}
