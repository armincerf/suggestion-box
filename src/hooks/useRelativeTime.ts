import { formatDistanceToNow } from "date-fns";
import { useIsScreenSmallerThan } from "./useScreenSize";

export function useRelativeTime(timestamp: number) {
	const isSmallScreen = useIsScreenSmallerThan({
		sizeBreakpoint: 768,
	});

	// Format the relative time
	const relativeTime = () => {
		const timeSince = formatDistanceToNow(new Date(timestamp), {
			addSuffix: true,
		});
		// strip the word about from the string
		const shortenAbout = (str: string) => str.replace("about ", "");
		const shortenHours = (str: string) => str.replace("hours", "hrs");
		const shortenMinutes = (str: string) => str.replace("minutes", "mins");
		const shortenSeconds = (str: string) => str.replace("seconds", "secs");
		const shortenDays = (str: string) => str.replace("days", "d");
		const shortenMonths = (str: string) => str.replace("months", "mos");

		return isSmallScreen()
			? // wheres my lisp syntax at :(
				shortenAbout(
					shortenHours(
						shortenMinutes(
							shortenSeconds(shortenDays(shortenMonths(timeSince))),
						),
					),
				)
			: timeSince;
	};

	return relativeTime;
}
