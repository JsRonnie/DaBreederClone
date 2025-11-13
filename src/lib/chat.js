// Chat helper library for DaBreeder
// Provides: ensureContact, listContacts, listMessages, sendMessage,
// uploadAttachment, subscribeToMessages, unsubscribeFromMessages
// Depends on Supabase client in ./supabaseClient.js

import { supabase } from "./supabaseClient";

// Utility: get current auth user id (returns null if not signed in)
export async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

// 1) Ensure (get/create) a contact thread for a dog owner pair.
// Inputs: dogId (uuid | null), dogName, dogImage(optional), ownerId (uuid)
// Output: contact_id (uuid)
export async function ensureContact({ dogId = null, dogName, dogImage, ownerId }) {
  const { data, error } = await supabase.rpc("ensure_contact", {
    in_dog_id: dogId,
    in_dog_name: dogName,
    in_dog_image: dogImage,
    in_owner_id: ownerId,
  });
  if (error) throw error;
  return data; // UUID
}

// 2) List contacts for current user ordered by last activity
export async function listContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("last_message_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// 3) List messages for a contact (paged)
// options: { limit=50, before } where before is a timestamp or message id for pagination
export async function listMessages(contactId, options = {}) {
  const { limit = 50, before } = options;
  let query = supabase
    .from("messages")
    .select("*, message_attachments(*)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(limit);

  // Simple pagination: fetch messages created before given timestamp
  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((message) => ({
    ...message,
    message_attachments: Array.isArray(message.message_attachments)
      ? message.message_attachments
      : [],
  }));
}

// 4) Send a message (kind: 'text' | 'image' | 'file' | 'system')
export async function sendMessage({ contactId, content, kind = "text", replyTo = null }) {
  const senderId = await getCurrentUserId();
  if (!senderId) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("messages")
    .insert({ contact_id: contactId, sender_id: senderId, content, kind, reply_to: replyTo })
    .select()
    .single();
  if (error) throw error;
  return { ...data, message_attachments: [] }; // message row with attachments placeholder
}

// 5) Upload attachment: automatically creates a message then uploads file and adds attachment record
// Returns { message, attachment, publicUrl:null }
export async function uploadAttachment({ contactId, file, kind = "image" }) {
  if (!file) throw new Error("file required");
  if (!["image", "file"].includes(kind)) throw new Error("Invalid kind for attachment");

  // Create the message first (no content required)
  const message = await sendMessage({ contactId, content: null, kind });

  const path = `${contactId}/${message.id}/${file.name}`;
  const bucket = supabase.storage.from("chat-attachments");
  const { error: uploadError } = await bucket.upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  // Insert attachment row
  const { data: attachment, error: attachError } = await supabase
    .from("message_attachments")
    .insert({
      message_id: message.id,
      contact_id: contactId, // trigger would fill if omitted; explicit for clarity
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();
  if (attachError) throw attachError;

  const messageWithAttachment = {
    ...message,
    message_attachments: [attachment],
  };
  return { message: messageWithAttachment, attachment, publicUrl: null }; // bucket is private
}

// 6) Subscribe to new messages for a contact (realtime)
// callback receives the inserted message row
export function subscribeToMessages(contactId, callback) {
  const channel = supabase
    .channel(`messages-contact-${contactId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `contact_id=eq.${contactId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
  return channel; // caller can pass to unsubscribeFromMessages
}

export function unsubscribeFromMessages(channel) {
  if (channel) supabase.removeChannel(channel);
}

// 7) Helper to build a temporary object URL for an attachment (download on demand)
// Since bucket is private, you must create a signed URL or download the contents directly.
export async function createSignedAttachmentUrl(storagePath, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl;
}

// 7b) Fetch attachments for a specific message (used to hydrate realtime inserts)
export async function listMessageAttachments(messageId) {
  const { data, error } = await supabase
    .from("message_attachments")
    .select("*")
    .eq("message_id", messageId);
  if (error) throw error;
  return data || [];
}

// 8) Delete a message you sent (soft delete by setting deleted_at)
export async function softDeleteMessage(messageId) {
  const { data, error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: null })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 9) Simple search across messages in a contact (client side filter after fetch)
export async function searchMessages(contactId, term) {
  const msgs = await listMessages(contactId, { limit: 500 });
  const t = term.toLowerCase();
  return msgs.filter((m) => (m.content || "").toLowerCase().includes(t));
}

// Edge cases / notes:
// - Large files: consider size check (e.g. file.size > 10MB) before upload.
// - Multiple attachments per message: create one message and call uploadAttachment repeatedly with same message.id logic if desired.
//   (Currently we create a new message per file for simplicity.)
// - Presence indicators or "typing" can use a separate channel + ephemeral table or Realtime broadcast.
// - Pagination: implement 'before' using earliest loaded message.created_at to fetch previous batch.
