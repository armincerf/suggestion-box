// This is a handler for the goto effect. It scrolls to the target element and highlights it.
// currently not used becaues we're limiting the number of suggestions loaded
// and we're not using virtualized lists because of a lack of a good library and also time
import { useSearchParams } from "@solidjs/router";
import { createEffect, onCleanup } from "solid-js";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("SuggestionBoard");

const HIGHLIGHT_DURATION = 1500;

export function useGotoHandler() {
	const [searchParams, setSearchParams] = useSearchParams();

	createEffect(() => {
		if (
			(!searchParams.selectedSuggestionId && !searchParams.selectedCommentId) ||
			!searchParams.scrolled
		) {
			return;
		}

		const suggestionId = searchParams.selectedSuggestionId;
		const commentId = searchParams.selectedCommentId;

		const targetId = commentId
			? `comment-${commentId}`
			: suggestionId
				? `suggestion-${suggestionId}`
				: null;

		if (targetId) {
			const element = document.getElementById(targetId);
			if (element) {
				element.classList.add("highlight-temporary");
				const removeHighlightTimer = setTimeout(() => {
					element.classList.remove("highlight-temporary");
					if (
						searchParams.selectedSuggestionId === suggestionId &&
						searchParams.selectedCommentId === commentId
					) {
						setSearchParams({
							selectedSuggestionId: undefined,
							selectedCommentId: undefined,
						});
						logger.debug(`Cleared highlight params for: ${targetId}`);
					} else {
						logger.debug(
							`Highlight params changed before removal timer for: ${targetId}`,
						);
					}
				}, HIGHLIGHT_DURATION);

				onCleanup(() => clearTimeout(removeHighlightTimer));
			} else {
				logger.warn(
					`Element ${targetId} not found for highlighting after delay.`,
				);
				const clearNotFoundTimer = setTimeout(() => {
					if (
						searchParams.selectedSuggestionId === suggestionId &&
						searchParams.selectedCommentId === commentId
					) {
						setSearchParams({
							selectedSuggestionId: undefined,
							selectedCommentId: undefined,
						});
						logger.debug(
							`Cleared highlight params because element ${targetId} was not found.`,
						);
					}
				}, 500);
				onCleanup(() => clearTimeout(clearNotFoundTimer));
			}
		}
	});
}
