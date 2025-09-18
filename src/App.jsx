import { useState } from 'react'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Community from './components/Community'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AuthModal from './components/AuthModal'
import DogForm from './pages/DogForm'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [user, setUser] = useState(null) // { name, role, avatarUrl }
  const [view, setView] = useState('landing') // 'landing' | 'dogForm'

  const handleAuthSuccess = (u) => {
    setUser(u)
  }
  const handleLogout = () => {
    setUser(null)
    setSidebarOpen(false)
  }

  const goToDogForm = () => setView('dogForm')
  const goHome = () => setView('landing')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(true)}
        onSignInClick={() => { setAuthMode('signin'); setAuthOpen(true) }}
        onSignUpClick={() => { setAuthMode('signup'); setAuthOpen(true) }}
        user={user}
        onLogout={handleLogout}
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
            <Hero onGetStarted={goToDogForm} />
            <Features />
            <HowItWorks />
            <Community />
          </>
        )}
        {view === 'dogForm' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <button
              type="button"
              onClick={goHome}
              className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-200 hover:bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
            >← Back to Home</button>
            <DogForm />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

