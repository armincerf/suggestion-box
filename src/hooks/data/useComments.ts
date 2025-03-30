import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { createMemo } from "solid-js";
import { DUMMY_QUERY_ID, QUERY_TTL_FOREVER } from "../../utils/constants";

export const commentsBySuggestionQuery = (z: TZero, suggestionId: string) =>
	z.query.comments.where("suggestionId", suggestionId);

export function useComments(suggestionId: string) {
	const z = useZero();

	return useQuery(() => commentsBySuggestionQuery(z, suggestionId), {
		ttl: QUERY_TTL_FOREVER,
	});
}

interface UseCommentRepliesParams {
	commentId: string;
}

/**
 * Hook to fetch replies to a comment with reactive updates
 */
export function useCommentReplies(params: UseCommentRepliesParams) {
	const z = useZero();

	// Query for comment replies
	const [commentsData] = useQuery(
		() => {
			if (!params.commentId) {
				return z.query.comments
					.where("id", DUMMY_QUERY_ID)
					.related("reactions");
			}

			return z.query.comments
				.where("parentCommentId", params.commentId)
				.related("reactions");
		},
		{ ttl: QUERY_TTL_FOREVER },
	);

	// Create a memoized value for the replies
	const replies = createMemo(() => {
		const data = commentsData();
		// Filter to ensure we only return valid comments
		return data ? data : [];
	});

	return {
		replies,
	};
}
