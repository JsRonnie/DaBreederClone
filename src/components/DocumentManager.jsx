import React, { useRef } from "react";
import useDogDocuments from "../hooks/useDogDocuments";

export default function DocumentManager({
  dogId,
  requiredCategories = ["vaccination", "pedigree", "dna", "health"],
  data,
  updateDocuments,
  removeDocument,
}) {
  const { documents, loading, error } = useDogDocuments(dogId);
  const fileInputRefs = {
    vaccination: useRef(null),
    pedigree: useRef(null),
    dna: useRef(null),
    health: useRef(null),
  };

  const handleFiles = (filesList, category) => {
    const files = Array.from(filesList);
    updateDocuments(files, category);
  };

  const handleDelete = (fileName, category) => {
    removeDocument(fileName, category);
  };

  const getDocumentsByCategory = (category) => {
    // First get existing documents from database
    const existingDocs = documents.filter((doc) => doc.category === category);
    // Then get new documents from form data
    const newDocs =
      data?.documents?.filter((f) => f.category === category) || [];
    return [...existingDocs, ...newDocs];
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
      <div className="field">
        <label>{title}</label>
        <div className="documents-preview">
          {categoryDocs.length > 0 && (
            <div className="documents-list">
              {categoryDocs.map((doc, index) => {
                // Handle both database documents and new file objects
                const fileName =
                  doc.file_name || doc.file?.name || doc.name || "Unknown file";
                const fileSize = doc.file_size_bytes || doc.file?.size || 0;

                return (
                  <div
                    key={doc.id || `${category}-${fileName}-${index}`}
                    className="document-item"
                  >
                    <div className="document-info">
                      <svg
                        className="document-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
                      <div className="document-details">
                        <span className="document-filename">{fileName}</span>
                        <span className="document-size">
                          {formatFileSize(fileSize)}
                        </span>
                      </div>
                    </div>
                    <div className="document-buttons">
                      <button
                        type="button"
                        className="remove-document-btn"
                        onClick={() => handleDelete(fileName, category)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Always show upload option */}
          <div className="document-item">
            <div className="document-info">
              <svg
                className="document-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              <span className="document-filename">
                {categoryDocs.length === 0
                  ? "No documents uploaded"
                  : "Add more files"}
              </span>
            </div>
            <div className="document-buttons">
              <button
                type="button"
                className="add-more-btn"
                onClick={() => inputRef.current?.click()}
              >
                {categoryDocs.length === 0 ? "Add Files" : "Add More"}
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden-file-input"
            onChange={(e) => {
              handleFiles(e.target.files, category);
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

  const categoryTitles = {
    vaccination: "Vaccination Records",
    pedigree: "Pedigree Certificates",
    dna: "DNA Test Results",
    health: "Health Certificates",
  };

  return (
    <div>
      {requiredCategories.map((category) => (
        <DocumentSection
          key={category}
          title={categoryTitles[category]}
          category={category}
          inputRef={fileInputRefs[category]}
        />
      ))}
    </div>
  );
}
