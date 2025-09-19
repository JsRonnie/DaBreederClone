import { useEffect, useState } from 'react'
import supabase from './lib/supabaseClient'
import { upsertUserProfile } from './lib/profile'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Community from './components/Community'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AuthModal from './components/AuthModal'
import DogForm from './pages/DogForm'
import MyDogs from './components/MyDogs'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [user, setUser] = useState(null) // { name, role, avatarUrl }
  const [view, setView] = useState('landing') // 'landing' | 'dogForm' | 'dashboard'

  const handleAuthSuccess = (u) => {
    setUser(u)
    setView('dashboard') // Redirect to dashboard after login
  }
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore network errors
    }
    // Hard reset client state in case signOut didn't propagate yet
    try {
      // Clear any local storage tokens used by supabase-js across environments
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (/^sb-.*-auth-token$/.test(k) || k.includes('supabase')) {
          localStorage.removeItem(k)
        }
      }
    } catch {}

    setUser(null)
    setSidebarOpen(false)
    setView('landing') // Return to landing page after logout
    // Reload to ensure all in-memory state from supabase-js is reset
    setTimeout(() => window.location.reload(), 50)
  }

  const goHome = () => setView('landing')
  const goToDashboard = () => setView('dashboard')
  const goToAddDog = () => setView('dogForm') // Add dog functionality
  
  const handleGetStarted = () => {
    if (user) {
      // If logged in, go to dashboard
      setView('dashboard')
    } else {
      // If not logged in, open signup modal
      setAuthMode('signup')
      setAuthOpen(true)
    }
  }

  // Keep app state in sync with Supabase auth
  useEffect(() => {
    function toAppUser(session) {
      const user = session?.user
      if (!user) return null
      // If anonymous sign-ins are enabled, ignore anonymous sessions for app login state
      // Detect via user.is_anonymous (new) or provider === 'anonymous' (fallback)
      const provider = user.app_metadata?.provider
      if (user.is_anonymous || provider === 'anonymous') return null
      const meta = user.user_metadata || {}
      return {
        id: user.id,
        name: meta.name || meta.full_name || user.email?.split('@')[0] || 'User',
        role: 'Dog Owner',
        avatarUrl: meta.avatar_url || meta.avatarUrl || 'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(user.email || 'U'),
      }
    }

    let mounted = true
    // Fetch current session at startup
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const appUser = toAppUser(data?.session)
      if (appUser) {
        setUser(appUser)
        setView('dashboard')
        await upsertUserProfile(supabase, data.session.user)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appUser = toAppUser(session)
      if (appUser) {
        setUser(appUser)
        setView('dashboard')
        await upsertUserProfile(supabase, session.user)
      } else {
        setUser(null)
        setView('landing')
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(true)}
        onSignInClick={() => { setAuthMode('signin'); setAuthOpen(true) }}
        onSignUpClick={() => { setAuthMode('signup'); setAuthOpen(true) }}
        user={user}
        onLogout={handleLogout}
        onDashboardClick={goToDashboard}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSwitch={(m) => setAuthMode(m)}
        onAuthSuccess={handleAuthSuccess}
      />

      <main className="flex-1">

        {view === 'landing' && (
          <>
            <Hero onGetStarted={handleGetStarted} />
            <Features />
            <HowItWorks />
            <Community />
          </>
        )}
        {view === 'dogForm' && (
          <div className="p-6 sm:p-8 lg:p-12">
            <button
              type="button"
              onClick={user ? goToDashboard : goHome}
              className="mb-6 ml-2 sm:ml-4 inline-flex items-center gap-2 rounded-md bg-slate-200 hover:bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200"
            >← Back to {user ? 'Dashboard' : 'Home'}</button>
            <DogForm onSubmitted={() => setView('dashboard')} />
          </div>
        )}
        {view === 'dashboard' && user && (
          <MyDogs onAddDog={goToAddDog} userId={user.id} />
        )}
      </main>
    </div>
  )
}

export default App

