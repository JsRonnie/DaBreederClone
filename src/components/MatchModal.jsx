import React from "react";
import { Link } from "react-router-dom";

export default function MatchModal({ isOpen, onClose, selectedDog, matches, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Top Matches for {selectedDog?.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Finding the best matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No compatible matches found at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matches.map((match, index) => (
                <div
                  key={match.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  {/* Match Ranking Badge */}
                  <div className="relative">
                    <div className="absolute top-3 left-3 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">
                      #{index + 1}
                    </div>
                    <div className="absolute top-3 right-3 bg-green-600 text-white rounded-full px-3 py-1 text-sm font-bold z-10">
                      {match.score}% Match
                    </div>
                    <img
                      src={match.image_url || "/shibaPor.jpg"}
                      alt={match.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = "/shibaPor.jpg";
                      }}
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{match.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1 mb-4">
                      <p>{match.breed}</p>
                      <p>
                        {match.age_years} years old • {match.gender}
                      </p>
                      <p>Size: {match.size}</p>
                      <p>Weight: {match.weight_kg} kg</p>
                    </div>

                    <Link
                      to={`/dog/${match.id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
