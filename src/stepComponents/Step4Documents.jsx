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
							{categoryFiles.map(f => (
								<li key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
									<span>{f.name}</span>
									<button 
										type="button" 
										onClick={(e) => { 
											e.stopPropagation(); 
											removeDocument(f.name, category) 
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

	return (
		<div className="step step-4">
			<h3 className="step-title">Upload Documents</h3>
			
			<DocumentUploadSection
				title="Vaccination Records"
				category="vaccination"
				inputRef={vaccinationRef}
				description="vaccination certificates"
			/>

			<DocumentUploadSection
				title="Pedigree Certificate"
				category="pedigree"
				inputRef={pedigreeRef}
				description="pedigree documents"
			/>

			<DocumentUploadSection
				title="DNA Test Results"
				category="dna"
				inputRef={dnaRef}
				description="DNA test reports"
			/>

			<DocumentUploadSection
				title="Other Health Files"
				category="health"
				inputRef={healthRef}
				description="health certificates and test results"
			/>

			<small className="upload-note">
				Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max file size: 5MB per file.
			</small>

			{/* Submit Button */}
			<div className="submit-section">
				<button 
					type="button" 
					className="submit-btn"
					onClick={onSubmit}
				>
				</button>
			</div>
		</div>
	)
}
