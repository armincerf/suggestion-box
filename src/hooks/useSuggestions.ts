import type { Category, Schema } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

export const suggestionQuery = (z: Zero<Schema>) =>
	z.query.suggestion.orderBy("timestamp", "desc");

export function useSuggestions(props: {
	categories: Category[];
}) {
	const z = useZero();
	return useQuery(() => {
		const visibleCategoryIds = props.categories.map((c) => c.id);

		if (visibleCategoryIds.length === 0) {
			return z.query.suggestion
				.where("id", "=", "no-results-placeholder")
				.related("reactions")
				.related("comments");
		}

		return z.query.suggestion
			.where("categoryID", "IN", visibleCategoryIds)
			.orderBy("timestamp", "desc")
			.related("comments")
			.related("reactions");
	});
}
