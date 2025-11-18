// Upsert the authenticated user into the public.users table
// Expected table columns: id (uuid PK), email, name, role, avatar_url, created_at

export async function upsertUserProfile(supabase, authUser) {
  if (!authUser) return;
  const meta = authUser.user_metadata || {};

  // 1) Read any existing profile to keep its chosen name/avatar as source of truth
  let existing = null;
  try {
    const { data } = await supabase
      .from("users")
      .select("name, avatar_url, role")
      .eq("id", authUser.id)
      .single();
    existing = data || null;
  } catch {
    existing = null;
  }

  const fallbackName = authUser.email?.split("@")[0] || "User";
  const derivedName = meta.name || meta.full_name || fallbackName;
  // Prefer existing profile name if it exists (so table stays the source of truth)
  const targetName = (existing && existing.name) || derivedName;

  const fallbackAvatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    authUser.email || "U"
  )}`;
  const derivedAvatar = meta.avatar_url || meta.avatarUrl || fallbackAvatar;
  const targetAvatar = (existing && existing.avatar_url) || derivedAvatar;

  // Preserve existing role if it exists (don't overwrite admin role!)
  const targetRole = (existing && existing.role) || "user";

  const payload = {
    id: authUser.id,
    email: authUser.email,
    name: targetName,
    role: targetRole,
    avatar_url: targetAvatar,
  };

  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
  if (error) {
    // Not fatal for auth, but log it
    console.warn("Profile upsert failed:", error.message);
  }

  // 2) Ensure Supabase auth user metadata mirrors the profile (display name sync)
  try {
    const currentName = meta.name || meta.full_name || "";
    const currentAvatar = meta.avatar_url || meta.avatarUrl || "";
    if (currentName !== targetName || currentAvatar !== targetAvatar) {
      await supabase.auth.updateUser({
        data: {
          name: targetName,
          full_name: targetName,
          avatar_url: targetAvatar,
        },
      });
    }
  } catch (e) {
    // Not fatal if we can't update auth metadata (e.g., no active session)
    console.warn("Auth metadata sync skipped:", e?.message || e);
  }
}

export default upsertUserProfile;
