import React from 'react'

export default function Step2Health({ data, updateCheckbox }) {
	return (
		<div className="step step-2">
			<div className="check-block">
				<label className="check-item">
					<input
						type="checkbox"
						checked={data.pedigree_certified}
						onChange={updateCheckbox('pedigree_certified')}
					/> Pedigree Certified
				</label>
				<label className="check-item">
					<input
						type="checkbox"
						checked={data.dna_tested}
						onChange={updateCheckbox('dna_tested')}
					/> DNA Tested
				</label>
				<label className="check-item">
					<input
						type="checkbox"
						checked={data.vaccinated}
						onChange={updateCheckbox('vaccinated')}
					/> Vaccinated
				</label>
			</div>
		</div>
	)
}
