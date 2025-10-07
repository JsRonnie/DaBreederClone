import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import useDogProfile from "../hooks/useDogProfile";
import supabase from "../lib/supabaseClient";

export default function DogProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { dog, photoUrl, loading, error } = useDogProfile(id);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Check if current user owns this dog
  const isOwner = currentUser && dog && currentUser.id === dog.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !dog) {
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
            The dog profile you're looking for doesn't exist or has been
            removed.
          </p>
          <button
            onClick={() => {
              if (location.state?.fromFindMatch) {
                navigate("/find-match", {
                  state: {
                    selectedDog: location.state.selectedDog,
                    potentialMatches: location.state.potentialMatches,
                  },
                });
              } else {
                navigate("/dashboard");
              }
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {location.state?.fromFindMatch
              ? "Back to Find Match"
              : "Back to Dashboard"}
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
                  onClick={() => {
                    if (location.state?.fromFindMatch) {
                      navigate("/find-match", {
                        state: {
                          selectedDog: location.state.selectedDog,
                          potentialMatches: location.state.potentialMatches,
                        },
                      });
                    } else {
                      navigate("/dashboard");
                    }
                  }}
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
                    {dog.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {dog.breed || "Breed not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {isOwner && (
                  <button
                    onClick={() => navigate(`/dog/${id}/edit`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hero Section with Photo */}
          <div className="px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:space-x-8">
              {/* Photo */}
              <div className="flex-shrink-0 mb-6 lg:mb-0">
                <div className="w-64 h-64 mx-auto lg:mx-0 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-gray-400"
                    style={photoUrl ? { display: "none" } : {}}
                  >
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm">No photo</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm text-gray-500">Gender</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.gender || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Size</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.size || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Color</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.color || "—"}
                        </dd>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                      Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm text-gray-500">Age</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.age_years ? `${dog.age_years} years` : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Weight</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.weight_kg ? `${dog.weight_kg} kg` : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Coat Type</dt>
                        <dd className="text-base text-gray-900 font-medium">
                          {dog.coat_type || "—"}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dog Characteristics */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Dog Characteristics
              </h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Activity Level</dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {dog.activity_level || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Sociability</dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {dog.sociability || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Trainability</dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {dog.trainability || "—"}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Health & Verification */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Health & Verification
              </h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-500">Vaccinated</dt>
                  <dd className="flex items-center">
                    {dog.vaccinated ? (
                      <div className="flex items-center text-green-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">No</span>
                      </div>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-500">DNA Tested</dt>
                  <dd className="flex items-center">
                    {dog.dna_tested ? (
                      <div className="flex items-center text-green-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">No</span>
                      </div>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-500">Pedigree Certified</dt>
                  <dd className="flex items-center">
                    {dog.pedigree_certified ? (
                      <div className="flex items-center text-green-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">No</span>
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
