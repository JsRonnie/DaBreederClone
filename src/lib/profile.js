// Upsert the authenticated user into the public.users table
// Expected table columns: id (uuid PK), email, name, role, avatar_url, created_at

export async function upsertUserProfile(supabase, authUser) {
  if (!authUser) return
  const meta = authUser.user_metadata || {}
  const payload = {
    id: authUser.id,
    email: authUser.email,
    name: meta.name || meta.full_name || authUser.email?.split('@')[0] || 'User',
    role: 'Dog Owner',
    avatar_url: meta.avatar_url || meta.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(authUser.email || 'U')}`,
  }
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
  if (error) {
    // Not fatal for auth, but log it
    // eslint-disable-next-line no-console
    console.warn('Profile upsert failed:', error.message)
  }
}

export default upsertUserProfile
