import React, { useRef } from 'react'

export default function Step4Documents({ data, updateDocuments, removeDocument, onSubmit }) {
	const vaccinationRef = useRef(null)
	const pedigreeRef = useRef(null)
	const dnaRef = useRef(null)
	const healthRef = useRef(null)

	const handleFiles = (filesList, category) => {
		const files = Array.from(filesList)
		updateDocuments(files, category)
	}

	const DocumentUploadSection = ({ title, category, inputRef, description }) => {
		const categoryFiles = data.documents?.filter(f => f.category === category) || []
		
		return (
			<div className="field">
				<label>{title}</label>
				<div
					className="doc-drop"
					onDragOver={e => {
						e.preventDefault()
						e.dataTransfer.dropEffect = 'copy'
					}}
					onDrop={e => {
						e.preventDefault()
						handleFiles(e.dataTransfer.files, category)
					}}
					onClick={() => inputRef.current?.click()}
				>
					<p>Click or drag & drop to add {description}</p>
					{categoryFiles.length > 0 && (
						<ul className="file-list">
							{categoryFiles.map((f, index) => (
								<li key={`${category}-${f.file?.name || f.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
									<span>{f.file?.name || f.name}</span>
									<button 
										type="button" 
										onClick={(e) => { 
											e.stopPropagation(); 
											removeDocument(f.file?.name || f.name, category) 
										}} 
										style={{ background:'none', border:'none', color:'#c00', cursor:'pointer', fontSize:12 }}
									>
										✕
									</button>
								</li>
							))}
						</ul>
					)}
					<input
						ref={inputRef}
						type="file"
						multiple
						accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
						hidden
						onChange={e => handleFiles(e.target.files, category)}
					/>
				</div>
			</div>
		)
	}

	// Check if any additional health tests are selected
	const hasAdditionalHealthTests = data.hip_elbow_tested || data.heart_tested || data.eye_tested || data.genetic_panel || data.thyroid_tested

	// Check if any documents are required
	const hasAnyDocuments = data.vaccinated || data.pedigree_certified || data.dna_tested || hasAdditionalHealthTests

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
							description="vaccination certificates"
						/>
					)}

					{/* Show Pedigree Certificate only if pedigree_certified is checked */}
					{data.pedigree_certified && (
						<DocumentUploadSection
							title="Pedigree Certificate"
							category="pedigree"
							inputRef={pedigreeRef}
							description="pedigree documents"
						/>
					)}

					{/* Show DNA Test Results only if dna_tested is checked */}
					{data.dna_tested && (
						<DocumentUploadSection
							title="DNA Test Results"
							category="dna"
							inputRef={dnaRef}
							description="DNA test reports"
						/>
					)}

					{/* Show Other Health Files only if any additional health tests are checked */}
					{hasAdditionalHealthTests && (
						<DocumentUploadSection
							title="Other Health Files"
							category="health"
							inputRef={healthRef}
							description="health certificates and test results"
						/>
					)}

					<small className="upload-note">
						Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max file size: 5MB per file.
					</small>
				</>
			)}
		</div>
	)
}
