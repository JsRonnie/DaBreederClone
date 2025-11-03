import { useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";

const initialData = {
  name: "",
  gender: "",
  breed: "",
  age: "", // UI uses `age`; we'll map to age_years on submit
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
  ear_type: "",
  tail_type: "",
  muzzle_shape: "",
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
      if (typeof e.message === "string" && e.message.length > 0)
        return new Error(e.message);
      // Some Supabase errors include 'error' or 'msg' or other fields useful to show
      if (typeof e.error === "string" && e.error.length > 0)
        return new Error(e.error);
      try {
        return new Error(JSON.stringify(e));
      } catch {
        return new Error(String(e));
      }
    }
    return new Error(String(e));
  };

  // Helper to extract a missing column name from Supabase schema-cache errors
  const extractMissingColumn = (msg) => {
    if (!msg || typeof msg !== "string") return null;
    const m =
      msg.match(/Could not find the '([^']+)' column/i) ||
      msg.match(/column "([^"]+)" does not exist/i);
    return m ? m[1] : null;
  };

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
      `📋 Category '${category}' is ${
        isSingleFileCategory ? "single-file" : "multi-file"
      } category`
    );

    setData((d) => {
      const existing = Array.isArray(d.documents) ? d.documents : [];

      if (isSingleFileCategory) {
        // For single-file categories, replace all files in that category
        console.log(`🔄 Replacing single file for category: ${category}`);
        const filtered = existing.filter(
          (x) => (x.category || "misc") !== category
        );
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
      const beforeCount = (Array.isArray(d.documents) ? d.documents : [])
        .length;
      const filtered = (Array.isArray(d.documents) ? d.documents : []).filter(
        (x) => {
          const docFileName = x.file?.name || x.name;
          const docCategory = x.category || "misc";
          // Keep documents that DON'T match both fileName AND category
          const shouldKeep = !(
            docFileName === fileName && docCategory === category
          );
          if (!shouldKeep) {
            console.log(
              `🗑️ Removing document: ${docFileName} (${docCategory})`
            );
          }
          return shouldKeep;
        }
      );
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
        photo: data.photo
          ? { name: data.photo.name, size: data.photo.size }
          : null,
      });

      const src = { ...data };
      // Remove client-only fields early
      delete src.documents;
      delete src.photo;

      // Map UI age -> age_years if provided
      if (
        (src.age_years === "" || src.age_years === undefined) &&
        src.age !== undefined &&
        src.age !== ""
      ) {
        src.age_years = src.age;
      }
      delete src.age;

      // Whitelist dog table columns to avoid unknown-column errors
      const allowedDogColumns = new Set([
        "user_id",
        "name",
        "gender",
        "breed",
        "age_years",
        "size",
        "weight_kg",
        "pedigree_certified",
        "dna_tested",
        "vaccinated",
        "hip_elbow_tested",
        "heart_tested",
        "eye_tested",
        "genetic_panel",
        "thyroid_tested",
        "coat_type",
        "color",
        "activity_level",
        "sociability",
        "trainability",
      ]);
      const dogPayload = Object.fromEntries(
        Object.entries(src).filter(([k]) => allowedDogColumns.has(k))
      );

      // Attach user_id (requires authenticated session if RLS policies rely on it)
      try {
        const { data: userResult, error: userError } =
          await supabase.auth.getUser();
        console.log("🔐 Auth check result:", { userResult, userError });
        if (userError) {
          throw new Error(
            "Authentication check failed. Please sign in and try again."
          );
        } else if (userResult?.user) {
          dogPayload.user_id = userResult.user.id;
          console.log("👤 User authenticated:", userResult.user.id);
        } else {
          // Prevent inserting invisible records
          throw new Error(
            "You are not signed in. Please sign in to add a dog profile."
          );
        }
      } catch (authCheckErr) {
        console.error("🚨 Auth check failed:", authCheckErr);
        throw authCheckErr;
      }
      // Convert numeric fields
      if (dogPayload.weight_kg !== "" && dogPayload.weight_kg !== undefined)
        dogPayload.weight_kg = Number(dogPayload.weight_kg);
      if (dogPayload.age_years !== "" && dogPayload.age_years !== undefined) {
        dogPayload.age_years = Number(dogPayload.age_years);
        // Validate age limit (25 years maximum)
        if (dogPayload.age_years > 25) {
          throw new Error(
            "Age cannot exceed 25 years. Please enter a valid age."
          );
        }
        if (dogPayload.age_years < 0) {
          throw new Error("Age cannot be negative. Please enter a valid age.");
        }
      }

      // Try inserting; if Supabase complains about a missing column in the schema cache,
      // iteratively strip the reported missing column and retry a few times. This handles
      // cases where the client sends multiple obsolete columns.
      let payload = { ...dogPayload };
      let inserted = null;
      let insertError = null;
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const resp = await supabase
          .from("dogs")
          .insert(payload)
          .select("id")
          .single();
        inserted = resp.data;
        insertError = resp.error;
        if (!insertError) break;
        const missing = extractMissingColumn(
          insertError.message || insertError.error || ""
        );
        if (!missing || !Object.prototype.hasOwnProperty.call(payload, missing))
          break;
        console.warn(
          `Detected missing column '${missing}' during insert (attempt ${
            attempt + 1
          }); removing and retrying.`
        );
        delete payload[missing];
      }

      if (insertError) throw insertError;

      const dogId = inserted.id;

      // Upload main photo if provided, then update dogs.image_url
      if (data.photo) {
        const photoPath = `${dogId}/profile-${Date.now()}-${data.photo.name}`;
        const { error: uploadPhotoError } = await supabase.storage
          .from("dog-photos")
          .upload(photoPath, data.photo, { upsert: false });
        if (uploadPhotoError) {
          if (
            uploadPhotoError.message?.toLowerCase().includes("bucket") &&
            uploadPhotoError.message.toLowerCase().includes("not found")
          ) {
            throw new Error(
              "Upload failed: Bucket 'dog-photos' not found. Create it in Supabase Storage (make it public) or update the bucket name."
            );
          }
          throw new Error(
            `Photo upload failed for ${data.photo.name}: ${uploadPhotoError.message}`
          );
        }
        // Get public URL (bucket should be public)
        const { data: pub } = supabase.storage
          .from("dog-photos")
          .getPublicUrl(photoPath);
        const imageUrl = pub?.publicUrl || null;
        if (imageUrl) {
          const { error: updError } = await supabase
            .from("dogs")
            .update({ image_url: imageUrl })
            .eq("id", dogId);
          if (updError) {
            const msg = (updError.message || "").toLowerCase();
            // If the DB doesn't yet have image_url, don't block the submission
            if (msg.includes("image_url") && msg.includes("does not exist")) {
              console.warn(
                "dogs.image_url column missing; skipping storing of image URL. You can add it later and images will still be uploaded to Storage."
              );
            } else {
              throw updError;
            }
          }
        }

        // Optional: also log the photo in dog_documents for completeness
        const { error: docInsertErrorPhoto } = await supabase
          .from("dog_documents")
          .insert({
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

          // Determine file type for better organization
          const isImage =
            file.type?.startsWith("image/") ||
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name);
          const subfolder = isImage ? "images" : "documents";
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
          const path = `${dogId}/${subfolder}/${Date.now()}-${sanitizedFileName}`;
          const { error: uploadError } = await supabase.storage
            .from("dog-photos")
            .upload(path, file, { upsert: false });
          if (uploadError) {
            console.error("📤 Upload error for", file.name, ":", uploadError);
            // Improve messaging for bucket not found vs permission
            if (
              uploadError.message?.toLowerCase().includes("bucket") &&
              uploadError.message.toLowerCase().includes("not found")
            ) {
              throw new Error(
                "Upload failed: Bucket 'dog-photos' not found. Create it in Supabase Storage (make it public) or update the bucket name."
              );
            }
            throw new Error(
              `Upload failed for ${file.name}: ${uploadError.message}`
            );
          }

          const { error: docInsertError } = await supabase
            .from("dog_documents")
            .insert({
              dog_id: dogId,
              user_id: dogPayload.user_id, // pass same user id for RLS
              file_name: file.name,
              storage_path: path,
              file_size_bytes: file.size,
              content_type: file.type,
              category: category,
            });
          if (docInsertError) throw docInsertError;
          console.log(
            `✅ Document uploaded successfully: ${file.name} (${
              isImage ? "image" : "document"
            })`
          );
        }
      }

      setSuccess(true);
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

        // Map UI age -> age_years if provided
        if (
          (src.age_years === "" || src.age_years === undefined) &&
          src.age !== undefined &&
          src.age !== ""
        ) {
          src.age_years = src.age;
        }
        delete src.age;

        // Whitelist dog table columns
        const allowedDogColumns = new Set([
          "name",
          "gender",
          "breed",
          "age_years",
          "size",
          "weight_kg",
          "pedigree_certified",
          "dna_tested",
          "vaccinated",
          "hip_elbow_tested",
          "heart_tested",
          "eye_tested",
          "genetic_panel",
          "thyroid_tested",
          "coat_type",
          "color",
          "activity_level",
          "sociability",
          "trainability",
          "ear_type",
          "tail_type",
          "muzzle_shape",
        ]);
        const dogPayload = Object.fromEntries(
          Object.entries(src).filter(([k]) => allowedDogColumns.has(k))
        );

        // Convert numeric fields
        if (dogPayload.weight_kg !== "" && dogPayload.weight_kg !== undefined)
          dogPayload.weight_kg = Number(dogPayload.weight_kg);
        if (dogPayload.age_years !== "" && dogPayload.age_years !== undefined) {
          dogPayload.age_years = Number(dogPayload.age_years);
          // Validate age limit (25 years maximum)
          if (dogPayload.age_years > 25) {
            throw new Error(
              "Age cannot exceed 25 years. Please enter a valid age."
            );
          }
          if (dogPayload.age_years < 0) {
            throw new Error(
              "Age cannot be negative. Please enter a valid age."
            );
          }
        }

        // Update the dog record
        // Try updating; iteratively strip missing columns reported by the schema cache and retry
        let payload = { ...dogPayload };
        let updateError = null;
        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const resp = await supabase
            .from("dogs")
            .update(payload)
            .eq("id", dogId);
          updateError = resp.error;
          if (!updateError) break;
          const missing = extractMissingColumn(
            updateError.message || updateError.error || ""
          );
          if (
            !missing ||
            !Object.prototype.hasOwnProperty.call(payload, missing)
          )
            break;
          console.warn(
            `Detected missing column '${missing}' during update (attempt ${
              attempt + 1
            }); removing and retrying.`
          );
          delete payload[missing];
        }

        if (updateError) throw updateError;

        // Upload new photo if provided
        if (data.photo) {
          console.log("📸 Uploading new photo:", data.photo.name);

          // First, try to delete old photos for this dog to avoid clutter
          try {
            const { data: oldPhotos, error: listError } = await supabase.storage
              .from("dog-photos")
              .list(`${dogId}`);

            if (!listError && oldPhotos && oldPhotos.length > 0) {
              const oldPaths = oldPhotos.map((file) => `${dogId}/${file.name}`);
              console.log("🗑️ Cleaning up old photos:", oldPaths);
              await supabase.storage.from("dog-photos").remove(oldPaths);
            }
          } catch (cleanupError) {
            console.warn("⚠️ Could not clean up old photos:", cleanupError);
            // Continue with upload even if cleanup fails
          }

          const photoPath = `${dogId}/profile-${Date.now()}-${data.photo.name}`;
          const { error: uploadPhotoError } = await supabase.storage
            .from("dog-photos")
            .upload(photoPath, data.photo, { upsert: false });

          if (uploadPhotoError) {
            throw new Error(
              `Photo upload failed for ${data.photo.name}: ${uploadPhotoError.message}`
            );
          }

          // Get public URL and update dogs.image_url
          const { data: pub } = supabase.storage
            .from("dog-photos")
            .getPublicUrl(photoPath);
          const imageUrl = pub?.publicUrl || null;

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
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;

        if (!userId) {
          throw new Error("User not authenticated for document operations");
        }

        // 1. First, handle document deletions by comparing initial vs current documents
        if (Array.isArray(initialDocuments) && initialDocuments.length > 0) {
          console.log("�️ Checking for removed documents...");

          // Get current document names/categories from form
          const currentDocuments = Array.isArray(data.documents)
            ? data.documents
            : [];
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

          console.log(
            "📋 Current existing document keys:",
            Array.from(currentDocSet)
          );

          // Find documents that were in initial but are not in current existing (i.e., removed)
          const removedDocuments = initialDocuments.filter((initialDoc) => {
            const key = `${initialDoc.file_name}:${
              initialDoc.category || "misc"
            }`;
            const isRemoved = !currentDocSet.has(key);
            if (isRemoved) {
              console.log(
                `🗑️ Document marked for removal: ${initialDoc.file_name} (${initialDoc.category}) - Key: ${key}`
              );
            }
            return isRemoved;
          });

          console.log(
            `📋 Found ${removedDocuments.length} documents to remove from database`
          );

          // Delete removed documents from database and storage
          for (const removedDoc of removedDocuments) {
            try {
              console.log(
                `🗑️ Deleting document: ${removedDoc.file_name} (${removedDoc.category})`
              );

              // Delete from storage first
              if (removedDoc.storage_path) {
                const { error: storageError } = await supabase.storage
                  .from("dog-photos")
                  .remove([removedDoc.storage_path]);

                if (storageError) {
                  console.warn(
                    `⚠️ Could not delete file from storage: ${removedDoc.storage_path}`,
                    storageError
                  );
                } else {
                  console.log(
                    `✅ Deleted from storage: ${removedDoc.storage_path}`
                  );
                }
              }

              // Delete from database
              const { error: dbError } = await supabase
                .from("dog_documents")
                .delete()
                .eq("id", removedDoc.id);

              if (dbError) {
                console.warn(
                  `⚠️ Could not delete document from database: ${removedDoc.file_name}`,
                  dbError
                );
              } else {
                console.log(
                  `✅ Deleted from database: ${removedDoc.file_name}`
                );
              }
            } catch (deleteError) {
              console.warn(
                `⚠️ Error deleting document ${removedDoc.file_name}:`,
                deleteError
              );
              // Continue with other deletions even if one fails
            }
          }
        }

        // 2. Then, handle new document uploads
        if (Array.isArray(data.documents) && data.documents.length > 0) {
          console.log("📁 Uploading new documents:", data.documents.length);

          // Separate new files from existing documents
          const newFiles = data.documents.filter(
            (item) => item.file && !item.isExisting
          );
          const primaryCertificationCategories = [
            "pedigree",
            "dna",
            "vaccination",
          ];

          console.log("📋 Processing documents for update:", {
            totalDocuments: data.documents.length,
            newFiles: newFiles.length,
            existingDocs: data.documents.filter((item) => item.isExisting)
              .length,
          });

          for (const item of newFiles) {
            const file = item.file;
            if (!file?.name) continue;
            const category = item?.category || null;

            // For single-file categories, remove existing files first
            if (primaryCertificationCategories.includes(category)) {
              console.log(
                `🗑️ Removing existing files for single-file category: ${category}`
              );
              const { error: deleteError } = await supabase
                .from("dog_documents")
                .delete()
                .eq("dog_id", dogId)
                .eq("category", category);

              if (deleteError) {
                console.warn(
                  `Warning: Could not delete existing ${category} documents:`,
                  deleteError
                );
              }
            }

            // Determine file type for better organization
            const isImage =
              file.type?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name);
            const subfolder = isImage ? "images" : "documents";
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
            const path = `${dogId}/${subfolder}/${Date.now()}-${sanitizedFileName}`;

            const { error: uploadError } = await supabase.storage
              .from("dog-photos")
              .upload(path, file, { upsert: false });

            if (uploadError) {
              console.error("📤 Upload error for", file.name, ":", uploadError);
              throw new Error(
                `Upload failed for ${file.name}: ${uploadError.message}`
              );
            }

            const { error: docInsertError } = await supabase
              .from("dog_documents")
              .insert({
                dog_id: dogId,
                user_id: userId,
                file_name: file.name,
                storage_path: path,
                file_size_bytes: file.size,
                content_type: file.type,
                category: category,
              });

            if (docInsertError) throw docInsertError;
            console.log(`✅ Document uploaded: ${file.name}`);
          }
        }

        setSuccess(true);
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
