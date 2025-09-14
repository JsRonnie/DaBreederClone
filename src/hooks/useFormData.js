import { useState, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

const initialData = {
	name: '',
	gender: '',
	pedigree_certified: false,
	dna_tested: false,
	vaccinated: false,
	size: '',
	weight_kg: '',
	age_years: '',
	coat_length: '',
	coat_color: '',
	ear_type: '',
	tail_type: '',
	muzzle_shape: '',
	build: '',
	documents: [] // File objects
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

	const updateDocuments = useCallback((files) => {
		setData(d => ({ ...d, documents: files }))
	}, [])

	const removeDocument = useCallback((fileName) => {
		setData(d => ({ ...d, documents: d.documents.filter(f => f.name !== fileName) }))
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
			const dogPayload = { ...data }
			// Remove client-only fields
			delete dogPayload.documents

			// Attach user_id (requires authenticated session if RLS policies rely on it)
			try {
				const { data: userResult, error: userError } = await supabase.auth.getUser()
				if (userError) {
					// Not fatal if policies allow anon inserts, just log
					// eslint-disable-next-line no-console
					console.warn('Auth getUser error:', userError.message)
				} else if (userResult?.user) {
					dogPayload.user_id = userResult.user.id
				} else {
					// If your RLS requires auth, throw to surface a helpful message
					// Comment out the next line if you allow anon inserts.
					throw new Error('You must be signed in to add a dog (no authenticated user found).')
				}
			} catch (authCheckErr) {
				throw authCheckErr
			}
			// Convert numeric fields
			if (dogPayload.weight_kg !== '') dogPayload.weight_kg = Number(dogPayload.weight_kg)
			if (dogPayload.age_years !== '') dogPayload.age_years = Number(dogPayload.age_years)

			const { data: inserted, error: insertError } = await supabase
				.from('dogs')
				.insert(dogPayload)
				.select('id')
				.single()

			if (insertError) throw insertError

			const dogId = inserted.id

			// Upload documents sequentially (can optimize later)
			if (data.documents.length > 0) {
				for (const file of data.documents) {
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
							content_type: file.type
						})
					if (docInsertError) throw docInsertError
				}
			}

			setSuccess(true)
			return dogId
		} catch (e) {
			setError(e)
			// eslint-disable-next-line no-console
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
		submit,
		reset,
		removeDocument
	}
}

export default useFormData
