import { createSignal, onMount, For } from "solid-js";

interface AvatarDrawerProps {
	onUpdate: (dataUrl: string) => void;
}

type PenColor = "black" | "red" | "green" | "white";

export function AvatarDrawer(props: AvatarDrawerProps) {
	const [isDrawing, setIsDrawing] = createSignal(false);
	const [currentColor, setCurrentColor] = createSignal<PenColor>("black");
	const [pixels, setPixels] = createSignal<
		{ x: number; y: number; color: PenColor }[]
	>([]);

	let svgRef: SVGSVGElement | undefined;
	const pixelSize = 10; // Size of each "pixel" for the drawing
	const canvasSize = 400;
	const borderWidth = 16;

	// Color options with their display values
	const colorOptions: { id: PenColor; label: string; value: string }[] = [
		{ id: "black", label: "Black", value: "#000000" },
		{ id: "red", label: "Red", value: "#ff0000" },
		{ id: "green", label: "Green", value: "#00cc00" },
		{ id: "white", label: "White", value: "#FFF" },
	];

	onMount(() => {
		// Add document-level mouse up event to ensure we catch mouse releases outside the SVG
		document.addEventListener("mouseup", handleGlobalMouseUp);
		document.addEventListener("touchend", handleGlobalTouchEnd);

		updatePreview();

		return () => {
			// Clean up event listeners on component unmount
			document.removeEventListener("mouseup", handleGlobalMouseUp);
			document.removeEventListener("touchend", handleGlobalTouchEnd);
		};
	});

	const handleGlobalMouseUp = () => {
		if (isDrawing()) {
			stopDrawing();
		}
	};

	const handleGlobalTouchEnd = () => {
		if (isDrawing()) {
			stopDrawing();
		}
	};

	// Mouse event handlers
	const startDrawing = (e: MouseEvent) => {
		e.preventDefault();
		setIsDrawing(true);
		drawAtPosition(e.clientX, e.clientY);
	};

	const draw = (e: MouseEvent) => {
		e.preventDefault();
		if (isDrawing()) {
			drawAtPosition(e.clientX, e.clientY);
		}
	};

	// Touch event handlers
	const handleTouchStart = (e: TouchEvent) => {
		e.preventDefault(); // Prevent scrolling while drawing
		setIsDrawing(true);
		if (e.touches.length > 0) {
			const touch = e.touches[0];
			drawAtPosition(touch.clientX, touch.clientY);
		}
	};

	const handleTouchMove = (e: TouchEvent) => {
		e.preventDefault(); // Prevent scrolling while drawing
		if (isDrawing() && e.touches.length > 0) {
			const touch = e.touches[0];
			drawAtPosition(touch.clientX, touch.clientY);
		}
	};

	const handleTouchEnd = (e: TouchEvent) => {
		e.preventDefault();
		stopDrawing();
	};

	const stopDrawing = () => {
		setIsDrawing(false);
		updatePreview();
	};

	const drawAtPosition = (clientX: number, clientY: number) => {
		if (!svgRef) return;

		// Get position relative to SVG
		const rect = svgRef.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		// Calculate which pixel to fill
		const pixelX = Math.floor(x / pixelSize) * pixelSize;
		const pixelY = Math.floor(y / pixelSize) * pixelSize;

		// Check if within the circular boundary
		const centerX = canvasSize / 2;
		const centerY = canvasSize / 2;
		const radius = canvasSize / 2 - borderWidth;
		const distance = Math.sqrt(
			(pixelX + pixelSize / 2 - centerX) ** 2 +
				(pixelY + pixelSize / 2 - centerY) ** 2,
		);

		// Skip drawing if outside the circle, but don't stop the drawing mode
		if (distance > radius) return;

		// Check if we already have a pixel at this position
		const existingPixelIndex = pixels().findIndex(
			(p) => p.x === pixelX && p.y === pixelY,
		);

		// Get the current selected color
		const color = currentColor();

		if (existingPixelIndex >= 0) {
			// Replace the existing pixel with the current color
			const updatedPixels = [...pixels()];
			updatedPixels[existingPixelIndex] = {
				x: pixelX,
				y: pixelY,
				color,
			};
			setPixels(updatedPixels);
		} else {
			// Add a new pixel
			setPixels([
				...pixels(),
				{
					x: pixelX,
					y: pixelY,
					color,
				},
			]);
		}
	};

	const clearCanvas = () => {
		setPixels([]);
		updatePreview();
	};

	const updatePreview = () => {
		if (!svgRef) return;

		// Convert SVG to data URL
		const svgData = new XMLSerializer().serializeToString(svgRef);
		const svgBlob = new Blob([svgData], {
			type: "image/svg+xml;charset=utf-8",
		});
		const url = URL.createObjectURL(svgBlob);

		// Create an image to load the SVG
		const img = new Image();
		img.onload = () => {
			// Create a canvas to draw the image
			const canvas = document.createElement("canvas");
			canvas.width = canvasSize;
			canvas.height = canvasSize;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				// Create circular clipping path
				ctx.beginPath();
				ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
				ctx.closePath();
				ctx.clip();

				// Fill with white background
				ctx.fillStyle = "white";
				ctx.fillRect(0, 0, canvasSize, canvasSize);

				// Draw the SVG
				ctx.drawImage(img, 0, 0);

				// Convert to data URL and update parent
				const dataUrl = canvas.toDataURL("image/png");
				props.onUpdate(dataUrl);
			}

			// Clean up
			URL.revokeObjectURL(url);
		};
		img.src = url;
	};

	const selectColor = (color: PenColor) => {
		setCurrentColor(color);
	};

	return (
		<div class="flex flex-col items-center">
			<div
				class="mb-4 rounded-full overflow-hidden bg-white"
				style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
			>
				<svg
					ref={svgRef}
					width={canvasSize}
					height={canvasSize}
					viewBox={`0 0 ${canvasSize} ${canvasSize}`}
					// Mouse events
					onMouseDown={startDrawing}
					onMouseMove={draw}
					// Don't stop drawing on mouse leave, only on mouse up
					// onMouseLeave={stopDrawing} - Removed this line
					// Touch events
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchEnd}
					class="touch-none max-w-full h-auto"
					style={{ "image-rendering": "pixelated" }}
				>
					{/* Circular mask and border */}
					<defs>
						<pattern
							id="grid"
							width={pixelSize}
							height={pixelSize}
							patternUnits="userSpaceOnUse"
						>
							<path
								d={`M ${pixelSize} 0 L 0 0 0 ${pixelSize}`}
								fill="none"
								stroke="#f0f0f0"
								stroke-width="0.5"
							/>
							<title>Grid pattern</title>
						</pattern>
						<mask id="circleMask">
							<rect width="100%" height="100%" fill="white" />
							<circle
								cx={canvasSize / 2}
								cy={canvasSize / 2}
								r={canvasSize / 2}
								fill="black"
							/>
						</mask>
						<clipPath id="circleClip">
							<circle
								cx={canvasSize / 2}
								cy={canvasSize / 2}
								r={canvasSize / 2 - borderWidth}
							/>
						</clipPath>
					</defs>

					{/* Blue border circle */}
					<circle
						cx={canvasSize / 2}
						cy={canvasSize / 2}
						r={canvasSize / 2}
						fill="blue"
					/>

					{/* White background for drawing area */}
					<circle
						cx={canvasSize / 2}
						cy={canvasSize / 2}
						r={canvasSize / 2 - borderWidth}
						fill="white"
					/>

					{/* Grid pattern inside the circle */}
					<circle
						cx={canvasSize / 2}
						cy={canvasSize / 2}
						r={canvasSize / 2 - borderWidth}
						fill="url(#grid)"
					/>

					{/* Render all pixels with clipping to ensure they stay within the circle */}
					<g clip-path="url(#circleClip)">
						<For each={pixels()}>
							{(pixel) => {
								const colorValue =
									colorOptions.find((c) => c.id === pixel.color)?.value ||
									"#000000";
								return (
									<rect
										x={pixel.x}
										y={pixel.y}
										width={pixelSize}
										height={pixelSize}
										fill={colorValue}
									/>
								);
							}}
						</For>
					</g>
				</svg>
			</div>

			<div class="flex justify-center space-x-2 mb-3">
				<For each={colorOptions}>
					{(color) => (
						<button
							type="button"
							onClick={() => selectColor(color.id)}
							class={`w-10 h-10 rounded-full border-2 ${
								currentColor() === color.id
									? "border-indigo-500 ring-2 ring-indigo-200"
									: "border-gray-300"
							}`}
							style={{ "background-color": color.value }}
							aria-label={`Select ${color.label} pen`}
							aria-pressed={currentColor() === color.id}
						/>
					)}
				</For>
			</div>

			<div class="flex justify-center">
				<button
					type="button"
					onClick={clearCanvas}
					class="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
				>
					Clear Drawing
				</button>
			</div>

			<p class="mt-4 text-sm text-gray-500 text-center">
				Click or touch and drag to draw with the selected color. Your avatar
				will be displayed in a circle with a blue border.
			</p>
		</div>
	);
}
