import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useDogProfile from "../hooks/useDogProfile";
import useFormData from "../hooks/useFormData";
import Step1DogInfo from "../stepComponents/Step1DogInfo";
import Step2Health from "../stepComponents/Step2Health";
import Step3Traits from "../stepComponents/Step3Traits";
import DocumentManager from "../components/DocumentManager";
import supabase from "../lib/supabaseClient";

export default function DogEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    dog,
    photoUrl,
    loading: profileLoading,
    error: profileError,
  } = useDogProfile(id);
  const form = useFormData();
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" or "error"
  const [initialDocuments, setInitialDocuments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

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
          console.log("❌ User not authorized to edit this dog");
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/dashboard");
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
      console.log("🔄 Initializing form with dog data:", dog);

      // Fetch initial documents and populate form
      const fetchInitialDocuments = async () => {
        try {
          const { data: docs, error } = await supabase
            .from("dog_documents")
            .select("*")
            .eq("dog_id", id);

          if (!error && docs) {
            setInitialDocuments(docs);

            // Convert database documents to form format
            // For Primary Certifications (single file only), take only the first document per category
            // For Additional Health Tests (multiple files allowed), take all documents
            const primaryCertificationCategories = [
              "pedigree",
              "dna",
              "vaccination",
            ];
            const categorizedDocs = {};

            // Group documents by category
            docs.forEach((doc) => {
              const category = doc.category || "misc";
              if (!categorizedDocs[category]) {
                categorizedDocs[category] = [];
              }
              categorizedDocs[category].push(doc);
            });

            // Process documents according to their category constraints
            const formDocuments = [];
            Object.entries(categorizedDocs).forEach(
              ([category, categoryDocs]) => {
                if (primaryCertificationCategories.includes(category)) {
                  // For primary certifications, only take the first (most recent) document
                  // Sort by ID descending to get the most recent
                  const sortedDocs = categoryDocs.sort((a, b) => b.id - a.id);
                  const doc = sortedDocs[0];
                  formDocuments.push({
                    name: doc.file_name,
                    category: category,
                    storage_path: doc.storage_path,
                    file_size_bytes: doc.file_size_bytes,
                    content_type: doc.content_type,
                    isExisting: true,
                  });

                  // Log if there were multiple files for single-file category
                  if (categoryDocs.length > 1) {
                    console.warn(
                      `Multiple files found for single-file category '${category}'. Using most recent file:`,
                      doc.file_name
                    );
                  }
                } else {
                  // For health tests and other categories, take all documents
                  categoryDocs.forEach((doc) => {
                    formDocuments.push({
                      name: doc.file_name,
                      category: category,
                      storage_path: doc.storage_path,
                      file_size_bytes: doc.file_size_bytes,
                      content_type: doc.content_type,
                      isExisting: true,
                    });
                  });
                }
              }
            );

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
              ear_type: dog.ear_type || "",
              tail_type: dog.tail_type || "",
              muzzle_shape: dog.muzzle_shape || "",
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
              ear_type: dog.ear_type || "",
              tail_type: dog.tail_type || "",
              muzzle_shape: dog.muzzle_shape || "",
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
            ear_type: dog.ear_type || "",
            tail_type: dog.tail_type || "",
            muzzle_shape: dog.muzzle_shape || "",
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
              const initialDocIds = new Set(
                initialDocuments.map((doc) => doc.id)
              );
              const newDocs = currentDocs.filter(
                (doc) => !initialDocIds.has(doc.id)
              );

              if (newDocs.length > 0) {
                console.log(
                  "🗑️ Cleanup on unmount - removing unsaved documents:",
                  newDocs.length
                );

                for (const doc of newDocs) {
                  try {
                    await supabase.storage
                      .from("documents")
                      .remove([doc.file_path]);

                    await supabase
                      .from("dog_documents")
                      .delete()
                      .eq("id", doc.id);
                  } catch (deleteError) {
                    console.warn(
                      "Failed to cleanup document on unmount:",
                      doc.file_name,
                      deleteError
                    );
                  }
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
      console.log("💾 Saving dog profile changes...");
      console.log("📋 Current form data:", form.data);

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
        const existingCategories = new Set(
          existingDocs?.map((doc) => doc.category) || []
        );
        const newDocumentCategories = new Set(
          form.data.documents?.map((doc) => doc.category) || []
        );
        const allCategories = new Set([
          ...existingCategories,
          ...newDocumentCategories,
        ]);

        const missingCategories = requiredCategories.filter(
          (cat) => !allCategories.has(cat)
        );

        if (missingCategories.length > 0) {
          const categoryNames = {
            vaccination: "Vaccination Records",
            pedigree: "Pedigree Certificates",
            dna: "DNA Test Results",
            health: "Health Certificates",
          };
          const missingNames = missingCategories
            .map((cat) => categoryNames[cat])
            .join(", ");
          throw new Error(`Please upload documents for: ${missingNames}`);
        }
      }

      setUploadProgress(30); // Completed validation

      // Use the form's update method instead of submit (to update existing dog)
      const success = await form.updateDog(id, initialDocuments);

      setUploadProgress(80); // Update completed

      if (success) {
        console.log("✅ Dog profile updated successfully");

        // Update initial documents to current state to prevent cleanup
        const { data: updatedDocs } = await supabase
          .from("dog_documents")
          .select("*")
          .eq("dog_id", id);
        if (updatedDocs) {
          setInitialDocuments(updatedDocs);
        }

        setUploadProgress(100); // All done
        setSaveSuccess(true);
        showToastMessage("Dog profile updated successfully! 🎉", "success");

        // Show success message briefly before navigating
        setTimeout(() => {
          navigate(`/dog/${id}`);
        }, 1500);
      } else {
        throw new Error("Failed to update dog profile. Please try again.");
      }
    } catch (error) {
      console.error("❌ Failed to save changes:", error);
      setUploadProgress(0);
      showToastMessage(
        `Failed to update dog profile: ${error.message}`,
        "error"
      );
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
          console.log("🗑️ Cleaning up unsaved documents:", newDocs.length);

          // Delete new documents from storage and database
          for (const doc of newDocs) {
            try {
              // Delete from storage
              await supabase.storage.from("documents").remove([doc.file_path]);

              // Delete from database
              await supabase.from("dog_documents").delete().eq("id", doc.id);
            } catch (deleteError) {
              console.warn(
                "Failed to cleanup document:",
                doc.file_name,
                deleteError
              );
            }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !dog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The dog profile you're trying to edit doesn't exist.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Edit {dog.name}'s Profile
                  </h1>
                  <p className="text-sm text-gray-500">
                    Update your dog's information
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-8">
          {/* Basic Information & Photo */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Basic Information & Photo
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Update your dog's basic details and profile photo
              </p>
            </div>
            <div className="px-6 py-6">
              <Step1DogInfo
                data={form.data}
                updateField={form.updateField}
                updatePhoto={form.updatePhoto}
                currentPhotoUrl={photoUrl}
              />
            </div>
          </div>

          {/* Traits & Physical Characteristics */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Traits & Physical Characteristics
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Describe your dog's personality and physical features
              </p>
            </div>
            <div className="px-6 py-6">
              <Step3Traits data={form.data} updateField={form.updateField} />
            </div>
          </div>

          {/* Health & Verification */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Health & Verification
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Update health records and certifications
              </p>
            </div>
            <div className="px-6 py-6">
              <Step2Health
                data={form.data}
                updateCheckbox={form.updateCheckbox}
              />

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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Required Documents
                    </h3>
                    <p className="text-sm text-gray-500">
                      Please upload the following documents for the
                      certifications you've checked:
                    </p>
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex">
                        <svg
                          className="w-4 h-4 mr-2 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          Documents are required for checked certifications
                          before saving.
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

        {/* Success Display */}
        {saveSuccess && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
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
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Changes saved successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your dog's profile has been updated and all files have been
                    uploaded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {form.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
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
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error saving changes
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{form.error.message || "An unexpected error occurred"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            {saving && uploadProgress > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
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
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {saveSuccess
                  ? "✅ Changes saved successfully!"
                  : "Don't forget to save your changes"}
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-6 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                    saveSuccess
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } ${saving ? "opacity-75" : ""}`}
                >
                  {saving ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                    </div>
                  ) : saveSuccess ? (
                    <div className="flex items-center">
                      <svg
                        className="mr-2 h-4 w-4"
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
                    </div>
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
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 text-white font-medium transition-all duration-300 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
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
