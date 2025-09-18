import React from 'react'
import {
	sizeOptions,
	coatTypeOptions,
	colorOptions,
	activityLevelOptions,
	sociabilityOptions,
	trainabilityOptions
} from '../utils/traitOptions'

function Select({ label, value, onChange, options, placeholder = 'Select...' }) {
	return (
		<div className="field">
			<label>{label}</label>
			<select className="select-input" value={value || ''} onChange={e => onChange(e.target.value)}>
				<option value="">{placeholder}</option>
				{options.map(opt => (
					<option key={opt.value} value={opt.value}>{opt.label}</option>
				))}
			</select>
		</div>
	)
}

export default function Step3Traits({ data, updateField }) {
	return (
		<div className="step step-3">
			<h3 className="step-title">Traits & Physical Characteristics</h3>
			
			{/* Size and Weight */}
			<div className="form-row">
				<Select
					label="Size"
					value={data.size}
					onChange={v => updateField('size', v)}
					options={sizeOptions}
				/>
				<div className="field">
					<label>Weight (kg)</label>
					<input
						className="text-input"
						type="number"
						min="0.5"
						max="150"
						step="0.1"
						value={data.weight_kg || ''}
						onChange={e => updateField('weight_kg', e.target.value)}
						placeholder="Enter weight in kg"
					/>
				</div>
			</div>

			{/* Coat and Color */}
			<div className="form-row">
				<Select
					label="Coat Type"
					value={data.coat_type}
					onChange={v => updateField('coat_type', v)}
					options={coatTypeOptions}
				/>
				<Select
					label="Color / Markings"
					value={data.color}
					onChange={v => updateField('color', v)}
					options={colorOptions}
				/>
			</div>

			{/* Behavioral Traits */}
			<Select
				label="Activity Level"
				value={data.activity_level}
				onChange={v => updateField('activity_level', v)}
				options={activityLevelOptions}
			/>
			
			<div className="form-row">
				<Select
					label="Sociability"
					value={data.sociability}
					onChange={v => updateField('sociability', v)}
					options={sociabilityOptions}
				/>
				<Select
					label="Trainability"
					value={data.trainability}
					onChange={v => updateField('trainability', v)}
					options={trainabilityOptions}
				/>
			</div>
		</div>
	)
}
