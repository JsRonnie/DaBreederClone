import React from 'react'

export default function StepNavigation({ current, total, goTo, canPrev, canNext, onPrev, onNext, onSubmit, submitting }) {
	return (
		<div className="step-navigation">
			<div className="progress-indicator">
				{Array.from({ length: total }, (_, i) => {
					const step = i + 1
					const isActive = step === current
					const isComplete = step < current
					return (
						<button
							key={step}
							type="button"
							className={`step-dot ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
							onClick={() => (isComplete ? goTo(step) : null)}
							disabled={!isComplete}
						>
							{step}
						</button>
					)
				})}
			</div>
			<div className="nav-buttons">
				<button type="button" onClick={onPrev} disabled={!canPrev}>Back</button>
				{current < total && (
					<button type="button" onClick={onNext} disabled={!canNext}>Next</button>
				)}
				{current === total && (
					<button type="button" onClick={onSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
				)}
			</div>
		</div>
	)
}
