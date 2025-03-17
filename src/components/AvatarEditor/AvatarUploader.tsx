import { createSignal } from "solid-js";
import {
	blobToDataUrl,
	imageToWebpDataUrl,
} from "../../utils/imageCompression";

interface AvatarUploaderProps {
	onUpdate: (dataUrl: string) => void;
}

export function AvatarUploader(props: AvatarUploaderProps) {
	const [dragActive, setDragActive] = createSignal(false);
	const [errorMessage, setErrorMessage] = createSignal("");
	const [isProcessing, setIsProcessing] = createSignal(false);

	const handleDrag = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const handleChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFiles(target.files);
		}
	};

	const handleFiles = async (files: FileList) => {
		const file = files[0];

		// Validate file type
		if (!file.type.match("image.*")) {
			setErrorMessage("Please upload an image file (PNG, JPG, GIF)");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			setErrorMessage("Image must be smaller than 5MB");
			return;
		}

		setErrorMessage("");
		setIsProcessing(true);

		try {
			// Convert to WebP, resize to 64x64, and compress
			const webpDataUrl = await imageToWebpDataUrl(file);
			console.log("Image processed successfully", {
				originalSize: (await blobToDataUrl(file)).length,
				compressedSize: webpDataUrl.length,
			});
			props.onUpdate(webpDataUrl);
		} catch (error) {
			console.error("Error processing image:", error);
			setErrorMessage("Failed to process image. Please try another file.");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div class="flex flex-col items-center">
			<div
				class={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors ${
					dragActive()
						? "border-indigo-500 bg-indigo-50"
						: "border-gray-300 hover:border-gray-400"
				}`}
				onDragEnter={handleDrag}
				onDragOver={handleDrag}
				onDragLeave={handleDrag}
				onDrop={handleDrop}
			>
				{isProcessing() ? (
					<div class="flex flex-col items-center">
						<div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
						<p class="text-sm text-gray-600">Processing image...</p>
					</div>
				) : (
					<>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10 text-gray-400 mb-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>

						<p class="text-sm text-gray-600 text-center mb-2">
							Drag and drop an image here, or click to select
						</p>

						<label class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer">
							Choose File
							<input
								type="file"
								accept="image/*"
								class="hidden"
								onChange={handleChange}
							/>
						</label>
					</>
				)}
			</div>

			{errorMessage() && (
				<p class="mt-2 text-sm text-red-600">{errorMessage()}</p>
			)}

			<p class="mt-4 text-sm text-gray-500 text-center">
				Images will be converted to WebP format, resized to 128x128, and
				compressed for optimal performance.
			</p>
		</div>
	);
}
