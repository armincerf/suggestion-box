import { onMount, onCleanup, type Accessor } from "solid-js";

export interface ShortcutDefinition {
	key: string;
	ctrl?: boolean; // Corresponds to Ctrl on Windows/Linux, Cmd on macOS
	meta?: boolean; // Corresponds to Cmd on macOS, Windows key on Windows/Linux
	shift?: boolean;
	alt?: boolean;
	handler: (event: KeyboardEvent) => void;
	/** If true, the shortcut won't trigger if the event target is an input, textarea, or contenteditable */
	ignoreInput?: boolean;
}

/**
 * Attaches global keyboard shortcut listeners.
 * @param shortcuts An array of shortcut definitions.
 */
export function useKeyboardShortcuts(
	shortcuts: Accessor<ShortcutDefinition[]>,
) {
	const handleGlobalKeyDown = (event: KeyboardEvent) => {
		const activeShortcuts = shortcuts(); // Get current shortcut definitions

		for (const shortcut of activeShortcuts) {
			// Check if modifier keys match (Ctrl/Cmd treated interchangeably via 'ctrl' flag)
			const ctrlKeyPressed = event.ctrlKey || event.metaKey;
			const metaKeyPressed = event.metaKey || event.ctrlKey; // Allow Meta to also trigger Ctrl checks if needed
			const shiftKeyPressed = event.shiftKey;
			const altKeyPressed = event.altKey;

			const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
			const ctrlMatch = shortcut.ctrl ? ctrlKeyPressed : !ctrlKeyPressed;
			// Use meta specifically if defined, otherwise rely on ctrlMatch which covers Cmd too
			const metaMatch =
				shortcut.meta !== undefined
					? shortcut.meta
						? metaKeyPressed
						: !metaKeyPressed
					: true;
			const shiftMatch = shortcut.shift ? shiftKeyPressed : !shiftKeyPressed;
			const altMatch = shortcut.alt ? altKeyPressed : !altKeyPressed;
			// console.log("keyMatch", keyMatch);
			// console.log("ctrlMatch", ctrlMatch);
			// console.log("metaMatch", metaMatch);
			// console.log("shiftMatch", shiftMatch);
			// console.log("altMatch", altMatch);

			if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
				// Check if we should ignore inputs
				if (shortcut.ignoreInput) {
					const target = event.target as HTMLElement;
					const isInputFocused =
						target.tagName === "INPUT" ||
						target.tagName === "TEXTAREA" ||
						target.isContentEditable ||
						// Check parent node in case focus is inside a contenteditable element
						target.closest('[contenteditable="true"]');

					if (isInputFocused) {
						continue; // Skip this shortcut if an input is focused
					}
				}

				// all conditions met, call the handler
				shortcut.handler(event);
			}
		}
	};

	onMount(() => {
		document.addEventListener("keydown", handleGlobalKeyDown);
		 console.log("Keyboard shortcuts attached");
	});

	onCleanup(() => {
		document.removeEventListener("keydown", handleGlobalKeyDown);
		console.log("Keyboard shortcuts detached");
	});

	// This hook manages side effects and doesn't return anything directly.
}
