import supabase from "./supabaseClient";
import { uploadFileToBucket, deletePathsFromBucket } from "./storage";

function sanitizeFilename(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
}

function inferSubfolder(fileName, mimeType) {
  const isImage =
    (mimeType && mimeType.startsWith("image/")) ||
    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName || "");
  return isImage ? "images" : "documents";
}

export async function listDogDocuments(dogId) {
  const { data, error } = await supabase.from("dog_documents").select("*").eq("dog_id", dogId);
  if (error) throw error;
  return data || [];
}

export async function removeAllDocumentsForDog(dogId) {
  // Fetch existing documents
  const docs = await listDogDocuments(dogId);
  const paths = (docs || []).map((d) => d.storage_path).filter(Boolean);
  // Remove from storage first (best effort)
  if (paths.length) await deletePathsFromBucket({ bucket: "dog-photos", paths });
  // Delete rows
  const { error } = await supabase.from("dog_documents").delete().eq("dog_id", dogId);
  if (error) throw error;
  return { removed: docs.length };
}

export async function uploadDogDocument({ dogId, userId, file, category = null }) {
  if (!file?.name) throw new Error("No file provided");
  const subfolder = inferSubfolder(file.name, file.type);
  const sanitized = sanitizeFilename(file.name);
  const path = `${dogId}/${subfolder}/${Date.now()}-${sanitized}`;

  // Use dog-photos only for profile photos, dog-documents for all other documents
  let bucket = "dog-documents";
  if (category && category.toLowerCase() === "photo") {
    bucket = "dog-photos";
  }
  await uploadFileToBucket({ bucket, path, file, upsert: false });

  const payload = {
    dog_id: dogId,
    user_id: userId,
    file_name: file.name,
    storage_path: path,
    file_size_bytes: file.size,
    content_type: file.type,
    category,
  };
  const { data, error } = await supabase.from("dog_documents").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function removeDocumentsByCategory(dogId, category) {
  if (!category) return { removed: 0 };
  const { data: docs, error: selErr } = await supabase
    .from("dog_documents")
    .select("id, storage_path")
    .eq("dog_id", dogId)
    .eq("category", category);
  if (selErr) throw selErr;
  const paths = (docs || []).map((d) => d.storage_path).filter(Boolean);
  if (paths.length) await deletePathsFromBucket({ bucket: "dog-photos", paths });
  const { error: delErr } = await supabase
    .from("dog_documents")
    .delete()
    .eq("dog_id", dogId)
    .eq("category", category);
  if (delErr) throw delErr;
  return { removed: docs?.length || 0 };
}

// Remove a set of documents by their IDs; deletes storage objects then DB rows
export async function removeDocumentsByIds(ids) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) return { removed: 0 };
  const { data: docs, error: selErr } = await supabase
    .from("dog_documents")
    .select("id, storage_path")
    .in("id", list);
  if (selErr) throw selErr;
  const paths = (docs || []).map((d) => d.storage_path).filter(Boolean);
  if (paths.length) await deletePathsFromBucket({ bucket: "dog-photos", paths });
  const { error: delErr } = await supabase.from("dog_documents").delete().in("id", list);
  if (delErr) throw delErr;
  return { removed: docs?.length || 0 };
}

// Adapt dog_documents rows to DocumentManager's form shape
// - For single-file categories (pedigree, dna, vaccination), only keep the most recent
// - For other categories (e.g., health), keep all
export function mapDogDocumentsToForm(rows, options = {}) {
  const singleFileCategories = options.singleFileCategories || ["pedigree", "dna", "vaccination"];
  const byCat = {};
  (rows || []).forEach((r) => {
    const cat = r?.category || "misc";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r);
  });

  const out = [];
  for (const [cat, list] of Object.entries(byCat)) {
    if (singleFileCategories.includes(cat)) {
      const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
      const doc = sorted[0];
      if (doc) {
        out.push({
          name: doc.file_name,
          category: cat,
          storage_path: doc.storage_path || null,
          file_size_bytes: doc.file_size_bytes,
          content_type: doc.content_type,
          isExisting: true,
        });
      }
    } else {
      for (const doc of list) {
        out.push({
          name: doc.file_name,
          category: cat,
          storage_path: doc.storage_path || null,
          file_size_bytes: doc.file_size_bytes,
          content_type: doc.content_type,
          isExisting: true,
        });
      }
    }
  }
  return out;
}
