import React, { useRef } from "react";
import "../stepComponents/stepbystepUI.css";

export default function DocumentManager({ data, updateDocuments, removeDocument }) {
  const vaccinationRef = useRef(null);
  const pedigreeRef = useRef(null);
  const dnaRef = useRef(null);
  const healthRef = useRef(null);

  const handleFiles = (filesList, category) => {
    const files = Array.from(filesList);

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/rtf",
      ];
      const validExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|doc|docx|txt|rtf)$/i;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        console.warn(
          `File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(
            2
          )}MB). Maximum size is 10MB.`
        );
        return false;
      }

      if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
        console.warn(
          `File ${file.name} has an invalid type. Please upload images or documents only.`
        );
        return false;
      }

      return true;
    });

    if (validFiles.length !== files.length) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            message: `${files.length - validFiles.length} file(s) were skipped due to invalid type or size. Please upload images or documents under 10MB.`,
            type: "warning",
          },
        })
      );
    }

    updateDocuments(validFiles, category);
  };

  // Component for single file upload (Primary Certifications)
  const SingleDocumentUploadSection = ({ title, category, inputRef }) => {
    const categoryFiles = data.documents?.filter((f) => f.category === category) || [];

    // For single file categories, we should only have one file maximum
    // If there are multiple files due to data inconsistency, take only the first one
    const hasFile = categoryFiles.length > 0;
    const currentFile = hasFile ? categoryFiles[0] : null;
    const fileName = currentFile?.file?.name || currentFile?.name || "Unknown file";

    console.log(`📄 Single file section for ${category}:`, {
      hasFile,
      categoryFilesCount: categoryFiles.length,
      currentFile: currentFile
        ? {
            name: fileName,
            isExisting: currentFile.isExisting,
            hasFileObject: !!currentFile.file,
          }
        : null,
    });

    const handleSingleFileUpload = (filesList) => {
      if (filesList.length > 0) {
        console.log(`🔄 Single file upload for ${category}:`, filesList[0].name);
        // The updateDocuments function now handles single-file replacement automatically
        handleFiles([filesList[0]], category); // Only take the first file
      }
    };

    return (
      <div className="field">
        <label>
          {title} <span className="single-file-indicator">(Single file only)</span>
        </label>
        <div className="documents-preview">
          {hasFile ? (
            <div className="documents-list">
              <div className="document-item has-file">
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
                  <span className="document-filename">{fileName}</span>
                </div>
                <div className="document-buttons">
                  <button
                    type="button"
                    className="add-more-btn"
                    onClick={() => inputRef.current?.click()}
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    className="remove-document-btn"
                    onClick={() => {
                      console.log(`🗑️ Remove button clicked for: ${fileName} in ${category}`);
                      removeDocument(fileName, category);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="document-item no-file">
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
                <span className="document-filename">No document uploaded</span>
              </div>
              <div className="document-buttons">
                <button
                  type="button"
                  className="add-more-btn"
                  onClick={() => inputRef.current?.click()}
                >
                  Add File
                </button>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.txt,.rtf"
            className="hidden-file-input"
            onChange={(e) => {
              handleSingleFileUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  };

  // Component for multiple file upload (Additional Health Tests)
  const MultipleDocumentUploadSection = ({ title, category, inputRef }) => {
    const categoryFiles = data.documents?.filter((f) => f.category === category) || [];

    return (
      <div className="field">
        <label>
          {title} <span className="multiple-file-indicator">(Multiple files allowed)</span>
        </label>
        <div className="documents-preview">
          {categoryFiles.length > 0 ? (
            <div className="documents-list">
              {categoryFiles.map((f, index) => {
                const fileName = f.file?.name || f.name || "Unknown file";
                return (
                  <div key={`${category}-${fileName}-${index}`} className="document-item has-file">
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
                      <span className="document-filename">{fileName}</span>
                    </div>
                    <div className="document-buttons">
                      <button
                        type="button"
                        className="remove-document-btn"
                        onClick={() => {
                          console.log(
                            `🗑️ Multiple file remove button clicked for: ${fileName} in ${category}`
                          );
                          removeDocument(fileName, category);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="add-more-section">
                <button
                  type="button"
                  className="add-more-btn"
                  onClick={() => inputRef.current?.click()}
                >
                  Add More Files
                </button>
              </div>
            </div>
          ) : (
            <div className="document-item no-file">
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
                <span className="document-filename">No documents uploaded</span>
              </div>
              <div className="document-buttons">
                <button
                  type="button"
                  className="add-more-btn"
                  onClick={() => inputRef.current?.click()}
                >
                  Add Files
                </button>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.txt,.rtf"
            className="hidden-file-input"
            onChange={(e) => {
              handleFiles(e.target.files, category);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  };

  // Check if any additional health tests are selected
  const hasAdditionalHealthTests =
    data.hip_elbow_tested ||
    data.heart_tested ||
    data.eye_tested ||
    data.genetic_panel ||
    data.thyroid_tested;

  // Check if any documents are required
  const hasAnyDocuments =
    data.vaccinated || data.pedigree_certified || data.dna_tested || hasAdditionalHealthTests;

  return (
    <div className="step step-4">
      {!hasAnyDocuments ? (
        <div className="no-documents-message">
          <div className="no-docs-icon">
            <svg
              className="w-12 h-12 text-gray-400"
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
          <p className="text-gray-500 text-center">
            No certifications selected. Check the boxes above to enable document uploads.
          </p>
        </div>
      ) : (
        <div className="documents-container">
          {/* Primary Certifications - Single File Only */}
          {(data.vaccinated || data.pedigree_certified || data.dna_tested) && (
            <div className="document-category primary-certifications">
              <h4 className="category-title">
                Primary Certifications
                <span className="category-description">(Single file per certification)</span>
              </h4>
              <div className="category-fields">
                {data.vaccinated && (
                  <SingleDocumentUploadSection
                    title="Vaccination Records"
                    category="vaccination"
                    inputRef={vaccinationRef}
                  />
                )}
                {data.pedigree_certified && (
                  <SingleDocumentUploadSection
                    title="Pedigree Certificates"
                    category="pedigree"
                    inputRef={pedigreeRef}
                  />
                )}
                {data.dna_tested && (
                  <SingleDocumentUploadSection
                    title="DNA Test Results"
                    category="dna"
                    inputRef={dnaRef}
                  />
                )}
              </div>
            </div>
          )}

          {/* Additional Health Tests - Multiple Files Allowed */}
          {hasAdditionalHealthTests && (
            <div className="document-category health-tests">
              <h4 className="category-title">
                Additional Health Tests (Optional)
                <span className="category-description">(Multiple files allowed per test type)</span>
              </h4>
              <div className="category-fields">
                {(data.hip_elbow_tested ||
                  data.heart_tested ||
                  data.eye_tested ||
                  data.genetic_panel ||
                  data.thyroid_tested) && (
                  <MultipleDocumentUploadSection
                    title="Health Test Results"
                    category="health"
                    inputRef={healthRef}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
