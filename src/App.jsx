import { useState } from 'react'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Community from './components/Community'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AuthModal from './components/AuthModal'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [user, setUser] = useState(null) // { name, role, avatarUrl }

  const handleAuthSuccess = (u) => {
    setUser(u)
  }
  const handleLogout = () => {
    setUser(null)
    setSidebarOpen(false)
  }

  return (
    <>
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

      <Hero />
      <Features />
      <HowItWorks />
      <Community />
    </>
  )
}

export default App

