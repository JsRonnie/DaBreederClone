import React, { useState, useRef } from "react";

// Complete list of dog breeds organized by groups
const allBreeds = [
  // Herding Group
  "Australian Cattle Dog",
  "Australian Kelpie",
  "Australian Shepherd",
  "Bearded Collie",
  "Beauceron",
  "Belgian Laekenois",
  "Belgian Malinois",
  "Belgian Sheepdog",
  "Belgian Tervuren",
  "Berger Picard (Berger Picard)",
  "Border Collie",
  "Briard",
  "Catalan Sheepdog",
  "Collie (Rough)",
  "Czeslovakan Wolfdog",
  "Dutch Shepherd",
  "German Shepherd Dog",
  "Hrvatski Ovcar (Croatian Sheepdog)",
  "Komondor",
  "Kuvasz",
  "Old English Sheepdog",
  "Puli",
  "Pumi",
  "Saarloos Wolfdog",
  "Shetland Sheepdog",
  "Schipperke",
  "Welsh Corgi Cardigan",
  "Welsh Corgi Pembroke",

  // Working Group
  "Anatolian Shepherd Dog",
  "Bernese Mountain Dog",
  "Boxer",
  "Bulldog",
  "Bullmastiff",
  "Caucasian Shepherd Dog",
  "Central Asia Shepherd Dog",
  "Chinese Shar-Pei",
  "Dobermann",
  "Dogo Argentino",
  "Dogo Canario",
  "Dogo de Bordeaux",
  "Fila Brasileiro",
  "Giant Schnauzer",
  "Great Dane",
  "Great Pyrenees",
  "Mastiff",
  "Miniature Pinscher",
  "Miniature Schnauzer",
  "Neapolitan Mastiff",
  "Newfoundland",
  "Rottweiler",
  "St Bernard",
  "Tosa Inu",

  // Terrier Group
  "Airedale Terrier",
  "Am Staffordshire Terrier",
  "Australian Terrier",
  "Bedlington Terrier",
  "Border Terrier",
  "Bull Terrier",
  "Cairn Terrier",
  "Dandie Dinmont Terrier",
  "Fox Terrier (Smooth)",
  "Fox Terrier (Wirehaired)",
  "Irish Terrier",
  "Jack Russell Terrier",
  "Kerry Blue Terrier",
  "Lakeland Terrier",
  "Manchester Terrier",
  "Miniature Bull Terrier",
  "Norwich Terrier",
  "Parson Russell Terrier",
  "Scottish Terrier",
  "Sealyham Terrier",
  "Skye Terrier",
  "Welsh Terrier",
  "West Highland White Terrier",
  "Yorkshire Terrier",

  // Dachshund Group
  "Dachshund (Std-Smooth)",
  "Dachshund (Std-Wirehaired)",

  // Spitz Group
  "Akita",
  "Alaskan Malamute",
  "Basenji",
  "Chow Chow",
  "German Spitz",
  "Gronlandshund (Greenland Dog)",
  "Japanese Spitz",
  "Keeshond",
  "Norwegian Elkhound",
  "Pomeranian",
  "Samoyed",
  "Shiba Inu",
  "Siberian Husky",

  // Hounds
  "Alpine Dachsbracke",
  "American Foxhound",
  "Basset Artesien Normand (Artesian-Norman Basset)",
  "Basset Bleu de Gascogne (Blue Gascony Basset)",
  "Basset Fauve de Bretagne (Fawn Brittany Basset)",
  "Basset Hound",
  "Bavarian Mountain Scenthound",
  "Beagle",
  "Billy",
  "Black and Tan Coonhound",
  "Bloodhound",
  "Dalmatian",
  "Deutsche Bracke (German Hound)",
  "Drever (Swedish Dachsbracke)",
  "Dunker (Norwegian Hound)",
  "English Foxhound",
  "Grand Basset Griffon Vendeen",
  "Grand Griffon Vendeen",
  "Hamiltonstovare (Hamilton Hound)",
  "Hanoverian Scenthound",
  "Harrier",
  "Italian Hound",
  "Ogar Polski (Polish Hound)",
  "Otterhound",
  "Petit Basset Griffon Vendeen (Petit Basset Griffon Vendeen)",
  "Petit Chien Courant Suisse (Small Swiss Hound)",
  "Rhodesian Ridgeback",
  "Schillerstovare (Schiller Hound)",
  "Serbian Hound",
  "Serbian Tri Color Hound",
  "Slovensky Kopov (Slovakian Hound)",
  "Smalandstovare (Smaland Hound)",
  "Spanish Hound",
  "Suomenajokoira (Finnish Hound)",
  "Swiss Hound",
  "Westphalian Dachsbracke",

  // Pointing Dogs
  "Bracco Italiano (Italian Pointing Dogs)",
  "Brittany Spaniel",
  "English Pointer",
  "English Setter",
  "German Shorthaired Pointer",
  "German Wirehaired Pointer",
  "Gordon Setter",
  "Griffon, Wirehaired Pointer",
  "Irish Setter",
  "Irish Red & White Setter",
  "Pointer",
  "Vizsla",
  "Weimaraner",

  // Retrievers & Water Dogs
  "Am Cocker Spaniel",
  "American Water Spaniel",
  "Barbet (French Water Dog)",
  "Chesapeake Bay Retriever",
  "Clumber Spaniel",
  "Curly Coated Retriever",
  "Deutscher Wachtelhund (German Spaniel)",
  "English Cocker Spaniel",
  "English Springer Spaniel",
  "Field Spaniel",
  "Flat Coated Retriever",
  "Golden Retriever",
  "Irish Water Spaniel",
  "Labrador Retriever",
  "Lagotto Romagnolo (Romagna Water Dog)",
  "Dederlandse Kooikerhondje",
  "Nova Scotia Duck Tolling Retriever",
  "Perro de Agua Español (Spanish Waterdog)",
  "Portuguese Water Dog",
  "Sussex Spaniel",
  "Welsh Springer Spaniel",
  "Wetterhound (Frisian Water Dog)",

  // Toy & Companion Dogs
  "Affenpinscher",
  "Bichon Frise",
  "Bolognese",
  "Boston Terrier",
  "Coton de Tulear",
  "Cavalier King Charles Spaniel",
  "Chihuahua",
  "Chinese Crested Dog",
  "French Bulldog",
  "Griffon (Brussels)",
  "Havanese",
  "Japanese Chin",
  "Lhasa Apso",
  "Maltese",
  "Papillon",
  "Pekingese",
  "Poodle",
  "Pug",
  "Shih Tzu",

  // Sight Hounds
  "Afghan Hound",
  "Azawakh",
  "Borzoi",
  "Chart Polski (Polish Greyhound)",
  "Deerhound",
  "Galgo Español (Spanish Greyhound)",
  "Irish Wolfhound",
  "Italian Greyhound",
  "Magyar Agar (Hungarian Greyhound)",
  "Saluki",
  "Sloughi (Arabian Greyhound)",
  "Whippet",
].sort();

