import { useState, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

const initialData = {
	name: '',
	gender: '',
	breed: '',
	age: '', // UI uses `age`; we'll map to age_years on submit
	pedigree_certified: false,
	dna_tested: false,
	vaccinated: false,
	size: '',
	weight_kg: '',
	age_years: '',
	coat_length: '',
	coat_color: '',
	coat_type: '',
	color: '',
	activity_level: '',
	sociability: '',
	trainability: '',
	ear_type: '',
	tail_type: '',
	muzzle_shape: '',
	build: '',
	photo: null, // File object for main dog photo
	documents: [] // Array of { file: File, category: string }
}

export function useFormData() {
	const [data, setData] = useState(initialData)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState(null)
	const [success, setSuccess] = useState(false)

	const updateField = useCallback((field, value) => {
		setData(d => ({ ...d, [field]: value }))
	}, [])

	const updateCheckbox = useCallback((field) => (e) => {
		const { checked } = e.target
		setData(d => ({ ...d, [field]: checked }))
	}, [])

	const updateDocuments = useCallback((files, category = 'misc') => {
		console.log('📎 Adding documents:', { files: Array.from(files || []).map(f => f.name), category })
		const newItems = Array.from(files || []).map(f => ({ file: f, category }))
		setData(d => {
			// merge & de-dupe by (name, category)
			const existing = Array.isArray(d.documents) ? d.documents : []
			const merged = [...existing]
			for (const item of newItems) {
				const idx = merged.findIndex(x => (x.file?.name || x.name) === item.file.name && (x.category || 'misc') === item.category)
				if (idx === -1) merged.push(item)
			}
			console.log('📋 Updated documents:', merged.map(x => ({ name: x.file?.name || x.name, category: x.category })))
			return { ...d, documents: merged }
		})
	}, [])

	const updatePhoto = useCallback((file) => {
		setData(d => ({ ...d, photo: file }))
	}, [])

	const removeDocument = useCallback((fileName, category = 'misc') => {
		console.log('🗑️ Removing document:', { fileName, category })
		setData(d => {
			const filtered = (Array.isArray(d.documents) ? d.documents : []).filter(x =>
				((x.file?.name || x.name) !== fileName) || ((x.category || 'misc') !== category)
			)
			console.log('📋 Documents after removal:', filtered.map(x => ({ name: x.file?.name || x.name, category: x.category })))
			return { ...d, documents: filtered }
		})
	}, [])

	const reset = useCallback(() => {
		setData(initialData)
		setSubmitting(false)
		setError(null)
		setSuccess(false)
	}, [])

	const submit = useCallback(async () => {
		setSubmitting(true)
		setError(null)
		setSuccess(false)

		try {
			console.log('🚀 Starting form submission...')
			console.log('📋 Form data:', { 
				...data, 
				documents: data.documents?.map(d => ({ name: d.file?.name || d.name, category: d.category })),
				photo: data.photo ? { name: data.photo.name, size: data.photo.size } : null
			})
			
			const src = { ...data }
			// Remove client-only fields early
			delete src.documents
			delete src.photo

			// Map UI age -> age_years if provided
			if ((src.age_years === '' || src.age_years === undefined) && src.age !== undefined && src.age !== '') {
				src.age_years = src.age
			}
			delete src.age

			// Whitelist dog table columns to avoid unknown-column errors
			const allowedDogColumns = new Set([
				'user_id', 'name', 'gender', 'breed',
				'age_years', 'size', 'weight_kg',
				'pedigree_certified', 'dna_tested', 'vaccinated',
				'hip_elbow_tested', 'heart_tested', 'eye_tested',
				'genetic_panel', 'thyroid_tested',
				'coat_type', 'color', 'activity_level', 'sociability', 'trainability'
			])
			const dogPayload = Object.fromEntries(
				Object.entries(src).filter(([k]) => allowedDogColumns.has(k))
			)

			// Attach user_id (requires authenticated session if RLS policies rely on it)
			try {
				const { data: userResult, error: userError } = await supabase.auth.getUser()
				console.log('🔐 Auth check result:', { userResult, userError })
				if (userError) {
					// Not fatal if policies allow anon inserts, just log
					console.warn('Auth getUser error:', userError.message)
				} else if (userResult?.user) {
					dogPayload.user_id = userResult.user.id
					console.log('👤 User authenticated:', userResult.user.id)
				} else {
					// If your RLS requires auth, throw to surface a helpful message
					// Comment out the next line if you allow anon inserts.
					console.warn('⚠️ No authenticated user found - this may cause RLS policy violations')
				}
			} catch (authCheckErr) {
				console.error('🚨 Auth check failed:', authCheckErr)
				throw authCheckErr
			}
			// Convert numeric fields
			if (dogPayload.weight_kg !== '' && dogPayload.weight_kg !== undefined) dogPayload.weight_kg = Number(dogPayload.weight_kg)
			if (dogPayload.age_years !== '' && dogPayload.age_years !== undefined) dogPayload.age_years = Number(dogPayload.age_years)

			const { data: inserted, error: insertError } = await supabase
				.from('dogs')
				.insert(dogPayload)
				.select('id')
				.single()

			if (insertError) throw insertError

			const dogId = inserted.id

			// Upload main photo if provided, then update dogs.image_url
			if (data.photo) {
				const photoPath = `${dogId}/profile-${Date.now()}-${data.photo.name}`
				const { error: uploadPhotoError } = await supabase.storage
					.from('dog-photos')
					.upload(photoPath, data.photo, { upsert: false })
				if (uploadPhotoError) {
					if (uploadPhotoError.message?.toLowerCase().includes('bucket') && uploadPhotoError.message.toLowerCase().includes('not found')) {
						throw new Error("Upload failed: Bucket 'dog-photos' not found. Create it in Supabase Storage (make it public) or update the bucket name.")
					}
					throw new Error(`Photo upload failed for ${data.photo.name}: ${uploadPhotoError.message}`)
				}
				// Get public URL (bucket should be public)
				const { data: pub } = supabase.storage.from('dog-photos').getPublicUrl(photoPath)
				const imageUrl = pub?.publicUrl || null
				if (imageUrl) {
					const { error: updError } = await supabase
						.from('dogs')
						.update({ image_url: imageUrl })
						.eq('id', dogId)
					if (updError) {
						const msg = (updError.message || '').toLowerCase()
						// If the DB doesn't yet have image_url, don't block the submission
						if (msg.includes('image_url') && msg.includes('does not exist')) {
						
							console.warn("dogs.image_url column missing; skipping storing of image URL. You can add it later and images will still be uploaded to Storage.")
						} else {
							throw updError
						}
					}
				}

				// Optional: also log the photo in dog_documents for completeness
				const { error: docInsertErrorPhoto } = await supabase
					.from('dog_documents')
					.insert({
						dog_id: dogId,
						user_id: dogPayload.user_id,
						file_name: data.photo.name,
						storage_path: photoPath,
						file_size_bytes: data.photo.size,
						content_type: data.photo.type,
						category: 'photo'
					})
				if (docInsertErrorPhoto) throw docInsertErrorPhoto
			}

			// Upload documents sequentially (can optimize later)
			if (Array.isArray(data.documents) && data.documents.length > 0) {
				for (const item of data.documents) {
					const file = item?.file || item // backward compatible if array had File objects
					if (!file?.name) continue
					const category = item?.category || null
					const path = `${dogId}/${Date.now()}-${file.name}`
					const { error: uploadError } = await supabase.storage
						.from('dog-documents')
						.upload(path, file, { upsert: false })
					if (uploadError) {
						// Improve messaging for bucket not found vs permission
						if (uploadError.message?.toLowerCase().includes('bucket') && uploadError.message.toLowerCase().includes('not found')) {
							throw new Error("Upload failed: Bucket 'dog-documents' not found. Verify name EXACTLY and that you are pointing to the correct project (check VITE_SUPABASE_URL).")
						}
						throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`)
					}

					const { error: docInsertError } = await supabase
						.from('dog_documents')
						.insert({
							dog_id: dogId,
							user_id: dogPayload.user_id, // pass same user id for RLS
							file_name: file.name,
							storage_path: path,
							file_size_bytes: file.size,
							content_type: file.type,
							category: category
						})
					if (docInsertError) throw docInsertError
				}
			}

			setSuccess(true)
			return dogId
		} catch (e) {
			setError(e instanceof Error ? e : new Error(String(e)))
			console.error(e)
			return null
		} finally {
			setSubmitting(false)
		}
	}, [data])

	return {
		data,
		submitting,
		error,
		success,
		updateField,
		updateCheckbox,
		updateDocuments,
		updatePhoto,
		submit,
		reset,
		removeDocument
	}
}

export default useFormData
