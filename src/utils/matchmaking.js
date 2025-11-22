// Helper: map breeds to groups (comprehensive list of all available breeds)
const breedGroups = {
  // Herding Group
  // Native/Local Breeds
  aspin: "native",
  "australian cattle dog": "herding",
  "australian kelpie": "herding",
  "australian shepherd": "herding",
  "bearded collie": "herding",
  beauceron: "herding",
  "belgian laekenois": "herding",
  "belgian malinois": "herding",
  "belgian sheepdog": "herding",
  "belgian tervuren": "herding",
  "berger picard (berger picard)": "herding",
  "border collie": "herding",
  briard: "herding",
  "catalan sheepdog": "herding",
  "collie (rough)": "herding",
  "czeslovakan wolfdog": "herding",
  "dutch shepherd": "herding",
  "german shepherd dog": "herding",
  "hrvatski ovcar (croatian sheepdog)": "herding",
  komondor: "herding",
  kuvasz: "herding",
  "old english sheepdog": "herding",
  puli: "herding",
  pumi: "herding",
  "saarloos wolfdog": "herding",
  "shetland sheepdog": "herding",
  schipperke: "herding",
  "welsh corgi cardigan": "herding",
  "welsh corgi pembroke": "herding",

  // Working Group
  "anatolian shepherd dog": "working",
  "bernese mountain dog": "working",
  boxer: "working",
  bulldog: "working",
  bullmastiff: "working",
  "caucasian shepherd dog": "working",
  "central asia shepherd dog": "working",
  "chinese shar-pei": "working",
  dobermann: "working",
  "dogo argentino": "working",
  "dogo canario": "working",
  "dogo de bordeaux": "working",
  "fila brasileiro": "working",
  "giant schnauzer": "working",
  "great dane": "working",
  "great pyrenees": "working",
  mastiff: "working",
  "miniature pinscher": "working",
  "miniature schnauzer": "working",
  "neapolitan mastiff": "working",
  newfoundland: "working",
  rottweiler: "working",
  "st bernard": "working",
  "tosa inu": "working",

  // Terrier Group
  "airedale terrier": "terrier",
  "am staffordshire terrier": "terrier",
  "australian terrier": "terrier",
  "bedlington terrier": "terrier",
  "border terrier": "terrier",
  "bull terrier": "terrier",
  "cairn terrier": "terrier",
  "dandie dinmont terrier": "terrier",
  "fox terrier (smooth)": "terrier",
  "fox terrier (wirehaired)": "terrier",
  "irish terrier": "terrier",
  "jack russell terrier": "terrier",
  "kerry blue terrier": "terrier",
  "lakeland terrier": "terrier",
  "manchester terrier": "terrier",
  "miniature bull terrier": "terrier",
  "norwich terrier": "terrier",
  "parson russell terrier": "terrier",
  "scottish terrier": "terrier",
  "sealyham terrier": "terrier",
  "skye terrier": "terrier",
  "welsh terrier": "terrier",
  "west highland white terrier": "terrier",
  "yorkshire terrier": "terrier",

  // Dachshund Group (Hound)
  "dachshund (std-smooth)": "hound",
  "dachshund (std-wirehaired)": "hound",

  // Spitz Group (Non-Sporting)
  akita: "non-sporting",
  "alaskan malamute": "non-sporting",
  basenji: "non-sporting",
  "chow chow": "non-sporting",
  "german spitz": "non-sporting",
  "gronlandshund (greenland dog)": "non-sporting",
  "japanese spitz": "non-sporting",
  keeshond: "non-sporting",
  "norwegian elkhound": "non-sporting",
  pomeranian: "non-sporting",
  samoyed: "non-sporting",
  "shiba inu": "non-sporting",
  "siberian husky": "non-sporting",

  // Hounds
  "alpine dachsbracke": "hound",
  "american foxhound": "hound",
  "basset artesien normand (artesian-norman basset)": "hound",
  "basset bleu de gascogne (blue gascony basset)": "hound",
  "basset fauve de bretagne (fawn brittany basset)": "hound",
  "basset hound": "hound",
  "bavarian mountain scenthound": "hound",
  beagle: "hound",
  billy: "hound",
  "black and tan coonhound": "hound",
  bloodhound: "hound",
  dalmatian: "hound",
  "deutsche bracke (german hound)": "hound",
  "drever (swedish dachsbracke)": "hound",
  "dunker (norwegian hound)": "hound",
  "english foxhound": "hound",
  "grand basset griffon vendeen": "hound",
  "grand griffon vendeen": "hound",
  "hamiltonstovare (hamilton hound)": "hound",
  "hanoverian scenthound": "hound",
  harrier: "hound",
  "italian hound": "hound",
  "ogar polski (polish hound)": "hound",
  otterhound: "hound",
  "petit basset griffon vendeen (petit basset griffon vendeen)": "hound",
  "petit chien courant suisse (small swiss hound)": "hound",
  "rhodesian ridgeback": "hound",
  "schillerstovare (schiller hound)": "hound",
  "serbian hound": "hound",
  "serbian tri color hound": "hound",
  "slovensky kopov (slovakian hound)": "hound",
  "smalandstovare (smaland hound)": "hound",
  "spanish hound": "hound",
  "suomenajokoira (finnish hound)": "hound",
  "swiss hound": "hound",
  "westphalian dachsbracke": "hound",

  // Sporting Group (Pointing Dogs)
  "bracco italiano (italian pointing dogs)": "sporting",
  "brittany spaniel": "sporting",
  "english pointer": "sporting",
  "english setter": "sporting",
  "german shorthaired pointer": "sporting",
  "german wirehaired pointer": "sporting",
  "gordon setter": "sporting",
  "griffon, wirehaired pointer": "sporting",
  "irish setter": "sporting",
  "irish red & white setter": "sporting",
  pointer: "sporting",
  vizsla: "sporting",
  weimaraner: "sporting",

  // Sporting Group (Retrievers & Water Dogs)
  "am cocker spaniel": "sporting",
  "american water spaniel": "sporting",
  "barbet (french water dog)": "sporting",
  "chesapeake bay retriever": "sporting",
  "clumber spaniel": "sporting",
  "curly coated retriever": "sporting",
  "deutscher wachtelhund (german spaniel)": "sporting",
  "english cocker spaniel": "sporting",
  "english springer spaniel": "sporting",
  "field spaniel": "sporting",
  "flat coated retriever": "sporting",
  "golden retriever": "sporting",
  "irish water spaniel": "sporting",
  "labrador retriever": "sporting",
  "lagotto romagnolo (romagna water dog)": "sporting",
  "dederlandse kooikerhondje": "sporting",
  "nova scotia duck tolling retriever": "sporting",
  "perro de agua español (spanish waterdog)": "sporting",
  "portuguese water dog": "sporting",
  "sussex spaniel": "sporting",
  "welsh springer spaniel": "sporting",
  "wetterhound (frisian water dog)": "sporting",

  // Toy & Companion Dogs
  affenpinscher: "toy",
  "bichon frise": "toy",
  bolognese: "toy",
  "boston terrier": "toy",
  "coton de tulear": "toy",
  "cavalier king charles spaniel": "toy",
  chihuahua: "toy",
  "chinese crested dog": "toy",
  "french bulldog": "toy",
  "griffon (brussels)": "toy",
  havanese: "toy",
  "japanese chin": "toy",
  "lhasa apso": "toy",
  maltese: "toy",
  papillon: "toy",
  pekingese: "toy",
  poodle: "toy",
  pug: "toy",
  "shih tzu": "toy",

  // Sight Hounds (Hound Group)
  "afghan hound": "hound",
  azawakh: "hound",
  borzoi: "hound",
  "chart polski (polish greyhound)": "hound",
  deerhound: "hound",
  "galgo español (spanish greyhound)": "hound",
  "irish wolfhound": "hound",
  "italian greyhound": "hound",
  "magyar agar (hungarian greyhound)": "hound",
  saluki: "hound",
  "sloughi (arabian greyhound)": "hound",
  whippet: "hound",
};

