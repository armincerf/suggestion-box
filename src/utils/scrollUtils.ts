import { createSignal, onCleanup, type Accessor } from "solid-js";

/**
 * Creates a debounced signal that responds to scroll events on a specific element
 * 
 * @param elementRef Reference to the element to observe for scroll events
 * @param duration How long the signal stays true after a scroll event (in ms)
 * @param mobileOnly Whether to only listen for scroll events on mobile devices
 * @returns A signal that is true for the specified duration after a scroll event
 */
export function createScrollDetector(
  elementRef: Accessor<HTMLElement | null | undefined>,
  duration = 1000, 
  mobileOnly = true
) {
  const [isScrolling, setIsScrolling] = createSignal(false);
  const [timeoutId, setTimeoutId] = createSignal<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (timeoutId()) {
      clearTimeout(timeoutId());
    }
    
    // Set timeout to hide after specified duration
    const newTimeoutId = setTimeout(() => {
      setIsScrolling(false);
    }, duration);
    
    setTimeoutId(newTimeoutId);
  };

  // Setup the scroll event listener when ref is available
  const setupScrollListener = () => {
    const element = elementRef();
    if (!element) return;

    // Only add scroll listener if we're on mobile (when mobileOnly is true)
    if (!mobileOnly || (typeof window !== 'undefined' && window.matchMedia("(max-width: 768px)").matches)) {
      element.addEventListener("scroll", handleScroll, { passive: true });

      // Cleanup function to remove event listener
      onCleanup(() => {
        if (timeoutId()) {
          clearTimeout(timeoutId());
        }
        element.removeEventListener("scroll", handleScroll);
      });
    }
  };

  // Make sure to setup listeners when the ref is ready
  if (elementRef()) {
    setupScrollListener();
  }

  return isScrolling;
}