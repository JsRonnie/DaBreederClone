import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useDogProfile from "../hooks/useDogProfile";
import useFormData from "../hooks/useFormData";
import useDogMatches from "../hooks/useDogMatches";
import Step1DogInfo from "../stepComponents/Step1DogInfo";
import Step2Health from "../stepComponents/Step2Health";
import Step3Traits from "../stepComponents/Step3Traits";
import DocumentManager from "../components/DocumentManager";
import supabase from "../lib/supabaseClient";
import { listDogDocuments, mapDogDocumentsToForm, removeDocumentsByIds } from "../lib/dogDocuments";
import "./DogEditPage.css"; // warm dog-lover theme

export default function DogEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dog, photoUrl, loading: profileLoading, error: profileError } = useDogProfile(id);
  const form = useFormData();
  const { historyMatches, loading: matchesLoading } = useDogMatches();
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;
  const dogHistoryMatches =
    historyMatches?.filter(
      (m) => m.requester_dog_id === dog?.id || m.requested_dog_id === dog?.id
    ) || [];
  const totalPages = Math.ceil(dogHistoryMatches.length / HISTORY_PER_PAGE);
  const paginatedHistory = dogHistoryMatches.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" or "error"
  const [initialDocuments, setInitialDocuments] = useState([]);
  const [, setCurrentUser] = useState(null);
  const [, setAuthChecking] = useState(true);

  // Toast helper function
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        setCurrentUser(user);

        // If we have both user and dog data, check ownership
        if (user && dog && user.id !== dog.user_id) {
          console.log("User not authorized to edit this dog");
          navigate("/my-dog");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/my-dog");
      } finally {
        setAuthChecking(false);
      }
    };

    if (dog) {
      checkAuth();
    }
  }, [dog, navigate]);

  // Function to determine which document categories are required based on checked boxes
  const getRequiredCategories = (data) => {
    const required = [];
    if (data.vaccinated) required.push("vaccination");
    if (data.pedigree_certified) required.push("pedigree");
    if (data.dna_tested) required.push("dna");
    if (
      data.hip_elbow_tested ||
      data.heart_tested ||
      data.eye_tested ||
      data.genetic_panel ||
      data.thyroid_tested
    )
      required.push("health");
    return required;
  };

  // Initialize form with existing dog data and store initial documents
  useEffect(() => {
    if (dog && initializing) {
      console.log(" Initializing form with dog data:", dog);

      // Fetch initial documents and populate form
      const fetchInitialDocuments = async () => {
        try {
          const docs = await listDogDocuments(id);
          if (docs) {
            setInitialDocuments(docs);
            const formDocuments = mapDogDocumentsToForm(docs);
            // Use setFormData to populate all fields at once including existing documents
            form.setFormData({
              name: dog.name || "",
              gender: dog.gender || "",
              breed: dog.breed || "",
              age: dog.age_years || "", // Map database age_years to UI age field
              age_years: dog.age_years || "",
              size: dog.size || "",
              weight_kg: dog.weight_kg || "",
              color: dog.color || "",
              coat_type: dog.coat_type || "",
              activity_level: dog.activity_level || "",
              sociability: dog.sociability || "",
              trainability: dog.trainability || "",

              build: dog.build || "",
              vaccinated: dog.vaccinated || false,
              dna_tested: dog.dna_tested || false,
              pedigree_certified: dog.pedigree_certified || false,
              hip_elbow_tested: dog.hip_elbow_tested || false,
              heart_tested: dog.heart_tested || false,
              eye_tested: dog.eye_tested || false,
              genetic_panel: dog.genetic_panel || false,
              thyroid_tested: dog.thyroid_tested || false,
              // Load existing documents
              photo: null,
              documents: formDocuments,
            });
          } else {
            // If no documents found, still set the form data
            form.setFormData({
              name: dog.name || "",
              gender: dog.gender || "",
              breed: dog.breed || "",
              age: dog.age_years || "", // Map database age_years to UI age field
              age_years: dog.age_years || "",
              size: dog.size || "",
              weight_kg: dog.weight_kg || "",
              color: dog.color || "",
              coat_type: dog.coat_type || "",
              activity_level: dog.activity_level || "",
              sociability: dog.sociability || "",
              trainability: dog.trainability || "",

              build: dog.build || "",
              vaccinated: dog.vaccinated || false,
              dna_tested: dog.dna_tested || false,
              pedigree_certified: dog.pedigree_certified || false,
              hip_elbow_tested: dog.hip_elbow_tested || false,
              heart_tested: dog.heart_tested || false,
              eye_tested: dog.eye_tested || false,
              genetic_panel: dog.genetic_panel || false,
              thyroid_tested: dog.thyroid_tested || false,
              photo: null,
              documents: [],
            });
          }
        } catch (error) {
          console.warn("Could not fetch initial documents:", error);
          // Still set form data even if document fetch fails
          form.setFormData({
            name: dog.name || "",
            gender: dog.gender || "",
            breed: dog.breed || "",
            age: dog.age_years || "", // Map database age_years to UI age field
            age_years: dog.age_years || "",
            size: dog.size || "",
            weight_kg: dog.weight_kg || "",
            color: dog.color || "",
            coat_type: dog.coat_type || "",
            activity_level: dog.activity_level || "",
            sociability: dog.sociability || "",
            trainability: dog.trainability || "",

            build: dog.build || "",
            vaccinated: dog.vaccinated || false,
            dna_tested: dog.dna_tested || false,
            pedigree_certified: dog.pedigree_certified || false,
            hip_elbow_tested: dog.hip_elbow_tested || false,
            heart_tested: dog.heart_tested || false,
            eye_tested: dog.eye_tested || false,
            genetic_panel: dog.genetic_panel || false,
            thyroid_tested: dog.thyroid_tested || false,
            photo: null,
            documents: [],
          });
        }
      };

      fetchInitialDocuments();

      setInitializing(false);
    }
  }, [dog, initializing, form, id, setInitialDocuments]);

  // Cleanup unsaved documents on component unmount (if user navigates away)
  useEffect(() => {
    return () => {
      // Only cleanup if we haven't saved (saving flag will be false if navigated away)
      if (!saving && initialDocuments.length > 0) {
        const cleanupUnsavedDocuments = async () => {
          try {
            const { data: currentDocs, error } = await supabase
              .from("dog_documents")
              .select("*")
              .eq("dog_id", id);

            if (!error && currentDocs) {
              const initialDocIds = new Set(initialDocuments.map((doc) => doc.id));
              const newDocs = currentDocs.filter((doc) => !initialDocIds.has(doc.id));

              if (newDocs.length > 0) {
                console.log("Cleanup on unmount - removing unsaved documents:", newDocs.length);
                try {
                  await removeDocumentsByIds(newDocs.map((d) => d.id));
                } catch (err) {
                  console.warn("Failed batch cleanup on unmount:", err);
                }
              }
            }
          } catch (error) {
            console.warn("Error during unmount cleanup:", error);
          }
        };

        cleanupUnsavedDocuments();
      }
    };
  }, [id, initialDocuments, saving]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setUploadProgress(0);

    try {
      console.log("Saving dog profile changes...");
      console.log("Current form data:", form.data);

      setUploadProgress(10); // Started validation

      // Basic validation
      if (!form.data.name || !form.data.gender) {
        throw new Error("Name and gender are required fields");
      }

      // Validate required documents
      const requiredCategories = getRequiredCategories(form.data);
      if (requiredCategories.length > 0) {
        // Check if documents exist for required categories (both existing and new)
        const { data: existingDocs, error: docsError } = await supabase
          .from("dog_documents")
          .select("category")
          .eq("dog_id", id);

        if (docsError) {
          console.warn("Could not check existing documents:", docsError);
        }

        // Combine existing documents and new documents from form
        const existingCategories = new Set(existingDocs?.map((doc) => doc.category) || []);
        const newDocumentCategories = new Set(
          form.data.documents?.map((doc) => doc.category) || []
        );
        const allCategories = new Set([...existingCategories, ...newDocumentCategories]);

        const missingCategories = requiredCategories.filter((cat) => !allCategories.has(cat));

        if (missingCategories.length > 0) {
          const categoryNames = {
            vaccination: "Vaccination Records",
            pedigree: "Pedigree Certificates",
            dna: "DNA Test Results",
            health: "Health Certificates",
          };
          const missingNames = missingCategories.map((cat) => categoryNames[cat]).join(", ");
          throw new Error(`Please upload documents for: ${missingNames}`);
        }
      }

      setUploadProgress(30); // Completed validation

      // Use the form's update method instead of submit (to update existing dog)
      const success = await form.updateDog(id, initialDocuments);

      setUploadProgress(80); // Update completed

      if (success) {
        console.log("Dog profile updated successfully");

        // Update initial documents to current state to prevent cleanup
        const updatedDocs = await listDogDocuments(id);
        if (updatedDocs) setInitialDocuments(updatedDocs);

        setUploadProgress(100); // All done
        setSaveSuccess(true);
        showToastMessage("Dog profile updated successfully!", "success");

        // Show success message briefly before navigating
        setTimeout(() => {
          navigate(`/dog/${id}`);
        }, 1500);
      } else {
        throw new Error("Failed to update dog profile. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      setUploadProgress(0);
      showToastMessage(`Failed to update dog profile: ${error.message}`, "error");
      // Don't navigate on error, let user see the error and try again
    } finally {
      // Only set saving to false after success message is shown
      if (!saveSuccess) {
        setSaving(false);
      } else {
        // Keep saving state for success animation
        setTimeout(() => {
          setSaving(false);
        }, 1500);
      }
    }
  };

  const handleCancel = async () => {
    try {
      // Fetch current documents
      const { data: currentDocs, error } = await supabase
        .from("dog_documents")
        .select("*")
        .eq("dog_id", id);

      if (!error && currentDocs) {
        // Find documents that were added during this session
        const initialDocIds = new Set(initialDocuments.map((doc) => doc.id));
        const newDocs = currentDocs.filter((doc) => !initialDocIds.has(doc.id));

        if (newDocs.length > 0) {
          console.log("Cleaning up unsaved documents:", newDocs.length);
          try {
            await removeDocumentsByIds(newDocs.map((d) => d.id));
          } catch (err) {
            console.warn("Failed batch cleanup:", err);
          }
        }
      }
    } catch (error) {
      console.warn("Error during cleanup:", error);
    } finally {
      navigate(`/dog/${id}`);
    }
  };

  if (profileLoading || initializing) {
    return (
      <div className="dog-edit-loading">
        <div className="dog-edit-loading-content">
          <div className="dog-edit-spinner"></div>
          <p className="dog-edit-loading-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !dog) {
    return (
      <div className="dog-profile-error">
        <div className="dog-profile-error-card">
          <div className="dog-profile-error-icon">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="dog-profile-error-title">Profile Not Found</h1>
          <p className="dog-profile-error-message">
            The dog profile you're trying to edit doesn't exist.
          </p>
          <button onClick={() => navigate("/my-dog")} className="dog-profile-error-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dog-edit-page">
      <div className="dog-edit-container">
        {/* Header */}
        <div className="dog-profile-header">
          <div className="dog-profile-header-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={handleCancel} className="dog-profile-back-btn">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="dog-profile-name">Edit {dog.name}'s Profile</h1>
                  <p className="dog-profile-breed">Update your dog's information</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-8">
          {/* Basic Information & Photo */}
          <div className="dog-edit-section">
            <div className="dog-edit-section-header">
              <h2 className="dog-edit-section-title">Basic Information & Photo</h2>
              <p className="dog-edit-section-description">
                Update your dog's basic details and profile photo
              </p>
            </div>
            <div className="dog-edit-section-body">
              <Step1DogInfo
                data={form.data}
                updateField={form.updateField}
                updatePhoto={form.updatePhoto}
                currentPhotoUrl={photoUrl}
              />
            </div>
          </div>

          {/* Traits & Physical Characteristics */}
          <div className="dog-edit-section">
            <div className="dog-edit-section-header">
              <h2 className="dog-edit-section-title">Traits & Physical Characteristics</h2>
              <p className="dog-edit-section-description">
                Describe your dog's personality and physical features
              </p>
            </div>
            <div className="dog-edit-section-body">
              <Step3Traits data={form.data} updateField={form.updateField} />
            </div>
          </div>

          {/* Health & Verification */}
          <div className="dog-edit-section">
            <div className="dog-edit-section-header">
              <h2 className="dog-edit-section-title">Health & Verification</h2>
              <p className="dog-edit-section-description">
                Update health records and certifications
              </p>
            </div>
            <div className="dog-edit-section-body">
              <Step2Health data={form.data} updateCheckbox={form.updateCheckbox} />

              {/* Conditional Documents Section */}
              {(form.data.vaccinated ||
                form.data.pedigree_certified ||
                form.data.dna_tested ||
                form.data.hip_elbow_tested ||
                form.data.heart_tested ||
                form.data.eye_tested ||
                form.data.genetic_panel ||
                form.data.thyroid_tested) && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Required Documents</h3>
                    <p className="text-sm text-gray-700">
                      Please upload the following documents for the certifications you've checked:
                    </p>
                    <div className="dog-edit-warning">
                      <div className="dog-edit-warning-content">
                        <svg
                          className="w-5 h-5 dog-edit-warning-icon"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="dog-edit-warning-text">
                          Documents are required for checked certifications before saving.
                        </span>
                      </div>
                    </div>
                  </div>
                  <DocumentManager
                    dogId={id}
                    requiredCategories={getRequiredCategories(form.data)}
                    data={form.data}
                    updateDocuments={form.updateDocuments}
                    removeDocument={form.removeDocument}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dog History Table */}
        <div className="dog-profile-card mt-8">
          <div className="dog-profile-card-header">
            <h2 className="dog-profile-card-title">Dog History</h2>
          </div>
          <div className="dog-profile-card-body">
            {matchesLoading ? (
              <div className="text-gray-500">Loading dog history...</div>
            ) : paginatedHistory.length === 0 ? (
              <div className="text-gray-500">No history found for this dog.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="dog-profile-history-table">
                  <thead className="dog-profile-history-header">
                    <tr>
                      <th>Date</th>
                      <th>Partner</th>
                      <th>Status</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((match) => {
                      const isRequester = match.requester_dog_id === dog.id;
                      const partnerDog = isRequester ? match.requested_dog : match.requester_dog;
                      const date =
                        match.completed_at ||
                        match.declined_at ||
                        match.cancelled_at ||
                        match.requested_at;
                      const outcome =
                        match.outcome?.outcome ||
                        (match.status === "completed_success"
                          ? "Success"
                          : match.status === "completed_failed"
                            ? "Failed"
                            : match.status.charAt(0).toUpperCase() + match.status.slice(1));
                      return (
                        <tr key={match.id} className="dog-profile-history-row">
                          <td>{date ? new Date(date).toLocaleDateString() : "—"}</td>
                          <td>
                            {partnerDog?.id ? (
                              <a
                                href={`/dog/${partnerDog.id}`}
                                className="dog-profile-history-link"
                              >
                                {partnerDog.name}
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td>
                            {match.status.replace("completed_", "Completed: ").replace("_", " ")}
                          </td>
                          <td>{outcome}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="dog-edit-pagination">
                  <button
                    className="dog-edit-pagination-btn"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="dog-edit-pagination-text">
                    Page {historyPage} of {totalPages}
                  </span>
                  <button
                    className="dog-edit-pagination-btn"
                    disabled={historyPage === totalPages}
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {saveSuccess && (
          <div className="dog-edit-success">
            <div className="dog-edit-success-content">
              <div className="dog-edit-success-icon">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="dog-edit-success-title">Changes saved successfully!</h3>
                <div className="dog-edit-success-message">
                  <p>Your dog's profile has been updated and all files have been uploaded.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {form.error && (
          <div className="dog-edit-error">
            <div className="dog-edit-error-content">
              <div className="dog-edit-error-icon">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="dog-edit-error-title">Error saving changes</h3>
                <div className="dog-edit-error-message">
                  <p>{form.error.message || "An unexpected error occurred"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Save Bar */}
        <div className="dog-edit-save-bar">
          <div className="dog-edit-save-bar-content">
            {/* Progress Bar */}
            {saving && uploadProgress > 0 && (
              <div className="dog-edit-progress-container">
                <div className="dog-edit-progress-header">
                  <span>
                    {uploadProgress < 30
                      ? "Validating..."
                      : uploadProgress < 80
                        ? "Updating profile..."
                        : uploadProgress < 100
                          ? "Uploading files..."
                          : "Finalizing..."}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="dog-edit-progress-bar">
                  <div
                    className="dog-edit-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="dog-edit-save-bar-actions">
              <p className="dog-edit-save-bar-message">
                {saveSuccess ? "Changes saved successfully!" : "Don't forget to save your changes"}
              </p>
              <div className="dog-edit-save-bar-buttons">
                <button onClick={handleCancel} disabled={saving} className="dog-edit-btn-cancel">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`dog-edit-btn-save ${
                    saveSuccess ? "dog-edit-btn-save-success" : "dog-edit-btn-save-default"
                  }`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Saved!
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing for sticky bar */}
        <div className="h-20"></div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`dog-edit-toast ${
            toastType === "success" ? "dog-edit-toast-success" : "dog-edit-toast-error"
          }`}
        >
          {toastType === "success" ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
