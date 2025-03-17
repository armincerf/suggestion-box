import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

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
