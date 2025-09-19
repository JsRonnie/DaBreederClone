import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'

export default function MyDogs({ dogs = [], onAddDog, userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])
  const [uid, setUid] = useState(userId || null)

  // Keep internal uid in sync with prop
  useEffect(() => { setUid(userId || null) }, [userId])

  const displayDogs = useMemo(() => {
    if (dogs.length > 0) return dogs
    return mine
  }, [dogs, mine])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        let effectiveUserId = uid
        // If no userId provided, try to read it from Supabase auth
        if (!effectiveUserId) {
          const { data: u, error: uErr } = await supabase.auth.getUser()
          if (uErr) throw uErr
          effectiveUserId = u?.user?.id || null
          setUid(effectiveUserId)
        }
        if (!effectiveUserId) { setMine([]); return }
        let { data, error: qErr } = await supabase
          .from('dogs')
          // Select all columns to avoid errors if some optional columns (like image_url) don't exist yet
          .select('*')
          .eq('user_id', effectiveUserId)
          // Order by id to be robust even if created_at isn't present yet
          .order('id', { ascending: false })
        if (qErr) {
          const msg = (qErr.message || '').toLowerCase()
          // If user_id column doesn't exist, fall back to showing all dogs (dev-friendly)
          if (msg.includes('user_id') && msg.includes('does not exist')) {
            const fallback = await supabase
              .from('dogs')
              .select('*')
              .order('id', { ascending: false })
            if (fallback.error) throw fallback.error
            data = fallback.data
            setError("Note: 'user_id' column missing. Showing all dogs. Add a user_id uuid column to filter per-user.")
          } else if (msg.includes('permission denied') || msg.includes('not allowed')) {
            throw new Error('Permission denied when reading dogs. If Row Level Security is ON, add select policy: user_id = auth.uid().')
          } else {
            throw qErr
          }
        }
        if (!active) return
        setMine(
          (data || []).map(d => ({
            id: d.id,
            name: d.name || 'Unnamed',
            breed: d.breed || 'Unknown',
            age: d.age_years ? `${d.age_years} years` : '—',
            sex: d.gender ? (d.gender[0].toUpperCase() + d.gender.slice(1)) : '—',
            image: d.image_url || '/heroPup.jpg',
          }))
        )
      } catch (e) {
        console.error(e)
        setError(e.message || 'Failed to load your dogs')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const onFocus = () => load()
    window.addEventListener('visibilitychange', onFocus)
    // Safety timeout so UI doesn't appear stuck if something unforeseen happens
    const t = setTimeout(() => { if (active) setLoading(false) }, 6000)
    return () => { active = false; window.removeEventListener('visibilitychange', onFocus) }
  }, [uid])

  async function addSampleDogs() {
    try {
      setError('')
      setLoading(true)
      let effectiveUserId = uid
      if (!effectiveUserId) {
        const { data: u } = await supabase.auth.getUser()
        effectiveUserId = u?.user?.id || null
        setUid(effectiveUserId)
      }
      if (!effectiveUserId) throw new Error('Please sign in to add sample dogs.')
      const sample = [
        { name: 'Mr.brown', breed: 'Great Dane', gender: 'male', age_years: 8, size: 'large' },
        { name: 'Mango', breed: 'Mastiff', gender: 'male', age_years: 3, size: 'small' },
        { name: 'Ronnie', breed: 'Boxer', gender: 'male', age_years: 7, size: 'medium' },
      ].map(d => ({ ...d, user_id: effectiveUserId }))
      const { error: insErr } = await supabase.from('dogs').insert(sample)
      if (insErr) throw insErr
      const { data, error: qErr } = await supabase
        .from('dogs')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('id', { ascending: false })
      if (qErr) throw qErr
      setMine(
        (data || []).map(d => ({
          id: d.id,
          name: d.name || 'Unnamed',
          breed: d.breed || 'Unknown',
          age: d.age_years ? `${d.age_years} years` : '—',
          sex: d.gender ? (d.gender[0].toUpperCase() + d.gender.slice(1)) : '—',
          image: d.image_url || '/heroPup.jpg',
        }))
      )
    } catch (e) {
      console.error(e)
      const m = (e.message || '').toLowerCase()
      if (m.includes('permission denied')) setError('Permission denied. Check RLS insert policy (user_id = auth.uid()).')
      else setError(e.message || 'Failed to add sample dogs')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDog(id) {
    try {
      setError('')
      const { error: delErr } = await supabase.from('dogs').delete().eq('id', id)
      if (delErr) throw delErr
      setMine((prev) => prev.filter(d => d.id !== id))
    } catch (e) {
      console.error(e)
      setError(e.message || 'Failed to delete dog')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with title and add button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dogs</h1>
          <button 
            onClick={onAddDog}
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Pet
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading your dogs…</div>
        ) : displayDogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs yet</h3>
            <p className="text-gray-500 mb-6">Add your first dog to get started with breeding matches.</p>
            {userId && (
              <p className="text-xs text-slate-500 mb-2">(Filtering by your account id ending with …{String(userId).slice(-6)})</p>
            )}
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="mt-3">
              <button
                type="button"
                onClick={addSampleDogs}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Or add 3 sample dogs
              </button>
            </div>
            <button 
              onClick={onAddDog}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Add Your First Dog
            </button>
            <div className="mt-3" />
            {error && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-rose-600">{error}</p>
                <button type="button" onClick={() => window.location.reload()} className="text-xs text-slate-600 hover:text-slate-900 underline">Retry</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {displayDogs.map((dog) => (
              <div 
                key={dog.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                {/* Dog Photo */}
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img 
                    src={dog.image} 
                    alt={dog.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEzMCA3MEwxNzAgMTEwTDE3MCAyMDBIMzBMMzAgMTEwTDcwIDcwTDEwMCAxMDBaIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K'
                    }}
                  />
                </div>
                
                {/* Dog Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{dog.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>{dog.breed}</p>
                    <p>{dog.age} • {dog.sex}</p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200">
                      View Profile
                    </button>
                    <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200">
                      Find Match
                    </button>
                    <button onClick={() => handleDeleteDog(dog.id)} className="px-3 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors duration-200">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}