// Small helpers for form parsing and normalization

export function parseIntOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

export function parseFloatOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

// Normalize UI age (years only) to DB field and enforce breeding range (2–7 years)
// Signature simplified (months removed). Accepts either explicit years (integer) or a legacy
// string/float value via legacyAge. Returns { age_years } or { error }.
export function normalizeAge(years, legacyAge) {
  // Prefer explicit years input
  let ageYears = parseIntOrNull(years);

  // Fallback: legacy age string that might be float (e.g., "3.5") → round down to full years
  if (ageYears === null && legacyAge !== undefined && legacyAge !== "") {
    const f = parseFloatOrNull(legacyAge);
    if (f != null) ageYears = Math.floor(f); // Drop fractional part; UI no longer supports it
  }

  // If still null/undefined, treat as unset (caller may enforce required-ness separately)
  if (ageYears === null) {
    return { age_years: undefined };
  }

  // Validation: breeding-eligible range 2–7 inclusive
  if (ageYears < 2) {
    return { error: "Age must be at least 2 years for breeding." };
  }
  if (ageYears > 7) {
    return { error: "Age must not exceed 7 years for breeding." };
  }

  return { age_years: ageYears };
}

export function whitelistPayload(src, allowedKeys) {
  const set = new Set(allowedKeys);
  return Object.fromEntries(Object.entries(src).filter(([k]) => set.has(k)));
}

export function coerceNumbers(obj, numericKeys) {
  const out = { ...obj };
  for (const key of numericKeys) {
    if (out[key] !== "" && out[key] !== undefined) {
      const n = Number(out[key]);
      if (!Number.isNaN(n)) out[key] = n;
    }
  }
  return out;
}

export function friendlyError(err) {
  const raw = err?.message || err?.error || String(err) || "Unknown error";
  return new Error(raw);
}
