// Helper: map breeds to groups (only using breeds you specified)
const breedGroups = {
  "labrador retriever": "sporting",
  "golden retriever": "sporting",
  "cocker spaniel": "sporting",
  "german shepherd": "herding",
  "border collie": "herding",
  chihuahua: "toy",
  "great dane": "working",
};

function getBreedGroup(breed) {
  if (!breed) return null;
  return breedGroups[breed.toLowerCase()] || null;
}

function breedCompatibilityScore(breedA, breedB) {
  if (!breedA || !breedB) return 0;
  const a = breedA.toLowerCase();
  const b = breedB.toLowerCase();

  if (a === b) return 20; // exact breed match — strongest signal

  const groupA = getBreedGroup(a);
  const groupB = getBreedGroup(b);
  if (groupA && groupB && groupA === groupB) return 10; // same AKC-like group

  return 0; // different breeds and different groups
}

/**
 * Calculates a match score between two dogs based on breeding compatibility.
 *
 * @param {object} dogA - The first dog object.
 * @param {object} dogB - The second dog object.
 * @returns {number} A compatibility score from 0 to 100.
 */
export function calculateMatchScore(dogA, dogB) {
  let score = 0;

  // Normalize helper
  const safe = (v) => (typeof v === "string" ? v.toLowerCase() : v);

  // 1) Gender (must be opposite for breeding)
  if (!dogA.gender || !dogB.gender) return 0;
  if (safe(dogA.gender) === safe(dogB.gender)) return 0;
  score += 10;

  // 2) Breed compatibility
  score += breedCompatibilityScore(dogA.breed, dogB.breed); // max +20

  // 3) Age compatibility (max 15)
  const ageDiff = Math.abs((dogA.age_years || 0) - (dogB.age_years || 0));
  score += Math.max(0, 15 - ageDiff * 2); // -2 per year diff

  // 4) Size compatibility (max 15)
  const sizes = ["small", "medium", "large", "giant"];
  const sa = safe(dogA.size);
  const sb = safe(dogB.size);
  const ia = sizes.indexOf(sa);
  const ib = sizes.indexOf(sb);
  if (ia !== -1 && ib !== -1) {
    if (ia === ib) score += 15;
    else if (Math.abs(ia - ib) === 1) score += 7; // adjacent sizes
  }

  // 5) Weight proximity (max 15)
  const wa = Number(dogA.weight_kg || 0);
  const wb = Number(dogB.weight_kg || 0);
  const weightDiff = Math.abs(wa - wb);
  score += Math.max(0, 15 - weightDiff); // penalize big kg differences

  // 6) Coat & Color (max 10)
  if (safe(dogA.coat_type) === safe(dogB.coat_type)) score += 7;
  if (safe(dogA.color) === safe(dogB.color)) score += 3;

  // 7) Temperament (max 15)
  if (safe(dogA.activity_level) === safe(dogB.activity_level)) score += 7;
  if (safe(dogA.sociability) === safe(dogB.sociability)) score += 4;
  if (safe(dogA.trainability) === safe(dogB.trainability)) score += 4;

  // Final cap at 100
  return Math.min(Math.round(score), 100);
}
