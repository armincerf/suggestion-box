import { Show, createEffect, onCleanup, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: JSX.Element;
	size?: "default" | "lg" | "xl";
}

export function Modal(props: ModalProps) {
	// Handle ESC key to close modal
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && props.isOpen) {
			props.onClose();
		}
	};

	// Add/remove event listeners
	createEffect(() => {
		if (props.isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
		} else {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = ""; // Restore scrolling
		}

		onCleanup(() => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = ""; // Ensure scrolling is restored
		});
	});

	// Close when clicking the backdrop (outside the modal)
	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			props.onClose();
		}
	};

	const handleBackdropKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			props.onClose();
		}
	};

	// Calculate size classes based on prop
	const sizeClasses = createMemo(() => {
		switch (props.size) {
			case "lg":
				return "md:max-w-3xl lg:max-w-5xl"; // Wider for lg
			case "xl":
				return "md:max-w-4xl lg:max-w-6xl"; // Wider for xl
			default: // 'default' or undefined
				return "max-w-md"; // Original default
		}
	});

	return (
		<Show when={props.isOpen}>
			<dialog
				class={cn(
					"fixed inset-0 z-[500] flex items-start md:items-center justify-center", // Align top on small screens
					"bg-black/50 dark:bg-gray-900/70",
					"w-full h-full p-4 md:p-0 m-0 open:flex", // Add padding for small screens
				)}
				onClick={handleBackdropClick}
				onKeyDown={handleBackdropKeyDown}
				open
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				{/* Content Container */}
				<div
					class={cn(
						"bg-white rounded-lg shadow-xl w-full mx-auto flex flex-col",
						// Responsive sizing and height
						"h-[95vh] md:h-auto md:max-h-[85vh]", // Full height on small, constrained on medium+
						sizeClasses(), // Apply dynamic size class
						"dark:bg-gray-800",
					)}
					// Stop propagation to prevent backdrop click closing
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					role="document" // Added role
				>
					{/* Header */}
					<div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
						<h2 id="modal-title" class="text-lg font-medium dark:text-white">
							{props.title}
						</h2>
						<button
							type="button"
							class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
							onClick={props.onClose}
							aria-label="Close"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Body (make it scrollable) */}
					{/* The direct child passed to Modal will now be placed here */}
					<div class="flex-1 min-h-0 overflow-y-auto"> {/* Ensure body is scrollable and takes remaining space */}
						{props.children}
					</div>
				</div>
			</dialog>
		</Show>
	);
}
