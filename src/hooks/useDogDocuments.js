import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

/**
 * Load documents for a specific dog
 */
export default function useDogDocuments(dogId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dogId) {
      setDocuments([]);
      return;
    }

    let cancelled = false;

    async function loadDocuments() {
      try {
        setLoading(true);
        setError(null);

        const { data: docs, error: docsError } = await supabase
          .from("dog_documents")
          .select("*")
          .eq("dog_id", dogId)
          .order("id", { ascending: false });

        if (docsError) throw docsError;
        if (cancelled) return;

        console.log("📄 Loaded documents for dog:", dogId, docs);
        setDocuments(docs || []);
      } catch (e) {
        if (!cancelled) {
          console.error("❌ Failed to load documents:", e);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  const deleteDocument = async (documentId, storagePath) => {
    try {
      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("dog-documents")
          .remove([storagePath]);

        if (storageError) {
          console.warn("⚠️ Failed to delete file from storage:", storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("dog_documents")
        .delete()
        .eq("id", documentId);

      if (dbError) throw dbError;

      // Update local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      return true;
    } catch (e) {
      console.error("❌ Failed to delete document:", e);
      setError(e);
      return false;
    }
  };

  return {
    documents,
    loading,
    error,
    deleteDocument,
    refetch: () => {
      if (dogId) {
        const loadDocuments = async () => {
          try {
            setLoading(true);
            const { data: docs, error: docsError } = await supabase
              .from("dog_documents")
              .select("*")
              .eq("dog_id", dogId)
              .order("id", { ascending: false });

            if (docsError) throw docsError;
            setDocuments(docs || []);
          } catch (e) {
            setError(e);
          } finally {
            setLoading(false);
          }
        };
        loadDocuments();
      }
    },
  };
}
