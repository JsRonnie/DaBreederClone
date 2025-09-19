import React, { useState } from 'react'

export default function Navbar({ onMenuClick, onSignInClick, onSignUpClick, user, onDashboardClick, onLogout }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(!open)

  return (
  <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-slate-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: hamburger */}
        <button
          aria-label="Open menu"
          className="p-2 rounded-md hover:bg-slate-100 text-slate-700"
          onClick={() => (onMenuClick ? onMenuClick() : toggle())}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path fillRule="evenodd" d="M3.75 5.25A.75.75 0 0 1 4.5 4.5h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 7.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm.75 6.75a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5h-15Z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Center: brand */}
        <a href="#" className="font-semibold text-slate-800">
          <span className="text-blue-600">Da</span>
          <span>Breeder</span>
        </a>

        {/* Right: show auth only when logged out, dashboard when logged in */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <button onClick={onSignInClick} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100">
                Sign In
              </button>
              <button onClick={onSignUpClick} className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Sign Up
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onDashboardClick} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100">
                My Dogs
              </button>
              <button onClick={onLogout} className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-rose-600 hover:bg-rose-700">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Simple dropdown when open (fallback) */}
      {(!onMenuClick && open) && (
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-sm text-slate-600 grid gap-2">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#community" className="hover:text-slate-900">Community</a>
          </div>
        </div>
      )}
    </header>
  )
}
