import { createSignal, onCleanup, onMount } from "solid-js";
import { SCREEN_BREAKPOINT_MD } from "../../utils/constants";

/**
 * Hook to check if the screen size is smaller than a provided breakpoint
 * @param props.sizeBreakpoint The screen width breakpoint in pixels (defaults to MD if not provided)
 * @returns A signal indicating whether screen is smaller than the breakpoint 
 */
export function useIsScreenSmallerThan(props?: {
    sizeBreakpoint?: number
}) {
    const breakpoint = props?.sizeBreakpoint || SCREEN_BREAKPOINT_MD;
    const [isSmallScreen, setIsSmallScreen] = createSignal(false);

    // Define the handler function once
    const handleResize = () => {
        setIsSmallScreen(window.innerWidth < breakpoint);
    };

    // Run on mount and add listener
    onMount(() => {
        handleResize(); // Set initial value
        window.addEventListener("resize", handleResize);
    });

    // Cleanup removes the listener reference
    onCleanup(() => {
        window.removeEventListener("resize", handleResize);
    });

    return isSmallScreen; // Return the signal
}

// Additional hook for dimensions if needed
export function useScreenDimensions() {
    const [dimensions, setDimensions] = createSignal({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const handleResize = () => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    };

    onMount(() => {
        handleResize(); // Set initial value
        window.addEventListener("resize", handleResize);
    });

    onCleanup(() => {
        window.removeEventListener("resize", handleResize);
    });

    return dimensions; // Return signal containing width and height
} 