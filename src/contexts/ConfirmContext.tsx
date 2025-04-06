import {
	createContext,
	useContext,
	createSignal,
	type ParentProps,
} from "solid-js";
import { Dialog } from "@ark-ui/solid/dialog";
import { Portal } from "solid-js/web";

type ConfirmContextType = {
	confirm: (
		msg: string,
		options?: {
			confirmText?: string;
			cancelText?: string;
			title?: string;
			confirmVariant?: string;
		},
	) => Promise<boolean>;
};

// Default implementation throws error if context not found
const ConfirmContext = createContext<ConfirmContextType>({
	confirm: () => {
		throw new Error("useConfirm must be used within a ConfirmProvider");
	},
});

export function ConfirmProvider(props: ParentProps) {
	const [isOpen, setIsOpen] = createSignal(false);
	const [message, setMessage] = createSignal("");
	const [title, setTitle] = createSignal("Confirm Action");
	const [confirmText, setConfirmText] = createSignal("Confirm");
	const [cancelText, setCancelText] = createSignal("Cancel");
	const [confirmVariant, setConfirmVariant] = createSignal("btn-primary"); // Default variant
	// Store the promise's resolve function
	const [resolvePromise, setResolvePromise] = createSignal<
		(value: boolean) => void
	>(() => {});

	const confirm = (
		msg: string,
		options: {
			confirmText?: string;
			cancelText?: string;
			title?: string;
			confirmVariant?: string;
		} = {},
	): Promise<boolean> => {
		setMessage(msg);
		setTitle(options.title ?? "Confirm Action");
		setConfirmText(options.confirmText ?? "Confirm");
		setCancelText(options.cancelText ?? "Cancel");
		setConfirmVariant(options.confirmVariant ?? "btn-primary"); // Set variant or default
		setIsOpen(true);
		return new Promise<boolean>((resolve) => {
			setResolvePromise(() => resolve); // Store the resolve function
		});
	};

	const handleResolve = (value: boolean) => {
		resolvePromise()(value);
		setIsOpen(false);
	};

	// Handle closing via Esc or clicking outside, treat as cancel
	const handleOpenChange = (details: { open: boolean }) => {
		setIsOpen(details.open);
		if (!details.open) {
			// If closing without explicit button click, resolve as cancel
			handleResolve(false);
		}
	};

	const contextValue: ConfirmContextType = { confirm };

	return (
		<ConfirmContext.Provider value={contextValue}>
			{/* Render children passed to the provider */}
			{props.children}

			{/* Render the Dialog */}
			<Dialog.Root
				open={isOpen()}
				onOpenChange={handleOpenChange}
				modal // Makes it modal
				lazyMount // Only mount when opened
				unmountOnExit // Unmount when closed
				role="alertdialog" // Appropriate role for confirmations
				preventScroll // Prevent background scrolling
				trapFocus // Keep focus inside
			>
				<Portal>
					{" "}
					{/* Render dialog at the end of body */}
					<Dialog.Backdrop class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
					<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
						<Dialog.Content class="bg-base-100 dark:bg-base-900 rounded-lg shadow-xl p-6 w-full max-w-md border border-base-300 dark:border-base-700">
							<Dialog.Title class="text-lg font-semibold mb-2">
								{title()}
							</Dialog.Title>
							<Dialog.Description class="text-base-content/80 mb-4 whitespace-pre-wrap">
								{message()}
							</Dialog.Description>
							<div class="flex justify-end space-x-3">
								{/* Use CloseTrigger for cancel */}
								<Dialog.CloseTrigger class="btn btn-ghost">
									{cancelText()}
								</Dialog.CloseTrigger>
								<button
									type="button"
									// Apply dynamic variant class, ensure base 'btn' class is present
									class={`btn ${confirmVariant()}`}
									onClick={() => handleResolve(true)}
								>
									{confirmText()}
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Positioner>
				</Portal>
			</Dialog.Root>
		</ConfirmContext.Provider>
	);
}

/**
 * Hook to easily access the confirmation dialog function.
 * @example
 * const { confirm } = useConfirm();
 * const confirmed = await confirm("Are you sure?");
 * if (confirmed) { ... }
 */
export function useConfirm() {
	return useContext(ConfirmContext);
}
