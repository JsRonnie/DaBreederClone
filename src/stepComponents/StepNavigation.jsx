import React from 'react'

export default function StepNavigation({ current, total, goTo, canPrev, canNext, onPrev, onNext, onSubmit, submitting }) {
	const stepTitles = ['Dog Info', 'Health', 'Traits', 'Documents']

	return (
		<div className="step-navigation">
			{/* Enhanced Progress Indicator */}
			<div className="progress-wrapper">
				<div className="progress-track">
					<div 
						className="progress-fill" 
						style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
					></div>
				</div>
				<div className="progress-steps">
					{Array.from({ length: total }, (_, i) => {
						const step = i + 1
						const isActive = step === current
						const isComplete = step < current
						return (
							<div key={step} className="progress-step-container">
								<button
									type="button"
									className={`progress-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
									onClick={() => (isComplete ? goTo(step) : null)}
									disabled={!isComplete && !isActive}
								>
									{isComplete ? (
										<svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									) : (
										<span className="step-number">{step}</span>
									)}
								</button>
								<span className={`step-label ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
									{stepTitles[i]}
								</span>
							</div>
						)
					})}
				</div>
			</div>

			{/* Navigation Buttons */}
			<div className="nav-buttons">
				<button 
					type="button" 
					onClick={onPrev} 
					disabled={!canPrev}
					className="nav-btn nav-btn-back"
				>
					<svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
					</svg>
					Back
				</button>
				{current < total && (
					<button 
						type="button" 
						onClick={onNext} 
						disabled={!canNext}
						className="nav-btn nav-btn-next"
					>
						Next
						<svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
							<path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
						</svg>
					</button>
				)}
				{current === total && (
					<button 
						type="button" 
						onClick={onSubmit} 
						disabled={submitting}
						className="nav-btn nav-btn-submit"
					>
						{submitting ? (
							<>
								<div className="spinner"></div>
								Submitting...
							</>
						) : (
							<>
								Submit Profile
								<svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	)
}
