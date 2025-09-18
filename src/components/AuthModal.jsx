import React, { useState, useEffect } from 'react'
import Modal from './Modal'

export default function AuthModal({ open, mode = 'signin', onClose, onSwitch, onAuthSuccess }) {
  const isSignUp = mode === 'signup'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePrimary = () => {
    // Demo: immediately report success to parent
    onAuthSuccess?.({
      name: 'Demo Account',
      role: 'Dog Owner',
      avatarUrl:
        'https://images.unsplash.com/photo-1537301636718-0d39129e5c55?q=80&w=200&auto=format&fit=crop',
    })
    onClose?.()
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

              <form className="mt-8 grid gap-4 text-left" onSubmit={(e) => e.preventDefault()}>
                {isSignUp && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your name" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700">Email address</label>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    {!isSignUp && (
                      <a href="#" className="text-xs text-slate-600 hover:text-slate-900">forgot password</a>
                    )}
                  </div>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" type="password" />
                </div>

                {isSignUp && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" className="size-4 accent-blue-600" />
                    I agree to the <a href="#" className="underline">terms & policy</a>
                  </label>
                )}

                <button type="button" onClick={handlePrimary} className="mt-2 inline-flex items-center justify-center rounded-md bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
                  {isSignUp ? 'Signup' : 'Login'}
                </button>

                <div className="relative my-3">
                  <hr className="border-slate-300" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-2 text-[10px] text-slate-500">or</span>
                </div>

                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
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
