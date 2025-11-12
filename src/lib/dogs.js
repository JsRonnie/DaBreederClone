// Common dog-related API helpers and constants

export const DOG_ALLOWED_COLUMNS = [
  "user_id",
  "name",
  "gender",
  "breed",
  "age_years",
  "size",
  "weight_kg",
  "pedigree_certified",
  "dna_tested",
  "vaccinated",
  "hip_elbow_tested",
  "heart_tested",
  "eye_tested",
  "genetic_panel",
  "thyroid_tested",
  "coat_type",
  "color",
  "activity_level",
  "sociability",
  "trainability",
  // Optionally extended fields used in edit forms in some deployments:
  "ear_type",
  "tail_type",
  "muzzle_shape",
];

export const DOG_LIST_COLUMNS = [
  "id",
  "name",
  "breed",
  "gender",
  "age_years",
  "weight_kg",
  "size",
  "color",
  "image_url",
  "hidden",
  "user_id",
  "created_at",
];
