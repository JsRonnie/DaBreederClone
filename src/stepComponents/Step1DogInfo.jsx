import React from 'react'

// Common dog breeds for the dropdown
const commonBreeds = [
	'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle',
	'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky',
	'Boxer', 'Great Dane', 'Chihuahua', 'Shih Tzu', 'Boston Terrier',
	'Pomeranian', 'Australian Shepherd', 'Mastiff', 'Cocker Spaniel', 'Border Collie',
	'French Bulldog', 'Maltese', 'Schnauzer', 'Doberman Pinscher', 'Mixed Breed'
].sort()

export default function Step1DogInfo({ data, updateField, updatePhoto }) {
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

			{/* Main Photo with preview and remove */}
			<div className="field">
				<label htmlFor="dog-photo">Dog Photo</label>
				<input
					id="dog-photo"
					type="file"
					accept="image/*"
					onChange={(e) => updatePhoto?.(e.target.files?.[0] || null)}
				/>
				{data.photo && (
					<div style={{ marginTop: 8 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
							<img
								src={URL.createObjectURL(data.photo)}
								alt="Preview"
								style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
							/>
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								<small style={{ color: '#555' }}>Selected: {data.photo.name}</small>
								<button type="button" className="text-red-600 hover:text-red-700 underline text-sm" onClick={() => updatePhoto?.(null)}>
									Remove photo
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
