import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
        <div>
          <span className="font-semibold text-slate-900"><span className="text-blue-600">Da</span>Breeder</span> © {new Date().getFullYear()}
        </div>
        <nav className="flex items-center gap-4">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how" className="hover:text-slate-900">How it works</a>
          <a href="#community" className="hover:text-slate-900">Community</a>
        </nav>
      </div>
    </footer>
  )
}
