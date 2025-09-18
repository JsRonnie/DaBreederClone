import React from 'react'

// Common dog breeds for the dropdown
const commonBreeds = [
	'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle',
	'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky',
	'Boxer', 'Great Dane', 'Chihuahua', 'Shih Tzu', 'Boston Terrier',
	'Pomeranian', 'Australian Shepherd', 'Mastiff', 'Cocker Spaniel', 'Border Collie',
	'French Bulldog', 'Maltese', 'Schnauzer', 'Doberman Pinscher', 'Mixed Breed'
].sort()

export default function Step1DogInfo({ data, updateField }) {
	return (
		<div className="step step-1">
			<div className="field">
				<label htmlFor="dog-name">Dog Name</label>
				<input
					id="dog-name"
					type="text"
					className="text-input"
					value={data.name || ''}
					onChange={e => updateField('name', e.target.value)}
					placeholder="Enter dog name"
				/>
			</div>
			
			<div className="field">
				<label htmlFor="dog-gender">Gender</label>
				<select
					id="dog-gender"
					className="select-input"
					value={data.gender || ''}
					onChange={e => updateField('gender', e.target.value)}
				>
					<option value="">Select gender</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
				</select>
			</div>

			<div className="field">
				<label htmlFor="dog-age">Age (years)</label>
				<input
					id="dog-age"
					type="number"
					min="0"
					max="25"
					step="0.1"
					className="text-input"
					value={data.age || ''}
					onChange={e => updateField('age', e.target.value)}
					placeholder="Enter age in years"
				/>
			</div>

			<div className="field">
				<label htmlFor="dog-breed">Breed</label>
				<select
					id="dog-breed"
					className="select-input"
					value={data.breed || ''}
					onChange={e => updateField('breed', e.target.value)}
				>
					<option value="">Select breed</option>
					{commonBreeds.map(breed => (
						<option key={breed} value={breed}>{breed}</option>
					))}
				</select>
			</div>
		</div>
	)
}
