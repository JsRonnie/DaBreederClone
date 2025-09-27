import React, { useEffect } from 'react'
import useDogProfile from '../hooks/useDogProfile'

export default function DogProfileSheet({ dogId, open, onClose }) {
  const { dog, photoUrl, loading, error } = useDogProfile(dogId)

  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:w-[560px] bg-white shadow-2xl z-[96] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt={dog?.name || 'Dog'} className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-500"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2Z"/></svg>
              </div>
            )}
            <div>
              <div className="text-lg font-semibold text-gray-900">{dog?.name ?? 'Dog Profile'}</div>
              <div className="text-sm text-gray-500">{dog?.breed || 'Breed not set'}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-gray-500">Loading profile…</div>
          )}
          {error && (
            <div className="p-6 text-red-600">Failed to load profile.</div>
          )}
          {!loading && !error && dog && (
            <div className="p-6 space-y-6">
              {/* Overview */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-gray-500">Gender</div><div className="text-gray-900">{dog.gender || '—'}</div></div>
                  <div><div className="text-gray-500">Size</div><div className="text-gray-900">{dog.size || '—'}</div></div>
                  <div><div className="text-gray-500">Color</div><div className="text-gray-900">{dog.color || '—'}</div></div>
                  <div><div className="text-gray-500">Age (years)</div><div className="text-gray-900">{dog.age_years ?? '—'}</div></div>
                </div>
              </section>

              {/* Traits */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Traits & Physical Characteristics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-gray-500">Coat Type</div><div className="text-gray-900">{dog.coat_type || '—'}</div></div>
                  <div><div className="text-gray-500">Activity Level</div><div className="text-gray-900">{dog.activity_level || '—'}</div></div>
                  <div><div className="text-gray-500">Sociability</div><div className="text-gray-900">{dog.sociability || '—'}</div></div>
                  <div><div className="text-gray-500">Trainability</div><div className="text-gray-900">{dog.trainability || '—'}</div></div>
                </div>
              </section>

              {/* Health */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Health & Verification</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>Vaccinated: <strong>{dog.vaccinated ? 'Yes' : 'No'}</strong></li>
                  <li>DNA Tested: <strong>{dog.dna_tested ? 'Yes' : 'No'}</strong></li>
                  <li>Pedigree Certified: <strong>{dog.pedigree_certified ? 'Yes' : 'No'}</strong></li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
