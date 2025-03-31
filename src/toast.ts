import { createToaster } from "@ark-ui/solid/toast";

// Configure placement, gap, etc. as needed
export const toaster = createToaster({
	placement: "bottom-end", // Position toasts at the bottom-right
	overlap: true,           // Allow toasts to overlap
	gap: 16,                 // Gap between toasts (adjust px value)
    max: 5,                  // Max number of toasts visible at once
    duration: 6000,          // Default duration (ms)
}); 