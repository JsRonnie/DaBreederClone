// Password validation helpers
// Returns null if OK, otherwise returns a user-friendly error string
export function validatePassword(password, { email, username } = {}) {
  if (!password) return "Password is required.";

  // Minimum length
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const lower = password.toLowerCase();

  // Disallow using email or parts of it
  if (email) {
    const emailStr = String(email).trim().toLowerCase();
    const [localPart] = emailStr.split("@");
    const localNoDigits = (localPart || "").replace(/\d+/g, "");

    if (lower === emailStr) {
      return "You can't use your email as your password. Try a stronger password.";
    }
    if (localPart && lower === localPart) {
      return "You can't use the part of your email before @ as your password. Try a stronger password.";
    }
    if (localNoDigits && localNoDigits.length >= 3 && lower === localNoDigits) {
      return "You can't base your password on your email name. Try a stronger password.";
    }
  }

  // Disallow using username exactly
  if (username) {
    const uname = String(username).trim().toLowerCase();
    if (uname && lower === uname) {
      return "You can't use your name/username as your password. Try a stronger password.";
    }
  }

  // Optional: basic strength hint – require at least one letter
  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter.";
  }

  // Optional: encourage stronger passwords by hinting when only letters are used
  if (/^[A-Za-z]+$/.test(password)) {
    return "Use a stronger password (mix letters, numbers, or symbols).";
  }

  return null; // OK
}

export const passwordPolicyNote =
  "• At least 8 characters\n• Don't use your email or username\n• Use a mix of letters, numbers, and symbols";