export function getBreedGroup(breed) {
  if (!breed) return null;
  return breedGroups[breed.toLowerCase()] || null;
}

// 💥 NEW: Define groups with common lineage for higher compatibility score
const relatedGroups = [
  // Poodle/Doodle mixes (Toy/Non-Sporting/Sporting - Poodles, Water Dogs, Retrievers)
  ["toy", "sporting", "non-sporting"],
  // Working/Molosser/Terrier types (Mastiffs, Rottweilers, Bullies, Staffies)
  ["working", "terrier"],
  // Herding/Working (General Livestock and Guard Dogs)
  ["herding", "working"],
  // Scent Hounds/Sight Hounds (All Hounds are related)
  ["hound"],
];

function getCrossGroupScore(groupA, groupB) {
  // Only check if groups are different
  if (groupA === groupB) return 0;

  for (const relation of relatedGroups) {
    // Check if both groups are included in the same related group set
    if (relation.includes(groupA) && relation.includes(groupB)) {
      // Score: Higher than same-group (10) but less than exact match (20)
      return 15;
    }
  }
  return 0;
}

export function breedCompatibilityScore(breedA, breedB) {
  if (!breedA || !breedB) return 0;
  const a = breedA.toLowerCase();
  const b = breedB.toLowerCase();

  // 1. Exact breed match
  if (a === b) return 20;

  const groupA = getBreedGroup(a);
  const groupB = getBreedGroup(b);

  if (groupA && groupB) {
    // 2. Same AKC-like group match
    if (groupA === groupB) return 10;

    // 3. 💥 NEW: Cross-Group/Lineage match
    const crossScore = getCrossGroupScore(groupA, groupB);
    if (crossScore > 0) return crossScore;
  }

  return 0; // different breeds and different groups/lineages
}

