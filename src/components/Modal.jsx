import React, { useEffect } from 'react'

export default function Modal({ open, onClose, children, widthClass = 'max-w-3xl' }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) {
      window.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300 opacity-100`}
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full ${widthClass} bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden transform transition-all scale-100 opacity-100`}
          role="dialog"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
