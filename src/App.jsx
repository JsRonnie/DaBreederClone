import { useState } from 'react'
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
  const handleLogout = () => {
    setUser(null)
    setSidebarOpen(false)
    setView('landing') // Return to landing page after logout
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
            <DogForm />
          </div>
        )}
        {view === 'dashboard' && user && (
          <MyDogs onAddDog={goToAddDog} />
        )}
      </main>
    </div>
  )
}

export default App

