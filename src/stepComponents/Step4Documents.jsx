import React, { useRef } from 'react'

export default function Step4Documents({ data, updateDocuments, removeDocument }) {
	const inputRef = useRef(null)

	const handleFiles = (filesList) => {
		const files = Array.from(filesList)
		updateDocuments(files)
	}

	return (
		<div className="step step-4">
			<div className="field">
				<label>Dog Documents</label>
				<div
					className="doc-drop"
					onDragOver={e => {
						e.preventDefault()
						e.dataTransfer.dropEffect = 'copy'
					}}
					onDrop={e => {
						e.preventDefault()
						handleFiles(e.dataTransfer.files)
					}}
					onClick={() => inputRef.current?.click()}
				>
					<p>Click or drag & drop to add files</p>
					{data.documents.length > 0 && (
						<ul className="file-list">
							{data.documents.map(f => (
								<li key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
									<span>{f.name}</span>
									<button type="button" onClick={(e) => { e.stopPropagation(); removeDocument(f.name) }} style={{ background:'none', border:'none', color:'#c00', cursor:'pointer', fontSize:12 }}>✕</button>
								</li>
							))}
						</ul>
					)}
					<input
						ref={inputRef}
						type="file"
						multiple
						hidden
						onChange={e => handleFiles(e.target.files)}
					/>
				</div>
				<small>Max recommended total size 10MB.</small>
			</div>
		</div>
	)
}
