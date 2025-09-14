import React from 'react'
import Modal from './Modal'

export default function AuthModal({ open, mode = 'signin', onClose, onSwitch, onAuthSuccess }) {
  const isSignUp = mode === 'signup'

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
          className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: form */}
          <div className="bg-slate-50 p-6 sm:p-10">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold text-slate-900">
                {isSignUp ? 'Get Started Now' : 'Welcome back!'}
              </h2>
              {!isSignUp && (
                <p className="mt-2 text-sm text-slate-600">Enter your credentials to access your account</p>
              )}

              <form className="mt-8 grid gap-4" onSubmit={(e) => e.preventDefault()}>
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

                <p className="text-sm text-slate-700">
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
          <div className="hidden md:block bg-[url('https://images.unsplash.com/photo-1525253013412-55c1a69a5738?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center min-h-[480px]">
            <div className="h-full w-full bg-blue-100/40" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