export default function Step1DogInfo({
  data,
  updateField,
  updatePhoto,
  currentPhotoUrl,
  errors = {},
}) {
  const [breedSearch, setBreedSearch] = useState("");
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const fileInputRef = useRef(null);
  const breedContainerRef = useRef(null);

  // Filter breeds based on search
  const filteredBreeds = allBreeds.filter((breed) =>
    breed.toLowerCase().includes(breedSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (breedContainerRef.current && !breedContainerRef.current.contains(event.target)) {
        setShowBreedDropdown(false);
        setBreedSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBreedSelect = (breed) => {
    updateField("breed", breed);
    setBreedSearch("");
    setShowBreedDropdown(false);
  };

  const handlePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoRemove = () => {
    updatePhoto?.(null);
    // Clear the file input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="step step-1">
      <div className="field">
        <label htmlFor="dog-name">
          Dog Name {errors.name && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
        <input
          id="dog-name"
          type="text"
          className="text-input"
          value={data.name || ""}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter dog name"
        />
        {/* Suppress required notification; red * on label indicates required */}
      </div>

      <div className="field">
        <label htmlFor="dog-gender">
          Gender {errors.gender && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
        <select
          id="dog-gender"
          className="select-input"
          value={data.gender || ""}
          onChange={(e) => updateField("gender", e.target.value)}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {/* Suppress required notification; red * on label indicates required */}
      </div>

      <div className="field">
        <label htmlFor="dog-age-years">
          Age (Years){errors.age_years && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
        <input
          id="dog-age-years"
          type="number"
          min="2"
          max="7"
          step="1"
          className="text-input"
          value={data.age_years || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return updateField("age_years", "");
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 2 && n <= 7) updateField("age_years", String(n));
          }}
          placeholder="Enter dog age"
        />
        {/* Show only non-required validation messages (e.g., range/format) */}
        {errors.age_years && !/required/i.test(errors.age_years) && (
          <div className="field-error">{errors.age_years}</div>
        )}
      </div>

      <div className="field">
        <label htmlFor="dog-breed">
          Breed {errors.breed && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
        <div className="breed-input-container" ref={breedContainerRef}>
          <input
            id="dog-breed"
            type="text"
            className="text-input"
            placeholder={data.breed ? "" : "Enter your dog breed"}
            value={data.breed && !breedSearch ? data.breed : breedSearch}
            onChange={(e) => {
              setBreedSearch(e.target.value);
              setShowBreedDropdown(true);
              if (data.breed && e.target.value !== "") {
                updateField("breed", "");
              }
            }}
            onFocus={() => {
              setShowBreedDropdown(true);
              if (data.breed) {
                setBreedSearch("");
                updateField("breed", "");
              }
            }}
            style={{
              color: "#000000",
            }}
          />
          {showBreedDropdown && (
            <div className="breed-dropdown">
              {filteredBreeds.length > 0 ? (
                <>
                  {filteredBreeds.slice(0, 10).map((breed) => (
                    <button
                      key={breed}
                      type="button"
                      className="breed-option"
                      onClick={() => handleBreedSelect(breed)}
                    >
                      {breed}
                    </button>
                  ))}
                  {filteredBreeds.length > 10 && (
                    <div className="breed-more-results">
                      ... and {filteredBreeds.length - 10} more results. Keep typing to narrow down.
                    </div>
                  )}
                </>
              ) : (
                <div className="breed-no-results">No breeds found matching "{breedSearch}"</div>
              )}
            </div>
          )}
        </div>
        {/* Suppress required notification; red * on label indicates required */}
      </div>

      {/* Enhanced Photo Upload Section */}
      <div className="field">
        <label>Dog Photo</label>
        <div className="photo-upload-container">
          {data.photo ? (
            // Show newly selected photo
            <div className="documents-preview">
              <div className="document-item">
                <div className="document-info">
                  <img
                    src={URL.createObjectURL(data.photo)}
                    alt="New dog photo preview"
                    className="photo-thumbnail"
                  />
                  <span className="document-filename">{data.photo.name} (New)</span>
                </div>
                <div className="document-buttons">
                  <button type="button" className="add-more-btn" onClick={handlePhotoButtonClick}>
                    Change Photo
                  </button>
                  <button type="button" className="remove-document-btn" onClick={handlePhotoRemove}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : currentPhotoUrl ? (
            // Show existing photo from profile
            <div className="documents-preview">
              <div className="document-item">
                <div className="document-info">
                  <img src={currentPhotoUrl} alt="Current dog photo" className="photo-thumbnail" />
                  <span className="document-filename">Current Photo</span>
                </div>
                <div className="document-buttons">
                  <button type="button" className="add-more-btn" onClick={handlePhotoButtonClick}>
                    Change Photo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // No photo at all
            <div className="documents-preview">
              <div className="document-item">
                <div className="document-info">
                  <svg
                    className="document-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <span className="document-filename">No photo uploaded</span>
                </div>
                <div className="document-buttons">
                  <button type="button" className="add-more-btn" onClick={handlePhotoButtonClick}>
                    Add Photo
                  </button>
                </div>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden-file-input"
            onChange={(e) => updatePhoto?.(e.target.files?.[0] || null)}
          />
        </div>
      </div>
    </div>
  );
}
