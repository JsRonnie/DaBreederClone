import React, { useState, useMemo, useEffect } from 'react'
import useFormData from '../hooks/useFormData'
import Step1DogInfo from '../stepComponents/Step1DogInfo'
import Step2Health from '../stepComponents/Step2Health'
import Step3Traits from '../stepComponents/Step3Traits'
import Step4Documents from '../stepComponents/Step4Documents'
import StepNavigation from '../stepComponents/StepNavigation'
import '../stepComponents/stepbystepUI.css'

const TOTAL_STEPS = 4

export default function DogForm({ onSubmitted }) {
	const [step, setStep] = useState(1)
	const form = useFormData()

	// Apply background style when this component is mounted
	useEffect(() => {
		document.body.classList.add('step-flow-active')
		return () => {
			document.body.classList.remove('step-flow-active')
		}
	}, [])

		const canNext = useMemo(() => {
		switch (step) {
			case 1:
				return form.data.name.trim() !== '' && form.data.gender !== ''
			case 2: // Traits & Physical Characteristics
				return form.data.size !== ''
			case 3: // Health & Verification (no required fields)
				return true
			case 4: // documents optional
				return true
			default:
				return true
		}
	}, [step, form.data])

	const goNext = () => setStep(s => Math.min(TOTAL_STEPS, s + 1))
	const goPrev = () => setStep(s => Math.max(1, s - 1))
	const goTo = (s) => setStep(s)

	const submit = async () => {
			const id = await form.submit()
			if (id) {
			alert('Dog registered successfully!')
			form.reset()
			setStep(1)
				onSubmitted?.()
		}
	}

	let StepComponent
	if (step === 1) StepComponent = <Step1DogInfo data={form.data} updateField={form.updateField} updatePhoto={form.updatePhoto} />
	else if (step === 2) StepComponent = <Step3Traits data={form.data} updateField={form.updateField} />
	else if (step === 3) StepComponent = <Step2Health data={form.data} updateCheckbox={form.updateCheckbox} />
	else StepComponent = <Step4Documents data={form.data} updateDocuments={form.updateDocuments} removeDocument={form.removeDocument} onSubmit={submit} />

	return (
		<div className="step-flow-root">
			<div className="step-form-outer dog-step">
				<div className="progress-wrapper">
					<div className="progress-track" />
					<div className="progress-steps">
						{Array.from({ length: TOTAL_STEPS }, (_, i) => {
							const s = i + 1
							const active = s === step
							const complete = s < step
							return (
								<button
									key={s}
									type="button"
									className={`progress-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
									onClick={() => complete && goTo(s)}
									disabled={!complete}
								>{s}</button>
							)
						})}
					</div>
				</div>
				<form onSubmit={e => { e.preventDefault(); step === TOTAL_STEPS ? submit() : goNext() }}>
					{StepComponent}
					<div className="nav-bar">
						<button type="button" className="nav-btn" disabled={step === 1} onClick={goPrev}>Back</button>
						{step < TOTAL_STEPS && (
							<button type="button" className="nav-btn" disabled={!canNext} onClick={goNext}>Next</button>
						)}
						{step === TOTAL_STEPS && (
							<button type="submit" className="nav-btn submit" disabled={form.submitting}>{form.submitting ? 'Submitting…' : 'Submit'}</button>
						)}
					</div>
				</form>
				{form.error && <p className="error-inline">{form.error.message}</p>}
			</div>
		</div>
	)
}
