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
		const baseQuery = z.query.comments
			.where("parentCommentId", props.commentId)
			.orderBy("timestamp", "asc")
			.related("reactions");

		return props.limit ? baseQuery.limit(props.limit) : baseQuery;
	}, { ttl: "forever" });

	return { replies };
}
