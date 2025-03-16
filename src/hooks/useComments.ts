import type { Schema } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

export const commentQuery = (z: Zero<Schema>) =>
	z.query.comment.orderBy("timestamp", "desc");

/**
 * Hook to fetch comments for a suggestion with proper relationship handling
 * @param props.includeAllReplies Whether to fetch all replies in the same query (better for rendering full thread)
 */
export function useCommentsBySuggestionId(props: {
	suggestionId: string;
	limit: number | null;
	includeAllReplies?: boolean; // Whether to include all child comments in the result
}) {
	const z = useZero();

	const [suggestionComments] = useQuery(() => {
		// If including all replies, grab all comments for this suggestion
		if (props.includeAllReplies) {
			return z.query.comment
				.where("suggestionID", props.suggestionId)
				.orderBy("timestamp", "desc");
		}

		// Otherwise just fetch root comments with optional limit
		const baseQuery = z.query.comment
			.where("suggestionID", props.suggestionId)
			.where("parentCommentID", "IS", null)
			.orderBy("timestamp", "desc");

		const query = props.limit ? baseQuery.limit(props.limit) : baseQuery;

		return query;
	});

	return { suggestionComments };
}

/**
 * Hook to get replies for a specific comment
 */
export function useCommentReplies(props: {
	commentId: string;
	limit?: number;
}) {
	const z = useZero();

	const [replies] = useQuery(() => {
		const baseQuery = z.query.comment
			.where("parentCommentID", props.commentId)
			.orderBy("timestamp", "asc");

		return props.limit ? baseQuery.limit(props.limit) : baseQuery;
	});

	return { replies };
}
