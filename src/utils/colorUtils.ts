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

export function generateRandomColor(): string {
	return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

export function luminance(r: number, g: number, b: number): number {
	const a = [r, g, b].map((v) => {
		const normalizedV = v / 255;
		return normalizedV <= 0.03928 ? normalizedV / 12.92 : ((normalizedV + 0.055) / 1.055) ** 2.4;
	});
	return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(color: string): "light" | "dark" {
	// Convert hex to RGB
	const hex = color.replace("#", "");
	const r = Number.parseInt(hex.substr(0, 2), 16);
	const g = Number.parseInt(hex.substr(2, 2), 16);
	const b = Number.parseInt(hex.substr(4, 2), 16);

	// Calculate luminance
	const lum = luminance(r, g, b);

	// Return light or dark based on luminance
	return lum > 0.179 ? "dark" : "light";
}
