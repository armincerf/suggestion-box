import { createSignal, onCleanup } from "solid-js";

export const useIsScreenSmallerThan = (props: {
    sizeBreakpoint: number
}) => {
	const [isSmallScreen, setIsSmallScreen] = createSignal(
		window.innerWidth < props.sizeBreakpoint,
	);
    window.addEventListener("resize", () => {
        setIsSmallScreen(window.innerWidth < props.sizeBreakpoint);
    });
    onCleanup(() => {
        window.removeEventListener("resize", () => {});
    });
    return isSmallScreen;
};

