import React, { useRef } from "react";
import useDogDocuments from "../hooks/useDogDocuments";
import supabase from "../lib/supabaseClient";

export default function DocumentManager({ dogId, onDocumentAdded }) {
  const { documents, loading, error, deleteDocument, refetch } =
    useDogDocuments(dogId);
  const fileInputRefs = {
    vaccination: useRef(null),
    pedigree: useRef(null),
    dna: useRef(null),
    health: useRef(null),
  };

  const uploadDocument = async (files, category) => {
    if (!files || files.length === 0) return;

    try {
      const file = files[0]; // Take first file
      const fileName = file.name;
      const filePath = `${dogId}/${Date.now()}-${fileName}`;

      console.log(`📤 Uploading ${category} document:`, fileName);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("dog-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get user ID for RLS
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Save to database
      const { error: dbError } = await supabase.from("dog_documents").insert({
        dog_id: dogId,
        user_id: userId,
        file_name: fileName,
        storage_path: filePath,
        file_size_bytes: file.size,
        content_type: file.type,
        category: category,
      });

      if (dbError) throw dbError;

      console.log(`✅ ${category} document uploaded successfully`);
      refetch(); // Refresh the documents list
      onDocumentAdded?.(); // Notify parent component
    } catch (error) {
      console.error(`❌ Failed to upload ${category} document:`, error);
      alert(`Failed to upload document: ${error.message}`);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Are you sure you want to delete ${doc.file_name}?`)) {
      return;
    }

    const success = await deleteDocument(doc.id, doc.storage_path);
    if (success) {
      console.log(`✅ Document deleted: ${doc.file_name}`);
    }
  };

  const getDocumentsByCategory = (category) => {
    return documents.filter((doc) => doc.category === category);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const DocumentSection = ({ title, category, inputRef }) => {
    const categoryDocs = getDocumentsByCategory(category);

    return (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>

        {/* Existing Documents */}
        {categoryDocs.length > 0 && (
          <div className="mb-4 space-y-2">
            {categoryDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size_bytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload New Document */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <svg
              className="w-8 h-8 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600 mb-2">
              {categoryDocs.length > 0
                ? "Upload replacement document"
                : "Upload document"}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Choose File
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              uploadDocument(e.target.files, category);
              e.target.value = ""; // Reset input
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          Failed to load documents: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentSection
        title="Vaccination Records"
        category="vaccination"
        inputRef={fileInputRefs.vaccination}
      />
      <DocumentSection
        title="Pedigree Certificates"
        category="pedigree"
        inputRef={fileInputRefs.pedigree}
      />
      <DocumentSection
        title="DNA Test Results"
        category="dna"
        inputRef={fileInputRefs.dna}
      />
      <DocumentSection
        title="Health Certificates"
        category="health"
        inputRef={fileInputRefs.health}
      />
    </div>
  );
}
