import { useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { safeGetUser } from "../lib/auth";
import { upsertUserProfile } from "../lib/profile";
import { normalizeAge, whitelistPayload, coerceNumbers } from "../utils/form";
import { DOG_ALLOWED_COLUMNS } from "../lib/dogs";
import { uploadFileToBucket, listPathsUnder, deletePathsFromBucket } from "../lib/storage";
import {
  uploadDogDocument,
  removeDocumentsByCategory,
  removeDocumentsByIds,
} from "../lib/dogDocuments";

const initialData = {
  name: "",
  gender: "",
  breed: "",
  age: "", // UI uses `age`; we'll map to age_years on submit
  // months removed from UI
  pedigree_certified: false,
  dna_tested: false,
  vaccinated: false,
  hip_elbow_tested: false,
  heart_tested: false,
  eye_tested: false,
  genetic_panel: false,
  thyroid_tested: false,
  size: "",
  weight_kg: "",
  age_years: "",
  coat_length: "",
  // coat_color removed: not present in DB schema for some projects
  coat_type: "",
  color: "",
  activity_level: "",
  sociability: "",
  trainability: "",
  photo: null, // File object for main dog photo
  documents: [], // Array of { file: File, category: string }
};

export function useFormData() {
  const [data, setData] = useState(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Helper to normalize various thrown error shapes (Supabase may throw plain objects)
  const normalizeError = (e) => {
    if (e instanceof Error) return e;
    if (e && typeof e === "object") {
      // Prefer a message property if present
      if (typeof e.message === "string" && e.message.length > 0) return new Error(e.message);
      // Some Supabase errors include 'error' or 'msg' or other fields useful to show
      if (typeof e.error === "string" && e.error.length > 0) return new Error(e.error);
      try {
        return new Error(JSON.stringify(e));
      } catch {
        return new Error(String(e));
      }
    }
    return new Error(String(e));
  };

  // (Removed compatibility helper for older DB schemas — project assumes migrated schema)

  const updateField = useCallback((field, value) => {
    setData((d) => ({ ...d, [field]: value }));
  }, []);

  const updateCheckbox = useCallback(
    (field) => (e) => {
      const { checked } = e.target;
      setData((d) => ({ ...d, [field]: checked }));
    },
    []
  );

  const updateDocuments = useCallback((files, category = "misc") => {
    console.log("📎 Adding documents:", {
      files: Array.from(files || []).map((f) => f.name),
      category,
    });
    const newItems = Array.from(files || []).map((f) => ({
      file: f,
      category,
    }));

    // Define single-file categories
    const singleFileCategories = ["pedigree", "dna", "vaccination"];
    const isSingleFileCategory = singleFileCategories.includes(category);
    console.log(
      `📋 Category '${category}' is ${isSingleFileCategory ? "single-file" : "multi-file"} category`
    );

    setData((d) => {
      const existing = Array.isArray(d.documents) ? d.documents : [];

      if (isSingleFileCategory) {
        // For single-file categories, replace all files in that category
        console.log(`🔄 Replacing single file for category: ${category}`);
        const filtered = existing.filter((x) => (x.category || "misc") !== category);
        const merged = [...filtered, ...newItems];
        console.log(
          "📋 Updated documents (single-file replacement):",
          merged.map((x) => ({
            name: x.file?.name || x.name,
            category: x.category,
          }))
        );
        return { ...d, documents: merged };
      } else {
        // For multi-file categories, merge & de-dupe by (name, category)
        const merged = [...existing];
        for (const item of newItems) {
          const idx = merged.findIndex(
            (x) =>
              (x.file?.name || x.name) === item.file.name &&
              (x.category || "misc") === item.category
          );
          if (idx === -1) merged.push(item);
        }
        console.log(
          "📋 Updated documents (multi-file merge):",
          merged.map((x) => ({
            name: x.file?.name || x.name,
            category: x.category,
          }))
        );
        return { ...d, documents: merged };
      }
    });
  }, []);

  const updatePhoto = useCallback((file) => {
    setData((d) => ({ ...d, photo: file }));
  }, []);

  const removeDocument = useCallback((fileName, category = "misc") => {
    console.log("🗑️ Removing document:", { fileName, category });
    setData((d) => {
      const beforeCount = (Array.isArray(d.documents) ? d.documents : []).length;
      const filtered = (Array.isArray(d.documents) ? d.documents : []).filter((x) => {
        const docFileName = x.file?.name || x.name;
        const docCategory = x.category || "misc";
        // Keep documents that DON'T match both fileName AND category
        const shouldKeep = !(docFileName === fileName && docCategory === category);
        if (!shouldKeep) {
          console.log(`🗑️ Removing document: ${docFileName} (${docCategory})`);
        }
        return shouldKeep;
      });
      const afterCount = filtered.length;
      console.log(`📋 Documents count: ${beforeCount} → ${afterCount}`);
      console.log(
        "📋 Remaining documents:",
        filtered.map((x) => ({
          name: x.file?.name || x.name,
          category: x.category,
        }))
      );
      return { ...d, documents: filtered };
    });
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setSubmitting(false);
    setError(null);
    setSuccess(false);
  }, []);

  const setFormData = useCallback((newData) => {
    setData((prevData) => ({ ...prevData, ...newData }));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      console.log("🚀 Starting form submission...");
      console.log("📋 Form data:", {
        ...data,
        documents: data.documents?.map((d) => ({
          name: d.file?.name || d.name,
          category: d.category,
        })),
        photo: data.photo ? { name: data.photo.name, size: data.photo.size } : null,
      });

      const src = { ...data };
      // Remove client-only fields early
      delete src.documents;
      delete src.photo;

      // Map UI age (years only) -> age_years; fallback to legacy `age` field
      const age = normalizeAge(src.age_years, src.age);
      if (age.error) throw new Error(age.error);
      if (age.age_years !== undefined) src.age_years = age.age_years;

      // remove legacy UI-only fields
      delete src.age;
      // months removed from UI; nothing to delete

      // Whitelist dog table columns to avoid unknown-column errors
      const dogPayload = whitelistPayload(src, DOG_ALLOWED_COLUMNS);

      // Attach user_id (requires authenticated session if RLS policies rely on it)
      try {
        const { data: userResult, error: userError } = await safeGetUser();
        console.log("🔐 Auth check result:", { userResult, userError });
        if (userError) {
          throw new Error("Authentication check failed. Please sign in and try again.");
        } else if (userResult?.user) {
          // Extra safety: ensure a profile row exists in public.users before inserting dogs
          // This prevents FK violations in projects where dogs.user_id references public.users(id)
          try {
            await upsertUserProfile(supabase, userResult.user);
          } catch (e) {
            console.warn("Profile upsert skipped (non-fatal):", e?.message || e);
          }

          dogPayload.user_id = userResult.user.id;
          console.log("👤 User authenticated:", userResult.user.id);
        } else {
          // Prevent inserting invisible records
          throw new Error("You are not signed in. Please sign in to add a dog profile.");
        }
      } catch (authCheckErr) {
        console.error("🚨 Auth check failed:", authCheckErr);
        throw authCheckErr;
      }
      // Convert numeric fields
      const coerced = coerceNumbers(dogPayload, ["weight_kg", "age_years"]);
      if (coerced.weight_kg !== undefined && coerced.weight_kg !== "") {
        const w = Number(coerced.weight_kg);
        if (Number.isFinite(w)) {
          if (w < 1.5) throw new Error("Weight must be at least 1.5 kg.");
          if (w > 91) throw new Error("Weight must not exceed 91 kg.");
        }
      }
      if (coerced.age_years !== undefined) {
        if (coerced.age_years > 25) {
          throw new Error("Age cannot exceed 25 years. Please enter a valid age.");
        }
        if (coerced.age_years < 0) {
          throw new Error("Age cannot be negative. Please enter a valid age.");
        }
      }

      // Insert new dog record (assumes DB schema is up-to-date)
      const insertResp = await supabase.from("dogs").insert(coerced).select("id").single();
      if (insertResp.error) {
        // Provide a clearer error for common FK violations
        const code = insertResp.error.code || insertResp.error.status || "";
        const msg = (insertResp.error.message || "").toLowerCase();
        if (
          String(code) === "23503" ||
          msg.includes("foreign key") ||
          msg.includes("dogs_user_id_fkey")
        ) {
          throw new Error(
            "Couldn't save dog because your user profile hasn't been created yet. Please sign out and sign back in, then try again."
          );
        }
        throw insertResp.error;
      }
      const dogId = insertResp.data.id;

      // Upload main photo if provided, then update dogs.image_url
      if (data.photo) {
        const photoPath = `${dogId}/profile-${Date.now()}-${data.photo.name}`;
        const { publicUrl: imageUrl } = await uploadFileToBucket({
          bucket: "dog-photos",
          path: photoPath,
          file: data.photo,
          upsert: false,
        });
        if (imageUrl) {
          const { error: updError } = await supabase
            .from("dogs")
            .update({ image_url: imageUrl })
            .eq("id", dogId);
          if (updError) {
            // Assume image_url exists; if update fails surface the error to the caller
            throw updError;
          }
        }

        // Optional: also log the photo in dog_documents for completeness
        const { error: docInsertErrorPhoto } = await supabase.from("dog_documents").insert({
          dog_id: dogId,
          user_id: dogPayload.user_id,
          file_name: data.photo.name,
          storage_path: photoPath,
          file_size_bytes: data.photo.size,
          content_type: data.photo.type,
          category: "photo",
        });
        if (docInsertErrorPhoto) throw docInsertErrorPhoto;
      }

      // Upload documents sequentially (can optimize later)
      if (Array.isArray(data.documents) && data.documents.length > 0) {
        for (const item of data.documents) {
          const file = item?.file || item; // backward compatible if array had File objects
          if (!file?.name) continue;
          const category = item?.category || null;
          await uploadDogDocument({
            dogId,
            userId: dogPayload.user_id,
            file,
            category,
          });
        }
      }

      setSuccess(true);
      try {
        globalThis.__DB_DOGS_INVALIDATE_TS__ = Date.now();
      } catch {
        /* noop */
      }
      return dogId;
    } catch (e) {
      setError(normalizeError(e));
      console.error(e);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [data]);

  const updateDog = useCallback(
    async (dogId, initialDocuments = []) => {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        console.log("🔄 Starting dog profile update...");
        console.log(
          "📋 Initial documents:",
          initialDocuments?.map((d) => ({
            name: d.file_name,
            category: d.category,
            id: d.id,
          }))
        );

        const src = { ...data };
        // Remove client-only fields
        delete src.documents;
        delete src.photo;

        // Map UI age (years only) -> age_years if provided
        const age2 = normalizeAge(src.age_years, src.age);
        if (age2.error) throw new Error(age2.error);
        if (age2.age_years !== undefined) src.age_years = age2.age_years;
        delete src.age; // legacy field
        // months removed from UI

        // Whitelist dog table columns
        const dogPayload = whitelistPayload(src, DOG_ALLOWED_COLUMNS);

        // Convert numeric fields
        const coerced2 = coerceNumbers(dogPayload, ["weight_kg", "age_years"]);
        if (coerced2.weight_kg !== undefined && coerced2.weight_kg !== "") {
          const w2 = Number(coerced2.weight_kg);
          if (Number.isFinite(w2)) {
            if (w2 < 1.5) throw new Error("Weight must be at least 1.5 kg.");
            if (w2 > 91) throw new Error("Weight must not exceed 91 kg.");
          }
        }
        if (coerced2.age_years !== undefined) {
          if (coerced2.age_years > 25) {
            throw new Error("Age cannot exceed 25 years. Please enter a valid age.");
          }
          if (coerced2.age_years < 0) {
            throw new Error("Age cannot be negative. Please enter a valid age.");
          }
        }

        // Update the dog record
        // Update dog record (assumes DB schema is up-to-date)
        const updResp = await supabase.from("dogs").update(coerced2).eq("id", dogId);
        if (updResp.error) throw updResp.error;

        // Upload new photo if provided
        if (data.photo) {
          console.log("📸 Uploading new photo:", data.photo.name);

          // First, try to delete old photos for this dog to avoid clutter
          try {
            const oldPaths = await listPathsUnder({ bucket: "dog-photos", prefix: `${dogId}` });
            if (oldPaths.length) {
              console.log("🗑️ Cleaning up old photos:", oldPaths);
              await deletePathsFromBucket({ bucket: "dog-photos", paths: oldPaths });
            }
          } catch (cleanupError) {
            console.warn("⚠️ Could not clean up old photos:", cleanupError);
          }

          const photoPath = `${dogId}/profile-${Date.now()}-${data.photo.name}`;
          const { publicUrl: imageUrl } = await uploadFileToBucket({
            bucket: "dog-photos",
            path: photoPath,
            file: data.photo,
            upsert: false,
          });

          if (imageUrl) {
            const { error: updError } = await supabase
              .from("dogs")
              .update({ image_url: imageUrl })
              .eq("id", dogId);
            if (updError) {
              console.warn("Failed to update image_url:", updError);
            } else {
              console.log("✅ Photo updated successfully:", imageUrl);
            }
          }
        }

        // Handle document operations (deletions and uploads)
        console.log("📁 Processing document changes...");

        // Get user ID for RLS
        const { data: ures } = await safeGetUser();
        const userId = ures?.user?.id;

        if (!userId) {
          throw new Error("User not authenticated for document operations");
        }

        // 1. First, handle document deletions by comparing initial vs current documents
        if (Array.isArray(initialDocuments) && initialDocuments.length > 0) {
          console.log("�️ Checking for removed documents...");

          // Get current document names/categories from form
          const currentDocuments = Array.isArray(data.documents) ? data.documents : [];
          console.log(
            "📋 Current documents in form:",
            currentDocuments.map((d) => ({
              name: d.file?.name || d.name,
              category: d.category,
              isExisting: d.isExisting,
            }))
          );

          const currentDocSet = new Set(
            currentDocuments
              .filter((doc) => doc.isExisting) // Only consider existing documents for removal comparison
              .map((doc) => {
                const name = doc.file?.name || doc.name;
                const category = doc.category || "misc";
                return `${name}:${category}`;
              })
          );

          console.log("📋 Current existing document keys:", Array.from(currentDocSet));

          // Find documents that were in initial but are not in current existing (i.e., removed)
          const removedDocuments = initialDocuments.filter((initialDoc) => {
            const key = `${initialDoc.file_name}:${initialDoc.category || "misc"}`;
            const isRemoved = !currentDocSet.has(key);
            if (isRemoved) {
              console.log(
                `🗑️ Document marked for removal: ${initialDoc.file_name} (${initialDoc.category}) - Key: ${key}`
              );
            }
            return isRemoved;
          });

          console.log(`📋 Found ${removedDocuments.length} documents to remove from database`);

          // Batch delete removed documents using helper
          const removedIds = removedDocuments.map((d) => d.id).filter(Boolean);
          if (removedIds.length) {
            try {
              await removeDocumentsByIds(removedIds);
            } catch (err) {
              console.warn("⚠️ Batch delete of removed documents failed:", err);
            }
          }
        }

        // 2. Then, handle new document uploads
        if (Array.isArray(data.documents) && data.documents.length > 0) {
          console.log("📁 Uploading new documents:", data.documents.length);

          // Separate new files from existing documents
          const newFiles = data.documents.filter((item) => item.file && !item.isExisting);
          const primaryCertificationCategories = ["pedigree", "dna", "vaccination"];

          console.log("📋 Processing documents for update:", {
            totalDocuments: data.documents.length,
            newFiles: newFiles.length,
            existingDocs: data.documents.filter((item) => item.isExisting).length,
          });

          for (const item of newFiles) {
            const file = item.file;
            if (!file?.name) continue;
            const category = item?.category || null;

            // For single-file categories, remove existing files first
            if (primaryCertificationCategories.includes(category)) {
              console.log(`🗑️ Removing existing files for single-file category: ${category}`);
              try {
                await removeDocumentsByCategory(dogId, category);
              } catch (deleteError) {
                console.warn(
                  `Warning: Could not delete existing ${category} documents:`,
                  deleteError
                );
              }
            }

            await uploadDogDocument({ dogId, userId, file, category });
            console.log(`✅ Document uploaded: ${file.name}`);
          }
        }

        setSuccess(true);
        try {
          globalThis.__DB_DOGS_INVALIDATE_TS__ = Date.now();
        } catch {
          /* noop */
        }
        return true;
      } catch (e) {
        setError(normalizeError(e));
        console.error("Update error:", e);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [data]
  );

  return {
    data,
    submitting,
    error,
    success,
    updateField,
    updateCheckbox,
    updateDocuments,
    updatePhoto,
    submit,
    updateDog,
    reset,
    removeDocument,
    setFormData,
  };
}

export default useFormData;
