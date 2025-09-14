import React from 'react'
import {
	sizeOptions,
	coatLengthOptions,
	coatColorOptions,
	earTypeOptions,
	tailTypeOptions,
	muzzleShapeOptions,
	buildOptions
} from '../utils/traitOptions'

function Select({ label, value, onChange, options, placeholder = 'Select...' }) {
	return (
		<div className="field">
			<label>{label}</label>
			<select className="select-input" value={value} onChange={e => onChange(e.target.value)}>
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
			<Select
				label="Size"
				value={data.size}
				onChange={v => updateField('size', v)}
				options={sizeOptions}
			/>
			<div className="form-row">
				<div className="field">
					<label>Weight (kg)</label>
					<input
						className="text-input"
						type="number"
						step="0.1"
						value={data.weight_kg}
						onChange={e => updateField('weight_kg', e.target.value)}
					/>
				</div>
				<div className="field">
					<label>Age (years)</label>
					<input
						className="text-input"
						type="number"
						step="0.1"
						value={data.age_years}
						onChange={e => updateField('age_years', e.target.value)}
					/>
				</div>
			</div>
			<Select
				label="Coat Length"
				value={data.coat_length}
				onChange={v => updateField('coat_length', v)}
				options={coatLengthOptions}
			/>
			<Select
				label="Coat Color"
				value={data.coat_color}
				onChange={v => updateField('coat_color', v)}
				options={coatColorOptions}
			/>
			<Select
				label="Ear Type"
				value={data.ear_type}
				onChange={v => updateField('ear_type', v)}
				options={earTypeOptions}
			/>
			<Select
				label="Tail Type"
				value={data.tail_type}
				onChange={v => updateField('tail_type', v)}
				options={tailTypeOptions}
			/>
			<Select
				label="Muzzle Shape"
				value={data.muzzle_shape}
				onChange={v => updateField('muzzle_shape', v)}
				options={muzzleShapeOptions}
			/>
			<Select
				label="Build"
				value={data.build}
				onChange={v => updateField('build', v)}
				options={buildOptions}
			/>
		</div>
	)
}
