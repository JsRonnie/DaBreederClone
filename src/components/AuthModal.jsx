import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import supabase from '../lib/supabaseClient'
import { upsertUserProfile } from '../lib/profile'

export default function AuthModal({ open, mode = 'signin', onClose, onSwitch, onAuthSuccess }) {
  const isSignUp = mode === 'signup'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Clear messages when switching modes or reopening
    setErrorMsg('')
    setInfoMsg('')
  }, [mode, open])

  function toAppUser(session) {
    const user = session?.user
    if (!user) return null
    const meta = user.user_metadata || {}
    return {
      name: meta.name || meta.full_name || user.email?.split('@')[0] || 'User',
      role: 'Dog Owner',
      avatarUrl: meta.avatar_url || meta.avatarUrl || 'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(user.email || 'U'),
    }
  }

  const handlePrimary = async () => {
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      if (!email || !password) {
        throw new Error('Please enter email and password.')
      }

      // Sanitize inputs for common copy/paste issues
      const emailClean = email.trim().replace(/^[\"']|[\"']$/g, '').toLowerCase()
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }

      if (isSignUp) {
        // Sign up: may require email confirmation, thus session can be null
        const { data, error } = await supabase.auth.signUp({
          email: emailClean,
          password,
          options: {
            data: name ? { name } : undefined,
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error

        if (!data.session) {
          // Email confirmation required
          setInfoMsg('Check your email to confirm your account before logging in.')
          return
        }

        const appUser = toAppUser(data.session)
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user)
          onAuthSuccess?.(appUser)
          onClose?.()
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailClean, password })
        if (error) throw error
        if (!data.session) throw new Error('Login failed: no session returned.')

        const appUser = toAppUser(data.session)
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user)
          onAuthSuccess?.(appUser)
          onClose?.()
        }
      }
    } catch (e) {
      const raw = e?.message || 'Authentication failed.'
      let friendly = raw
      const lc = raw.toLowerCase()
      if (lc.includes('signup') && lc.includes('disable')) {
        friendly = 'Email signups are disabled in your Supabase project. In Supabase Studio → Authentication → Providers → Email, turn ON "Allow users to sign up" (and ensure global signups aren’t disabled in Authentication → Settings).'
      } else if (lc.includes('email') && lc.includes('invalid')) {
        friendly = 'Supabase rejected the email string. If you disabled confirmations for dev, you can still use any address like a@b.co, but make sure it looks like an email.'
      }
      setErrorMsg(friendly)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
      // For OAuth, Supabase handles redirect; the session will be stored on return
    } catch (e) {
      setErrorMsg(e.message || 'Google sign-in failed.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-5xl">
      <div className="relative">
        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 min-h-[600px]">
          {/* Left: form */}
          <div className="bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
            <div className="w-full max-w-md text-center">
              <h2 className="text-2xl font-semibold text-slate-900">
                {isSignUp ? 'Get Started Now' : 'Welcome back!'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {isSignUp 
                  ? 'Join our community of responsible dog breeders'
                  : 'Enter your credentials to access your account'
                }
              </p>

              <form className="mt-8 grid gap-4 text-left" onSubmit={(e) => { e.preventDefault(); if (!loading) handlePrimary() }}>
                {isSignUp && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700">Email address</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    {!isSignUp && (
                      <a href="#" className="text-xs text-slate-600 hover:text-slate-900">forgot password</a>
                    )}
                  </div>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                </div>

                {isSignUp && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" className="size-4 accent-blue-600" />
                    I agree to the <a href="#" className="underline">terms & policy</a>
                  </label>
                )}

                {errorMsg && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{errorMsg}</div>
                )}
                {infoMsg && (
                  <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{infoMsg}</div>
                )}

                <button type="submit" disabled={loading} className={`mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium ${loading ? 'bg-green-600/60 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800'}`}>
                  {loading ? (isSignUp ? 'Signing up…' : 'Logging in…') : (isSignUp ? 'Signup' : 'Login')}
                </button>

                <div className="relative my-3">
                  <hr className="border-slate-300" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-2 text-[10px] text-slate-500">or</span>
                </div>

                <button type="button" onClick={handleGoogle} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                  <span className="text-lg">🟢</span>
                  <span>Sign in with Google</span>
                </button>

                <p className="text-sm text-slate-700 text-center">
                  {isSignUp ? (
                    <>Have an account? <button type="button" className="text-blue-600 hover:underline" onClick={() => onSwitch?.('signin')}>Sign In</button></>
                  ) : (
                    <>Don't have an account? <button type="button" className="text-blue-600 hover:underline" onClick={() => onSwitch?.('signup')}>Sign Up</button></>
                  )}
                </p>
              </form>
            </div>
          </div>

          {/* Right: image */}
          {windowWidth >= 640 && (
            <div className="relative w-full h-full min-h-[600px] bg-[url('/shibaPor.jpg')] bg-cover bg-center" style={{backgroundColor: '#e2e8f0'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
