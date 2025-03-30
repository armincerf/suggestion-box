import { Show, createEffect, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: JSX.Element;
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

	return (
		<Show when={props.isOpen}>
			<dialog
				class={cn(
					"fixed inset-0 z-[500] flex items-center justify-center",
					// Use background color WITH opacity modifier
					"bg-black/50 dark:bg-gray-900/70",
					"w-full h-full p-0 m-0 open:flex"
				)}
				onClick={handleBackdropClick}
				onKeyDown={handleBackdropKeyDown}
				open
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<div
					class={cn(
						"bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col",
						"dark:bg-gray-800"
					)}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
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

					{/* Content */}
					<div class="p-4 overflow-y-auto flex-1 dark:text-gray-200">{props.children}</div>
				</div>
			</dialog>
		</Show>
	);
}
