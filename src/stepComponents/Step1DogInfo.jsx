import React from 'react'

export default function Step1DogInfo({ data, updateField }) {
	return (
		<div className="step step-1">
			<div className="field">
				<label htmlFor="dog-name">Dog Name</label>
				<input
					id="dog-name"
					type="text"
					className="text-input"
					value={data.name}
					onChange={e => updateField('name', e.target.value)}
					placeholder="Enter dog name"
				/>
			</div>
			<div className="field">
				<label htmlFor="dog-gender">Gender</label>
				<select
					id="dog-gender"
					className="select-input"
					value={data.gender}
					onChange={e => updateField('gender', e.target.value)}
				>
					<option value="">Select gender</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
				</select>
			</div>
		</div>
	)
}
