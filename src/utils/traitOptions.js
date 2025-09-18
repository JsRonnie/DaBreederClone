// Size options - Small, Medium, Large, Giant
export const sizeOptions = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "giant", label: "Giant" },
];

// Coat Type options - short, long, wire, hairless
export const coatTypeOptions = [
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
  { value: "wire", label: "Wire" },
  { value: "hairless", label: "Hairless" },
];

// Color/Markings options
export const colorOptions = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "brown", label: "Brown" },
  { value: "tan", label: "Tan" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "brindle", label: "Brindle" },
  { value: "merle", label: "Merle" },
  { value: "sable", label: "Sable" },
  { value: "cream", label: "Cream" },
  { value: "gold", label: "Gold" },
  { value: "mixed", label: "Mixed/Multiple Colors" },
];

// Activity Level options - low, moderate, high
export const activityLevelOptions = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

// Sociability options - friendly, neutral, reserved
export const sociabilityOptions = [
  { value: "friendly", label: "Friendly" },
  { value: "neutral", label: "Neutral" },
  { value: "reserved", label: "Reserved" },
];

// Trainability options - easy, moderate, stubborn
export const trainabilityOptions = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "stubborn", label: "Stubborn" },
];

// Legacy options for backward compatibility (if needed elsewhere)
export const coatLengthOptions = coatTypeOptions;
export const coatColorOptions = colorOptions;

export const traitGroups = {
  size: sizeOptions,
  coat_type: coatTypeOptions,
  color: colorOptions,
  activity_level: activityLevelOptions,
  sociability: sociabilityOptions,
  trainability: trainabilityOptions,
};
