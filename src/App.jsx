import { useEffect, useState } from 'react'
import supabase from './lib/supabaseClient'
import { upsertUserProfile } from './lib/profile'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import AboutUs from './components/AboutUs'
import ContactUs from './components/ContactUs'
import Community from './components/Community'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AuthModal from './components/AuthModal'
import DogForm from './pages/DogForm'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import MyDogs from './components/MyDogs'
import Footer from './components/Footer'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [user, setUser] = useState(null) // { name, role, avatarUrl }
  const [view, setView] = useState('landing') // 'landing' | 'dogForm' | 'dashboard' | 'about' | 'contact'
  const [dashboardKey, setDashboardKey] = useState(0) // Force refresh key

  const handleAuthSuccess = (u) => {
    setUser(u)
    setView('dashboard') // Redirect to dashboard after login
  }

  const handleNavigate = (newView) => {
    setView(newView)
    setSidebarOpen(false) // Close sidebar when navigating
  }
  const handleLogout = async () => {
    console.log('Logout initiated...') // Debug log
    
    // Immediately clear user state
    setUser(null)
    setSidebarOpen(false)
    setView('landing')
    
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase signout error:', error)
      } else {
        console.log('Supabase signout successful')
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
    
    // Clear local storage
    try {
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (/^sb-.*-auth-token$/.test(k) || k.includes('supabase')) {
          localStorage.removeItem(k)
          console.log('Removed localStorage key:', k)
        }
      }
      // Also clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage)
      for (const k of sessionKeys) {
        if (/^sb-.*-auth-token$/.test(k) || k.includes('supabase')) {
          sessionStorage.removeItem(k)
        }
      }
    } catch (err) {
      console.error('Error clearing storage:', err)
    }

    console.log('Logout completed, reloading page...')
    // Force reload to ensure clean state
    setTimeout(() => {
      window.location.href = window.location.origin
    }, 100)
  }

  const goHome = () => setView('landing')
  const goToDashboard = () => {
    console.log('📋 Navigating to dashboard...')
    setView('dashboard')
    setDashboardKey(prev => prev + 1) // Force refresh MyDogs component
  }
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
    let initialLoadDone = false
    
    // Optimized: Only fetch session once on startup
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      initialLoadDone = true
      const appUser = toAppUser(data?.session)
      if (appUser) {
        setUser(appUser)
        setView('dashboard')
        // Only upsert profile on initial load, not every auth change
        await upsertUserProfile(supabase, data.session.user)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || !initialLoadDone) return
      
      const appUser = toAppUser(session)
      if (appUser) {
        setUser(appUser)
        setView('dashboard')
        // Only upsert on sign in, not on token refresh
        if (event === 'SIGNED_IN') {
          await upsertUserProfile(supabase, session.user)
        }
      } else if (event === 'SIGNED_OUT') {
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
        onNavigate={handleNavigate}
        currentView={view}
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
        {view === 'about' && <AboutPage />}
        {view === 'contact' && <ContactPage />}
        {view === 'dogForm' && (
          <div className="p-6 sm:p-8 lg:p-12">
            <button
              type="button"
              onClick={user ? goToDashboard : goHome}
              className="mb-6 ml-2 sm:ml-4 inline-flex items-center gap-2 rounded-md bg-slate-200 hover:bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200"
            >← Back to {user ? 'Dashboard' : 'Home'}</button>
            <DogForm onSubmitted={() => {
              console.log('🐕 Dog submitted, going to dashboard...')
              setView('dashboard')
              setDashboardKey(prev => prev + 1) // Force refresh
            }} />
          </div>
        )}
        {view === 'dashboard' && user && (
          <MyDogs key={dashboardKey} onAddDog={goToAddDog} userId={user.id} />
        )}
      </main>
      
      <Footer />
    </div>
  )
}

export default App

