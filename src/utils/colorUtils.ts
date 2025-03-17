function hexToRgb(hex: string) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: Number.parseInt(result[1], 16),
				g: Number.parseInt(result[2], 16),
				b: Number.parseInt(result[3], 16),
			}
		: null;
}
export function darkenHexString(hex: string, amount: number) {
	const color = hexToRgb(hex);
	if (!color) {
		return hex;
	}
	const { r, g, b } = color;
	const darkenedColor = {
		r: Math.max(0, r - amount),
		g: Math.max(0, g - amount),
		b: Math.max(0, b - amount),
	};
	return `#${darkenedColor.r.toString(16).padStart(2, "0")}${darkenedColor.g.toString(16).padStart(2, "0")}${darkenedColor.b.toString(16).padStart(2, "0")}`;
}
