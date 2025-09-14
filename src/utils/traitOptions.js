export const sizeOptions = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' }
]

export const coatLengthOptions = [
	'Hairless', 'Short', 'Medium', 'Long', 'Wire', 'Curly'
].map(v => ({ value: v.toLowerCase(), label: v }))

export const coatColorOptions = [
	'Black', 'White', 'Brown', 'Tan', 'Red', 'Blue', 'Brindle', 'Merle', 'Sable', 'Cream', 'Gold'
].map(v => ({ value: v.toLowerCase(), label: v }))

export const earTypeOptions = [
	'Prick', 'Floppy', 'Semi-Prick', 'Button', 'Rose'
].map(v => ({ value: v.toLowerCase().replace(/\s+/g, '-'), label: v }))

export const tailTypeOptions = [
	'Curled', 'Docked', 'Sickle', 'Otter', 'Whip', 'Bobtail'
].map(v => ({ value: v.toLowerCase(), label: v }))

export const muzzleShapeOptions = [
	'Short', 'Moderate', 'Long', 'Brachycephalic', 'Dolichocephalic'
].map(v => ({ value: v.toLowerCase(), label: v }))

export const buildOptions = [
	'Lean', 'Athletic', 'Muscular', 'Stocky', 'Compact'
].map(v => ({ value: v.toLowerCase(), label: v }))

export const traitGroups = {
	coat_length: coatLengthOptions,
	coat_color: coatColorOptions,
	ear_type: earTypeOptions,
	tail_type: tailTypeOptions,
	muzzle_shape: muzzleShapeOptions,
	build: buildOptions
}
