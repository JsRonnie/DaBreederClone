import React, { useRef, useMemo, useCallback } from 'react'

const Step4Documents = React.memo(function Step4Documents({ data, updateDocuments, removeDocument }) {
	const vaccinationRef = useRef(null)
	const pedigreeRef = useRef(null)
	const dnaRef = useRef(null)
	const healthRef = useRef(null)

	const handleFiles = useCallback((filesList, category) => {
		const files = Array.from(filesList)
		updateDocuments(files, category)
	}, [updateDocuments])

	// Memoize document filtering to prevent unnecessary re-renders
	const documentsByCategory = useMemo(() => {
		const docs = data.documents || []
		return {
			vaccination: docs.filter(f => f.category === 'vaccination'),
			pedigree: docs.filter(f => f.category === 'pedigree'),
			dna: docs.filter(f => f.category === 'dna'),
			health: docs.filter(f => f.category === 'health')
		}
	}, [data.documents])

	const DocumentUploadSection = React.memo(({ title, category, inputRef }) => {
		const categoryFiles = documentsByCategory[category] || []
		
		return (
			<div className="field">
				<label>{title}</label>
				<div className="documents-preview">
					{categoryFiles.length > 0 ? (
						<div className="documents-list">
							{categoryFiles.map((f, index) => {
								const fileName = f.file?.name || f.name || 'Unknown file'
								return (
									<div key={`${category}-${fileName}-${index}`} className="document-item">
										<div className="document-info">
											<svg className="document-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
												<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
												<polyline points="14,2 14,8 20,8"/>
												<line x1="16" y1="13" x2="8" y2="13"/>
												<line x1="16" y1="17" x2="8" y2="17"/>
												<polyline points="10,9 9,9 8,9"/>
											</svg>
											<span className="document-filename">{fileName}</span>
										</div>
										<div className="document-buttons">
											<button 
												type="button" 
												className="add-more-btn"
												onClick={() => inputRef.current?.click()}
											>
												Change Files
											</button>
											<button 
												type="button" 
												className="remove-document-btn" 
												onClick={() => removeDocument(fileName, category)}
											>
												Remove
											</button>
										</div>
									</div>
								)
							})}
						</div>
					) : (
						<div className="document-item">
							<div className="document-info">
								<svg className="document-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
									<polyline points="14,2 14,8 20,8"/>
									<line x1="16" y1="13" x2="8" y2="13"/>
									<line x1="16" y1="17" x2="8" y2="17"/>
									<polyline points="10,9 9,9 8,9"/>
								</svg>
								<span className="document-filename">No documents uploaded</span>
							</div>
							<div className="document-buttons">
								<button 
									type="button" 
									className="add-more-btn"
									onClick={() => inputRef.current?.click()}
								>
									Add Files
								</button>
							</div>
						</div>
					)}
					<input
						ref={inputRef}
						type="file"
						multiple
						accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
						className="hidden-file-input"
						onChange={e => handleFiles(e.target.files, category)}
					/>
				</div>
			</div>
		)
	})

	// Memoize health test checks to prevent unnecessary re-calculations
	const hasAdditionalHealthTests = useMemo(() => 
		data.hip_elbow_tested || data.heart_tested || data.eye_tested || data.genetic_panel || data.thyroid_tested,
		[data.hip_elbow_tested, data.heart_tested, data.eye_tested, data.genetic_panel, data.thyroid_tested]
	)

	// Memoize document requirements check
	const hasAnyDocuments = useMemo(() => 
		data.vaccinated || data.pedigree_certified || data.dna_tested || hasAdditionalHealthTests,
		[data.vaccinated, data.pedigree_certified, data.dna_tested, hasAdditionalHealthTests]
	)

	return (
		<div className="step step-4">
			<h3 className="step-title">Upload Documents</h3>
			
			{!hasAnyDocuments ? (
				<div className="no-documents-message">
					<div className="no-docs-icon">
						<svg viewBox="0 0 24 24" fill="currentColor" className="document-icon">
							<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</div>
					<h4>No Documents Required</h4>
					<p>
						Based on your health certification selections, no document uploads are required at this time. 
						You can proceed to submit your dog's profile.
					</p>
					<div className="no-docs-tip">
						<strong>Tip:</strong> If you want to upload documents, go back to the Health & Verification step 
						and select the relevant certifications (Pedigree Certified, DNA Tested, Vaccinated, or Additional Health Tests).
					</div>
				</div>
			) : (
				<>
					{/* Show Vaccination Records only if vaccinated is checked */}
					{data.vaccinated && (
						<DocumentUploadSection
							title="Vaccination Records"
							category="vaccination"
							inputRef={vaccinationRef}
						/>
					)}

					{/* Show Pedigree Certificate only if pedigree_certified is checked */}
					{data.pedigree_certified && (
						<DocumentUploadSection
							title="Pedigree Certificate"
							category="pedigree"
							inputRef={pedigreeRef}
						/>
					)}

					{/* Show DNA Test Results only if dna_tested is checked */}
					{data.dna_tested && (
						<DocumentUploadSection
							title="DNA Test Results"
							category="dna"
							inputRef={dnaRef}
						/>
					)}

					{/* Show Other Health Files only if any additional health tests are checked */}
					{hasAdditionalHealthTests && (
						<DocumentUploadSection
							title="Other Health Files"
							category="health"
							inputRef={healthRef}
						/>
					)}

					<small className="upload-note">
						Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max file size: 5MB per file.
					</small>
				</>
			)}
		</div>
	)
}, (prevProps, nextProps) => {
	// Custom comparison to prevent unnecessary re-renders
	const prevData = prevProps.data
	const nextData = nextProps.data
	
	// Check if the relevant data fields have changed
	return (
		prevData.vaccinated === nextData.vaccinated &&
		prevData.pedigree_certified === nextData.pedigree_certified &&
		prevData.dna_tested === nextData.dna_tested &&
		prevData.hip_elbow_tested === nextData.hip_elbow_tested &&
		prevData.heart_tested === nextData.heart_tested &&
		prevData.eye_tested === nextData.eye_tested &&
		prevData.genetic_panel === nextData.genetic_panel &&
		prevData.thyroid_tested === nextData.thyroid_tested &&
		JSON.stringify(prevData.documents) === JSON.stringify(nextData.documents) &&
		prevProps.updateDocuments === nextProps.updateDocuments &&
		prevProps.removeDocument === nextProps.removeDocument
	)
})

export default Step4Documents
