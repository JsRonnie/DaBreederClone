import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { calculateMatchScore } from "../utils/matchmaking";
import { Link, useLocation } from "react-router-dom";
import "./FindMatchPage.css";

export default function FindMatchPage() {
  const location = useLocation();

  const [userDogs, setUserDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDogs = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("dogs")
          .select("*")
          .eq("user_id", user.id);
        if (error) {
          setError(error.message);
        } else {
          setUserDogs(data);
        }
      }
    };
    fetchUserDogs();

    // Restore state if coming back from a profile page
    if (location.state) {
      const { selectedDog: savedSelectedDog, potentialMatches: savedMatches } =
        location.state;
      if (savedSelectedDog) {
        setSelectedDog(savedSelectedDog);
      }
      if (savedMatches) {
        setPotentialMatches(savedMatches);
      }
    }
  }, [location.state]);

  const handleSelectDog = async (dog) => {
    setSelectedDog(dog);
    setLoading(true);
    setError(null);
    setPotentialMatches([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("dogs")
      .select("*")
      .neq("gender", dog.gender) // Basic filtering for breeding compatibility
      .neq("user_id", user.id); // Exclude user's own dogs

    if (error) {
      setError(error.message);
    } else {
      const scoredMatches = data
        .map((match) => ({
          ...match,
          score: calculateMatchScore(dog, match),
        }))
        .filter((match) => match.score > 0) // Only show compatible matches
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 3); // Get top 3 matches only
      setPotentialMatches(scoredMatches);
    }
    setLoading(false);
  };

  const handleContact = (match) => {
    // For now, we'll show an alert with contact info
    // In a real app, this would open a messaging system or show contact details
    alert(
      `Contact ${match.name}'s owner through their profile page or messaging system.`
    );
  };

  return (
    <div className="find-match-container">
      {/* Header Section */}
      <div className="header-section">
        <h1 className="page-title">Find Matches</h1>
        <p className="page-description">
          Find compatible breeding partners for your dogs
        </p>
      </div>

      {/* Dog Selection Section */}
      <div className="content-section">
        <h2 className="section-title">Select Your Dog</h2>

        {userDogs.length === 0 ? (
          <div className="empty-state">
            <p>Add a dog to your profile first to find matches</p>
            <Link to="/add-dog" className="primary-btn">
              Add Dog
            </Link>
          </div>
        ) : (
          <div className="dogs-grid">
            {userDogs.map((dog) => (
              <div
                key={dog.id}
                className={`dog-card ${
                  selectedDog?.id === dog.id ? "selected" : ""
                }`}
                onClick={() => handleSelectDog(dog)}
              >
                <img
                  src={dog.image_url || "/shibaPor.jpg"}
                  alt={dog.name}
                  className="dog-image"
                />
                <div className="dog-info">
                  <h3>{dog.name}</h3>
                  <p>{dog.breed}</p>
                  <div
                    className={
                      "gender-pill " +
                      (((dog.gender || dog.sex || "") + "").toString().toLowerCase() === "male"
                        ? "male"
                        : (((dog.gender || dog.sex || "") + "").toString().toLowerCase() === "female"
                          ? "female"
                          : "unknown"))
                    }
                    style={{ marginTop: 6 }}
                  >
                    {(() => {
                      const g = (dog.gender || dog.sex || "").toString();
                      const label = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : "—";
                      return <span className="gender-label">{label.toLowerCase()}</span>;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {selectedDog && (
        <div className="content-section">
          <h2 className="section-title">Matches for {selectedDog.name}</h2>

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Finding matches...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
            </div>
          )}

          {!loading && potentialMatches.length === 0 && !error && (
            <div className="empty-state">
              <p>No compatible matches found at this time.</p>
            </div>
          )}

          {!loading && potentialMatches.length > 0 && (
            <div className="matches-grid">
              {potentialMatches.map((match, index) => (
                <div key={match.id} className="match-card">
                  <div className="match-rank">#{index + 1}</div>
                  <div className="match-score">{match.score}% Match</div>

                  <div className="card-image-wrapper">
                    <img
                      src={match.image_url || "/shibaPor.jpg"}
                      alt={match.name}
                      className="match-image"
                    />
                  </div>

                  <div className="card-content">
                    <h3 className="match-name">{match.name}</h3>
                    <div className="match-details">
                      <div className="detail-item">
                        <span className="detail-label">Breed</span>
                        <span className="detail-value capitalize">
                          {match.breed}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Age</span>
                        <span className="detail-value">
                          {match.age_years} years old
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value capitalize">
                          {match.gender}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link
                        to={`/dog/${match.id}`}
                        state={{
                          fromFindMatch: true,
                          selectedDog: selectedDog,
                          potentialMatches: potentialMatches,
                        }}
                        className="view-profile-btn"
                      >
                        View Profile
                      </Link>
                      <button
                        className="contact-btn"
                        onClick={() => handleContact(match)}
                      >
                        Contact Owner
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