/**
 * Calculates a match score between two dogs based on breeding compatibility.
 *
 * @param {object} dogA - The first dog object.
 * @param {object} dogB - The second dog object.
 * @returns {number} A compatibility score from 0 to 100.
 */
const hasValue = (value) => value !== undefined && value !== null && value !== "";

function normalizeNumber(value) {
  if (!hasValue(value)) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeString(value) {
  return typeof value === "string" ? value.toLowerCase() : value || null;
}

function calculateMatchBreakdown(dogA, dogB) {
  const breakdown = {
    gender: 0,
    breed: 0,
    age: 0,
    size: 0,
    weight: 0,
    coat: 0,
    color: 0,
    temperament: 0,
  };

  const sizes = ["small", "medium", "large", "giant"];
  const safeA = normalizeString(dogA.size);
  const safeB = normalizeString(dogB.size);
  const ia = sizes.indexOf(safeA);
  const ib = sizes.indexOf(safeB);

  // Hard stop on unsafe size pairing
  if (ia !== -1 && ib !== -1 && Math.abs(ia - ib) >= 2) {
    return { breakdown, unsafe: true };
  }

  const genderA = normalizeString(dogA.gender || dogA.sex);
  const genderB = normalizeString(dogB.gender || dogB.sex);
  if (!genderA || !genderB || genderA === genderB) {
    return { breakdown, unsafe: true };
  }
  breakdown.gender = 10;

  breakdown.breed = breedCompatibilityScore(dogA.breed, dogB.breed);

  const ageA = normalizeNumber(dogA.age_years);
  const ageB = normalizeNumber(dogB.age_years);
  if (ageA !== null && ageB !== null) {
    const ageDiff = Math.abs(ageA - ageB);
    breakdown.age = Math.max(0, 15 - ageDiff * 2);
  }

  if (ia !== -1 && ib !== -1) {
    if (ia === ib) breakdown.size = 15;
    else if (Math.abs(ia - ib) === 1) breakdown.size = 7;
  }

  const weightA = normalizeNumber(dogA.weight_kg);
  const weightB = normalizeNumber(dogB.weight_kg);
  if (weightA !== null && weightB !== null) {
    const weightDiff = Math.abs(weightA - weightB);
    breakdown.weight = Math.max(0, 15 - weightDiff);
  }

  const coatA = normalizeString(dogA.coat_type);
  const coatB = normalizeString(dogB.coat_type);
  if (coatA && coatB && coatA === coatB) breakdown.coat = 7;

  const colorA = normalizeString(dogA.color);
  const colorB = normalizeString(dogB.color);
  if (colorA && colorB && colorA === colorB) breakdown.color = 3;

  const activityA = normalizeString(dogA.activity_level);
  const activityB = normalizeString(dogB.activity_level);
  if (activityA && activityB && activityA === activityB) breakdown.temperament += 7;

  const sociabilityA = normalizeString(dogA.sociability);
  const sociabilityB = normalizeString(dogB.sociability);
  if (sociabilityA && sociabilityB && sociabilityA === sociabilityB) breakdown.temperament += 4;

  const trainabilityA = normalizeString(dogA.trainability);
  const trainabilityB = normalizeString(dogB.trainability);
  if (trainabilityA && trainabilityB && trainabilityA === trainabilityB) breakdown.temperament += 4;

  return { breakdown, unsafe: false };
}

export function calculateMatchScore(dogA, dogB) {
  const { breakdown, unsafe } = calculateMatchBreakdown(dogA, dogB);
  if (unsafe) return 0;
  const total =
    breakdown.gender +
    breakdown.breed +
    breakdown.age +
    breakdown.size +
    breakdown.weight +
    breakdown.coat +
    breakdown.color +
    breakdown.temperament;
  return Math.min(Math.round(total), 100);
}

export function calculateMatchDetails(dogA, dogB) {
  const { breakdown, unsafe } = calculateMatchBreakdown(dogA, dogB);
  const score = unsafe
    ? 0
    : Math.min(
        Math.round(
          breakdown.gender +
            breakdown.breed +
            breakdown.age +
            breakdown.size +
            breakdown.weight +
            breakdown.coat +
            breakdown.color +
            breakdown.temperament
        ),
        100
      );
  return { score, breakdown, unsafe };
}
