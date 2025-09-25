import { useState, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

// Simplified version for debugging - NO FILE UPLOADS
const initialData = {
	name: '',
	gender: '',
	breed: '',
	age: '',
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
	photo: null,
	documents: []
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
		// Do nothing for debugging
	}, [])

	const updatePhoto = useCallback((file) => {
		// Do nothing for debugging
	}, [])

	const removeDocument = useCallback((fileName, category = 'misc') => {
		// Do nothing for debugging
	}, [])

	const reset = useCallback(() => {
		setData(initialData)
		setSubmitting(false)
		setError(null)
		setSuccess(false)
	}, [])

	const submit = useCallback(async () => {
		console.log('🐕 Starting debug submission...')
		setSubmitting(true)
		setError(null)
		setSuccess(false)

		try {
			// Test Supabase connection first
			console.log('🔗 Testing Supabase connection...')
			const { data: testData, error: testError } = await supabase
				.from('dogs')
				.select('count', { count: 'exact' })
				.limit(0)

			if (testError) {
				console.error('❌ Supabase connection test failed:', testError)
				throw new Error(`Database connection failed: ${testError.message}`)
			}
			console.log('✅ Supabase connection successful')

			// Prepare simplified data (no files)
			const src = { ...data }
			delete src.documents
			delete src.photo

			// Map age
			if ((src.age_years === '' || src.age_years === undefined) && src.age !== undefined && src.age !== '') {
				src.age_years = src.age
			}
			delete src.age

			// Only keep basic fields
			const dogPayload = {
				name: src.name,
				gender: src.gender,
				breed: src.breed || null,
				age_years: src.age_years ? Number(src.age_years) : null,
				size: src.size || null,
				weight_kg: src.weight_kg ? Number(src.weight_kg) : null,
				pedigree_certified: Boolean(src.pedigree_certified),
				dna_tested: Boolean(src.dna_tested),
				vaccinated: Boolean(src.vaccinated),
				activity_level: src.activity_level || null,
				sociability: src.sociability || null,
				trainability: src.trainability || null
			}

			console.log('📝 Payload to insert:', dogPayload)

			// Try to get user (but don't require it for testing)
			try {
				const { data: userResult, error: userError } = await supabase.auth.getUser()
				if (userResult?.user) {
					dogPayload.user_id = userResult.user.id
					console.log('👤 User authenticated:', userResult.user.id)
				} else {
					console.log('🚫 No authenticated user - continuing without user_id')
				}
			} catch (authErr) {
				console.log('⚠️ Auth check failed, continuing without user_id:', authErr.message)
			}

			// Insert basic dog data only
			const { data: inserted, error: insertError } = await supabase
				.from('dogs')
				.insert(dogPayload)
				.select('id')
				.single()

			if (insertError) {
				console.error('❌ Insert failed:', insertError)
				throw insertError
			}

			console.log('✅ Dog inserted successfully with ID:', inserted.id)
			setSuccess(true)
			return inserted.id

		} catch (e) {
			console.error('💥 Submission error:', e)
			setError(e instanceof Error ? e : new Error(String(e)))
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