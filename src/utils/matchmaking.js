
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

function getBreedGroup(breed) {
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

function breedCompatibilityScore(breedA, breedB) {
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
export function calculateMatchScore(dogA, dogB) {
  let score = 0;

  // Normalize helper
  const safe = (v) => (typeof v === "string" ? v.toLowerCase() : v);
  const sizes = ["small", "medium", "large", "giant"];
  const sa = safe(dogA.size);
  const sb = safe(dogB.size);
  const ia = sizes.indexOf(sa);
  const ib = sizes.indexOf(sb);

  // 💥 NEW: HARD STOP - Breeding Safety Check (Size/Risk)
  // If size difference is 2 or more levels (e.g., small -> large), return 0.
  if (ia !== -1 && ib !== -1 && Math.abs(ia - ib) >= 2) return 0; 

  // 1) Gender (must be opposite for breeding)
  if (!dogA.gender || !dogB.gender) return 0;
  if (safe(dogA.gender) === safe(dogB.gender)) return 0;
  score += 10;

  // 2) Breed compatibility (Max 20) - Uses enhanced logic
  score += breedCompatibilityScore(dogA.breed, dogB.breed); 

  // 3) Age compatibility (max 15)
  const ageDiff = Math.abs((dogA.age_years || 0) - (dogB.age_years || 0));
  score += Math.max(0, 15 - ageDiff * 2); // -2 per year diff

  // 4) Size compatibility (max 15) - Soft score after hard stop
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
